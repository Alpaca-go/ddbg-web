import { getBossScript, registerBossScript } from "../../../boss/registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "../../../boss/rules";
import type { BossScriptDefinition } from "../../../boss/types";
import { WEALD_POUNDER_I_CONTENT as content } from "./pounder-i-content";

export const POUNDER_I_SCRIPT_ID = "boss:weald:brigandPounder:1" as const;

/** R-258／R-259：显式注册用，尚未加入战役自动注册／正式出征入口。 */
export const pounderIBossScript: BossScriptDefinition = {
  id: POUNDER_I_SCRIPT_ID,
  displayName: "Brigand Pounder I",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes: "两段威胁、增援、炮击、显式部署与清场已接；战后交接已接；自然出征和完整回放仍 hold。",
  combatEntry: {
    descriptionAbilityCardId: content.abilities.descriptionCardId,
    combatAbilityCardId: content.abilities.combatCardId,
    combatMonsterCardId: content.faces[0].rawId,
    printedInitiativeCards: content.setup.monsterInitiativeCards,
    printedActionsPerRound: content.abilities.actionsPerRound,
  },
  hooks: {
    threatPassiveDungeon: () => ({
      status: "ok",
      effect: "buffRiposteOnMonsterRangedEntry",
      buffTurns: content.abilities.threats.dungeon.buffDuration,
      riposteTurns: content.abilities.threats.dungeon.riposteDuration,
      sourceAbilityCardId: content.abilities.combatCardId,
      rulesRef: ["R-259", "Weald W4", content.abilities.combatCardId],
    }),
    threatPassiveHamlet: () => ({
      status: "ok",
      effect: "bombardmentAtHamletDayEnd",
      damage: content.abilities.threats.hamlet.heroDamage,
      caretakerPreventsAll: true,
      sourceAbilityCardId: content.abilities.combatCardId,
      rulesRef: ["R-259", "R33", content.abilities.combatCardId],
    }),
    // 不用通用出征／部署钩子把尚未实现的战斗伪装成可用。
    faceTheThreatEmbark: () => ({ status: "stub", message: "Pounder I 正式出征尚未接入" }),
    bossSlotPlacement: () => ({
      status: "stub",
      message: "Pounder I 正式部署钩子尚未接入；部署使用显式命令",
    }),
    summon: () => ({ status: "stub", message: "Pounder I 正式召唤钩子尚未接入；增援使用显式命令" }),
  },
};

export function ensurePounderIBossScriptRegistered(): void {
  if (!getBossScript(POUNDER_I_SCRIPT_ID)) registerBossScript(pounderIBossScript);
}
