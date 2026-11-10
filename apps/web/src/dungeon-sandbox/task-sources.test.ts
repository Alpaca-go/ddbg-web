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
import { applyCommand, createCoreDungeonQuest, createQuestSave, loadQuestSave } from "@ddbg/engine";
import {
  preAbominationTaskSources,
  preHeroStatReviewTaskSources,
  preDarkestTaskSources,
  preProphetTaskSources,
  preFanaticTaskSources,
  preTemplarsTaskSources,
  preShufflingHorrorTaskSources,
  preMammothCystTaskSources,
  preFinalBattleBossCatalogTaskSources,
  preCollectorTaskSources,
  preNecromancerTaskSources,
  taskSources,
} from "./task-sources";
import {
  naturalParty,
  naturalQuest,
} from "../../../../packages/engine/src/test-helpers/natural-quest";
import { coreParty } from "../../../../packages/engine/src/test-helpers/core-quest";
it("R-215 仅在旧目录回放和新目录结果都匹配时更新旧存档", () => {
  const start = {
    seed: 1,
    questId: "quest:p001" as const,
    mode: "radiant" as const,
    party: coreParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
  };
  const make = (sources: typeof taskSources) =>
    createCoreDungeonQuest(start.seed, start.questId, start.mode, start.party, sources);
  const before = make(preHeroStatReviewTaskSources);
  const save = createQuestSave(start, [], before, preHeroStatReviewTaskSources);
  expect(() => loadQuestSave(save, taskSources)).toThrow();
  expect(loadQuestSave(save, taskSources, [preHeroStatReviewTaskSources]).game).toEqual(
    make(taskSources),
  );
  const tampered = JSON.parse(JSON.stringify(save));
  tampered.snapshot.dungeon.battleCatalog.heroStats[0].speed += 1;
  expect(() => loadQuestSave(tampered, taskSources, [preHeroStatReviewTaskSources])).toThrow();
});

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
  expect(
    preNecromancerTaskSources.catalog.monsters.length -
      preDarkestTaskSources.catalog.monsters.length,
  ).toBe(9);
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

it("正式目录补入Necromancer I后，旧目录存档仍先严格验证再升级", () => {
  const start = {
    seed: 2,
    questId: "quest:p019",
    mode: "radiant",
    party: naturalParty,
    bossEdgeRooms: true,
  } as const;
  const previous = createCoreDungeonQuest(
    2,
    start.questId,
    start.mode,
    start.party,
    preNecromancerTaskSources,
    true,
  );
  expect(
    preNecromancerTaskSources.catalog.monsters.some((c) => c.id === "monster_medium:p089"),
  ).toBe(false);
  expect(taskSources.catalog.monsters.some((c) => c.id === "monster_medium:p089")).toBe(true);
  const saved = createQuestSave(start, [], previous, preNecromancerTaskSources);
  const loaded = loadQuestSave(saved, taskSources, [preNecromancerTaskSources]);
  const oldSetup = JSON.parse(JSON.stringify(saved));
  delete oldSetup.snapshot.dungeon.campaignLevel;
  oldSetup.snapshot.dungeon.explorationSetup.dungeonLevel = 3;
  expect(loadQuestSave(oldSetup, taskSources, [preNecromancerTaskSources]).game).toEqual(
    loaded.game,
  );
  expect(loaded.game).toEqual(
    createCoreDungeonQuest(2, start.questId, start.mode, start.party, taskSources, true),
  );
  const forged = JSON.parse(JSON.stringify(saved));
  forged.snapshot.dungeon.gold++;
  expect(() => loadQuestSave(forged, taskSources, [preNecromancerTaskSources])).toThrow();
});

it("Prophet I正式目录补齐后旧目录先严格验证，英雄篡改仍拒绝", () => {
  expect(
    preFanaticTaskSources.catalog.monsters.length - preCollectorTaskSources.catalog.monsters.length,
  ).toBe(1);
  expect(
    preCollectorTaskSources.catalog.monsters.length - preProphetTaskSources.catalog.monsters.length,
  ).toBe(1);
  expect(preProphetTaskSources.catalog.monsters.some((c) => c.id === "monster_large:p005")).toBe(
    false,
  );
  expect(taskSources.catalog.monsters.some((c) => c.id === "monster_large:p005")).toBe(true);
  expect(
    preNecromancerTaskSources.catalog.monsters.some((c) => c.id === "monster_large:p005"),
  ).toBe(false);
  const start = {
    seed: 2,
    questId: "quest:p019",
    mode: "radiant",
    party: naturalParty,
    bossEdgeRooms: true,
  } as const;
  const previous = createCoreDungeonQuest(
    2,
    start.questId,
    start.mode,
    start.party,
    preProphetTaskSources,
    true,
  );
  const saved = createQuestSave(start, [], previous, preProphetTaskSources);
  expect(() => loadQuestSave(saved, taskSources)).toThrow();
  const loaded = loadQuestSave(saved, taskSources, [preProphetTaskSources]);
  expect(loaded.game).toEqual(
    createCoreDungeonQuest(2, start.questId, start.mode, start.party, taskSources, true),
  );
  const forged = JSON.parse(JSON.stringify(saved));
  forged.snapshot.dungeon.heroes[0].wounds++;
  expect(() => loadQuestSave(forged, taskSources, [preProphetTaskSources])).toThrow();
});

