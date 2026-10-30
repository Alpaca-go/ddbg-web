import { readFileSync } from "node:fs";
import { describe, expect, it, beforeEach } from "vitest";
import { createBattleState, type BattleEntity } from "../battle";
import { applyCommand, type GameState } from "../command";
import { normalizedMonsterMediumFileSchema } from "../../../data/src/normalize/schema";
import type { MonsterCardView } from "../monster-skill";
import type { SkillStance } from "../hero-skill";
import { createLootState } from "../loot";
import {
  COLLECTOR_I_COLLECTED_HIGHWAYMAN_CARD_ID,
  COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID,
  COLLECTOR_I_COLLECTED_VESTAL_CARD_ID,
  COLLECTOR_I_COLLECT_ALL_INITIATIVE_SHUFFLE_COUNT,
  COLLECTOR_I_COMBAT_MONSTER_CARD_ID,
  COLLECTOR_I_SCRIPT_ID,
  bossQuestScriptId,
  clearBossScriptsForTest,
  collectorCollectAllShouldReplaceSkill,
  ensureCollectorIBossScriptRegistered,
  getBossScript,
  readCollectorICollectAllEnabled,
  readCollectorICollectAllPartPlan,
  resolveCollectorCollectedAreaPlacement,
  runBossHook,
  FACE_THE_THREAT_QUEST_ID,
} from "./index";

const mediumCards = normalizedMonsterMediumFileSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../../data/normalized/corebox/monster_medium.json", import.meta.url), {
      encoding: "utf8",
    }),
  ),
).cards;

const collectorCard = mediumCards.find((card) => card.id === COLLECTOR_I_COMBAT_MONSTER_CARD_ID)!;
const collectorLife = "life" in collectorCard ? collectorCard.life : 66;

function verifiedCollectedCard(id: string, life: number): MonsterCardView {
  const base = mediumCards.find((card) => card.id === id)!;
  return {
    ...(base as MonsterCardView),
    id,
    name: base.name,
    life,
    dodge: 0,
    speed: 1,
    verification: { unverified: false, reasons: [] },
    skills: [],
    typeTags: ["Eldritch"],
  } as MonsterCardView;
}

const collectedLife = 1;
const collectedCards = [
  verifiedCollectedCard(COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID, collectedLife),
  verifiedCollectedCard(COLLECTOR_I_COLLECTED_HIGHWAYMAN_CARD_ID, collectedLife),
  verifiedCollectedCard(COLLECTOR_I_COLLECTED_VESTAL_CARD_ID, collectedLife),
];

const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

function collectorBossDungeon(): GameState["dungeon"] {
  return {
    phase: "inBattle",
    cursor: 0,
    heroes: [],
    questDistribution: { questId: FACE_THE_THREAT_QUEST_ID, campaignLevel: 1 },
    activeBossThreatScriptId: COLLECTOR_I_SCRIPT_ID,
  } as unknown as GameState["dungeon"];
}

