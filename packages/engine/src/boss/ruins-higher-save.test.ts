import { expect, it } from "vitest";
import { battleDataPlugin } from "../../../../apps/web/battle-data-plugin";
import { coreQuestSources, coreParty } from "../test-helpers/core-quest";
import { naturalQuest, naturalParty } from "../test-helpers/natural-quest";
import { createCoreDungeonQuest, type CoreQuestSources } from "../dungeon-quest-entry";
import { createQuestSave, loadQuestSave } from "../quest-save";
import type { GameState, Command } from "../command";
import { RUINS_BOSS_CATALOG_CARD_IDS } from "./ruins-combat-levels";

const load = battleDataPlugin().load as (id: string) => string;
const code = load("\0virtual:quest-battle-data");
const { bossMonsters, ...catalog } = JSON.parse(
  code.slice("export const battleData = ".length, -1),
);
const previous: CoreQuestSources = {
  ...coreQuestSources,
  catalog: { ...catalog, trinkets: coreQuestSources.catalog.trinkets },
};
const current: CoreQuestSources = {
  ...previous,
  catalog: { ...previous.catalog, monsters: [...catalog.monsters, ...bossMonsters] },
};

it("网页正式目录包含全部 Ruins II/III 与召唤物；普通遭遇目录与旧目录完全相同", () => {
  expect(new Set(bossMonsters.map((c: { id: string }) => c.id))).toEqual(
    RUINS_BOSS_CATALOG_CARD_IDS,
  );
  expect(previous.catalog.monsters.map((c) => c.id)).toEqual(
    catalog.monsters.map((c: { id: string }) => c.id),
  );
  const start = {
    seed: 7,
    questId: "quest:p001",
    mode: "radiant",
    party: JSON.parse(JSON.stringify(coreParty)),
  } as const;
  const oldGame = createCoreDungeonQuest(7, start.questId, start.mode, coreParty, previous);
  const save = createQuestSave(start, [], oldGame, previous);
  const restored = loadQuestSave(JSON.parse(JSON.stringify(save)), current, previous);
  expect(restored.game.dungeon!.battleCatalog?.monsters).toHaveLength(
    catalog.monsters.length + bossMonsters.length,
  );
  const forged = structuredClone(save);
  const old = forged.snapshot as unknown as GameState;
  forged.snapshot = JSON.parse(
    JSON.stringify({
      ...old,
      dungeon: {
        ...old.dungeon!,
        heroes: old.dungeon!.heroes.map((h, i) => (i ? h : { ...h, wounds: 1 })),
      },
    }),
  );
  expect(() => loadQuestSave(forged, current, previous)).toThrow();
});

it("旧正式战斗停点存档只允许追加已知 Boss 目录；不改英雄、怪物、骰面或先攻", () => {
  const stop = new Error("first battle checkpoint");
  let snapshot: GameState | undefined;
  const commands: Command[] = [];
  try {
    naturalQuest(14, "quest:p001", true, previous, 2, {
      observe(game, command) {
        commands.push(command);
        if (game.battle?.encounter) {
          snapshot = structuredClone(game);
          throw stop;
        }
      },
    });
  } catch (error) {
    if (error !== stop) throw error;
  }
  expect(snapshot?.battle?.encounter).toBeDefined();
  const start = { seed: 14, questId: "quest:p001", mode: "radiant", party: naturalParty } as const;
  const save = createQuestSave(start, commands, snapshot!, previous);
  const restored = loadQuestSave(JSON.parse(JSON.stringify(save)), current, previous).game;
  expect(restored.battle!.entities).toEqual(snapshot!.battle!.entities);
  expect(restored.battle!.encounter).toEqual(snapshot!.battle!.encounter);
  expect(restored.battle!.rngCursor).toBe(snapshot!.battle!.rngCursor);
  expect(restored.battle!.monsters!.slice(0, catalog.monsters.length)).toEqual(
    snapshot!.battle!.monsters,
  );
  const forged = structuredClone(save);
  const old = forged.snapshot as unknown as GameState;
  forged.snapshot = JSON.parse(
    JSON.stringify({
      ...old,
      battle: {
        ...old.battle!,
        entities: old.battle!.entities.map((e, i) => (i ? e : { ...e, wounds: e.wounds + 1 })),
      },
    }),
  );
  expect(() => loadQuestSave(forged, current, previous)).toThrow();
}, 20000);
