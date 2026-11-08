import { nextBattleRoll } from "../battle-roll";
import { expect, it } from "vitest";
import geometry from "../../../data/normalized/corebox/room_tile_geometry.json";
import rooms from "../../../data/normalized/corebox/room.json";
import { selectRoomTile } from "../../../data/src/normalize/room-tile-selection";
import { savedCommandSchema } from "../../../data/src/quest-save";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "./face-the-threat-embark-runtime";
import { resolveEncounterBossScriptId, encounterForcesRetreatAfterRound } from "./encounter-rules";
import { NECROMANCER_I_SCRIPT_ID } from "./necromancer-i";
import { RUINS_COMBAT_LEVELS } from "./ruins-combat-levels";

/** 显式目标房入口夹具，不声称已自然走过走廊或完成Boss任务。 */
function atObjective(): GameState {
  const s = createCoreDungeonQuest(17, "quest:p019", "standard", coreParty, coreQuestSources, true);
  const d = s.dungeon!;
  const context = {
    campaignLevel: 1 as const,
    activeBossThreatScriptId: NECROMANCER_I_SCRIPT_ID,
    imminentThreatDescriptionCardId: "boss_ability:p001",
  };
  const entered: GameState = {
    ...s,
    dungeon: {
      ...d,
      ...context,
      phase: "awaitingRoom",
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      faceTheThreatEmbarkPlan: {
        ...requireFaceTheThreatEmbarkPlanForSandbox(context),
        roomPlacement: "edgeRoomsR30",
      },
    },
  };
  return ok(entered, { type: "prepareDungeonBattle" }).state;
}
function ok(state: GameState, command: Command) {
  const r = applyCommand(state, command);
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return r;
}
const command = { type: "deployNecromancerI" } as const;

it("R-166/172：真实8区/11通路、Boss进攻A、四英雄G，部署不掷骰/洗先攻/发奖励", () => {
  const s = atObjective(),
    before = structuredClone(s),
    d = s.dungeon!;
  const r = ok(s, command),
    b = r.state.battle!;
  expect(b.areas).toHaveLength(8);
  expect(b.areas.find((a) => a.id === "A")).toMatchObject({
    capacity: 3,
    elevation: "high",
    adjacent: ["C"],
  });
  expect(b.areas.reduce((n, a) => n + a.adjacent.length, 0)).toBe(22);
  expect(b.entities.filter((e) => e.side === "hero").map((e) => e.areaId)).toEqual([
    "G",
    "G",
    "G",
    "G",
  ]);
  expect(b.entities.filter((e) => e.side === "monster")).toMatchObject([
    {
      monsterCardId: "monster_medium:p089",
      areaId: "A",
      stance: "aggressive",
      stanceSlots: 1,
      life: 77,
    },
  ]);
  expect(b.entities).toHaveLength(5);
  expect(b.encounter).toBeUndefined();
  expect(b.rngCursor).toBe(d.cursor);
  expect(b.choiceCursor).toBe(d.decision);
  expect(r.state.dungeon!.heroes).toEqual(d.heroes);
  expect(r.state.dungeon!.gold).toBe(d.gold);
  expect(r.state.dungeon!.roomCards!.active!.tileId).toBe("room_tile:p006:back");
  expect(r.state.dungeon!.monsterPool).toEqual(d.monsterPool);
  expect(b.monsters!.some((c) => c.id === "monster_medium:p040")).toBe(true);
  expect(r).toEqual(applyCommand(JSON.parse(JSON.stringify(s)), command));
  expect(s).toEqual(before);
});

it("英雄实际属性、压力/伤口、疾病怪癖和状态沿用；不修复无效装备", () => {
  const s = atObjective(),
    d = s.dungeon!;
  const changed = {
    ...s,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) =>
        i
          ? h
          : {
              ...h,
              wounds: 4,
              stress: 3,
              quirkIds: ["quirk:p001"],
              statusStacks: [{ kind: "bleed" as const, amount: 1, remaining: 2 }],
            },
      ),
    },
  };
  const b = ok(changed, command).state.battle!;
  expect(b.entities[0]).toMatchObject({
    wounds: 4,
    stress: 3,
    quirkIds: ["quirk:p001"],
    areaId: "G",
    statusStacks: changed.dungeon.heroes[0]!.statusStacks,
  });
  const bad = {
    ...s,
    dungeon: { ...d, heroes: d.heroes.map((h, i) => (i ? h : { ...h, skillIds: [] })) },
  };
  expect(applyCommand(bad, command).state).toBe(bad);
});

it("显式startBattle后接既有Boss先攻/不限四轮规则，部署不可重复", () => {
  const deployed = ok(atObjective(), command).state;
  expect(applyCommand(deployed, command).state).toBe(deployed);
  const s = ok(deployed, { type: "startBattle" }).state;
  expect(resolveEncounterBossScriptId(s)).toBe(NECROMANCER_I_SCRIPT_ID);
  expect(s.battle!.encounter!.deck.filter((side) => side === "monster")).toHaveLength(1);
  expect(s.battle!.encounter!.deck.filter((side) => side === "hero")).toHaveLength(4);
  expect(encounterForcesRetreatAfterRound(s, 4)).toBe(false);
});

