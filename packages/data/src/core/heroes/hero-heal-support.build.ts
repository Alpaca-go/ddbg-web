import { healSupportSchema } from "../../shared/effects";
import type { NormalizedHeroSkillCard } from "../../shared/schema";
import { HERO_ANNOTATIONS } from "./annotations";
import { lineSignature } from "./annotations/shared";
import type { HealSupportEntry } from "./annotations/types";

type ReviewedHeal = Omit<HealSupportEntry, "id" | "name">;

const compactEffect = (text: string) => text.replace(/[\s,]+/g, "");

const STANCES = ["support", "ranged", "defensive", "aggressive"] as const;

function hasRangeSelf(card: NormalizedHeroSkillCard): boolean {
  const isSelf = (line: NormalizedHeroSkillCard["stats_line"]) =>
    !!line &&
    compactEffect(lineSignature(line)).startsWith("{range}Self") &&
    line.every(
      (part) =>
        part.type === "text" ||
        part.icon.naming === "confirmed" ||
        part.icon.naming === "confirmed_rulebook",
    );
  if (isSelf(card.stats_line)) return true;
  return card.effect_lines.some((line) => isSelf(line));
}

function attachHealSupport(
  card: NormalizedHeroSkillCard,
  review: ReviewedHeal,
): NormalizedHeroSkillCard {
  const labels = new Map(card.printed_labels.map(({ label, value }) => [label, value]));
  const number = (label: string) =>
    card.unlabeled_numbers.find(
      (entry) => entry.anchor.type === "printed_label" && entry.anchor.label === label,
    )?.numeric;
  const ranges = card.unlabeled_numbers.filter(
    ({ anchor }) =>
      anchor.type === "beside_icon" &&
      anchor.left_icon?.key === "range" &&
      anchor.inside_icon === null,
  );
  const [range] = ranges;
  const interval = card.rules?.range;
  const validRange = review.selfRange
    ? hasRangeSelf(card)
    : review.rangeMinimum === undefined
      ? ranges.length === 1 && !interval && range?.numeric === review.range
      : interval?.min === review.rangeMinimum &&
        interval.max === review.range &&
        range?.numeric === null &&
        range.text === `${review.rangeMinimum}-${review.range}`;
  const printedStances = STANCES.map(
    (stance) => "stance_" + stance + (review.stances.includes(stance) ? "_lit" : "_unlit"),
  );
  const topKeys = card.top_row_icons
    .filter(({ key }) => key !== "text_plate")
    .map(({ key }) => key);
  const selfHeal = card.rules?.self?.heal;
  const selfStress = card.rules?.self?.stress;
  const pairedSelf = Boolean(selfHeal && selfStress);
  const support = card.rules?.target?.support;
  const targetHealRule = card.rules?.target?.heal;
  const targetStressRule = card.rules?.target?.stress;
  const effects = card.rules?.statuses ?? [];
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
  const removal = (card.rules?.removal ?? []).map(({ scope, kinds }) => ({ scope, kinds }));
  const namedIcon = (part: { type: string; icon?: { naming: string } }) =>
    part.type === "text" ||
    part.icon?.naming === "confirmed" ||
    part.icon?.naming === "confirmed_rulebook";
  const hasCombined =
    card.stats_line?.some(
      (part) => part.type === "icon" && part.icon.key === "damage_or_heal_combined_marker",
    ) ||
    card.effect_lines.some((line) =>
      line.some(
        (part) => part.type === "icon" && part.icon.key === "damage_or_heal_combined_marker",
      ),
    );
  if (
    card.verification.unverified ||
    !validRange ||
    (review.selfRange
      ? card.rules?.targets?.monster !== 0 && card.rules?.targets !== undefined
      : false) ||
    (!review.selfRange &&
      card.rules?.targets !== undefined &&
      (card.rules.targets.hero !== review.heroTargets ||
        card.rules.targets.monster !== 0 ||
        card.rules.targets.heroOrMonster !== 0)) ||
    (review.effect !== undefined && card.rules?.effect !== review.effect) ||
    (review.effect === undefined && card.rules?.effect !== undefined) ||
    (review.hit ? labels.get("Acc") !== review.hit.threshold : labels.has("Acc")) ||
    (review.critical ? labels.get("Crit") !== review.critical.threshold : labels.has("Crit")) ||
    (review.hit?.heal !== undefined ? number("Acc") !== review.hit.heal : number("Acc") != null) ||
    (review.critical?.heal !== undefined
      ? number("Crit") !== review.critical.heal
      : number("Crit") != null) ||
    topKeys.join() !== printedStances.join() ||
    card.effect_lines.some((line) => !line.every(namedIcon)) ||
    (card.stats_line !== null && !card.stats_line.every(namedIcon))
  ) {
    throw new Error(card.id + " 效果词条与已核卡面不符（R-048）");
  }
  const packed = healSupportSchema.parse({
    ...review,
    ...(pairedSelf
      ? { selfHealStress: { heal: selfHeal!.amount, stress: selfStress!.amount } }
      : {
          ...(selfHeal && isPureSelfHealLine(card.effect_lines[selfHeal.lineIndex], selfHeal.amount)
            ? { selfHeal: selfHeal.amount }
            : {}),
          ...(selfStress ? { selfStress: selfStress.amount } : {}),
        }),
    ...(support
      ? {
          targetHeal: support.heal,
          targetStress: support.stress,
          ...(support.light !== undefined ? { targetLight: support.light } : {}),
        }
      : {
          ...(targetHealRule ? { targetHeal: targetHealRule.amount } : {}),
          ...(targetStressRule ? { targetStress: targetStressRule.amount } : {}),
        }),
    ...(hasCombined ? { combinedHealMarker: true } : {}),
    ...(onHit.length ? { onHit } : {}),
    ...(onUse.length ? { onUse } : {}),
    ...(removal.length ? { removal } : {}),
  });
  return { ...card, rules: { ...card.rules, healSupport: packed } };
}

