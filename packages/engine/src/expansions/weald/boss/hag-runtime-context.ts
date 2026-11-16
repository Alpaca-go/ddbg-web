import type { GameState } from "../../../command";
import { resolveEncounterBossScriptId } from "../../../boss/encounter-rules";
import {
  HAG_I_SCRIPT_ID,
  HAG_I_COMBAT_MONSTER_CARD_ID,
  HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
  HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
} from "./hag-i";
import { buildHagICombatCatalog } from "./hag-i-projection";
import { hagHigherContext } from "./hag-higher";
import type { HagCaptiveContext } from "./hag-i-captive";

/** 独立高等级战斗接线；不放宽 Face the Threat 正式出征准入。 */
export function readHagRuntimeContext(state: GameState): HagCaptiveContext | null {
  if (resolveEncounterBossScriptId(state) === HAG_I_SCRIPT_ID)
    return {
      scriptId: HAG_I_SCRIPT_ID,
      matchesEncounter: (s) => resolveEncounterBossScriptId(s) === HAG_I_SCRIPT_ID,
      hagId: HAG_I_COMBAT_MONSTER_CARD_ID,
      emptyId: HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
      fullId: HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
      catalog: buildHagICombatCatalog(),
    };
  const active = state.dungeon?.activeBossThreatScriptId;
  const level = active === "boss:weald:hag:2" ? 2 : active === "boss:weald:hag:3" ? 3 : null;
  if (!level) return null;
  const context = hagHigherContext(level);
  if (!context.matchesEncounter(state)) return null;
  return context.catalog.every((expected) =>
    state.battle?.monsters?.some((card) => JSON.stringify(card) === JSON.stringify(expected)),
  )
    ? context
    : null;
}
