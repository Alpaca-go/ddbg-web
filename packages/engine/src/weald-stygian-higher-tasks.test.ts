import { expect, it } from "vitest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { wealdTaskSources } from "./test-helpers/weald-task-battle";
import { applyCommand } from "./command";
import { createQuestSave, loadQuestSave } from "./quest-save";
import medium from "../../data/normalized/extension/weald/monster_medium.json";
import large from "../../data/normalized/extension/weald/monster_large.json";
import curios from "../../data/normalized/extension/weald/curio.json";
import { wealdCurioFileSchema } from "../../data/src/curio";
import { rebuildLocationQuestDecks } from "./location-quest-sources";
import { createBattleState } from "./battle";
import { readActiveWealdStygianRoom } from "./weald-stygian-room-effects";

const packs = ["core", "weald"] as const;
const whisperSources = {
  ...coreQuestSources,
  weald: { medium, large, curios: wealdCurioFileSchema.parse(curios).cards },
};

it("tasks-v1：Stygian 可进入 II 级任务并带 higher-v1 来源", () => {
  const game = createCoreDungeonQuest(
    0,
    "quest:weald:p006",
    "stygian",
    coreParty,
    wealdTaskSources,
    true,
    "full",
    packs,
    undefined,
    undefined,
    "tasks-v1",
  );
  expect(game.dungeon!.mode).toBe("stygian");
  expect(game.dungeon!.stygianRoomRules).toBe("full");
  expect(game.dungeon!.wealdHigherQuestOffers).toBe("tasks-v1");
  expect(game.dungeon!.campaignLevel).toBe(2);
  expect(game.dungeon!.monsterPool?.wealdSourceVersion).toBe("higher-v1");
  expect(game.dungeon!.gold).toBe(0);
});

it("Whispering Woods：Stygian 显式 p015 入口", () => {
  const game = createCoreDungeonQuest(
    0,
    "quest:weald:p015",
    "stygian",
    coreParty,
    whisperSources,
    true,
    "full",
    packs,
    undefined,
    true,
  );
  expect(game.dungeon!.whisperingWoodsQuest).toBe(true);
  expect(game.dungeon!.campaignLevel).toBe(3);
  expect(game.dungeon!.monsterPool?.wealdSourceVersion).toBe("higher-v1");
  expect(game.dungeon!.gold).toBe(0);
});

it("旧版无 tasks-v1 仍拒绝 II 级任务", () => {
  expect(() =>
    createCoreDungeonQuest(
      0,
      "quest:weald:p007",
      "radiant",
      coreParty,
      wealdTaskSources,
      true,
      "full",
      packs,
    ),
  ).toThrow();
});

it("核心-only Stygian 不受 Weald 任务扩展影响", () => {
  const game = createCoreDungeonQuest(
    0,
    "quest:p001",
    "stygian",
    coreParty,
    coreQuestSources,
    true,
    "full",
    ["core"],
  );
  expect(game.dungeon!.contentPacks).toEqual(["core"]);
  expect(game.dungeon!.monsterPool?.location).not.toBe("weald");
});

it("Whispering Woods 轮开始压力在 Stygian 下仍触发", () => {
  const command = { type: "startBattle", wealdWhisperingWoods: true } as const;
  const pool = rebuildLocationQuestDecks(
    whisperSources,
    "weald",
    3,
    packs,
    "weald-higher-v1",
  ).monsterPool;
  const base = createCoreDungeonQuest(
    0,
    "quest:weald:p015",
    "stygian",
    coreParty,
    whisperSources,
    true,
    "full",
    packs,
    undefined,
    true,
  );
  const battle = createBattleState(0, {
    entities: [
      ...(["aggressive", "defensive", "ranged", "support"] as const).map((stance, i) => ({
        id: `h${i}`,
        side: "hero" as const,
        hero: "CRUSADER",
        skillIds: [],
        areaId: "a",
        stance,
        wounds: 0,
        stress: 0,
        dodge: 0,
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      })),
      {
        areaId: "a",
        stance: "aggressive",
        skillIds: [],
        wounds: 0,
        dodge: 0,
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
        id: "m",
        side: "monster" as const,
        hero: null,
        monsterCardId: "neutral",
        life: 30,
        stanceSlots: 1,
      },
    ],
    areas: [{ id: "a", adjacent: [], elevation: "normal" }],
    skills: [],
    monsters: [
      {
        id: "neutral",
        life: 30,
        verification: { unverified: false },
        skills: [],
        type_position_tags: ["Beast"],
      },
    ],
    light: 5,
    resolveCards: coreQuestSources.resolveCards,
  });
  const state = {
    ...base,
    battle: { ...battle.battle!, wealdMechanics: true as const },
    dungeon: {
      ...base.dungeon!,
      phase: "inBattle" as const,
      monsterPool: pool,
    },
  };
  const started = applyCommand(state, command);
  expect(started.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(
    started.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress),
  ).toEqual([1, 1, 1, 1]);
});

it("Stygian 出征存档严格回放保留 tasks-v1 与房间规则", () => {
  const game = createCoreDungeonQuest(
    0,
    "quest:weald:p008",
    "stygian",
    coreParty,
    wealdTaskSources,
    true,
    "full",
    packs,
    undefined,
    undefined,
    "tasks-v1",
  );
  const start = {
    seed: 0,
    questId: "quest:weald:p008" as const,
    mode: "stygian" as const,
    party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
    contentPacks: [...packs],
    bossEdgeRooms: true,
    stygianRoomRules: "full" as const,
    wealdHigherQuestOffers: "tasks-v1" as const,
  };
  const save = createQuestSave(start, [], game, wealdTaskSources);
  const loaded = loadQuestSave(JSON.parse(JSON.stringify(save)), wealdTaskSources);
  expect(loaded.game.dungeon!.wealdHigherQuestOffers).toBe("tasks-v1");
  expect(loaded.game.dungeon!.stygianRoomRules).toBe("full");
});

it("Stygian Weald 普通房替换与 II 级任务并存", () => {
  const game = createCoreDungeonQuest(
    0,
    "quest:weald:p009",
    "stygian",
    coreParty,
    wealdTaskSources,
    true,
    "full",
    packs,
    undefined,
    undefined,
    "tasks-v1",
  );
  const d = game.dungeon!;
  const cardId = "room:weald:p001";
  const withActive = {
    ...d,
    roomCards: {
      ...d.roomCards!,
      deck: null,
      active: { roomId: "r1", cardId, blockedReason: "stygian-test" },
    },
  };
  expect(readActiveWealdStygianRoom(withActive)?.id).toBe("stygian_room:weald:p001");
});
