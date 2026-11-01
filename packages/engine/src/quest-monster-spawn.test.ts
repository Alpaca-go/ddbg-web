import { expect, it } from "vitest";
import { asQuestMapPairingQuest, basicQuests } from "../../data/src/basic-quests";
import { pickEmbarkQuestMapLayout } from "../../data/src/quest-map-pairing";
import { applyCommand, type GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";
import { readRoomTile } from "./room-tile-selection";
import { questMonsterDeploymentHold } from "./quest-monster-deployment";
import {
  questMonsterOutsidePoolInstanceIds,
  readQuestMonsterPlanAtRoom,
} from "./quest-monster-spawn";
import { coreQuestSources as sources, coreParty } from "./test-helpers/core-quest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { nextBattleRoll } from "./battle-roll";
import { selectMonsterSkill } from "./monster-stance";
import { distance } from "./battle";

function fixture(questId: string): GameState {
  const quest = basicQuests.find((q) => q.id === questId)!;
  const game = createDungeonSandbox(
    17,
    pickEmbarkQuestMapLayout(asQuestMapPairingQuest(quest), 17, 0),
    quest.distribution,
    "standard",
    "S",
    undefined,
    sources.resolveCards,
    { dungeonLevel: quest.level, light: 5, provisions: [] },
    sources.curios,
    sources.rooms,
    sources.monsters,
    sources.catalog,
  );
  const d = game.dungeon!;
  const position = d.rooms.find((r) => r.kind === "objective")!.id;
  return {
    ...game,
    dungeon: {
      ...d,
      heroes: createCoreDungeonQuest(17, "quest:p001", "radiant", coreParty, sources).dungeon!
        .heroes,
      phase: "awaitingRoom",
      position,
      campaignLevel: quest.level,
      rooms: d.rooms.map((r) => (r.id === position ? { ...r, revealed: true } : r)),
      roomCards: {
        ...d.roomCards!,
        active: {
          roomId: position,
          cardId: "room:p001",
          tileId: (() => {
            const selected = readRoomTile(sources.rooms.find((r) => r.id === "room:p001"));
            if (selected.status !== "matched") throw new Error("fixture requires approved room");
            return selected.tile.id;
          })(),
          blockedReason: "机制夹具",
        },
      },
    },
  };
}
it("R-142 Bone Bearer 选招表含显式不可选远程，Unholy Rally 经公开 AI 全治疗且不耗攻击骰", () => {
  const base = fixture("quest:p009");
  const deployed = applyCommand(base, { type: "prepareDungeonMonsters" }).state;
  let state = applyCommand(deployed, { type: "startDungeonBattle" }).state;
  const card = state.battle!.monsters!.find((c) => c.id === "monster_medium:p016")!;
  expect(card.speed).toBe(2);
  expect(selectMonsterSkill(card, ["ranged"]).status).toBe("refused");
  for (let roll = 1; roll <= 10; roll++) {
    expect(selectMonsterSkill(card, ["aggressive"], roll)).toMatchObject({
      status: "selected",
      skillSlot: 2,
    });
    expect(selectMonsterSkill(card, ["defensive"], roll)).toMatchObject({
      status: "selected",
      skillSlot: roll <= 4 ? 1 : roll <= 7 ? 2 : 3,
    });
    expect(selectMonsterSkill(card, ["support"], roll)).toMatchObject({
      status: "selected",
      skillSlot: roll <= 6 ? 1 : 3,
    });
  }
  const actor = state.battle!.entities.find((e) => e.side === "monster")!;
  let cursor = state.battle!.rngCursor;
  while (nextBattleRoll(state.seed, cursor) < 7) cursor++;
  state = {
    ...state,
    battle: {
      ...state.battle!,
      rngCursor: cursor,
      entities: state.battle!.entities.map((e) =>
        e.id === actor.id ? { ...e, stance: "support", wounds: 7 } : e,
      ),
      encounter: {
        round: 1,
        deck: ["hero"],
        actedIds: [],
        turn: { type: "monster", actorId: actor.id },
      },
    },
  };
  let pending: ReturnType<typeof applyCommand>["pendingChoice"];
  const send = (command: Parameters<typeof applyCommand>[1]) => {
    const result = applyCommand(state, command);
    expect(
      result.events.filter((e) => e.type === "commandRefused"),
      JSON.stringify(result.events),
    ).toEqual([]);
    state = result.state;
    pending = result.pendingChoice;
  };
  send({ type: "prepareMonsterAction", actorId: actor.id });
  expect(state.battle!.monsterAction).toMatchObject({ skillSlot: 3, targetId: actor.id });
  send({ type: "moveMonsterToRange", actorId: actor.id });
  while (pending) {
    const choice = pending;
    send({ type: "resolveChoice", choiceId: choice.id, optionId: choice.options[0]!.id });
  }
  const before = state.battle!.rngCursor;
  send({ type: "playMonsterSkill", actorId: actor.id, targetId: actor.id, skillSlot: 3 });
  expect(state.battle!.rngCursor).toBe(before);
  expect(state.battle!.entities.find((e) => e.id === actor.id)).toMatchObject({
    wounds: 0,
    statusStacks: [{ kind: "buff", remaining: 2 }],
  });
});
it("Wicked Surge 无攻击骰，公开命令施加目标 Debuff 2t 与压力1", () => {
  const deployed = applyCommand(fixture("quest:p009"), { type: "prepareDungeonMonsters" }).state;
  const started = applyCommand(deployed, { type: "startDungeonBattle" }).state;
  const actor = started.battle!.entities.find((e) => e.side === "monster")!;
  const target = started.battle!.entities.find((e) => e.side === "hero")!;
  const targetArea = started.battle!.areas.find(
    (a) => distance(started.battle!.areas, actor.areaId, a.id) === 2,
  )!;
  const state: GameState = {
    ...started,
    battle: {
      ...started.battle!,
      entities: started.battle!.entities.map((e) =>
        e.side === "hero" ? { ...e, areaId: targetArea.id, stress: 0, resistances: [] } : e,
      ),
      encounter: {
        round: 1,
        deck: ["hero"],
        actedIds: [],
        turn: { type: "monster", actorId: actor.id },
      },
    },
  };
  const result = applyCommand(state, {
    type: "playMonsterSkill",
    actorId: actor.id,
    targetId: target.id,
    skillSlot: 1,
  });
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
  expect(result.events).toContainEqual(
    expect.objectContaining({
      actorId: actor.id,
      skillSlot: 1,
      roll: null,
    }),
  );
  expect(result.state.battle!.entities.find((e) => e.id === target.id)).toMatchObject({
    stress: 1,
    statusStacks: [{ kind: "debuff", remaining: 2 }],
  });
});
it("跨级指定实例仍拒绝伪造实例ID，不能借任务豁免破坏牌池守恒", () => {
  const deployed = applyCommand(fixture("quest:p009"), { type: "prepareDungeonMonsters" }).state;
  const state = {
    ...deployed,
    dungeon: {
      ...deployed.dungeon!,
      monsterPool: {
        ...deployed.dungeon!.monsterPool!,
        active: {
          ...deployed.dungeon!.monsterPool!.active!,
          monsters: deployed.dungeon!.monsterPool!.active!.monsters.map((m) => ({
            ...m,
            instanceId: "fake",
          })),
        },
      },
    },
  };
  const result = applyCommand(state, { type: "startDungeonBattle" });
  expect(result.state).toBe(state);
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
});

it.each([
  ["quest:p009", "Bone Bearer", "monster_medium:p016", "3 级", true],
  ["quest:p013", "Bone Captain", "monster_large:p001", "Life +20", false],
])(
  "%s 任务指定生成：不洗牌、单怪部署、RNG 不变、按已批计划入场",
  (id, name, cardId, detail, outsidePool) => {
    const state = fixture(id),
      beforeCursor = state.dungeon!.cursor;
    const result = applyCommand(state, { type: "prepareDungeonMonsters" });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    const active = result.state.dungeon!.monsterPool!.active!;
    expect(active.monsters).toHaveLength(1);
    expect(active.monsters[0]).toMatchObject({
      cardId,
      stanceSlots: name === "Bone Captain" ? 2 : 1,
    });
    expect(active.blockedReason).toContain("按已批字段检查后入场");
    expect(active.blockedReason).toContain(detail);
    expect(result.state.dungeon!.cursor).toBe(beforeCursor);
    expect(readQuestMonsterPlanAtRoom(result.state.dungeon!)!.printedMonsterLevel).toBe(
      id === "quest:p009" ? 3 : null,
    );
    if (outsidePool) {
      expect(questMonsterOutsidePoolInstanceIds(result.state.dungeon!)).toEqual([
        active.monsters[0]!.instanceId,
      ]);
    }
    const battle = applyCommand(result.state, { type: "startDungeonBattle" });
    expect(
      battle.events.filter((e) => e.type === "commandRefused"),
      JSON.stringify(battle.events),
    ).toEqual([]);
    expect(battle.state.battle!.entities.filter((e) => e.side === "monster")).toHaveLength(1);
    const monster = battle.state.battle!.entities.find((e) => e.side === "monster")!;
    const printed = sources.catalog.monsters.find((c) => c.id === cardId)!;
    expect(monster.life).toBe(printed.life + (id === "quest:p013" ? 20 : 0));
    expect(monster.dodge).toBe(printed.dodge + (id === "quest:p013" ? 2 : 0));
    expect(questMonsterDeploymentHold(result.state.dungeon!)).toBeUndefined();
  },
);

it("未部署时 prepareDungeonMonsters 仍拒绝普通抽牌", () => {
  const state = fixture("quest:p009");
  const hold = questMonsterDeploymentHold(state.dungeon!);
  expect(hold).toContain("不能用普通随机遭遇替代");
  const random = applyCommand(
    {
      ...state,
      dungeon: {
        ...state.dungeon!,
        questDistribution: { ...state.dungeon!.questDistribution!, questId: "quest:p005" },
      },
    },
    { type: "prepareDungeonMonsters" },
  );
  expect(random.events.some((e) => e.type === "commandRefused")).toBe(false);
});
