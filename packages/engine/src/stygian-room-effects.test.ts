import { expect, it } from "vitest";
import rooms from "../../data/normalized/corebox/stygian_rooms.json";
import { basicQuests } from "../../data/src/basic-quests";
import type { BattleArea, BattleEntity } from "./battle";
import { applySpikedPit } from "./battle-spiked-pit";
import { endRoundInvocation } from "./battle-invocation";
import { applyHeroTeleporterMoveStress } from "./battle-teleporters";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { objectiveRoomBattleAreas } from "./dungeon-objective";
import { roomTileBattleAreas } from "./battle-monster-movement";
import { readRoomTile } from "./room-tile-selection";
import { readActiveStygianRoom, stygianRoomBattleAreas } from "./stygian-room-effects";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { roomEffectFixture } from "./test-helpers/room-effects";

const dungeon = createCoreDungeonQuest(
  7,
  "quest:p001",
  "stygian",
  coreParty,
  coreQuestSources,
).dungeon!;
function room(page: number) {
  const card = rooms.cards[page - 1]!;
  const d = {
    ...dungeon,
    roomCards: {
      ...dungeon.roomCards!,
      active: { roomId: dungeon.position, cardId: card.replacesCardId, blockedReason: "" },
    },
  };
  const selected = readRoomTile(d.roomCards.cards.find((c) => c.id === card.replacesCardId));
  if (selected.status !== "matched") throw new Error(`Stygian p${page} 缺少正式板块`);
  const standard = roomTileBattleAreas(selected.tile);
  return { d, standard, areas: stygianRoomBattleAreas(standard, d) };
}

it.each(rooms.cards)("$name 绑定正式板块并覆盖至少一个实际区域", (card) => {
  const { d, standard, areas } = room(card.source.page);
  expect(readActiveStygianRoom(d)?.id).toBe(card.id);
  expect(areas).not.toEqual(standard);
  expect(areas.map((a) => [a.id, a.capacity, a.adjacent])).toEqual(
    standard.map((a) => [a.id, a.capacity, a.adjacent]),
  );
  expect(stygianRoomBattleAreas(standard, { ...d, mode: "standard" })).toBe(standard);
});

const e = (state: GameState, id = "h0") => state.battle!.entities.find((actor) => actor.id === id)!;
const endHero = (state: GameState) => {
  const b = state.battle!;
  return applyCommand(
    {
      ...state,
      battle: {
        ...b,
        encounter: {
          ...b.encounter!,
          turn: { type: "hero", actorId: "h0", actions: 1, usedSkillIds: [] },
        },
      },
    },
    { type: "changeStance", actorId: "h0", direction: "backward" },
  );
};
const fixture = (
  heroArea: Partial<BattleArea> = {},
  monsterArea: Partial<BattleArea> = {},
  hero: Partial<BattleEntity> = {},
) =>
  roomEffectFixture(
    [
      { ...heroArea, id: "E", elevation: "normal", capacity: 4, adjacent: ["G"] },
      { id: "G", elevation: "normal", capacity: 4, adjacent: ["E", "C"] },
      { ...monsterArea, id: "C", elevation: "normal", capacity: 4, adjacent: ["G"] },
    ],
    { wounds: 0, ...hero },
  );
const endMonster = (state: GameState, wounds = 0) => {
  const b = state.battle!;
  return applyCommand(
    {
      ...state,
      battle: {
        ...b,
        entities: b.entities.map((entity) => (entity.id === "m" ? { ...entity, wounds } : entity)),
        encounter: { ...b.encounter!, turn: { type: "monster", actorId: "m" } },
      },
    },
    { type: "finishMonsterTurn", actorId: "m" },
  );
};

it.each([1, 5])("p%i 英雄回合结束压力 +2", (page) => {
  const area = room(page).areas.find((a) => a.endTurnStress === 2)!;
  expect(e(endHero(fixture(area)).state).stress).toBe(2);
});

it("p03 III 级英雄先治疗 9，再承受压力 1。净化前两项均停用", () => {
  const { d, areas } = room(3);
  const area = areas.find((a) => a.endTurnHealPerHeroLevel)!;
  const result = endHero(fixture(area, {}, { heroLevel: 3, wounds: 12 }));
  expect(e(result.state)).toMatchObject({ wounds: 3, stress: 1 });
  const relevant = result.events.filter((event) =>
    ["heroHealthResolved", "areaStressResolved"].includes(event.type),
  );
  expect(relevant.map((event) => event.type)).toEqual(["heroHealthResolved", "areaStressResolved"]);
  const purify = basicQuests.find((quest) => quest.id === "quest:p010")!;
  const disabled = objectiveRoomBattleAreas(areas, {
    ...d,
    questDistribution: purify.distribution,
  });
  expect(disabled.find((a) => a.id === area.id)).not.toHaveProperty("endTurnStress");
  expect(disabled.find((a) => a.id === area.id)).not.toHaveProperty("endTurnHeal");
});

