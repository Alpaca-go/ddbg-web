import { readFileSync } from "node:fs";
import { describe, expect, it, beforeEach } from "vitest";
import { createBattleState, type BattleEntity, type BattleState } from "../battle";
import { applyCommand, type GameState } from "../command";
import { finishTurn } from "../encounter";
import { normalizedMonsterLargeFileSchema } from "../../../data/src/normalize/schema";
import { createLootState } from "../loot";
import { nextBattleRoll } from "../battle-roll";
import type { SkillStance } from "../hero-skill";
import type { MonsterCardView } from "../monster-skill";
import {
  PROPHET_I_COMBAT_MONSTER_CARD_ID,
  PROPHET_I_SCRIPT_ID,
  PROPHET_I_WOODEN_PEW_SUMMON_TOKEN_ID,
  PROPHET_ROOM_D10_MARKERS,
  applyProphetCalamitousPrognostication,
  applyProphetRubbleOfRuin,
  clearBossScriptsForTest,
  countWoodenPewsInArea,
  ensureProphetIBossScriptRegistered,
  getBossScript,
  prophetActionIndexBeforeTurn,
  prophetCalamitousShouldReplaceSkill,
  prophetD10RollMatchesMarker,
  prophetRubbleShouldReplaceSkill,
  prophetRoomD10AreaTableFromMarkers,
  PROPHET_I_RUBBLE_SKILL_SLOT,
  PROPHET_I_FIRST_ACTION_INDEX,
  PROPHET_I_SECOND_ACTION_INDEX,
  PROPHET_I_THIRD_ACTION_INDEX,
  expandProphetIInitiativeDeckSides,
  prophetSecondActionUsesDefaultSkillSelection,
  prophetShouldEnterActedIdsAfterTurn,
  readProphetICalamitousEnabled,
  readProphetIRubbleEnabled,
  readProphetIWwoodenPewPlan,
  resolveProphetAreaIdForD10Roll,
  FACE_THE_THREAT_QUEST_ID,
} from "./index";

const largeCards = normalizedMonsterLargeFileSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../../data/normalized/corebox/monster_large.json", import.meta.url), {
      encoding: "utf8",
    }),
  ),
).cards;

const prophetCardRaw = largeCards.find((card) => card.id === PROPHET_I_COMBAT_MONSTER_CARD_ID)!;
const prophetLife = "life" in prophetCardRaw ? prophetCardRaw.life : 79;

const prophetCardView = {
  ...(prophetCardRaw as MonsterCardView),
  id: prophetCardRaw.id,
  name: prophetCardRaw.name,
  life: prophetLife,
  dodge: 0,
  speed: 1,
  verification: { unverified: false },
  skills: prophetCardRaw.skills,
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
  typeTags: ["Unholy"],
} as MonsterCardView;

const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

const markerAreas = Object.fromEntries(
  PROPHET_ROOM_D10_MARKERS.map((marker, index) => [marker, `pew-area-${index}`]),
) as Record<(typeof PROPHET_ROOM_D10_MARKERS)[number], string>;

function prophetBossDungeon(): GameState["dungeon"] {
  return {
    phase: "inBattle",
    cursor: 0,
    heroes: [],
    questDistribution: { questId: FACE_THE_THREAT_QUEST_ID, campaignLevel: 1 },
    activeBossThreatScriptId: PROPHET_I_SCRIPT_ID,
  } as unknown as GameState["dungeon"];
}

