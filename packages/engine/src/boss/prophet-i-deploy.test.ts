import { nextBattleRoll } from "../battle-roll";
import { resolveProphetAreaIdForD10Roll } from "./prophet-i-combat-runtime";
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
import { PROPHET_I_SCRIPT_ID } from "./prophet-i";
import { RUINS_COMBAT_LEVELS } from "./ruins-combat-levels";

/** 显式目标房入口夹具，不声称已自然走过走廊或完成Boss任务。 */
function atObjective(): GameState {
  const s = createCoreDungeonQuest(17, "quest:p019", "standard", coreParty, coreQuestSources, true);
  const d = s.dungeon!;
  const context = {
    campaignLevel: 1 as const,
    activeBossThreatScriptId: PROPHET_I_SCRIPT_ID,
    imminentThreatDescriptionCardId: "boss_ability:p007",
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
const command = { type: "deployProphetI" } as const;

it("R-167/173：真实8区/12通路、Boss进攻E、四姿态部署，部署不掷骰/洗先攻/发奖励", () => {
  const s = atObjective(),
    before = structuredClone(s),
    d = s.dungeon!;
  const r = ok(s, command),
    b = r.state.battle!;
  expect(b.areas).toHaveLength(8);
  expect(b.areas.find((a) => a.id === "A")).toMatchObject({
    capacity: 4,
    elevation: "normal",
    adjacent: ["B", "D"],
  });
  expect(b.areas.reduce((n, a) => n + a.adjacent.length, 0)).toBe(24);
  expect(b.entities.filter((e) => e.side === "hero").map((e) => e.areaId)).toEqual([
    "C",
    "H",
    "H",
    "D",
  ]);
  expect(b.entities.filter((e) => e.side === "monster")).toMatchObject([
    {
      monsterCardId: "monster_large:p005",
      areaId: "E",
      stance: "aggressive",
      stanceSlots: 1,
    },
  ]);
  expect(b.entities).toHaveLength(5);
  expect(b.encounter).toBeUndefined();
  expect(b.rngCursor).toBe(d.cursor);
  expect(b.choiceCursor).toBe(d.decision);
  expect(r.state.dungeon!.heroes).toEqual(d.heroes);
  expect(r.state.dungeon!.gold).toBe(d.gold);
  expect(r.state.dungeon!.roomCards!.active!.tileId).toBe("room_tile:p006:front");
  expect(r.state.dungeon!.monsterPool).toEqual(d.monsterPool);
  expect(b.prophetRoomD10AreaTable).toHaveLength(8);
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
    areaId: "C",
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
  expect(resolveEncounterBossScriptId(s)).toBe(PROPHET_I_SCRIPT_ID);
  expect(s.battle!.encounter!.deck.filter((side) => side === "monster")).toHaveLength(3);
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
    {
      ...s,
      dungeon: { ...d, activeBossThreatScriptId: RUINS_COMBAT_LEVELS.necromancer[0].script },
    },
    { ...s, dungeon: { ...d, imminentThreatDescriptionCardId: "boss_ability:p008" } },
    {
      ...s,
      dungeon: { ...d, faceTheThreatEmbarkPlan: legacyPlan },
    },
    {
      ...s,
      dungeon: {
        ...d,
        roomCards: { ...d.roomCards!, active: { ...d.roomCards!.active!, cardId: "room:p010" } },
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

it("缺Boss、缺Dodge、缺房间目录、重复姿态均原子拒绝", () => {
  const s = atObjective(),
    d = s.dungeon!,
    catalog = d.battleCatalog!;
  for (const missing of ["monster_large:p005"]) {
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
            c.id === "monster_large:p005" ? { ...c, header_unlabeled_numbers: [] } : c,
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
      rooms.cards.find((c) => c.id === "room:p011"),
      geometry,
    ).status,
  ).toBe("refused");
});

it("真实橙色标记覆盖十骰面；首次行动放四长椅、第三次按长椅逐次落石，JSON续接确定", () => {
  const started = ok(ok(atObjective(), command).state, { type: "startBattle" }).state;
  const table = started.battle!.prophetRoomD10AreaTable;
  expect(
    Array.from({ length: 10 }, (_, i) => resolveProphetAreaIdForD10Roll(i + 1, table)),
  ).toEqual(["A", "A", "B", "C", "D", "E", "F", "F", "G", "H"]);
  // 仅固定当前行动者的机制夹具；房间、实体与骰序全部来自真实部署。
  const first: GameState = {
    ...started,
    battle: {
      ...started.battle!,
      encounter: {
        ...started.battle!.encounter!,
        turn: { type: "monster", actorId: "boss:prophet:1" },
      },
    },
  };
  const placed = ok(first, { type: "prepareMonsterAction", actorId: "boss:prophet:1" });
  const b = placed.state.battle!;
  expect(b.woodenPews).toHaveLength(4);
  expect(b.rngCursor).toBe(first.battle!.rngCursor + 4);
  expect(b.woodenPews!.map((p) => p.areaId)).toEqual(
    Array.from({ length: 4 }, (_, i) =>
      resolveProphetAreaIdForD10Roll(
        nextBattleRoll(first.seed, first.battle!.rngCursor + i),
        table,
      ),
    ),
  );
  const third: GameState = {
    ...placed.state,
    battle: {
      ...b,
      prophetActionsThisRound: 2,
      encounter: { ...b.encounter!, turn: { type: "monster", actorId: "boss:prophet:1" } },
    },
  };
  const cast = { type: "prepareMonsterAction", actorId: "boss:prophet:1" } as const;
  const result = ok(third, cast);
  expect(result.state.battle!.rngCursor).toBe(b.rngCursor + 4);
  expect(result.state.battle!.prophetActionsThisRound).toBe(3);
  expect(result).toEqual(applyCommand(JSON.parse(JSON.stringify(third)), cast));
});
