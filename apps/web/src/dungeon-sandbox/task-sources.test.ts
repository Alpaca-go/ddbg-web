import { expect, it, vi } from "vitest";
const { catalog } = vi.hoisted(() => ({
  catalog: async (id: string) => {
    const { battleDataPlugin } = await import("../../battle-data-plugin");
    const load = battleDataPlugin().load as (id: string) => string;
    return JSON.parse(load(`\0virtual:${id}`).slice("export const battleData = ".length, -1));
  },
}));
vi.mock("virtual:battle-data", async () => ({ battleData: await catalog("battle-data") }));
vi.mock("virtual:quest-battle-data", async () => ({
  battleData: await catalog("quest-battle-data"),
}));
vi.mock("virtual:quest-battle-data-v1", async () => ({
  battleData: await catalog("quest-battle-data-v1"),
}));
vi.mock("virtual:quest-battle-data-v2", async () => ({
  battleData: await catalog("quest-battle-data-v2"),
}));
import { createCoreDungeonQuest, createQuestSave, loadQuestSave } from "@ddbg/engine";
import { preAbominationTaskSources, preDarkestTaskSources, taskSources } from "./task-sources";
import {
  naturalParty,
  naturalQuest,
} from "../../../../packages/engine/src/test-helpers/natural-quest";
import { coreParty } from "../../../../packages/engine/src/test-helpers/core-quest";
it("#416 catalog snapshots are validated against fixed old sources before upgrading; altered player state is refused", () => {
  expect(taskSources.catalog.skills.length - preAbominationTaskSources.catalog.skills.length).toBe(
    10,
  );
  const start = {
    seed: 1,
    questId: "quest:p001" as const,
    mode: "radiant" as const,
    party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
  };
  const before = createCoreDungeonQuest(
    start.seed,
    start.questId,
    start.mode,
    start.party,
    preAbominationTaskSources,
  );
  const saved = createQuestSave(start, [], before, preAbominationTaskSources);
  expect(() => loadQuestSave(saved, taskSources)).toThrow();
  const upgraded = loadQuestSave(saved, taskSources, [preAbominationTaskSources]);
  expect(upgraded.game).toEqual(
    createCoreDungeonQuest(start.seed, start.questId, start.mode, start.party, taskSources),
  );
  expect(() => createQuestSave(start, [], upgraded.game, taskSources)).not.toThrow();
  const tampered = JSON.parse(JSON.stringify(saved));
  tampered.snapshot.dungeon.heroes[0].wounds = 1;
  expect(() => loadQuestSave(tampered, taskSources, [preAbominationTaskSources])).toThrow();
});

it("网页补入最暗九种怪物后，旧真实战斗存档仅迁移可信目录，玩家状态篡改仍拒绝", () => {
  expect(taskSources.catalog.monsters.length - preDarkestTaskSources.catalog.monsters.length).toBe(
    9,
  );
  const prefix = naturalQuest(1, "quest:p001", true, preDarkestTaskSources, 2, {
    observe(state) {
      if (state.battle) throw Error("battle-prefix");
    },
  });
  expect(prefix.stopReason).toBe("battle-prefix");
  const start = {
    seed: 1,
    questId: "quest:p001" as const,
    mode: "radiant" as const,
    party: naturalParty,
  };
  const saved = createQuestSave(start, prefix.commands, prefix.state, preDarkestTaskSources);
  expect(() => loadQuestSave(saved, taskSources)).toThrow();
  const loaded = loadQuestSave(saved, taskSources, [preDarkestTaskSources]);
  expect(loaded.game.battle!.monsters).toHaveLength(taskSources.catalog.monsters.length);
  expect(loaded.game.dungeon!.heroes).toEqual(prefix.state.dungeon!.heroes);
  const forged = JSON.parse(JSON.stringify(saved));
  forged.snapshot.battle.entities[0].wounds++;
  expect(() => loadQuestSave(forged, taskSources, [preDarkestTaskSources])).toThrow();
}, 30000);