function prophetBattle(): GameState {
  const heroes: BattleEntity[] = stances.map((stance, index) => ({
    id: `h${index}`,
    side: "hero",
    areaId: "pew-area-0",
    stance,
    hero: "CRUSADER",
    skillIds: [],
    wounds: 0,
    stress: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));

  const battle = createBattleState(42, {
    entities: [
      ...heroes,
      {
        id: "prophet",
        side: "monster",
        hero: null,
        monsterCardId: prophetCardView.id,
        life: prophetLife,
        dodge: 0,
        areaId: "pew-area-0",
        stance: "aggressive",
        stanceSlots: 2,
        shuffleResist: false,
        wounds: 0,
        skillIds: [],
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
    ],
    areas: PROPHET_ROOM_D10_MARKERS.map((_, index) => ({
      id: `pew-area-${index}`,
      elevation: "normal" as const,
      adjacent: [],
      capacity: 4,
    })),
    prophetRoomD10AreaTable: prophetRoomD10AreaTableFromMarkers(markerAreas),
    skills: [],
    monsters: [prophetCardView],
    light: 5,
    heroStats: [],
    lootPool: createLootState(),
  });

  return {
    ...battle,
    dungeon: prophetBossDungeon(),
  } as GameState;
}

describe("Prophet I · Calamitous Prognostication 战斗最小运行时", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureProphetIBossScriptRegistered();
  });

  it("d10 标记匹配 room:p011 印刷范围", () => {
    expect(prophetD10RollMatchesMarker(1, "1-2")).toBe(true);
    expect(prophetD10RollMatchesMarker(2, "1-2")).toBe(true);
    expect(prophetD10RollMatchesMarker(8, "7-8")).toBe(true);
    expect(prophetD10RollMatchesMarker(4, "3")).toBe(false);
    expect(resolveProphetAreaIdForD10Roll(5, prophetRoomD10AreaTableFromMarkers(markerAreas))).toBe(
      markerAreas["5"],
    );
  });

  it("summon(calamitousWoodenPew) 与 calamitousPrognostication 钩子已声明", () => {
    const script = getBossScript(PROPHET_I_SCRIPT_ID)!;
    expect(readProphetICalamitousEnabled(script)).toBe(true);
    for (const pewIndex of [0, 1, 2, 3] as const) {
      const plan = readProphetIWwoodenPewPlan(script, pewIndex);
      expect(plan?.summonMonsterCardId).toBe(PROPHET_I_WOODEN_PEW_SUMMON_TOKEN_ID);
      expect(plan?.miniaturePlacement).toBe("areaD10Marker");
      expect(plan?.woodenPewIndex).toBe(pewIndex);
    }
  });

  it("Prophet I · Calamitous Prognostication：Wooden Pew 区域 d10 写入", () => {
    let state = prophetBattle();
    state = {
      ...state,
      battle: {
        ...state.battle!,
        encounter: {
          round: 1,
          deck: ["hero"],
          actedIds: [],
          turn: { type: "monster", actorId: "prophet" },
        },
      },
    };
    expect(prophetCalamitousShouldReplaceSkill(state, "prophet")).toBe(true);

    const result = applyProphetCalamitousPrognostication(state, "prophet");
    expect(result.state.battle!.woodenPews).toHaveLength(4);
    for (const pew of result.state.battle!.woodenPews ?? []) {
      expect(pew.areaId.startsWith("pew-area-")).toBe(true);
    }
    expect(
      result.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("Wooden Pew 区域 d10"),
      ),
    ).toBe(true);
    expect(countWoodenPewsInArea(result.state.battle!, "pew-area-0")).toBeGreaterThanOrEqual(0);
  });

  it("prepareMonsterAction 路径触发 Calamitous 并写入木长椅", () => {
    let state = prophetBattle();
    state = {
      ...state,
      battle: {
        ...state.battle!,
        encounter: {
          round: 1,
          deck: ["hero"],
          actedIds: [],
          turn: { type: "monster", actorId: "prophet" },
        },
      },
    };
    const result = applyCommand(state, { type: "prepareMonsterAction", actorId: "prophet" });
    expect(result.state.battle!.woodenPews).toHaveLength(4);
    expect(prophetCalamitousShouldReplaceSkill(result.state, "prophet")).toBe(false);
  });

  it("本回合已 Calamitous 后不再替代选招", () => {
    let state = prophetBattle();
    state = {
      ...state,
      battle: {
        ...state.battle!,
        prophetCalamitousUsedThisRound: true,
        encounter: {
          round: 1,
          deck: ["hero"],
          actedIds: [],
          turn: { type: "monster", actorId: "prophet" },
        },
      },
    };
    expect(prophetCalamitousShouldReplaceSkill(state, "prophet")).toBe(false);
  });
});

