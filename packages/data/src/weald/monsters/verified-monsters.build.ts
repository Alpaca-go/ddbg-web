import { WEALD_ATTACK_SIGNATURES } from "./monster-attack-print.build";
import { WEALD_MONSTER_ATTACK_RULES } from "./monster-rulings";
import { matchesWealdAttackPrint, matchesWealdDefencePrint } from "./monster-print";
import { WEALD_MONSTER_PROFILES } from "./monster-profiles";
import type { NormalizedMonsterMediumCard } from "../../shared/schema";

/** R-230、R-232：附加核准语义；原始图标命名状态保持原状。 */
export function attachVerifiedWealdMonster(
  card: NormalizedMonsterMediumCard,
): NormalizedMonsterMediumCard {
  if (!("skills" in card)) return card;
  const profile = WEALD_MONSTER_PROFILES.find((entry) => entry.cardId === card.id);
  const attacks = WEALD_MONSTER_ATTACK_RULES.filter((entry) => entry.cardId === card.id);
  if (
    !profile ||
    card.name !== profile.name ||
    card.level !== 1 ||
    card.life !== profile.life ||
    JSON.stringify(card.pages) !== JSON.stringify(profile.pages) ||
    !matchesWealdDefencePrint(card, profile) ||
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
      const rule = attacks.find((entry) => entry.slot === skill.slot);
      const signature = WEALD_ATTACK_SIGNATURES[card.id + ":" + skill.slot];
      const entry = rule && { ...rule, effectSignatures: signature ? [signature] : [] };
      if (!entry || !matchesWealdAttackPrint(skill, entry))
        throw new Error(`Weald R-230 技能卡面漂移：${card.id} / ${skill.slot}`);
      return {
        ...skill,
        target: entry.target,
        rules: { ...skill.rules, wealdAttack: entry },
      };
    }),
  };
}
