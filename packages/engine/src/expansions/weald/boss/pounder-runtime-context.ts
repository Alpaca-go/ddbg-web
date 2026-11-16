import { WEALD_POUNDER_HIGHER_CONTENT as higher } from "./pounder-higher-content";
import corePool from "../../../../../data/normalized/corebox/monster_pool.json";
import coreMedium from "../../../../../data/normalized/corebox/monster_medium.json";
import coreLarge from "../../../../../data/normalized/corebox/monster_large.json";
import type { GameState } from "../../../command";
import type { MonsterCardView } from "../../../monster-skill";
import { bossEnabledForPacks } from "../../../../../data/src/content-packs";
import { WEALD_POUNDER_I_CONTENT as ordinary } from "./pounder-i-data";
import { projectPounderCombatFaces } from "./pounder-i-projection";
import { resolveEncounterBossScriptId } from "../../../boss/encounter-rules";

export function pounderContextForLevel(level: 1 | 2 | 3) {
  const card = level === 1 ? ordinary : higher.cards.find((c) => c.level === level)!;
  const companionId =
    level === 1
      ? ordinary.abilities.reinforcements.fusilierCardId
      : higher.cards.find((c) => c.level === level)!.abilities.reinforcements.companionCardId;
  const companions = level === 1 ? 2 : level === 2 ? 1 : 2;
  const source = corePool.cards.find((c) => c.combatCardId === companionId)!;
  const companion = [...coreMedium.cards, ...coreLarge.cards].find(
    (c) => c.id === companionId,
  )! as MonsterCardView;
  if (
    !source ||
    !companion ||
    companion.verification.unverified ||
    source.pages.length < companions ||
    ![1, 2].includes(source.stanceSlots)
  )
    throw new Error("Pounder 缺少真实核心增援来源");
  return {
    level,
    scriptId: `boss:weald:brigandPounder:${level}` as const,
    pounderCardId: card.faces[0].rawId,
    matchmanCardId: card.faces[1].rawId,
    description: card.abilities.descriptionCardId,
    ability: card.abilities.combatCardId,
    faces: card.faces,
    catalog: projectPounderCombatFaces(card.faces),
    companion,
    companionCardId: companionId,
    companions,
    companionSize: source.stanceSlots as 1 | 2,
    threats: card.abilities.threats,
  };
}
export function readPounderRuntimeContext(state: GameState) {
  const d = state.dungeon;
  const level = d?.campaignLevel;
  if (
    !d ||
    (level !== 1 && level !== 2 && level !== 3) ||
    d.phase !== "inBattle" ||
    !["standard", "radiant"].includes(d.mode)
  )
    return null;
  const context = pounderContextForLevel(level);
  if (level === 1) return resolveEncounterBossScriptId(state) === context.scriptId ? context : null;
  if (
    !d.wealdHigherBosses ||
    !d.pounderBossBattles ||
    !d.pounderDungeonThreats ||
    !d.pounderHamletThreats ||
    !d.contentPacks?.includes("weald") ||
    !bossEnabledForPacks(d.contentPacks, context.scriptId) ||
    d.activeBossThreatScriptId !== context.scriptId ||
    d.imminentThreatDescriptionCardId !== context.description
  )
    return null;
  return context.catalog.every((expected) =>
    state.battle?.monsters?.some((c) => JSON.stringify(c) === JSON.stringify(expected)),
  )
    ? context
    : null;
}
