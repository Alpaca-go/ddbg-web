import { expect, it } from "vitest";
import medium from "../../data/normalized/extension/weald/monster_medium.json";
import large from "../../data/normalized/extension/weald/monster_large.json";
import curio from "../../data/normalized/extension/weald/curio.json";
import { wealdCurioFileSchema } from "../../data/src/curio";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { rebuildLocationQuestDecks } from "./location-quest-sources";
import { sourcesForContentPacks } from "./content-packs";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { dungeonMonsterPoolThrough } from "./monster-pool-runtime";
const sources = {
  ...coreQuestSources,
  weald: { medium, large, curios: wealdCurioFileSchema.parse(curio).cards },
};

it("来源按选包保留或剔除，重建Weald只取通用和当地目录，不修改来源", () => {
  expect(sourcesForContentPacks(sources, ["core"]).weald).toBeUndefined();
  expect(sourcesForContentPacks(sources, ["core", "weald"]).weald).toBe(sources.weald);
  const before = structuredClone(sources);
  const decks = rebuildLocationQuestDecks(sources, "weald", 1, ["core", "weald"]);
  expect(decks.curios).toHaveLength(24);
  expect(decks.curios.filter((card) => card.id.startsWith("curio:weald:"))).toHaveLength(16);
  const instances = dungeonMonsterPoolThrough(decks.monsterPool, 1);
  expect(instances).toHaveLength(45);
  expect(new Set(instances.map((card) => card.instanceId)).size).toBe(45);
  expect(new Set(instances.map((card) => card.cardId))).toEqual(
    new Set(decks.catalog.monsters.map((card) => card.id)),
  );
  expect(decks).toEqual(rebuildLocationQuestDecks(sources, "weald", 1, ["core", "weald"]));
  expect(sources).toEqual(before);
});

it("未选包、无可信来源、高等级或缺少通用战斗引用均拒绝", () => {
  expect(() => rebuildLocationQuestDecks(sources, "weald", 1)).toThrow();
  expect(() => rebuildLocationQuestDecks(sources, "weald", 1, ["core"])).toThrow();
  expect(() =>
    rebuildLocationQuestDecks(coreQuestSources, "weald", 1, ["core", "weald"]),
  ).toThrow();
  expect(() => rebuildLocationQuestDecks(sources, "weald", 2, ["core", "weald"])).toThrow();
  expect(() =>
    rebuildLocationQuestDecks(
      { ...sources, catalog: { ...sources.catalog, monsters: [] } },
      "weald",
      1,
      ["core", "weald"],
    ),
  ).toThrow();
});

it("新增可信地点来源不改变核心任务，旧档与选包档均可交叉来源严格回放", () => {
  for (const contentPacks of [undefined, ["core", "weald"] as const]) {
    const start = {
      seed: 1,
      questId: "quest:p001" as const,
      mode: "radiant" as const,
      party: coreParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
      bossEdgeRooms: true,
      stygianRoomRules: "full" as const,
      ...(contentPacks ? { contentPacks: [...contentPacks] } : {}),
    };
    const create = (input: typeof coreQuestSources) =>
      createCoreDungeonQuest(
        start.seed,
        start.questId,
        start.mode,
        start.party,
        input,
        true,
        "full",
        contentPacks,
      );
    const old = create(coreQuestSources),
      fresh = create(sources);
    expect(fresh).toEqual(old);
    const save = createQuestSave(start, [], old, coreQuestSources);
    expect(loadQuestSave(save, sources).game).toEqual(old);
    const next = createQuestSave(start, [], fresh, sources);
    expect(loadQuestSave(next, coreQuestSources).game).toEqual(fresh);
    const forged = {
      ...next,
      snapshot: {
        ...fresh,
        dungeon: {
          ...fresh.dungeon!,
          monsterPool: rebuildLocationQuestDecks(sources, "weald", 1, ["core", "weald"])
            .monsterPool,
        },
      },
    };
    expect(() => loadQuestSave(forged, sources)).toThrow();
  }
}, 20000);
