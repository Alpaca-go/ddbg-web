import {
  WEALD_MONSTER_ATTACKS,
  WEALD_RANGE_ICON_ID,
  wealdEffectSignatures,
} from "./monster-rulings";
import { WEALD_MONSTER_PROFILES } from "./monster-profiles";
import type { NormalizedMonsterMediumCard } from "../../shared/schema";

/** R-230、R-232：附加核准语义；原始图标命名状态保持原状。 */
export function attachVerifiedWealdMonster(
  card: NormalizedMonsterMediumCard,
): NormalizedMonsterMediumCard {
  if (!("skills" in card)) return card;
  const profile = WEALD_MONSTER_PROFILES.find((entry) => entry.cardId === card.id);
  const attacks = WEALD_MONSTER_ATTACKS.filter((entry) => entry.cardId === card.id);
  if (
    !profile ||
    card.name !== profile.name ||
    card.level !== 1 ||
    card.life !== profile.life ||
    JSON.stringify(card.pages) !== JSON.stringify(profile.pages) ||
    card.resistances.length !== 1 ||
    card.resistances[0]?.iconId !== profile.resistanceIcon ||
    card.immunities.length !== 0 ||
    card.skills.length !== attacks.length
  )
    throw new Error(`Weald R-230 卡身份不符：${card.id}`);
  return {
    ...card,
    rules: { ...card.rules, wealdProfile: profile },
    dodge: profile.dodge,
    speed: profile.speed,
    stanceGroups: profile.stanceGroups,
    skills: card.skills.map((skill) => {
      const entry = attacks.find((entry) => entry.slot === skill.slot);
      const number = (label: string) =>
        skill.unlabeled_numbers.find(
          (n) => n.anchor.type === "printed_label" && n.anchor.label === label,
        )?.numeric;
      const ranges = skill.unlabeled_numbers.filter(
        (n) =>
          n.anchor.type === "beside_icon" &&
          n.anchor.left_icon?.iconId === WEALD_RANGE_ICON_ID &&
          n.anchor.inside_icon === null,
      );
      if (
        !entry ||
        entry.name !== skill.name ||
        skill.printed_labels.find((label) => label.label === "Crit")?.value !== entry.crit ||
        skill.printed_labels.find((label) => label.label === "Acc")?.value !== entry.acc ||
        number("Crit") !== entry.criticalDamage ||
        number("Acc") !== entry.damage ||
        ranges.length !== 1 ||
        ranges[0]?.numeric !== entry.range ||
        skill.target?.replace(/\s+/g, "") !== entry.target.replace(/\s+/g, "") ||
        JSON.stringify(wealdEffectSignatures(skill.effect_lines)) !==
          JSON.stringify(entry.effectSignatures)
      )
        throw new Error(`Weald R-230 技能卡面漂移：${card.id} / ${skill.slot}`);
      return {
        ...skill,
        target: entry.target,
        rules: { ...skill.rules, wealdAttack: entry },
      };
    }),
  };
}
