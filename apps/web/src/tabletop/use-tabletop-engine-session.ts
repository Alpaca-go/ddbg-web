import { useEffect, useMemo, useState } from "react";
import type { GameEvent, GameState } from "@ddbg/engine";
import { battleData } from "virtual:battle-data";
import { useBattleStore } from "../battle-store";
import { useDungeonStore } from "../dungeon-sandbox/store";
import {
  adaptGameStateToTabletopWorld,
  type TabletopWorldAdaptation,
} from "./phase/adapt-game-state-to-tabletop-world";

export type TabletopEngineMode = "battle" | "dungeon" | null;

export function readTabletopEngineMode(): TabletopEngineMode {
  const raw = new URLSearchParams(window.location.search).get("engine");
  if (raw === "battle" || raw === "dungeon") return raw;
  return null;
}

function heroDisplayNameFromCatalog(hero: {
  readonly id: string;
  readonly hero?: string | null;
  readonly heroStatId?: string;
}): string {
  if (hero.hero) return hero.hero;
  const stat = battleData.heroStats.find((s) => s.id === hero.heroStatId);
  return stat?.name ?? "—";
}

export function useTabletopEngineSession(): {
  readonly engineGame: GameState | null;
  readonly worldPatch: TabletopWorldAdaptation | null;
  readonly engineMode: TabletopEngineMode;
} {
  const engineMode = readTabletopEngineMode();
  const battleGame = useBattleStore((s) => (engineMode === "battle" ? s.game : null));
  const dungeonGame = useDungeonStore((s) => (engineMode === "dungeon" ? s.game : null));
  const engineGame = battleGame ?? dungeonGame;
  const battleEvents = useBattleStore((s) => s.events);
  const [dungeonEvents, setDungeonEvents] = useState<readonly GameEvent[]>(
    () => useDungeonStore.getState().events,
  );
  useEffect(
    () =>
      useDungeonStore.subscribe((next, previous) => {
        if (next.events === previous.events) return;
        setDungeonEvents((history) =>
          next.commands.length === 0 ? next.events : [...history, ...next.events],
        );
      }),
    [],
  );
  const events = engineMode === "battle" ? battleEvents : dungeonEvents;

  const worldPatch = useMemo(
    () =>
      engineGame
        ? adaptGameStateToTabletopWorld(engineGame, {
            heroDisplayName: heroDisplayNameFromCatalog,
            events,
          })
        : null,
    [engineGame, events],
  );

  return { engineGame, worldPatch, engineMode };
}
