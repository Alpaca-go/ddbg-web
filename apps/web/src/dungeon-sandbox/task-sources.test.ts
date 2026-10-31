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
import { preAbominationTaskSources, taskSources } from "./task-sources";
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