function collectorBattle(extra?: Partial<GameState["battle"]>): GameState {
  const heroes: BattleEntity[] = stances.map((stance, index) => ({
    id: `h${index}`,
    side: "hero",
    areaId: stance === "ranged" ? "b" : "a",
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
  const collector: BattleEntity = {
    id: "collector",
    side: "monster",
    hero: null,
    monsterCardId: collectorCard.id,
    life: collectorLife,
    dodge: 0,
    areaId: "a",
    stance: "aggressive",
    stanceSlots: 1,
    shuffleResist: false,
    wounds: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  return {
    ...createBattleState(7, {
      entities: [...heroes, collector],
      monsters: [collectorCard, ...collectedCards] as MonsterCardView[],
      areas: [
        { id: "a", elevation: "normal", adjacent: ["b"], capacity: 10 },
        { id: "b", elevation: "normal", adjacent: ["a"], capacity: 8 },
      ],
      light: 5,
      skills: [],
      heroStats: [],
      lootPool: createLootState(),
      // C-015：只用于机制夹具，不代表 Collector Room 生产几何已批。
      collectorRoomLootAreaId: "b",
      collectorCollectedStanceAreas: { defensive: "a", ranged: "b", support: "a" },
      ...extra,
    }),
    dungeon: collectorBossDungeon(),
  } as GameState;
}

describe("Collector I Collect All 战斗运行时", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureCollectorIBossScriptRegistered();
    bossQuestScriptId[FACE_THE_THREAT_QUEST_ID] = COLLECTOR_I_SCRIPT_ID;
  });

  it("summon(collectAllPart) 声明三 Collected + stanceArea + 固定姿态", () => {
    const script = getBossScript(COLLECTOR_I_SCRIPT_ID)!;
    expect(readCollectorICollectAllPartPlan(script, "manAtArms")).toMatchObject({
      summonMonsterCardId: COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID,
      miniaturePlacement: "stanceArea",
      fixedStance: "defensive",
    });
    expect(readCollectorICollectAllPartPlan(script, "highwayman")).toMatchObject({
      fixedStance: "ranged",
    });
    expect(readCollectorICollectAllPartPlan(script, "vestal")).toMatchObject({
      fixedStance: "support",
    });
    const skill = runBossHook(script, "summon", {
      scriptId: COLLECTOR_I_SCRIPT_ID,
      skillSlot: 0,
      purpose: "skill",
    });
    expect(skill.status).toBe("stub");
  });

  it("collectAll 钩子 ok", () => {
    const script = getBossScript(COLLECTOR_I_SCRIPT_ID)!;
    expect(readCollectorICollectAllEnabled(script)).toBe(true);
  });

  it("Collector 回合无 Collected 时 prepareMonsterAction 召唤三卡并结束回合", () => {
    let state = collectorBattle();
    state = {
      ...state,
      battle: {
        ...state.battle!,
        encounter: {
          round: 1,
          deck: [],
          actedIds: [],
          turn: { type: "monster", actorId: "collector" },
        },
      },
    };
    expect(collectorCollectAllShouldReplaceSkill(state, "collector")).toBe(true);
    const result = applyCommand(state, { type: "prepareMonsterAction", actorId: "collector" });
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    const ids: readonly string[] = [
      COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID,
      COLLECTOR_I_COLLECTED_HIGHWAYMAN_CARD_ID,
      COLLECTOR_I_COLLECTED_VESTAL_CARD_ID,
    ];
    const summoned = result.state.battle!.entities.filter(
      (entity) => entity.monsterCardId && ids.includes(entity.monsterCardId),
    );
    expect(summoned).toHaveLength(3);
    expect(
      summoned.find((entity) => entity.monsterCardId === COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID),
    ).toMatchObject({
      stance: "defensive",
      areaId: "a",
    });
    expect(
      summoned.find((entity) => entity.monsterCardId === COLLECTOR_I_COLLECTED_HIGHWAYMAN_CARD_ID),
    ).toMatchObject({
      stance: "ranged",
      areaId: "b",
    });
    expect(
      result.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("Collect All"),
      ),
    ).toBe(true);
  });

  it("场上已有 Collected 时不替代选招", () => {
    let state = collectorBattle({
      entities: [
        ...stances.map((stance, index) => ({
          id: `h${index}`,
          side: "hero" as const,
          areaId: stance === "ranged" ? "b" : "a",
          stance,
          hero: "CRUSADER",
          skillIds: [] as string[],
          wounds: 0,
          stress: 0,
          dodge: 0,
          guard: false,
          dead: false,
          bleed: [] as string[],
          blight: [] as string[],
        })),
        {
          id: "collector",
          side: "monster" as const,
          hero: null,
          monsterCardId: collectorCard.id,
          life: collectorLife,
          dodge: 0,
          areaId: "a",
          stance: "aggressive" as const,
          stanceSlots: 1 as const,
          shuffleResist: false,
          wounds: 0,
          skillIds: [] as string[],
          guard: false,
          dead: false,
          bleed: [] as string[],
          blight: [] as string[],
        },
        {
          id: "collected:manAtArms",
          side: "monster" as const,
          hero: null,
          monsterCardId: COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID,
          life: collectedLife,
          dodge: 0,
          areaId: "a",
          stance: "defensive" as const,
          stanceSlots: 1 as const,
          shuffleResist: false,
          wounds: 0,
          skillIds: [] as string[],
          guard: false,
          dead: false,
          bleed: [] as string[],
          blight: [] as string[],
        },
      ],
    });
    state = {
      ...state,
      battle: {
        ...state.battle!,
        encounter: {
          round: 1,
          deck: [],
          actedIds: [],
          turn: { type: "monster", actorId: "collector" },
        },
      },
    };
    expect(collectorCollectAllShouldReplaceSkill(state, "collector")).toBe(false);
  });
});

