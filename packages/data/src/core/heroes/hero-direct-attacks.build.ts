import { directAttackSchema } from "../../shared/effects";
import type { NormalizedHeroSkillCard } from "../../shared/schema";

/** If It Bleeds I–III，技能正面 p031–033。效果按规则书 R19–21、R-018 结算。 */
const IF_IT_BLEEDS: Readonly<
  Partial<
    Record<
      string,
      { accuracy: number; hit: number; critical: number; amount: number; duration: number }
    >
  >
> = {
  "hero_skill:core:h02:p031": { accuracy: 9, hit: 5, critical: 8, amount: 2, duration: 2 },
  "hero_skill:core:h02:p032": { accuracy: 10, hit: 6, critical: 11, amount: 3, duration: 3 },
  "hero_skill:core:h02:p033": { accuracy: 10, hit: 8, critical: 15, amount: 4, duration: 3 },
};

export function attachDirectHeroAttack(card: NormalizedHeroSkillCard): NormalizedHeroSkillCard {
  const review = IF_IT_BLEEDS[card.id];
  if (!review) return card;
  const stances = ["ranged", "defensive", "aggressive"] as const;
  const labels = new Map(card.printed_labels.map(({ label, value }) => [label, value]));
  const number = (label: string) =>
    card.unlabeled_numbers.find(
      (entry) => entry.anchor.type === "printed_label" && entry.anchor.label === label,
    )?.numeric;
  const effects = card.rules?.statuses;
  const printedEffect = card.effect_lines[0]
    ?.map((segment) => (segment.type === "text" ? segment.text : `{${segment.icon.key}}`))
    .join("")
    .replace(/\s+/g, "");
  if (
    card.verification.unverified ||
    card.rules?.effect !== "damage" ||
    labels.get("Crit") !== 0 ||
    labels.get("Acc") !== review.accuracy ||
    number("Crit") !== review.critical ||
    number("Acc") !== review.hit ||
    !card.unlabeled_numbers.some(
      (entry) =>
        entry.numeric === 1 &&
        entry.anchor.type === "beside_icon" &&
        entry.anchor.left_icon?.key === "range",
    ) ||
    card.rules.targets?.monster !== 1 ||
    card.rules.targets.hero !== 0 ||
    card.rules.targets.heroOrMonster !== 0 ||
    card.top_row_icons.map(({ key }) => key).join() !==
      ["stance_support_unlit", ...stances.map((stance) => "stance_" + stance + "_lit")].join() ||
    card.effect_lines.length !== 1 ||
    printedEffect !== `{target_effects}${review.amount}{bleed}${review.duration}t` ||
    effects?.length !== 1 ||
    effects[0]?.scope !== "target" ||
    effects[0].kind !== "bleed" ||
    effects[0].amount !== review.amount ||
    effects[0].duration !== review.duration
  ) {
    throw new Error(card.id + " 效果词条与已核卡面不符（R-048）");
  }
  const directAttack = directAttackSchema.parse({
    stances,
    range: 1,
    monsterTargets: 1,
    hit: { threshold: review.accuracy, damage: review.hit },
    critical: { threshold: 0, damage: review.critical },
    onHit: [{ kind: "bleed", amount: review.amount, duration: review.duration }],
  });
  return { ...card, rules: { ...card.rules, directAttack } };
}