it("p04 按地牢等级治疗怪物，尖刺坑只伤英雄", () => {
  const { d, standard } = room(4);
  const areas = stygianRoomBattleAreas(standard, {
    ...d,
    explorationSetup: { ...d.explorationSetup!, dungeonLevel: 2 },
  });
  const pit = areas.find((a) => a.spikedPit)!;
  const heal = areas.find((a) => a.circleOfPower)!;
  expect(applySpikedPit(fixture(pit, pit), "m")).toBeNull();
  expect(e(applySpikedPit(fixture(pit), "h0")!.state).wounds).toBe(3);
  expect(e(endMonster(fixture({}, heal), 9).state, "m").wounds).toBe(1);
});

it("p06 Hide and Heal 先承受压力 3，再清除所有伤口", () => {
  const area = room(6).areas.find((a) => a.hideAndHeal)!;
  const result = applyCommand(fixture(area, {}, { wounds: 8 }), {
    type: "hideAndHeal",
    actorId: "h0",
  });
  expect(e(result.state)).toMatchObject({ wounds: 0, stress: 3 });
});

it("p07 进区不清除状态，结束回合清五种状态并保留 Buff", () => {
  const area = room(7).areas.find((a) => a.endTurnAncestorCleanse)!;
  expect(area.ancestorGlory).toBeUndefined();
  const state = fixture(
    area,
    {},
    {
      statusStacks: [
        { kind: "mark", remaining: 2 },
        { kind: "buff", remaining: 2 },
        { kind: "bleed", amount: 1, remaining: 2 },
      ],
    },
  );
  expect(e(state).statusStacks).toHaveLength(3);
  expect(e(endHero(state).state).statusStacks?.map((stack) => stack.kind)).toEqual(["buff"]);
});

it("p08 轮末在星区有怪物时，所有英雄压力 +4", () => {
  const area = room(8).areas.find((a) => a.invokingAbyss)!;
  const result = endRoundInvocation({ state: fixture({}, area), events: [] });
  expect(
    result.state
      .battle!.entities.filter((actor) => actor.side === "hero")
      .map((actor) => actor.stress),
  ).toEqual([4, 4, 4, 4]);
});

it("p09 每个负面怪癖压力 +2，正面怪癖仍按英雄等级治疗", () => {
  const area = room(9).areas.find((a) => a.feelingThePresence)!;
  const result = endHero(
    fixture(area, {}, { wounds: 6, quirkIds: ["quirk:p001", "quirk:p018"], heroLevel: 2 }),
  );
  expect(e(result.state)).toMatchObject({ wounds: 4, stress: 2 });
});

it("p13 站立时维持 Acc −3，回合结束施加枯萎 1·3t", () => {
  const area = room(13).areas.find((a) => a.toxicVapors)!;
  const state = fixture(area);
  expect(e(state).statusStacks ?? []).toEqual([]);
  expect(e(endHero(state).state).statusStacks).toContainEqual({
    kind: "blight",
    amount: 1,
    remaining: 3,
  });
});

it("p14 怪物在星区结束回合，每名英雄承受 10 伤害", () => {
  const area = room(14).areas.find((a) => a.eldritchPower)!;
  expect(e(endMonster(fixture({}, area)).state).wounds).toBe(10);
});

it("p15 移动逐次经过星区，各承受压力 2", () => {
  const area = room(15).areas.find((a) => a.teleporter)!;
  const result = applyHeroTeleporterMoveStress(fixture(area), "h0", ["E", "G", "E"], []);
  expect(e(result.state).stress).toBe(4);
});

it("p17 怪物治疗 5，英雄压力 +2，每个负面怪癖另承受 5 个伤口", () => {
  const area = room(17).areas.find((a) => a.riteOfTheChosen)!;
  const result = endMonster(
    fixture({}, area, { protection: true, quirkIds: ["quirk:p018", "quirk:p019"] }),
    8,
  );
  expect(e(result.state)).toMatchObject({ stress: 2, wounds: 10 });
  expect(e(result.state, "h1")).toMatchObject({ stress: 2, wounds: 0 });
  expect(e(result.state, "m").wounds).toBe(3);
});
