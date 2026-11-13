import { expect, it } from "vitest";
import coreRaw from "../../data/normalized/corebox/curio.json";
import wealdRaw from "../../data/normalized/extension/weald/curio.json";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import { curioFileSchema, wealdCurioFileSchema } from "../../data/src/curio";
import { locationCurioPool } from "../../data/src/curio-pool";
import { basicQuests } from "../../data/src/basic-quests";
import { createDungeonSandbox } from "./dungeon";
import { dungeonCurioCatalogValid, questCurioCatalogSchema } from "./dungeon-curio-catalog";
import { drawDungeonCurio } from "./dungeon-curio";

const core = curioFileSchema.parse(coreRaw).cards;
const weald = locationCurioPool(core, {
  location: "weald",
  cards: wealdCurioFileSchema.parse(wealdRaw).cards,
});
const create = (cards = core) =>
  createDungeonSandbox(
    1237,
    layout,
    distribution,
    "standard",
    "S",
    [{ id: "h0", stance: "aggressive", stress: 0 }],
    [],
    undefined,
    cards,
  );

it("已登记核心任务和旧沙盒保持原核心目录，不添加快照字段", () => {
  for (const quest of basicQuests) {
    const questId = quest.id;
    if (quest.expeditionRegion === "weald") {
      expect(questCurioCatalogSchema(questId).safeParse(core).success).toBe(false);
      expect(questCurioCatalogSchema(questId).parse(weald)).toEqual(weald);
      continue;
    }
    expect(questCurioCatalogSchema(questId).parse(core)).toEqual(core);
    expect(questCurioCatalogSchema(questId).safeParse(weald).success).toBe(false);
  }
  expect(questCurioCatalogSchema(undefined).parse(core)).toEqual(core);
  expect(questCurioCatalogSchema(undefined).safeParse(weald).success).toBe(false);
  expect(create().dungeon!.curio).toEqual({ cards: core, deck: null, discard: [], active: null });
  expect(dungeonCurioCatalogValid(create().dungeon!)).toBe(true);
});

it("即使启用 Weald，遗迹创建与抽牌也拒绝同为 24 张的异地目录", () => {
  expect(() => create(weald)).toThrow();
  const initial = create();
  const state = {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      contentPacks: ["core", "weald"] as const,
      phase: "awaitingHazards" as const,
      curio: { ...initial.dungeon!.curio!, cards: weald },
      exploration: {
        from: "S",
        to: "D",
        dicePerHero: 2,
        rolls: [{ id: "curio-roll", heroId: "h0", face: "curio" as const, resolved: false }],
      },
    },
  };
  const before = structuredClone(state);
  expect(dungeonCurioCatalogValid(state.dungeon)).toBe(false);
  const result = drawDungeonCurio(state, "curio-roll", "draw");
  expect(result.state).toBe(state);
  expect(result.events[0]?.type).toBe("commandRefused");
  expect(state).toEqual(before);
});