it("I级专用，不接受其它Boss/等级、旧无边缘房标记、错房或篡改出征战斗卡", () => {
  const s = atObjective(),
    d = s.dungeon!,
    plan = d.faceTheThreatEmbarkPlan!;
  const { roomPlacement: _placement, ...legacyPlan } = plan;
  void _placement;
  const bad: GameState[] = [
    { ...s, dungeon: { ...d, campaignLevel: 2 } },
    { ...s, dungeon: { ...d, cursor: -1 } },
    { ...s, dungeon: { ...d, activeBossThreatScriptId: RUINS_COMBAT_LEVELS.prophet[0].script } },
    { ...s, dungeon: { ...d, imminentThreatDescriptionCardId: "boss_ability:p002" } },
    {
      ...s,
      dungeon: { ...d, faceTheThreatEmbarkPlan: legacyPlan },
    },
    {
      ...s,
      dungeon: {
        ...d,
        roomCards: { ...d.roomCards!, active: { ...d.roomCards!.active!, cardId: "room:p011" } },
      },
    },
    {
      ...s,
      dungeon: {
        ...d,
        faceTheThreatEmbarkPlan: {
          ...plan,
          combatEntry: { ...plan.combatEntry, combatMonsterCardId: "monster_medium:p090" },
        },
      },
    },
    { ...s, dungeon: { ...d, mustLeaveRoomId: d.position } },
    {
      ...s,
      dungeon: {
        ...d,
        pending: { id: "pending", prompt: "待选", options: [{ id: "x", label: "x" }] },
      },
    },
  ];
  for (const state of bad) {
    const before = structuredClone(state),
      r = applyCommand(state, command);
    expect(r.state).toBe(state);
    expect(r.events[0]!.type).toBe("commandRefused");
    expect(state).toEqual(before);
  }
});

it("缺Boss/召唤卡、缺Dodge、缺房间目录、重复姿态均原子拒绝", () => {
  const s = atObjective(),
    d = s.dungeon!,
    catalog = d.battleCatalog!;
  for (const missing of ["monster_medium:p089", "monster_medium:p040"]) {
    const bad = {
      ...s,
      dungeon: {
        ...d,
        battleCatalog: { ...catalog, monsters: catalog.monsters.filter((c) => c.id !== missing) },
      },
    };
    expect(applyCommand(bad, command).state).toBe(bad);
  }
  const bad: GameState[] = [
    {
      ...s,
      dungeon: {
        ...d,
        battleCatalog: {
          ...catalog,
          monsters: catalog.monsters.map((c) =>
            c.id === "monster_medium:p089" ? { ...c, header_unlabeled_numbers: [] } : c,
          ),
        },
      },
    },
    { ...s, dungeon: { ...d, roomCards: { ...d.roomCards!, cards: [] } } },
    { ...s, dungeon: { ...d, heroes: d.heroes.map((h) => ({ ...h, stance: "aggressive" })) } },
  ];
  for (const state of bad) expect(applyCommand(state, command).state).toBe(state);
});

it("命令可序列化重放，普通Boss选择与usable/combatReady停点不被打开", () => {
  expect(savedCommandSchema.safeParse(command).success).toBe(true);
  const s = atObjective();
  const replay = (state: GameState) =>
    [command, { type: "startBattle" } as const].reduce((state, c) => ok(state, c).state, state);
  expect(replay(JSON.parse(JSON.stringify(s)))).toEqual(replay(s));
  expect(geometry.tiles.filter((t) => t.usable)).toHaveLength(17);
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p010"),
      geometry,
    ).status,
  ).toBe("refused");
});

it("真实房间衔接自动选招、移动和Six Feet Under召唤；满G区交玩家选择挤占", () => {
  let state = ok(ok(atObjective(), command).state, { type: "startBattle" }).state;
  const b = state.battle!;
  const cursor = Array.from({ length: 300 }, (_, i) => i + b.rngCursor).find(
    (i) => nextBattleRoll(state.seed, i) === 7 && nextBattleRoll(state.seed, i + 1) === 1,
  )!;
  expect(cursor).toBeDefined();
  state = {
    ...state,
    battle: {
      ...b,
      rngCursor: cursor,
      encounter: { ...b.encounter!, turn: { type: "monster", actorId: "boss:necromancer:1" } },
    },
  };
  const settle = (s: GameState): GameState => {
    for (let i = 0; (s.battle!.pending || s.battle!.shuffleIntents.length) && i < 20; i++) {
      const choice = s.battle!.pending?.choice;
      s = ok(
        s,
        choice
          ? { type: "resolveChoice", choiceId: choice.id, optionId: choice.options[0]!.id }
          : { type: "resolveShuffles" },
      ).state;
    }
    expect(s.battle!.pending).toBeNull();
    return s;
  };
  state = ok(state, { type: "prepareMonsterAction", actorId: "boss:necromancer:1" }).state;
  expect(state.battle!.monsterAction!.skillSlot).toBe(3);
  state = settle(ok(state, { type: "moveMonsterToRange", actorId: "boss:necromancer:1" }).state);
  const action = state.battle!.monsterAction!;
  state = settle(
    ok(state, {
      type: "playMonsterSkill",
      actorId: action.actorId,
      targetId: action.targetId,
      skillSlot: action.skillSlot,
    }).state,
  );
  expect(
    state.battle!.entities.filter((e) => e.monsterCardId === "monster_medium:p040" && !e.dead),
  ).toHaveLength(1);
  expect(
    state.battle!.entities.find((e) => e.monsterCardId === "monster_medium:p040")!.areaId,
  ).toBe("G");
  expect(state.battle!.entities.filter((e) => e.side === "hero" && e.areaId !== "G")).toHaveLength(
    1,
  );
});
