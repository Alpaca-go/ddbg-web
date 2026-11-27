import { directAttackSchema } from "../../shared/effects";
import type { NormalizedHeroSkillCard } from "../../shared/schema";
import { HERO_ANNOTATIONS } from "./annotations";
import { ABOMINATION_PROJECTIONS } from "./annotations/abomination-projection-data";
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
  const form = ABOMINATION_PROJECTIONS.find(({ id }) => id === card.id)?.front;
  const effects = form?.statuses ?? card.rules?.statuses ?? [];
  const heal = card.rules?.self?.heal;
  const stress = form?.selfStress ?? card.rules?.self?.stress;
  const ranges = card.unlabeled_numbers.filter(
    ({ anchor }) =>
      anchor.type === "beside_icon" &&
      anchor.left_icon?.key === "range" &&
      anchor.inside_icon === null,
  );
  const [range] = ranges;
  const interval = card.rules?.range;
  const validRange =
    ranges.length === 1 &&
    (review.rangeMinimum === undefined
      ? !interval && range?.numeric === review.range
      : interval?.min === review.rangeMinimum &&
        interval.max === review.range &&
        range?.numeric === null &&
        range.text === `${review.rangeMinimum}-${review.range}`);
  const printedEffects = card.effect_lines.map((line) =>
    line
      .map((segment) => (segment.type === "text" ? segment.text : `{${segment.icon.key}}`))
      .join("")
      .replaceAll(String.fromCharCode(7), "")
      .replace(/[\s,]+/g, ""),
  );
  const printedStances = (["support", "ranged", "defensive", "aggressive"] as const).map(
    (stance) => "stance_" + stance + (review.stances.includes(stance) ? "_lit" : "_unlit"),
  );
  const statusesAt = new Map<number, string>();
  for (const { lineIndex, scope, kind, amount, duration } of effects) {
    const prefix = scope === "self" ? "{self_effects}Self" : "{target_effects}";
    statusesAt.set(
      lineIndex,
      (statusesAt.get(lineIndex) ?? prefix) + `${amount ?? ""}{${kind}}${duration}t`,
    );
  }
  const statusRules = (scope: "self" | "target") =>
    effects
      .filter((effect) => effect.scope === scope)
      .map(({ kind, amount, duration }) => ({
        kind,
        duration,
        ...(amount === undefined ? {} : { amount }),
      }));
  const onHit = statusRules("target");
  const onUse = statusRules("self");
  const combinedStress = form?.lines?.length === 2 && onUse.length > 0;
  const bonus = card.rules?.damage;
  const shuffles = card.rules?.shuffle ?? [];
  const [shuffle] = shuffles;
  const move = /^(Push|Pull) ([1-9]\d*)$/.exec(shuffle?.text ?? "");
  const selfShuffle = move
    ? { direction: move[1] === "Pull" ? "pull" : "push", distance: Number(move[2]) }
    : undefined;
  const expectedEffects = new Map(statusesAt);
  if (move) expectedEffects.set(0, `{self_effects}Self{shuffle}${move[1]}${move[2]}`);
  if (bonus)
    expectedEffects.set(bonus.lineIndex, `{target_effects}{damage}+${bonus.amount}vsUnholy`);
  if (heal)
    expectedEffects.set(
      heal.lineIndex,
      `{self_effects}Self{damage_or_heal_combined_marker}{heal}${heal.amount}`,
    );
  if (review.selfWound !== undefined)
    expectedEffects.set(0, `{self_effects}Self${review.selfWound}{wound}`);
  if (review.targetLight !== undefined) {
    const target = effects.find(({ scope }) => scope === "target");
    if (!target) throw new Error(card.id + " 光照效果缺少目标状态行（R-048）");
    const { lineIndex } = target;
    const sign = review.targetLight > 0 ? "+" : "";
    expectedEffects.set(
      lineIndex,
      expectedEffects.get(lineIndex) + `{light}${sign}${review.targetLight}`,
    );
  }
  if (stress) {
    const sign = stress.amount > 0 ? "+" : "";
    // R-212：Rake 的核准投影拆分一条印刷行中的自身增益与压力。
    const index = combinedStress ? 0 : stress.lineIndex;
    expectedEffects.set(
      index,
      (combinedStress ? expectedEffects.get(index) : "{self_effects}Self") +
        `{stress}${sign}${stress.amount}`,
    );
  }
  const effectLineCount =
    statusesAt.size +
    Number(Boolean(move)) +
    Number(Boolean(bonus)) +
    Number(Boolean(heal)) +
    Number(review.selfWound !== undefined) +
    Number(Boolean(stress) && !combinedStress);
  if (
    card.verification.unverified ||
    card.rules?.effect !== "damage" ||
    labels.get("Crit") !== review.critical.threshold ||
    labels.get("Acc") !== review.hit.threshold ||
    number("Crit") !== review.critical.damage ||
    number("Acc") !== review.hit.damage ||
    !validRange ||
    card.rules.targets?.monster !== review.monsterTargets ||
    card.rules.targets.hero !== 0 ||
    card.rules.targets.heroOrMonster !== 0 ||
    card.top_row_icons.map(({ key }) => key).join() !==
      (form ? ["text_plate", ...printedStances] : printedStances).join() ||
    card.effect_lines.some((line) =>
      line.some(
        (part) =>
          part.type === "icon" &&
          part.icon.naming !== "confirmed" &&
          part.icon.naming !== "confirmed_rulebook",
      ),
    ) ||
    printedEffects.length !== expectedEffects.size ||
    expectedEffects.size !== effectLineCount ||
    printedEffects.some((line, index) => line !== expectedEffects.get(index)) ||
    (review.selfWound !== undefined &&
      !card.unlabeled_numbers.some(
        ({ numeric, anchor }) =>
          numeric === review.selfWound &&
          anchor.type === "beside_icon" &&
          anchor.left_icon === null &&
          anchor.inside_icon === null,
      )) ||
    (shuffle !== undefined &&
      (shuffles.length !== 1 || shuffle.scope !== "self" || shuffle.lineIndex !== 0 || !move)) ||
    card.rules.damageBonuses !== undefined ||
    (bonus !== undefined &&
      (bonus.condition !== "unholy" ||
        bonus.lineIndex !== Number(Boolean(move)) ||
        effects.length !== 0))
  ) {
    throw new Error(card.id + " 效果词条与已核卡面不符（R-048）");
  }
  const directAttack = directAttackSchema.parse({
    ...review,
    onHit,
    ...(onUse.length ? { onUse } : {}),
    ...(heal ? { selfHeal: heal.amount, combinedHealMarker: true } : {}),
    ...(stress ? { selfStress: stress.amount } : {}),
    ...(form?.requiredForm ? { requiredForm: form.requiredForm } : {}),
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
