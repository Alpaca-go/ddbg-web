import printed from "../../../../data/normalized/extension/weald/shrieker_i.json";
import { wealdShriekerContentSchema } from "../../../../data/src/weald/bosses/shrieker/weald-shrieker";
/** 叶模块：只解析核准数据，不加载战斗／注册器，避免初始化循环。 */
export const WEALD_SHRIEKER_I_CONTENT = wealdShriekerContentSchema.parse(printed);
export const SHRIEKER_I_SCRIPT_ID = "boss:weald:shrieker:1" as const;
export const SHRIEKER_I_DEPLOYMENT_ENTRY = {
  descriptionAbilityCardId: WEALD_SHRIEKER_I_CONTENT.abilities.descriptionCardId,
  combatAbilityCardId: WEALD_SHRIEKER_I_CONTENT.abilities.combatCardId,
  combatMonsterCardId: WEALD_SHRIEKER_I_CONTENT.faces[0]!.rawId,
  printedInitiativeCards: WEALD_SHRIEKER_I_CONTENT.setup.monsterInitiativeCards,
  printedActionsPerRound: WEALD_SHRIEKER_I_CONTENT.abilities.actionsPerRound,
};