describe("Prophet I · Rubble of Ruin 战斗最小运行时", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureProphetIBossScriptRegistered();
  });

  it("rubbleOfRuin 钩子与卡面 slot 3 已声明", () => {
    const script = getBossScript(PROPHET_I_SCRIPT_ID)!;
    expect(readProphetIRubbleEnabled(script)).toBe(true);
    expect(PROPHET_I_RUBBLE_SKILL_SLOT).toBe(3);
    expect(prophetCardRaw.skills.find((skill) => skill.slot === 3)?.name).toBe("Rubble of Ruin");
  });

  it("Prophet I · Rubble of Ruin：第 3 行动每木长椅独立攻击", () => {
    let state = prophetBattle();
    state = {
      ...state,
      battle: {
        ...state.battle!,
        woodenPews: [
          { areaId: "pew-area-0", pewIndex: 0 },
          { areaId: "pew-area-1", pewIndex: 1 },
        ],
        prophetActionsThisRound: PROPHET_I_THIRD_ACTION_INDEX,
        rngCursor: 0,
        encounter: {
          round: 1,
          deck: ["hero"],
          actedIds: [],
          turn: { type: "monster", actorId: "prophet" },
        },
      },
    };
    expect(prophetActionIndexBeforeTurn(state.battle!)).toBe(2);
    expect(prophetRubbleShouldReplaceSkill(state, "prophet")).toBe(true);

    const heroBefore = state.battle!.entities.find((entity) => entity.id === "h0")!.wounds;
    const result = applyProphetRubbleOfRuin(state, "prophet");
    expect(result.events.some((event) => event.type === "monsterSkillTargetsResolved")).toBe(true);
    expect(
      result.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("Rubble of Ruin"),
      ),
    ).toBe(true);
    const heroAfter = result.state.battle!.entities.find((entity) => entity.id === "h0")!.wounds;
    expect(heroAfter).toBeGreaterThanOrEqual(heroBefore);
    expect(prophetActionIndexBeforeTurn(result.state.battle!)).toBe(3);
  });

  it("prepareMonsterAction 路径在第 3 行动触发 Rubble", () => {
    let state = prophetBattle();
    state = {
      ...state,
      battle: {
        ...state.battle!,
        woodenPews: [{ areaId: "pew-area-0", pewIndex: 0 }],
        prophetActionsThisRound: PROPHET_I_THIRD_ACTION_INDEX,
        encounter: {
          round: 1,
          deck: ["hero"],
          actedIds: [],
          turn: { type: "monster", actorId: "prophet" },
        },
      },
    };
    const result = applyCommand(state, { type: "prepareMonsterAction", actorId: "prophet" });
    expect(
      result.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("Rubble of Ruin"),
      ),
    ).toBe(true);
  });
});

describe("Prophet I · 先攻 3 洗入与多行动 actedIds", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureProphetIBossScriptRegistered();
  });

  it("单只 Prophet 时先攻堆补足 3 张 monster 侧", () => {
    const base = prophetBattle();
    const sides = expandProphetIInitiativeDeckSides(
      base.battle!.entities.filter((entity) => !entity.dead).map((entity) => entity.side),
      base.battle!,
      base,
    );
    expect(sides.filter((side) => side === "monster")).toHaveLength(3);
    expect(sides.filter((side) => side === "hero")).toHaveLength(4);
  });

  it("startBattle 写入 3 张 monster 先攻卡", () => {
    const started = applyCommand(prophetBattle(), { type: "startBattle" });
    const deck = started.state.battle!.encounter!.deck;
    expect(deck.filter((side) => side === "monster")).toHaveLength(3);
    expect(deck.filter((side) => side === "hero")).toHaveLength(4);
  });

  it("Calamitous 后先知未进入 actedIds，prophetActionsThisRound=1", () => {
    let state = prophetBattle();
    state = {
      ...state,
      battle: {
        ...state.battle!,
        encounter: {
          round: 1,
          deck: ["monster", "hero"],
          actedIds: [],
          turn: { type: "monster", actorId: "prophet" },
        },
      },
    };
    const result = applyProphetCalamitousPrognostication(state, "prophet");
    expect(result.state.battle!.prophetActionsThisRound).toBe(1);
    expect(result.state.battle!.encounter!.actedIds).not.toContain("prophet");
    expect(prophetShouldEnterActedIdsAfterTurn(result.state, "prophet")).toBe(false);
  });
});

