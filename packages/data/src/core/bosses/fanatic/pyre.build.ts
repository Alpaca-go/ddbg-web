import type { NormalizedMonsterLargeCard } from "../../../shared/schema";
import { BURN_THE_HERETIC, isPyreCard } from "./pyre";

export function verifyPyrePrint(card: NormalizedMonsterLargeCard): NormalizedMonsterLargeCard {
  if (!isPyreCard(card.id)) return card;
  const rule = BURN_THE_HERETIC;
  const skill = card.skills[0];
  const signature = skill?.effect_lines.map((line) =>
    line
      .map((segment) => (segment.type === "text" ? segment.text : `{${segment.icon.key}}`))
      .join("")
      .replace(/\s+/g, ""),
  );
  const ranges = skill?.unlabeled_numbers.filter(
    ({ anchor }) =>
      anchor.type === "beside_icon" &&
      anchor.left_icon?.key === "range" &&
      anchor.inside_icon === null,
  );
  if (
    card.verification.unverified ||
    card.skills.length !== 1 ||
    skill?.slot !== rule.slot ||
    skill.name !== rule.name ||
    skill.target !== rule.target ||
    skill.printed_labels.length !== 0 ||
    ranges?.length !== 1 ||
    ranges[0]?.numeric !== rule.range ||
    skill.lines
      .flat()
      .filter((segment) => segment.type === "icon" && segment.icon.key === "target_hero").length !==
      rule.heroTargets ||
    signature?.length !== 1 ||
    signature[0] !== `{damage}${rule.damage}`
  )
    throw new Error(card.id + " Pyre 印刷效果与 R-136 不符");
  return card;
}