describe("Collector I · 先攻 4 与 Collect All 洗入", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureCollectorIBossScriptRegistered();
    bossQuestScriptId[FACE_THE_THREAT_QUEST_ID] = COLLECTOR_I_SCRIPT_ID;
  });

  it("R39：startBattle 只写入本体 1 张 monster 先攻", () => {
    const started = applyCommand(collectorBattle(), { type: "startBattle" });
    const deck = started.state.battle!.encounter!.deck;
    expect(deck.filter((side) => side === "monster")).toHaveLength(1);
  });

  it("Collect All 向当前牌堆恰好洗入 3 张 monster 侧", () => {
    let state = collectorBattle();
    state = applyCommand(state, { type: "startBattle" }).state;
    state = {
      ...state,
      battle: {
        ...state.battle!,
        encounter: {
          ...state.battle!.encounter!,
          turn: { type: "monster", actorId: "collector" },
          deck: ["hero", "hero"],
        },
      },
    };
    const before = state.battle!.encounter!.deck.filter((side) => side === "monster").length;
    const result = applyCommand(state, { type: "prepareMonsterAction", actorId: "collector" });
    const after = result.state.battle!.encounter!.deck.filter((side) => side === "monster").length;
    expect(after - before).toBe(COLLECTOR_I_COLLECT_ALL_INITIATIVE_SHUFFLE_COUNT);
    expect(result.state.battle!.rngCursor - state.battle!.rngCursor).toBe(3);
    expect(after).toBeGreaterThanOrEqual(before);
  });
});

describe("Collector I · 最近区域挤占", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureCollectorIBossScriptRegistered();
  });

  it("姿态对应区域满员时把英雄挤到相邻区域并写入 Collected", () => {
    const battle = createBattleState(1, {
      entities: [
        {
          id: "h0",
          side: "hero",
          areaId: "a",
          stance: "defensive",
          hero: "CRUSADER",
          skillIds: [],
          wounds: 0,
          stress: 0,
          dodge: 0,
          guard: false,
          dead: false,
          bleed: [],
          blight: [],
        },
        {
          id: "collector",
          side: "monster",
          hero: null,
          monsterCardId: collectorCard.id,
          life: collectorLife,
          dodge: 0,
          areaId: "a",
          stance: "aggressive",
          stanceSlots: 1,
          shuffleResist: false,
          wounds: 0,
          skillIds: [],
          guard: false,
          dead: false,
          bleed: [],
          blight: [],
        },
      ],
      monsters: [collectorCard as MonsterCardView],
      areas: [
        { id: "a", elevation: "normal", adjacent: ["b"], capacity: 2 },
        { id: "b", elevation: "normal", adjacent: ["a"], capacity: 4 },
      ],
      light: 5,
      skills: [],
      heroStats: [],
      lootPool: createLootState(),
    }).battle!;
    const placement = resolveCollectorCollectedAreaPlacement(battle, "a");
    expect("status" in placement).toBe(false);
    if ("status" in placement) return;
    expect(placement.areaId).toBe("a");
    expect(placement.battle.entities.find((entity) => entity.id === "h0")?.areaId).toBe("b");
  });
});