describe("C-013 · Prophet Room d10 绑定与正式几何停点", () => {
  const expectedMarkersByRoll = [
    "1-2",
    "1-2",
    "3",
    "4",
    "5",
    "6",
    "7-8",
    "7-8",
    "9",
    "10",
  ] as const;
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureProphetIBossScriptRegistered();
  });

  function withTable(state: GameState, table: BattleState["prophetRoomD10AreaTable"]): GameState {
    const { prophetRoomD10AreaTable: previous, ...rest } = state.battle!;
    void previous;
    return {
      ...state,
      battle: { ...rest, ...(table === undefined ? {} : { prophetRoomD10AreaTable: table }) },
    };
  }
  function firstTurn(state: GameState): GameState {
    return {
      ...state,
      battle: {
        ...state.battle!,
        encounter: {
          round: 1,
          deck: ["monster", "hero"],
          actedIds: [],
          turn: { type: "monster", actorId: "prophet" },
        },
      },
    };
  }

  it("八个绑定键与 room:p011 的已确认印刷标记一致，覆盖全部十面", () => {
    const room = JSON.parse(
      readFileSync(new URL("../../../data/normalized/corebox/room.json", import.meta.url), "utf8"),
    ).cards.find((c: { id: string }) => c.id === "room:p011");
    const printed = room.printedLines.flatMap((line: string) => {
      const marker = /^\{icon:096ea91bb9\} (.+)$/.exec(line);
      return marker ? [marker[1]] : [];
    });
    expect(printed).toEqual(PROPHET_ROOM_D10_MARKERS);
    for (let roll = 1; roll <= 10; roll++) {
      expect(
        resolveProphetAreaIdForD10Roll(roll, prophetBattle().battle!.prophetRoomD10AreaTable),
      ).toBe(markerAreas[expectedMarkersByRoll[roll - 1]!]);
    }
  });

  const valid = prophetRoomD10AreaTableFromMarkers(markerAreas);
  it.each([
    { label: "缺失", table: undefined },
    { label: "缺一组", table: valid.slice(1) },
    { label: "重复印刷标记", table: [valid[0]!, ...valid.slice(0, -1)] },
    { label: "非印刷范围", table: valid.map((e, i) => (i === 0 ? { ...e, marker: "1-10" } : e)) },
    {
      label: "不存在的战斗区",
      table: valid.map((e, i) => (i === 0 ? { ...e, areaId: "unmapped" } : e)),
    },
  ])("$label：开战与第1行动均原子拒绝，不退回普通选招或推进骰序", ({ table }) => {
    const initial = withTable(prophetBattle(), table);
    const start = applyCommand(initial, { type: "startBattle" });
    expect(start.events[0]).toMatchObject({
      type: "commandRefused",
      message: expect.stringContaining("R-048"),
    });
    expect(start.state).toBe(initial);
    const acting = firstTurn(initial);
    expect(prophetActionIndexBeforeTurn(acting.battle!)).toBe(PROPHET_I_FIRST_ACTION_INDEX);
    expect(prophetCalamitousShouldReplaceSkill(acting, "prophet")).toBe(true);
    const result = applyCommand(acting, { type: "prepareMonsterAction", actorId: "prophet" });
    expect(result.events[0]!.type).toBe("commandRefused");
    expect(result.state).toBe(acting);
    expect(result.state.battle!.rngCursor).toBe(0);
    expect(result.state.battle!.woodenPews).toBeUndefined();
    expect(result.state.battle!.monsterAction).toBeNull();
  });

  it("房间身份冲突拒绝；同一标记有两个候选落点时不取首项", () => {
    const initial = prophetBattle();
    const wrong = {
      ...initial,
      dungeon: {
        ...initial.dungeon!,
        roomCards: {
          active: { cardId: "room:p012" },
        } as unknown as NonNullable<NonNullable<GameState["dungeon"]>["roomCards"]>,
      },
    };
    const result = applyCommand(wrong, { type: "startBattle" });
    expect(result.events[0]).toMatchObject({
      type: "commandRefused",
      message: expect.stringContaining("房间身份"),
    });
    expect(result.state).toBe(wrong);
    expect(
      resolveProphetAreaIdForD10Roll(5, [...valid, { marker: "5", areaId: "pew-area-0" }]),
    ).toBeNull();
  });

  it("完整夹具绑定通过开战与4d10布置，落点可解析，输入不变且可重放", () => {
    const initial = prophetBattle();
    const before = structuredClone(initial);
    const started = applyCommand(initial, { type: "startBattle" });
    expect(started.events.some((e) => e.type === "commandRefused")).toBe(false);
    const acting = firstTurn(started.state);
    const cursor = acting.battle!.rngCursor;
    const placed = applyCommand(acting, { type: "prepareMonsterAction", actorId: "prophet" });
    expect(placed.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(placed).toEqual(
      applyCommand(acting, { type: "prepareMonsterAction", actorId: "prophet" }),
    );
    expect(initial).toEqual(before);
    expect(placed.state.battle!.rngCursor).toBe(cursor + 4);
    expect(placed.state.battle!.woodenPews?.map((p) => p.pewIndex)).toEqual([0, 1, 2, 3]);
    expect(placed.state.battle!.woodenPews?.map((p) => p.areaId)).toEqual(
      [0, 1, 2, 3].map(
        (i) => markerAreas[expectedMarkersByRoll[nextBattleRoll(acting.seed, cursor + i) - 1]!],
      ),
    );
    expect(
      placed.state.battle!.woodenPews?.every((p) =>
        acting.battle!.areas.some((a) => a.id === p.areaId),
      ),
    ).toBe(true);
    expect(placed.state.battle!.entities).toEqual(acting.battle!.entities);
    expect(placed.state.battle!.prophetActionsThisRound).toBe(1);
    const repeated = applyProphetCalamitousPrognostication(placed.state, "prophet");
    expect(repeated.events[0]!.type).toBe("commandRefused");
    expect(repeated.state).toBe(placed.state);
  });
});