it("R-176 Collector I 正式卡字段、旧目录严格迁移和篡改拒绝", () => {
  expect(taskSources.catalog.monsters.find((c) => c.id === "monster_medium:p092")).toMatchObject({
    speed: 2,
    stanceGroups: [
      {
        stances: ["aggressive", "defensive", "ranged", "support"],
        rollTable: [
          { min: 1, max: 5, skill: 1 },
          { min: 6, max: 10, skill: 2 },
        ],
      },
    ],
  });
  expect(preCollectorTaskSources.catalog.monsters).toEqual(
    preFanaticTaskSources.catalog.monsters.filter((c) => c.id !== "monster_medium:p092"),
  );
  expect(preProphetTaskSources.catalog.monsters.some((c) => c.id === "monster_medium:p092")).toBe(
    false,
  );
  const start = {
    seed: 2,
    questId: "quest:p019",
    mode: "radiant",
    party: naturalParty,
    bossEdgeRooms: true,
  } as const;
  const oldGame = createCoreDungeonQuest(
    2,
    start.questId,
    start.mode,
    start.party,
    preCollectorTaskSources,
    true,
  );
  const save = JSON.parse(
    JSON.stringify(createQuestSave(start, [], oldGame, preCollectorTaskSources)),
  );
  expect(loadQuestSave(save, taskSources, [preCollectorTaskSources]).game).toEqual(
    createCoreDungeonQuest(2, start.questId, start.mode, start.party, taskSources, true),
  );
  save.snapshot.dungeon.gold++;
  expect(() => loadQuestSave(save, taskSources, [preCollectorTaskSources])).toThrow();
}, 30000);

it("R-179 Fanatic I 正式卡字段、旧目录严格迁移和篡改拒绝", () => {
  expect(taskSources.catalog.monsters.find((c) => c.id === "monster_large:p008")).toMatchObject({
    speed: 2,
    stanceGroups: [
      {
        stances: ["aggressive", "defensive", "ranged", "support"],
        rollTable: [
          { min: 1, max: 2, skill: 1 },
          { min: 3, max: 6, skill: 2 },
          { min: 7, max: 10, skill: 3 },
        ],
      },
    ],
  });
  expect(preFanaticTaskSources.catalog.monsters).toEqual(
    preTemplarsTaskSources.catalog.monsters.filter((c) => c.id !== "monster_large:p008"),
  );
  expect(preCollectorTaskSources.catalog.monsters.some((c) => c.id === "monster_large:p008")).toBe(
    false,
  );
  const start = {
    seed: 2,
    questId: "quest:p019",
    mode: "radiant",
    party: naturalParty,
    bossEdgeRooms: true,
  } as const;
  const oldGame = createCoreDungeonQuest(
    2,
    start.questId,
    start.mode,
    start.party,
    preFanaticTaskSources,
    true,
  );
  const save = JSON.parse(
    JSON.stringify(createQuestSave(start, [], oldGame, preFanaticTaskSources)),
  );
  expect(loadQuestSave(save, taskSources, [preFanaticTaskSources]).game).toEqual(
    createCoreDungeonQuest(2, start.questId, start.mode, start.party, taskSources, true),
  );
  save.snapshot.dungeon.gold++;
  expect(() => loadQuestSave(save, taskSources, [preFanaticTaskSources])).toThrow();
}, 30000);

const templarsStanceExpect = {
  speed: 2,
  stanceGroups: [
    {
      stances: ["aggressive"],
      rollTable: [
        { min: 1, max: 2, skill: 1 },
        { min: 3, max: 4, skill: 2 },
        { min: 5, max: 10, skill: 3 },
      ],
    },
    {
      stances: ["defensive", "ranged", "support"],
      rollTable: [
        { min: 1, max: 5, skill: 1 },
        { min: 6, max: 10, skill: 2 },
      ],
    },
  ],
};

