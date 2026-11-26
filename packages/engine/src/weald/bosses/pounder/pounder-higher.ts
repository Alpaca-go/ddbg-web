import { WEALD_POUNDER_HIGHER_CONTENT } from "./pounder-higher-content";
import { DEFAULT_BOSS_BATTLE_RULES } from "../../../core/bosses/rules";
import { defaultFaceTheThreatEmbarkHook } from "../../../core/bosses/default-boss-hooks";
import { getBossScript, registerBossScript } from "../../../core/bosses/registry";
import type { BossScriptDefinition } from "../../../core/bosses/types";

const scripts: BossScriptDefinition[] = WEALD_POUNDER_HIGHER_CONTENT.cards.map(
  (card): BossScriptDefinition => ({
    id: `boss:weald:brigandPounder:${card.level}`,
    displayName: `Brigand Pounder ${card.level === 2 ? "II" : "III"}`,
    rules: DEFAULT_BOSS_BATTLE_RULES,
    combatEntry: {
      descriptionAbilityCardId: card.abilities.descriptionCardId,
      combatAbilityCardId: card.abilities.combatCardId,
      combatMonsterCardId: card.faces[0].rawId,
      printedInitiativeCards: 1,
      printedActionsPerRound: 1,
    },
    hooks: {
      threatPassiveDungeon: () => ({
        status: "ok",
        effect: "buffRiposteOnMonsterRangedEntry",
        buffTurns: card.abilities.threats.dungeon.buffDuration,
        riposteTurns: card.abilities.threats.dungeon.riposteDuration,
        sourceAbilityCardId: card.abilities.combatCardId,
        rulesRef: ["R-268", "Weald W4"],
      }),
      threatPassiveHamlet: () => ({
        status: "ok",
        effect: "bombardmentAtHamletDayEnd",
        damage: card.abilities.threats.hamlet.heroDamage,
        caretakerPreventsAll: true,
        sourceAbilityCardId: card.abilities.combatCardId,
        rulesRef: ["R-268", "Weald W4"],
      }),
      faceTheThreatEmbark: (ctx) =>
        ctx.wealdHigherBosses && ctx.pounderBossBattles && ctx.campaignLevel === card.level
          ? defaultFaceTheThreatEmbarkHook(ctx)
          : { status: "stub", message: "高等级 Pounder 需要显式版本与同级威胁" },
    },
  }),
);
export function ensurePounderHigherScriptsRegistered() {
  for (const script of scripts) if (!getBossScript(script.id)) registerBossScript(script);
}
