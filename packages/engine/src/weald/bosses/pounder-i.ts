import { getBossScript, registerBossScript } from "../../boss/registry";
import { defaultFaceTheThreatEmbarkHook } from "../../boss/default-boss-hooks";
import { DEFAULT_BOSS_BATTLE_RULES } from "../../boss/rules";
import type { BossScriptDefinition } from "../../boss/types";
import { WEALD_POUNDER_I_CONTENT as content } from "./pounder-i-data";

export const POUNDER_I_SCRIPT_ID = "boss:weald:brigandPounder:1" as const;

/** R-258／R-259：显式注册用，尚未加入战役自动注册／正式出征入口。 */
export const pounderIBossScript: BossScriptDefinition = {
  id: POUNDER_I_SCRIPT_ID,
  displayName: "Brigand Pounder I",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes:
    "两段威胁、增援、炮击、显式部署与清场已接；战后交接与显式版本出征已接；怪物回合与失败日志已接；网页与受伤饰品窗口已接；压力待选和自然胜利验收仍 hold。",
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
    // 出征须显式版本；部署与召唤使用独立公开命令。
    faceTheThreatEmbark: (ctx) =>
      ctx.pounderBossBattles &&
      ctx.campaignLevel === 1 &&
      ctx.imminentThreatDescriptionCardId === content.abilities.descriptionCardId
        ? defaultFaceTheThreatEmbarkHook(ctx)
        : { status: "stub", message: "Pounder I 正式出征尚未接入" },
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