const mammothCystStanceExpect = {
  speed: 1,
  stanceGroups: [
    {
      stances: ["aggressive", "defensive", "ranged", "support"],
      rollTable: [
        { min: 1, max: 4, skill: 1 },
        { min: 5, max: 8, skill: 2 },
        { min: 9, max: 10, skill: 3 },
      ],
    },
  ],
};

const shufflingHorrorStanceExpect = {
  speed: 1,
  stanceGroups: [
    {
      stances: ["aggressive", "defensive", "ranged", "support"],
      rollTable: [
        { min: 1, max: 7, skill: 1 },
        { min: 8, max: 10, skill: 2 },
      ],
    },
  ],
};

it("R-185 Mammoth Cyst 正式卡字段、旧目录严格迁移和篡改拒绝", () => {
  expect(taskSources.catalog.monsters.find((c) => c.id === "monster_large:p016")).toMatchObject(
    mammothCystStanceExpect,
  );
  expect(preMammothCystTaskSources.catalog.monsters).toEqual(
    preShufflingHorrorTaskSources.catalog.monsters.filter((c) => c.id !== "monster_large:p016"),
  );
  expect(
    preShufflingHorrorTaskSources.catalog.monsters.some((c) => c.id === "monster_large:p016"),
  ).toBe(true);
  const start = {
    seed: 2,
    questId: "quest:p019",
    mode: "radiant",
    party: naturalParty,
    bossEdgeRooms: true,
  } as const;
  const oldGame = createCoreDungeonQuest(
    2,
    start.questId,
    start.mode,
    start.party,
    preMammothCystTaskSources,
    true,
  );
  const save = JSON.parse(
    JSON.stringify(createQuestSave(start, [], oldGame, preMammothCystTaskSources)),
  );
  expect(loadQuestSave(save, taskSources, [preMammothCystTaskSources]).game).toEqual(
    createCoreDungeonQuest(2, start.questId, start.mode, start.party, taskSources, true),
  );
  save.snapshot.dungeon.gold++;
  expect(() => loadQuestSave(save, taskSources, [preMammothCystTaskSources])).toThrow();
});

const ancestor1StanceExpect = {
  speed: 3,
  stanceGroups: [
    {
      stances: ["aggressive", "defensive", "ranged", "support"],
      rollTable: [
        { min: 1, max: 3, skill: 1 },
        { min: 4, max: 10, skill: 2 },
      ],
    },
  ],
};

const heartOfDarknessStanceExpect = {
  speed: 0,
  stanceGroups: [
    {
      stances: ["aggressive", "defensive", "ranged", "support"],
      rollTable: [
        { min: 1, max: 4, skill: 1 },
        { min: 5, max: 7, skill: 2 },
        { min: 8, max: 10, skill: 3 },
      ],
    },
  ],
};

it("R-187 最终战形态正式卡字段、旧目录严格迁移和篡改拒绝", () => {
  for (const id of [
    "monster_medium:p105",
    "monster_medium:p106",
    "monster_medium:p109",
    "monster_large:p018",
    "monster_large:p019",
    "monster_large:p020",
  ] as const) {
    expect(taskSources.catalog.monsters.find((c) => c.id === id)).toBeDefined();
  }
  expect(taskSources.catalog.monsters.find((c) => c.id === "monster_medium:p105")).toMatchObject(
    ancestor1StanceExpect,
  );
  expect(taskSources.catalog.monsters.find((c) => c.id === "monster_large:p020")).toMatchObject(
    heartOfDarknessStanceExpect,
  );
  expect(preFinalBattleBossCatalogTaskSources.catalog.monsters).toEqual(
    preMammothCystTaskSources.catalog.monsters.filter(
      (c) =>
        ![
          "monster_medium:p105",
          "monster_medium:p106",
          "monster_medium:p109",
          "monster_large:p018",
          "monster_large:p019",
          "monster_large:p020",
        ].includes(c.id),
    ),
  );
  expect(
    preMammothCystTaskSources.catalog.monsters.some((c) => c.id === "monster_large:p018"),
  ).toBe(true);
  const start = {
    seed: 2,
    questId: "quest:p019",
    mode: "radiant",
    party: naturalParty,
    bossEdgeRooms: true,
  } as const;
  const oldGame = createCoreDungeonQuest(
    2,
    start.questId,
    start.mode,
    start.party,
    preFinalBattleBossCatalogTaskSources,
    true,
  );
  const save = JSON.parse(
    JSON.stringify(createQuestSave(start, [], oldGame, preFinalBattleBossCatalogTaskSources)),
  );
  expect(loadQuestSave(save, taskSources, [preFinalBattleBossCatalogTaskSources]).game).toEqual(
    createCoreDungeonQuest(2, start.questId, start.mode, start.party, taskSources, true),
  );
  save.snapshot.dungeon.gold++;
  expect(() => loadQuestSave(save, taskSources, [preFinalBattleBossCatalogTaskSources])).toThrow();
});

