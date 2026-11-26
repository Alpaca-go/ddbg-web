import { getBossScript, registerBossScript } from "../../../core/bosses/registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "../../../core/bosses/rules";
import type { BossScriptDefinition } from "../../../core/bosses/types";
import {
  SHRIEKER_I_SCRIPT_ID,
  SHRIEKER_I_DEPLOYMENT_ENTRY,
  WEALD_SHRIEKER_I_CONTENT as content,
} from "./shrieker-i-content";

export const shriekerIBossScript: BossScriptDefinition = {
  id: SHRIEKER_I_SCRIPT_ID,
  displayName: "Shrieker I",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  combatEntry: SHRIEKER_I_DEPLOYMENT_ENTRY,
  notes: "W3／R-261／R-262：三行动；Nest 无主动回合；飞行治疗与补给威胁。",
  hooks: {
    threatPassiveDungeon: () => ({
      status: "ok",
      effect: "shriekerProvisionTheft",
      sourceAbilityCardId: content.abilities.combatCardId,
      rulesRef: ["R-261", "R-262"],
    }),
    threatPassiveHamlet: () => ({
      status: "ok",
      effect: "shriekerReserveTheft",
      sourceAbilityCardId: content.abilities.combatCardId,
      rulesRef: ["R-261"],
    }),
    faceTheThreatEmbark: (ctx) =>
      ctx.questId === "quest:p019" &&
      ctx.scriptId === SHRIEKER_I_SCRIPT_ID &&
      ctx.activeBossThreatScriptId === SHRIEKER_I_SCRIPT_ID &&
      ctx.shriekerBossBattles &&
      ctx.campaignLevel === 1 &&
      ctx.imminentThreatDescriptionCardId === content.abilities.descriptionCardId
        ? {
            status: "ok",
            value: {
              resolvedScriptId: SHRIEKER_I_SCRIPT_ID,
              questId: "quest:p019",
              combatEntry: SHRIEKER_I_DEPLOYMENT_ENTRY,
              rulesRef: ["W3", "R30", "R-261", "R-262"],
              wiringHold: "R30 边缘房由正式出征入口布置",
            },
          }
        : { status: "stub", message: "Shrieker I 需要显式运行时版本与实际威胁" },
    monsterTurnActionCount: () => ({ status: "ok", value: 3 }),
  },
};
export function ensureShriekerIBossScriptRegistered(): void {
  if (!getBossScript(SHRIEKER_I_SCRIPT_ID)) registerBossScript(shriekerIBossScript);
}
