import { create } from "zustand";
import { applyCommand } from "@ddbg/engine";
import type { QuestStart, Command, GameEvent, GameState, DungeonState } from "@ddbg/engine";
import type { DungeonLayout } from "../../../../packages/data/src/dungeon-layout";
import { loadQuestSave } from "@ddbg/engine";
import { setup } from "./fixture-setup";
import type { Fixture } from "./fixture-types";

export const useDungeonStore = create<{
  game: GameState;
  page: number;
  fixture: Fixture;
  preview: DungeonLayout | null;
  events: readonly GameEvent[];
  commands: readonly Command[];
  questStart: QuestStart | null;
  dispatch: (command: Command) => void;
  beginTask: (game: GameState, start: QuestStart) => void;
  restoreTask: (loaded: ReturnType<typeof loadQuestSave>) => void;
  reset: (mode: DungeonState["mode"]) => void;
  select: (page: number, fixture: Fixture) => void;
}>((set) => ({
  // 当前房间为导航就绪的测试注入点；没有通过走廊，也没有获得奖励。
  ...setup("standard"),
  questStart: null,
  dispatch: (command) =>
    set((s) => {
      const recorded: Command = {
        ...command,
        allTrinkets: true,
        ...(command.type === "resolveChoice" ? { bossEdgeRooms: true } : {}),
      };
      const result = applyCommand(s.game, recorded);
      return {
        game: result.state,
        events: result.events,
        commands: result.events.some((e) => e.type === "commandRefused")
          ? s.commands
          : [...s.commands, recorded],
      };
    }),
  beginTask: (game, questStart) =>
    set({ game, questStart, page: 1, fixture: "neutral", preview: null, events: [], commands: [] }),
  restoreTask: (loaded) =>
    set({
      game: loaded.game,
      questStart: loaded.start,
      commands: loaded.commands,
      events: loaded.events,
      page: 1,
      fixture: "neutral",
      preview: null,
    }),
  reset: (mode) => set((s) => ({ ...setup(mode, s.page, s.fixture), questStart: null })),
  select: (page, fixture) =>
    set((s) => ({ ...setup(s.game.dungeon!.mode, page, fixture), questStart: null })),
}));