describe("Prophet I · 第 2 行动默认选招", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureProphetIBossScriptRegistered();
  });

  it("第 2 行动索引走姿态骰表（非 Calamitous / Rubble）", () => {
    let state = prophetBattle();
    state = {
      ...state,
      battle: {
        ...state.battle!,
        prophetCalamitousUsedThisRound: true,
        prophetActionsThisRound: PROPHET_I_SECOND_ACTION_INDEX,
        encounter: {
          round: 1,
          deck: ["monster"],
          actedIds: [],
          turn: { type: "monster", actorId: "prophet" },
        },
      },
    };
    expect(prophetActionIndexBeforeTurn(state.battle!)).toBe(1);
    expect(prophetSecondActionUsesDefaultSkillSelection(state.battle!, "prophet")).toBe(true);
    expect(prophetCalamitousShouldReplaceSkill(state, "prophet")).toBe(false);
    expect(prophetRubbleShouldReplaceSkill(state, "prophet")).toBe(false);

    const result = applyCommand(state, { type: "prepareMonsterAction", actorId: "prophet" });
    expect(result.events.some((event) => event.type === "monsterActionPrepared")).toBe(true);
    expect(result.state.battle!.monsterAction?.skillSlot).toBeGreaterThanOrEqual(1);
    expect(result.state.battle!.monsterAction?.skillSlot).toBeLessThanOrEqual(2);
  });
});