describe("C-016 · Collector 挤占选择与原子续接", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureCollectorIBossScriptRegistered();
  });
  function fixture(): GameState {
    const base = collectorBattle();
    return {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) => ({
          ...e,
          areaId: e.side === "hero" ? "c" : "a",
        })),
        areas: [
          { id: "a", adjacent: ["b", "d"], elevation: "normal", capacity: 1 },
          { id: "b", adjacent: ["a", "c"], elevation: "normal", capacity: 1 },
          { id: "d", adjacent: ["a"], elevation: "normal", capacity: 2 },
          { id: "c", adjacent: ["b"], elevation: "normal", capacity: 8 },
        ],
        collectorCollectedStanceAreas: { defensive: "a", ranged: "b", support: "c" },
        encounter: {
          round: 1,
          deck: ["hero"],
          actedIds: [],
          turn: { type: "monster", actorId: "collector" },
        },
      },
    };
  }
  function prepare(state: GameState) {
    return applyCommand(state, { type: "prepareMonsterAction", actorId: "collector" });
  }
  function choose(result: ReturnType<typeof applyCommand>, entity: string, area: string) {
    expect(result.pendingChoice).toBeDefined();
    return applyCommand(result.state, {
      type: "resolveChoice",
      choiceId: result.pendingChoice!.id,
      optionId: JSON.stringify([entity, area]),
    });
  }
  function refused(result: ReturnType<typeof applyCommand>, state: GameState) {
    expect(result.state).toBe(state);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]!.type).toBe("commandRefused");
  }
  it("怪物满区公开待选只列最近落点，未确认不改实体/骰序；多次选择完成后一次召唤", () => {
    const state = fixture(),
      original = structuredClone(state);
    const first = prepare(state);
    expect(first.pendingChoice!.options.map((o) => JSON.parse(o.id))).toEqual([
      ["collector", "b"],
      ["collector", "d"],
    ]);
    expect(first.state.battle!.entities).toEqual(state.battle!.entities);
    expect(first.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
    expect(first.state.battle!.encounter).toEqual(state.battle!.encounter);
    const second = choose(first, "collector", "b");
    expect(second.pendingChoice!.id).not.toBe(first.pendingChoice!.id);
    expect(second.pendingChoice!.options.map((o) => JSON.parse(o.id))).toEqual([
      ["collector", "c"],
    ]);
    expect(second.state.battle!.entities).toEqual(state.battle!.entities);
    expect(second.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
    const done = choose(second, "collector", "c");
    expect(done.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(done.state.battle!.pending).toBeNull();
    expect(done.state.battle!.entities.find((e) => e.id === "collector")!.areaId).toBe("c");
    expect(
      done.state
        .battle!.entities.filter((e) => e.id.startsWith("collected:"))
        .map((e) => [e.id, e.areaId]),
    ).toEqual([
      ["collected:manAtArms", "a"],
      ["collected:highwayman", "b"],
      ["collected:vestal", "c"],
    ]);
    expect(new Set(done.state.battle!.entities.map((e) => e.id)).size).toBe(
      done.state.battle!.entities.length,
    );
    expect(done.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 3);
    expect(done.state.battle!.encounter!.deck.filter((s) => s === "monster")).toHaveLength(3);
    expect(done.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
    expect(done).toEqual(choose(choose(prepare(state), "collector", "b"), "collector", "c"));
    expect(state).toEqual(original);
  });

  it("待选冻结其它行动，非法/旧选择/重复确认均原子拒绝", () => {
    const first = prepare(fixture());
    refused(prepare(first.state), first.state);
    refused(applyCommand(first.state, { type: "drawInitiative" }), first.state);
    refused(choose(first, "collector", "c"), first.state);
    refused(
      applyCommand(first.state, {
        type: "resolveChoice",
        choiceId: "stale",
        optionId: first.pendingChoice!.options[0]!.id,
      }),
      first.state,
    );
    const second = choose(first, "collector", "b");
    refused(
      applyCommand(second.state, {
        type: "resolveChoice",
        choiceId: first.pendingChoice!.id,
        optionId: first.pendingChoice!.options[0]!.id,
      }),
      second.state,
    );
    const done = choose(second, "collector", "c");
    refused(
      applyCommand(done.state, {
        type: "resolveChoice",
        choiceId: second.pendingChoice!.id,
        optionId: second.pendingChoice!.options[0]!.id,
      }),
      done.state,
    );
  });

  it("英雄挤走后仍用原姿态区域；后续被挤出的已规划召唤物也只落地一次", () => {
    const base = fixture();
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) => ({ ...e, areaId: e.id === "h1" ? "a" : "c" })),
        collectorCollectedStanceAreas: { defensive: "a", ranged: "a", support: "a" },
      },
    };
    const first = prepare(state);
    const second = choose(first, "h1", "b");
    expect(second.pendingChoice!.options.map((o) => JSON.parse(o.id))).toEqual([
      ["collected:manAtArms", "d"],
    ]);
    const third = choose(second, "collected:manAtArms", "d");
    expect(third.state.battle!.entities).toEqual(state.battle!.entities);
    const done = choose(third, "collected:highwayman", "d");
    expect(done.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(done.state.battle!.entities.find((e) => e.id === "h1")!.areaId).toBe("b");
    expect(
      done.state
        .battle!.entities.filter((e) => e.id.startsWith("collected:"))
        .map((e) => [e.id, e.areaId]),
    ).toEqual([
      ["collected:manAtArms", "d"],
      ["collected:highwayman", "d"],
      ["collected:vestal", "a"],
    ]);
  });

  it("多只怪物占满时玩家选哪只；Large 的最近可用区域按实际占格筛选", () => {
    const base = fixture().battle!,
      monster = base.entities.find((e) => e.id === "collector")!;
    const battle = {
      ...base,
      entities: [
        { ...monster, id: "m1" },
        { ...monster, id: "m2" },
      ],
      areas: base.areas.map((a) => (a.id === "a" ? { ...a, capacity: 2 } : a)),
    };
    const result = resolveCollectorCollectedAreaPlacement(battle, "a");
    expect("status" in result && result.status).toBe("choice");
    if (!("status" in result) || result.status !== "choice") throw new Error("expected choice");
    expect(result.options.map((o) => JSON.parse(o.id))).toEqual([
      ["m1", "b"],
      ["m1", "d"],
      ["m2", "b"],
      ["m2", "d"],
    ]);
    const moved = resolveCollectorCollectedAreaPlacement(battle, "a", JSON.stringify(["m2", "d"]));
    expect("status" in moved).toBe(false);
    if (!("status" in moved))
      expect(moved.battle.entities.map((e) => e.areaId)).toEqual(["a", "d"]);
    const large = { ...battle, entities: [{ ...monster, stanceSlots: 2 as const }] };
    const largeChoice = resolveCollectorCollectedAreaPlacement(large, "a");
    expect(largeChoice).toMatchObject({
      status: "choice",
      options: [{ id: JSON.stringify(["collector", "d"]) }],
    });
  });

  it("没有能容纳被挤怪物的区域时拒绝，不能把召唤物改放到远处空小区", () => {
    const base = fixture(),
      monster = base.battle!.entities.find((e) => e.id === "collector")!;
    const battle = {
      ...base.battle!,
      entities: [{ ...monster, stanceSlots: 2 as const }],
      areas: [
        { id: "a", adjacent: ["b"], elevation: "normal" as const, capacity: 2 },
        { id: "b", adjacent: ["a"], elevation: "normal" as const, capacity: 1 },
      ],
    };
    expect(resolveCollectorCollectedAreaPlacement(battle, "a")).toMatchObject({
      status: "refused",
      message: expect.stringContaining("不能改放召唤物"),
    });
  });

  it.each(["missing", "unknown"])("%s 姿态绑定明确拒绝，不再从英雄当前位置推断", (kind) => {
    const base = fixture();
    const { collectorCollectedStanceAreas: removed, ...rest } = base.battle!;
    void removed;
    const state = {
      ...base,
      battle: {
        ...rest,
        ...(kind === "unknown"
          ? { collectorCollectedStanceAreas: { defensive: "unknown", ranged: "b", support: "c" } }
          : {}),
      },
    };
    refused(prepare(state), state);
  });

  it("待选后卡牌失去核实则整次拒绝，既有计划不落地", () => {
    const first = prepare(fixture());
    const state = {
      ...first.state,
      battle: {
        ...first.state.battle!,
        monsters: first.state.battle!.monsters!.map((c) =>
          c.id === COLLECTOR_I_COLLECTED_VESTAL_CARD_ID
            ? { ...c, verification: { unverified: true } }
            : c,
        ),
      },
    };
    refused(
      applyCommand(state, {
        type: "resolveChoice",
        choiceId: first.pendingChoice!.id,
        optionId: first.pendingChoice!.options[0]!.id,
      }),
      state,
    );
  });

  it("后续召唤完全没有合法去处时回滚，保留玩家当前待选而不消耗 RNG", () => {
    const base = fixture();
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        areas: base.battle!.areas.map((a) =>
          a.id === "d" ? { ...a, capacity: 0 } : a.id === "c" ? { ...a, capacity: 4 } : a,
        ),
      },
    };
    const first = prepare(state);
    expect(first.pendingChoice!.options.map((o) => JSON.parse(o.id))).toEqual([["collector", "b"]]);
    refused(choose(first, "collector", "b"), first.state);
  });

  it("待选目的地容量改变后重新校验，旧合法选项也不能强行落地", () => {
    const first = prepare(fixture());
    const state = {
      ...first.state,
      battle: {
        ...first.state.battle!,
        areas: first.state.battle!.areas.map((a) => (a.id === "b" ? { ...a, capacity: 0 } : a)),
      },
    };
    refused(
      applyCommand(state, {
        type: "resolveChoice",
        choiceId: first.pendingChoice!.id,
        optionId: JSON.stringify(["collector", "b"]),
      }),
      state,
    );
  });
});
