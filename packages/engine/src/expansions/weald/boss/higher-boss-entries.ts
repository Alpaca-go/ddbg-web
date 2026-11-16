import { WEALD_SHRIEKER_HIGHER_CONTENT } from "./shrieker-higher-content";
import hagPrinted from "../../../../../data/normalized/extension/weald/hag_higher.json";
import { wealdHagHigherContentSchema } from "../../../../../data/src/weald-hag-higher";
import { WEALD_POUNDER_HIGHER_CONTENT } from "./pounder-higher-content";
const hag = wealdHagHigherContentSchema.parse(hagPrinted);
/** 真正接过目录的角色才有引用；与注册表和旧日志版本权限分开。 */
export const WEALD_HIGHER_BOSS_ENTRIES = [
  ...WEALD_SHRIEKER_HIGHER_CONTENT.cards.map((c) => ({
    scriptId: `boss:weald:shrieker:${c.level}` as const,
    descriptionAbilityCardId: c.abilities.descriptionCardId,
    combatAbilityCardId: c.abilities.combatCardId,
    combatMonsterCardId: c.faces[0].rawId,
    printedInitiativeCards: 3,
    printedActionsPerRound: 3,
  })),
  ...hag.cards.map((c) => ({
    scriptId: `boss:weald:hag:${c.level}` as const,
    descriptionAbilityCardId: c.abilities.descriptionCardId,
    combatAbilityCardId: c.abilities.hagCardId,
    combatMonsterCardId: c.faces[0]!.rawId,
    printedInitiativeCards: 2,
    printedActionsPerRound: 2,
  })),
  ...WEALD_POUNDER_HIGHER_CONTENT.cards.map((c) => ({
    scriptId: `boss:weald:brigandPounder:${c.level}` as const,
    descriptionAbilityCardId: c.abilities.descriptionCardId,
    combatAbilityCardId: c.abilities.combatCardId,
    combatMonsterCardId: c.faces[0].rawId,
    printedInitiativeCards: 1,
    printedActionsPerRound: 1,
  })),
];