it("R-183 Shuffling Horror 正式卡字段、旧目录严格迁移和篡改拒绝", () => {
  expect(taskSources.catalog.monsters.find((c) => c.id === "monster_large:p017")).toMatchObject(
    shufflingHorrorStanceExpect,
  );
  expect(preShufflingHorrorTaskSources.catalog.monsters).toEqual(
    preTemplarsTaskSources.catalog.monsters.filter((c) => c.id !== "monster_large:p017"),
  );
  expect(preTemplarsTaskSources.catalog.monsters.some((c) => c.id === "monster_large:p017")).toBe(
    true,
  );
  const start = {
    seed: 2,
    questId: "quest:p019",
    mode: "radiant",
    party: naturalParty,
    bossEdgeRooms: true,
  } as const;
  const oldGame = createCoreDungeonQuest(
    2,
    start.questId,
    start.mode,
    start.party,
    preShufflingHorrorTaskSources,
    true,
  );
  const save = JSON.parse(
    JSON.stringify(createQuestSave(start, [], oldGame, preShufflingHorrorTaskSources)),
  );
  expect(loadQuestSave(save, taskSources, [preShufflingHorrorTaskSources]).game).toEqual(
    createCoreDungeonQuest(2, start.questId, start.mode, start.party, taskSources, true),
  );
  save.snapshot.dungeon.gold++;
  expect(() => loadQuestSave(save, taskSources, [preShufflingHorrorTaskSources])).toThrow();
});

it("R-181 Templars 正式卡字段、旧目录严格迁移和篡改拒绝", () => {
  for (const id of ["monster_large:p014", "monster_large:p015"] as const) {
    expect(taskSources.catalog.monsters.find((c) => c.id === id)).toMatchObject(
      templarsStanceExpect,
    );
  }
  expect(preTemplarsTaskSources.catalog.monsters).toEqual(
    taskSources.catalog.monsters.filter(
      (c) => c.id !== "monster_large:p014" && c.id !== "monster_large:p015",
    ),
  );
  expect(preFanaticTaskSources.catalog.monsters.some((c) => c.id === "monster_large:p014")).toBe(
    false,
  );
  const start = {
    seed: 2,
    questId: "quest:p019",
    mode: "radiant",
    party: naturalParty,
    bossEdgeRooms: true,
  } as const;
  const oldGame = createCoreDungeonQuest(
    2,
    start.questId,
    start.mode,
    start.party,
    preTemplarsTaskSources,
    true,
  );
  const save = JSON.parse(
    JSON.stringify(createQuestSave(start, [], oldGame, preTemplarsTaskSources)),
  );
  expect(loadQuestSave(save, taskSources, [preTemplarsTaskSources]).game).toEqual(
    createCoreDungeonQuest(2, start.questId, start.mode, start.party, taskSources, true),
  );
  save.snapshot.dungeon.gold++;
  expect(() => loadQuestSave(save, taskSources, [preTemplarsTaskSources])).toThrow();
}, 30000);

it("旧目录与旧占位计划组合存档仍须完整匹配，升级后严格拒绝篡改", () => {
  const start = {
    seed: 5,
    questId: "quest:p019",
    mode: "radiant",
    party: naturalParty,
    bossEdgeRooms: true,
  } as const;
  const initial = createCoreDungeonQuest(
    5,
    start.questId,
    start.mode,
    start.party,
    preProphetTaskSources,
    true,
  );
  const command = { type: "establishImminentThreat" } as const;
  const game = applyCommand(initial, command).state;
  const saved = JSON.parse(
    JSON.stringify(createQuestSave(start, [command], game, preProphetTaskSources)),
  );
  saved.snapshot.dungeon.faceTheThreatEmbarkPlan = initial.dungeon!.faceTheThreatEmbarkPlan;
  delete saved.snapshot.dungeon.campaignLevel;
  saved.snapshot.dungeon.explorationSetup.dungeonLevel = 3;
  const loaded = loadQuestSave(saved, taskSources, [preProphetTaskSources]);
  expect(loaded.game.dungeon!.faceTheThreatEmbarkPlan!.resolvedScriptId).toBe(
    "boss:ruins:prophet:1",
  );
  expect(
    loaded.game.dungeon!.battleCatalog!.monsters.some((c) => c.id === "monster_large:p005"),
  ).toBe(true);
  const forged = structuredClone(saved);
  forged.snapshot.dungeon.gold++;
  expect(() => loadQuestSave(forged, taskSources, [preProphetTaskSources])).toThrow();
}, 30000);