describe("C-014 · Rubble 区域多目标与伴战先攻", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureProphetIBossScriptRegistered();
  });

  function rubbleState(): GameState {
    const state = prophetBattle();
    return {
      ...state,
      battle: {
        ...state.battle!,
        entities: state.battle!.entities.map((e) => (e.side === "hero" ? { ...e, life: 40 } : e)),
        areas: state.battle!.areas.map((a, i) => ({
          ...a,
          adjacent: i === 0 ? ["pew-area-1"] : i === 1 ? ["pew-area-0"] : [],
        })),
        woodenPews: [{ areaId: "pew-area-0", pewIndex: 0 }],
        prophetActionsThisRound: 2,
        encounter: {
          round: 1,
          deck: ["hero"],
          actedIds: [],
          turn: { type: "monster", actorId: "prophet" },
        },
      },
    };
  }
  function editEntities(state: GameState, change: (e: BattleEntity) => BattleEntity): GameState {
    return { ...state, battle: { ...state.battle!, entities: state.battle!.entities.map(change) } };
  }
  function hitCursor(seed: number): number {
    return Array.from({ length: 100 }, (_, i) => i).find(
      (i) => nextBattleRoll(seed, i) <= 8 && nextBattleRoll(seed, i + 1) <= 8,
    )!;
  }
  function attack(state: GameState) {
    return applyCommand(state, { type: "prepareMonsterAction", actorId: "prophet" });
  }
  function attacks(result: ReturnType<typeof applyCommand>) {
    return result.events.filter((e) => e.type === "monsterSkillTargetsResolved");
  }

  it("同区全体存活英雄共骰，逐名 Dodge 判定；Guard 不遮掉同区目标，异区和死者不受击", () => {
    let state = editEntities(rubbleState(), (e) =>
      e.id === "h1"
        ? { ...e, dodge: 10, guard: true }
        : e.id === "h2"
          ? { ...e, dead: true }
          : e.id === "h3"
            ? { ...e, areaId: "pew-area-1", guard: true }
            : e,
    );
    state = { ...state, battle: { ...state.battle!, rngCursor: hitCursor(state.seed) } };
    const original = structuredClone(state);
    const result = attack(state);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(result).toEqual(attack(state));
    expect(state).toEqual(original);
    expect(attacks(result)).toHaveLength(1);
    expect(attacks(result)[0]!.resolutions.map((r) => [r.targetId, r.outcome])).toEqual([
      ["h1", "miss"],
      ["h0", "hit"],
    ]);
    expect(result.state.battle!.entities.find((e) => e.id === "h0")!.wounds).toBe(9);
    expect(
      result.state
        .battle!.entities.filter((e) => ["h1", "h2", "h3"].includes(e.id))
        .map((e) => e.wounds),
    ).toEqual([0, 0, 0]);
    expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 1);
    expect(result.state.battle!.prophetActionsThisRound).toBe(3);
    expect(result.state.battle!.encounter!.actedIds).toContain("prophet");
  });

  it("同区两张木长椅各掷一次，每次均击中该区四名英雄", () => {
    const initial = rubbleState();
    const state = {
      ...initial,
      battle: {
        ...initial.battle!,
        rngCursor: hitCursor(initial.seed),
        woodenPews: [
          { areaId: "pew-area-0", pewIndex: 0 as const },
          { areaId: "pew-area-0", pewIndex: 1 as const },
        ],
      },
    };
    const result = attack(state);
    expect(attacks(result).map((e) => e.roll)).toEqual(
      [0, 1].map((i) => nextBattleRoll(state.seed, state.battle!.rngCursor + i)),
    );
    expect(attacks(result).map((e) => e.resolutions.map((r) => r.targetId))).toEqual([
      ["h0", "h1", "h2", "h3"],
      ["h0", "h1", "h2", "h3"],
    ]);
    expect(
      result.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.wounds),
    ).toEqual([18, 18, 18, 18]);
    expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 2);
    expect(result.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
  });

  it("两区域分别共骰；空区木长椅仍掷一次骰但没有受击事件", () => {
    const initial = editEntities(rubbleState(), (e) =>
      ["h2", "h3"].includes(e.id) ? { ...e, areaId: "pew-area-1" } : e,
    );
    const state = {
      ...initial,
      battle: {
        ...initial.battle!,
        woodenPews: [
          { areaId: "pew-area-0", pewIndex: 0 as const },
          { areaId: "pew-area-1", pewIndex: 1 as const },
          { areaId: "pew-area-2", pewIndex: 2 as const },
        ],
      },
    };
    const result = attack(state);
    expect(attacks(result).map((e) => e.resolutions.map((r) => r.targetId))).toEqual([
      ["h0", "h1"],
      ["h2", "h3"],
    ]);
    expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 3);
    expect(
      result.events.some(
        (e) => e.type === "dungeonUpdated" && e.message.includes("区域内无存活英雄"),
      ),
    ).toBe(true);
  });

  it.each(["区域", "Dodge", "姿态"])(
    "后续木长椅的%s无效时，整次拒绝并保留原骰序和伤口",
    (problem) => {
      const initial = editEntities(rubbleState(), (e) =>
        e.id === "h2"
          ? ({
              ...e,
              areaId: "pew-area-1",
              ...(problem === "Dodge"
                ? { dodge: -1 }
                : problem === "姿态"
                  ? { stance: undefined }
                  : {}),
            } as BattleEntity)
          : e,
      );
      const state = {
        ...initial,
        battle: {
          ...initial.battle!,
          woodenPews: [
            { areaId: "pew-area-0", pewIndex: 0 as const },
            { areaId: problem === "区域" ? "unknown" : "pew-area-1", pewIndex: 1 as const },
          ],
        },
      };
      const original = structuredClone(state);
      const result = attack(state);
      expect(result.state).toBe(state);
      expect(state).toEqual(original);
      expect(result.events).toHaveLength(1);
      expect(result.events[0]!.type).toBe("commandRefused");
    },
  );

  it("第一张木长椅造成死门死亡后补姿态；下一张不再攻击死者，并保留生命事件", () => {
    let state = editEntities(rubbleState(), (e) =>
      e.id === "h0" ? { ...e, life: 1, wounds: 1 } : e,
    );
    const cursor = Array.from({ length: 100 }, (_, i) => i).find(
      (i) => nextBattleRoll(state.seed, i) <= 8 && nextBattleRoll(state.seed, i + 1) <= 3,
    )!;
    state = {
      ...state,
      battle: {
        ...state.battle!,
        rngCursor: cursor,
        woodenPews: [
          { areaId: "pew-area-0", pewIndex: 0 },
          { areaId: "pew-area-0", pewIndex: 1 },
        ],
      },
    };
    const result = attack(state);
    expect(attacks(result).map((e) => e.resolutions.map((r) => r.targetId))).toEqual([
      ["h0", "h1", "h2", "h3"],
      ["h1", "h2", "h3"],
    ]);
    expect(attacks(result).map((e) => e.roll)).toEqual([
      nextBattleRoll(state.seed, cursor),
      nextBattleRoll(state.seed, cursor + 2),
    ]);
    expect(result.state.battle!.rngCursor).toBe(cursor + 3);
    expect(result.state.battle!.entities.find((e) => e.id === "h0")!.dead).toBe(true);
    expect(result.state.battle!.entities.find((e) => e.id === "h1")!.stance).toBe("aggressive");
    expect(result.events.some((e) => e.type === "heroHealthResolved" && e.entityId === "h0")).toBe(
      true,
    );
    expect(result.events.flatMap((e) => (e.type === "casualtyRemoved" ? [e.actorId] : []))).toEqual(
      ["h0"],
    );
  });

  it("共骰暴击仅给每名受击英雄加一次压力，心脏病走统一死亡收尾", () => {
    const cards: NonNullable<BattleState["resolveCards"]> = JSON.parse(
      readFileSync(
        new URL("../../../data/normalized/corebox/virtue_affliction.json", import.meta.url),
        "utf8",
      ),
    ).cards;
    let state = editEntities(rubbleState(), (e) =>
      e.id === "prophet"
        ? { ...e, buffStacks: 10 }
        : e.id === "h0"
          ? { ...e, stress: 9, resolveTested: true, resolveCardId: cards[0]!.id }
          : e,
    );
    state = {
      ...state,
      battle: {
        ...state.battle!,
        rngCursor: hitCursor(state.seed),
        resolveCards: cards,
        resolveDecks: {},
      },
    };
    const result = attack(state);
    expect(attacks(result)[0]!.resolutions.every((r) => r.outcome === "crit")).toBe(true);
    expect(
      result.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress),
    ).toEqual([10, 1, 1, 1]);
    expect(result.state.battle!.entities.find((e) => e.id === "h0")!.dead).toBe(true);
    expect(result.events.some((e) => e.type === "heartAttack")).toBe(true);
    expect(result.events.some((e) => e.type === "casualtyRemoved" && e.actorId === "h0")).toBe(
      true,
    );
  });

  it("同次区域攻击使英雄全灭则立即停战，后续木长椅不再掷骰", () => {
    let state = editEntities(rubbleState(), (e) =>
      e.side === "hero" ? { ...e, life: 1, wounds: 1 } : e,
    );
    const seed = Array.from({ length: 2000 }, (_, i) => i).find(
      (s) => nextBattleRoll(s, 0) <= 8 && [1, 2, 3, 4].every((i) => nextBattleRoll(s, i) <= 3),
    )!;
    state = {
      ...state,
      seed,
      battle: {
        ...state.battle!,
        woodenPews: [
          { areaId: "pew-area-0", pewIndex: 0 },
          { areaId: "pew-area-0", pewIndex: 1 },
        ],
      },
    };
    const result = attack(state);
    expect(attacks(result)).toHaveLength(1);
    expect(result.state.battle!.rngCursor).toBe(5);
    expect(result.state.battle!.encounter!.turn).toMatchObject({
      type: "halted",
      reason: "heroesDefeated",
    });
    expect(result.events.filter((e) => e.type === "heroHealthResolved")).toHaveLength(4);
    expect(result.events.filter((e) => e.type === "casualtyRemoved")).toHaveLength(4);
  });

  it("同区多名 Riposte 累加，先知被反击击败后停止后续木长椅", () => {
    let state = editEntities(rubbleState(), (e) =>
      e.id === "prophet" ? { ...e, wounds: prophetLife - 1 } : { ...e, riposte: true },
    );
    state = {
      ...state,
      battle: {
        ...state.battle!,
        rngCursor: hitCursor(state.seed),
        woodenPews: [
          { areaId: "pew-area-0", pewIndex: 0 },
          { areaId: "pew-area-0", pewIndex: 1 },
        ],
      },
    };
    const result = attack(state);
    expect(attacks(result)).toHaveLength(1);
    expect(attacks(result)[0]!.resolutions.every((r) => r.outcome === "hit")).toBe(true);
    expect(result.state.battle!.entities.find((e) => e.id === "prophet")!.wounds).toBe(
      prophetLife - 1 + 4 * 5,
    );
    expect(result.state.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "victory" });
    expect(result.events.filter((e) => e.type === "casualtyRemoved").length).toBe(1);
  });

  function accompanied(): GameState {
    const state = prophetBattle();
    const prophet = state.battle!.entities.find((e) => e.id === "prophet")!;
    return {
      ...state,
      battle: {
        ...state.battle!,
        entities: [
          ...state.battle!.entities,
          {
            ...prophet,
            id: "companion",
            monsterCardId: "fixture-small",
            stance: "ranged",
            stanceSlots: 1,
          },
          {
            ...prophet,
            id: "companion-back",
            monsterCardId: "fixture-small",
            stance: "support",
            stanceSlots: 1,
          },
        ],
      },
    };
  }
  it("伴战先攻为先知3+普通怪各1；死者不入堆，普通任务不扩张", () => {
    const state = accompanied();
    const started = applyCommand(state, { type: "startBattle" });
    expect(started).toEqual(applyCommand(state, { type: "startBattle" }));
    expect(started.state.battle!.encounter!.deck.filter((s) => s === "monster")).toHaveLength(5);
    expect(started.state.battle!.encounter!.deck.filter((s) => s === "hero")).toHaveLength(4);
    const dead = editEntities(state, (e) => (e.id === "companion" ? { ...e, dead: true } : e));
    expect(
      applyCommand(dead, { type: "startBattle" }).state.battle!.encounter!.deck.filter(
        (s) => s === "monster",
      ),
    ).toHaveLength(4);
    const noProphet = editEntities(state, (e) => (e.id === "prophet" ? { ...e, dead: true } : e));
    expect(
      applyCommand(noProphet, { type: "startBattle" }).state.battle!.encounter!.deck.filter(
        (s) => s === "monster",
      ),
    ).toHaveLength(2);
    const ordinary = {
      ...state,
      dungeon: {
        ...state.dungeon!,
        questDistribution: { ...state.dungeon!.questDistribution!, questId: "quest:p001" },
      },
    };
    expect(
      applyCommand(ordinary, { type: "startBattle" }).state.battle!.encounter!.deck.filter(
        (s) => s === "monster",
      ),
    ).toHaveLength(3);
  });

  it("当前姿态决定伴战行动先后；先知三次后才入 actedIds，新轮恢复3+2张", () => {
    let state = applyCommand(accompanied(), { type: "startBattle" }).state;
    state = {
      ...state,
      battle: {
        ...state.battle!,
        encounter: {
          ...state.battle!.encounter!,
          deck: ["monster", "monster", "monster", "monster", "monster"],
        },
      },
    };
    const actors: string[] = [];
    for (let i = 0; i < 5; i++) {
      const drawn = applyCommand(state, { type: "drawInitiative" });
      expect(
        drawn.events.some((e) => e.type === "commandRefused"),
        JSON.stringify(drawn.events),
      ).toBe(false);
      const turn = drawn.state.battle!.encounter!.turn;
      expect(turn.type).toBe("monster");
      if (turn.type !== "monster") throw new Error("expected monster turn");
      actors.push(turn.actorId);
      // 只测先攻调度：用统一回合收尾推进，不冒充伴战怪物完整技能 AI。
      state = finishTurn(drawn.state, turn.actorId, []).state;
      if (i === 3) {
        expect(state.battle!.prophetActionsThisRound).toBe(3);
        expect(state.battle!.encounter!.actedIds.filter((id) => id === "prophet")).toHaveLength(1);
      }
      if (i === 0)
        state = editEntities(state, (e) =>
          e.id === "prophet"
            ? { ...e, stance: "defensive" }
            : e.id === "companion"
              ? { ...e, stance: "aggressive" }
              : e,
        );
    }
    expect(actors).toEqual(["prophet", "companion", "prophet", "prophet", "companion-back"]);
    expect(state.battle!.encounter!.round).toBe(2);
    expect(state.battle!.encounter!.deck.filter((s) => s === "monster")).toHaveLength(5);
    expect(state.battle!.prophetActionsThisRound).toBeUndefined();
    expect(state.battle!.encounter!.actedIds).toEqual([]);
  });
});
