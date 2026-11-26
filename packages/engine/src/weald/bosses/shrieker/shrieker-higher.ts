import { WEALD_SHRIEKER_HIGHER_CONTENT } from "./shrieker-higher-content";
import { DEFAULT_BOSS_BATTLE_RULES } from "../../../core/bosses/rules";
import { defaultFaceTheThreatEmbarkHook } from "../../../core/bosses/default-boss-hooks";
import { getBossScript, registerBossScript } from "../../../core/bosses/registry";
import type { BossScriptDefinition } from "../../../core/bosses/types";

const scripts: BossScriptDefinition[] = WEALD_SHRIEKER_HIGHER_CONTENT.cards.map(
  (card): BossScriptDefinition => ({
    id: `boss:weald:shrieker:${card.level}`,
    displayName: `Shrieker ${card.level === 2 ? "II" : "III"}`,
    rules: DEFAULT_BOSS_BATTLE_RULES,
    combatEntry: {
      descriptionAbilityCardId: card.abilities.descriptionCardId,
      combatAbilityCardId: card.abilities.combatCardId,
      combatMonsterCardId: card.faces[0].rawId,
      printedInitiativeCards: 3,
      printedActionsPerRound: 3,
    },
    hooks: {
      monsterTurnActionCount: () => ({ status: "ok", value: 3 }),
      threatPassiveDungeon: () => ({
        status: "ok",
        effect: "shriekerProvisionTheft",
        sourceAbilityCardId: card.abilities.combatCardId,
        rulesRef: ["W3", "R-262", "R-268"],
      }),
      threatPassiveHamlet: () => ({
        status: "ok",
        effect: "shriekerReserveTheft",
        sourceAbilityCardId: card.abilities.combatCardId,
        rulesRef: ["W3", "R-268"],
      }),
      faceTheThreatEmbark: (ctx) =>
        ctx.wealdHigherBosses && ctx.shriekerBossBattles && ctx.campaignLevel === card.level
          ? defaultFaceTheThreatEmbarkHook(ctx)
          : { status: "stub", message: "高等级 Shrieker 需要显式版本与同级威胁" },
    },
  }),
);
export function ensureShriekerHigherScriptsRegistered() {
  for (const script of scripts) if (!getBossScript(script.id)) registerBossScript(script);
}
