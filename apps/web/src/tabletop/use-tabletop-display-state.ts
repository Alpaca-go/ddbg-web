import { useMemo } from "react";
import type { GameState } from "@ddbg/engine";
import type { TabletopWorldAdaptation } from "./phase/adapt-game-state-to-tabletop-world";
import type { TabletopState } from "./tabletop-types";

export function mergeTabletopDisplayState(
  base: TabletopState,
  engineGame: GameState | null,
  worldPatch: TabletopWorldAdaptation | null,
): TabletopState {
  if (!engineGame || !worldPatch) return base;
  return {
    ...base,
    heroes: worldPatch.heroes,
    ...(worldPatch.monsters ? { monsters: worldPatch.monsters } : {}),
    battle: { ...base.battle, ...worldPatch.battle },
    ui: {
      ...base.ui,
      engineBridge: {
        game: engineGame,
        ...(base.ui.engineBridge.questSetupActive !== undefined
          ? { questSetupActive: base.ui.engineBridge.questSetupActive }
          : {}),
      },
    },
  };
}

export function useTabletopDisplayState(
  base: TabletopState,
  engineGame: GameState | null,
  worldPatch: TabletopWorldAdaptation | null,
): TabletopState {
  return useMemo(
    () => mergeTabletopDisplayState(base, engineGame, worldPatch),
    [base, engineGame, worldPatch],
  );
}
