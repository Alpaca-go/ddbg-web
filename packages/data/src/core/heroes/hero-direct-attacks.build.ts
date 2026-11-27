import { directAttackSchema } from "../../shared/effects";
import type { NormalizedHeroSkillCard } from "../../shared/schema";
import { HERO_ANNOTATIONS } from "./annotations";
import type { DirectAttackEntry } from "./annotations/types";

type ReviewedAttack = Omit<DirectAttackEntry, "id" | "name">;

function attachDirectHeroAttack(
  card: NormalizedHeroSkillCard,
  review: ReviewedAttack,
): NormalizedHeroSkillCard {
  const labels = new Map(card.printed_labels.map(({ label, value }) => [label, value]));
  const number = (label: string) =>
    card.unlabeled_numbers.find(
      (entry) => entry.anchor.type === "printed_label" && entry.anchor.label === label,
    )?.numeric;
  const effects = card.rules?.statuses ?? [];
  const printedEffects = card.effect_lines.map((line) =>
    line
      .map((segment) => (segment.type === "text" ? segment.text : `{${segment.icon.key}}`))
      .join("")
      .replace(/[\s,]+/g, ""),
  );
  const printedStances = (["support", "ranged", "defensive", "aggressive"] as const).map(
    (stance) => "stance_" + stance + (review.stances.includes(stance) ? "_lit" : "_unlit"),
  );
  const onHit = effects.map(({ kind, amount, duration }) => ({
    kind,
    duration,
    ...(amount === undefined ? {} : { amount }),
  }));
  const statuses = onHit
    .map(({ kind, amount, duration }) => `${amount ?? ""}{${kind}}${duration}t`)
    .join("");
  const bonus = card.rules?.damage;
  const shuffles = card.rules?.shuffle ?? [];
  const [shuffle] = shuffles;
  const move = /^(Push|Pull) ([1-9]\d*)$/.exec(shuffle?.text ?? "");
  const selfShuffle = move
    ? { direction: move[1] === "Pull" ? "pull" : "push", distance: Number(move[2]) }
    : undefined;
  const selfEffects = move ? [`{self_effects}Self{shuffle}${move[1]}${move[2]}`] : [];
  const targetEffects = bonus
    ? [`{target_effects}{damage}+${bonus.amount}vsUnholy`]
    : statuses === ""
      ? []
      : [`{target_effects}${statuses}`];
  const expectedEffects = [...selfEffects, ...targetEffects];
  if (
    card.verification.unverified ||
    card.rules?.effect !== "damage" ||
    labels.get("Crit") !== review.critical.threshold ||
    labels.get("Acc") !== review.hit.threshold ||
    number("Crit") !== review.critical.damage ||
    number("Acc") !== review.hit.damage ||
    !card.unlabeled_numbers.some(
      (entry) =>
        entry.numeric === review.range &&
        entry.anchor.type === "beside_icon" &&
        entry.anchor.left_icon?.key === "range",
    ) ||
    card.rules.targets?.monster !== review.monsterTargets ||
    card.rules.targets.hero !== 0 ||
    card.rules.targets.heroOrMonster !== 0 ||
    card.top_row_icons.map(({ key }) => key).join() !== printedStances.join() ||
    printedEffects.length !== expectedEffects.length ||
    printedEffects.some((line, index) => line !== expectedEffects[index]) ||
    (shuffle !== undefined &&
      (shuffles.length !== 1 || shuffle.scope !== "self" || shuffle.lineIndex !== 0 || !move)) ||
    card.rules.damageBonuses !== undefined ||
    (bonus !== undefined &&
      (bonus.condition !== "unholy" ||
        bonus.lineIndex !== selfEffects.length ||
        statuses !== "")) ||
    effects.some(({ scope }) => scope !== "target")
  ) {
    throw new Error(card.id + " 效果词条与已核卡面不符（R-048）");
  }
  const directAttack = directAttackSchema.parse({
    ...review,
    onHit,
    ...(bonus ? { damageBonus: { amount: bonus.amount, condition: bonus.condition } } : {}),
    ...(selfShuffle ? { selfShuffle } : {}),
  });
  return { ...card, rules: { ...card.rules, directAttack } };
}

/** R-048：逐英雄规则必须唯一命中所属英雄的 canonical 卡牌。 */
export function applyDirectHeroAttacks(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  if (cardsById.size !== cards.length) throw new Error("技能目录存在重复 ID（R-048）");
  const reviewedById = new Map<string, ReviewedAttack>();
  for (const { hero, entries } of HERO_ANNOTATIONS) {
    for (const { id, name, ...review } of entries.directAttack ?? []) {
      const card = cardsById.get(id);
      if (card?.hero !== hero || card.name !== name || reviewedById.has(id))
        throw new Error(`${id} 直攻注解归属不符、缺卡或重复（R-048）`);
      reviewedById.set(id, review);
    }
  }
  return cards.map((card) => {
    const review = reviewedById.get(card.id);
    return review ? attachDirectHeroAttack(card, review) : card;
  });
}
