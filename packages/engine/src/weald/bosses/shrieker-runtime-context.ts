import type { GameState } from "../../shared/core/command";
import { WEALD_SHRIEKER_I_CONTENT as base } from "./shrieker-i-content";
import { WEALD_SHRIEKER_HIGHER_CONTENT as higher } from "./shrieker-higher-content";
import { projectShriekerCombatFaces } from "./shrieker-i-projection";
import { isCampaignExpeditionMode } from "../../shared/hamlet/campaign-expedition-mode";
export function shriekerContextForLevel(level: 1 | 2 | 3) {
  const card = level === 1 ? base : higher.cards.find((c) => c.level === level)!;
  return {
    level,
    scriptId: `boss:weald:shrieker:${level}` as const,
    faces: card.faces,
    abilities: card.abilities,
    catalog: (nestInPlay: boolean) =>
      projectShriekerCombatFaces(
        card.faces,
        { nestInPlay, nestFlightApproved: true },
        card.abilities.callTheMurder.printedHeal,
      ),
  };
}
export function readShriekerRuntimeContext(state: GameState) {
  const d = state.dungeon,
    level = d?.campaignLevel;
  if (!d || (level !== 1 && level !== 2 && level !== 3) || !d.contentPacks?.includes("weald"))
    return null;
  const context = shriekerContextForLevel(level);
  if (d.activeBossThreatScriptId !== context.scriptId) return null;
  if (
    level > 1 &&
    (!d.wealdHigherBosses ||
      !d.shriekerBossBattles ||
      !isCampaignExpeditionMode(d.mode) ||
      d.imminentThreatDescriptionCardId !== context.abilities.descriptionCardId)
  )
    return null;
  return context;
}