/** R-048：逐英雄规则必须唯一命中所属英雄的 canonical 卡牌。 */
export function applyHealSupport(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  if (cardsById.size !== cards.length) throw new Error("技能目录存在重复 ID（R-048）");
  const reviewedById = new Map<string, ReviewedHeal>();
  for (const { hero, entries } of HERO_ANNOTATIONS) {
    for (const { id, name, ...review } of entries.healSupport ?? []) {
      const card = cardsById.get(id);
      if (card?.hero !== hero || card.name !== name || reviewedById.has(id))
        throw new Error(`${id} 治疗减压注解归属不符、缺卡或重复（R-048）`);
      reviewedById.set(id, review);
    }
  }
  return cards.map((card) => {
    const review = reviewedById.get(card.id);
    return review ? attachHealSupport(card, review) : card;
  });
}
function isPureSelfHealLine(
  line:
    | readonly { type: string; text?: string; icon?: { key: string | null; naming: string } }[]
    | undefined,
  amount: number,
): boolean {
  if (!line) return false;
  let self = 0;
  let heal = 0;
  let marker = 0;
  let sawAmount = false;
  let sawSelfWord = false;
  for (const segment of line) {
    if (segment.type === "text") {
      const text = segment.text?.trim() ?? "";
      if (text === "") continue;
      if (text === "Self") {
        sawSelfWord = true;
        continue;
      }
      if (/^\d+$/.test(text) && Number(text) === amount) {
        sawAmount = true;
        continue;
      }
      return false;
    }
    const key = segment.icon?.key;
    const naming = segment.icon?.naming;
    if (naming !== "confirmed" && naming !== "confirmed_rulebook") return false;
    if (key === "self_effects") {
      self += 1;
      continue;
    }
    if (key === "heal") {
      heal += 1;
      continue;
    }
    if (key === "damage_or_heal_combined_marker") {
      marker += 1;
      continue;
    }
    return false;
  }
  return self === 1 && heal === 1 && marker <= 1 && sawAmount && sawSelfWord;
}
