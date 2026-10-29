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
  COLLECTOR_I_FULL_MONSTER_INITIATIVE_SIDES,
  COLLECTOR_I_SCRIPT_ID,
  bossQuestScriptId,
  clearBossScriptsForTest,
  collectorCollectAllShouldReplaceSkill,
  ensureCollectorIBossScriptRegistered,
  expandCollectorIInitiativeDeckSides,
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

  it("仅 Collector 在场时 startRound 补足 4 张 monster 侧（1 印刷 + R39×3）", () => {
    const base = collectorBattle();
    const sides = expandCollectorIInitiativeDeckSides(
      base.battle!.entities.filter((entity) => !entity.dead).map((entity) => entity.side),
      base.battle!,
      base,
    );
    expect(sides.filter((side) => side === "monster")).toHaveLength(
      COLLECTOR_I_FULL_MONSTER_INITIATIVE_SIDES,
    );
    expect(COLLECTOR_I_COLLECT_ALL_INITIATIVE_SHUFFLE_COUNT).toBe(3);
  });

  it("startBattle 写入 4 张 monster 先攻", () => {
    const started = applyCommand(collectorBattle(), { type: "startBattle" });
    const deck = started.state.battle!.encounter!.deck;
    expect(deck.filter((side) => side === "monster")).toHaveLength(
      COLLECTOR_I_FULL_MONSTER_INITIATIVE_SIDES,
    );
  });

  it("Collect All 后当前牌堆补足至 4 张 monster 侧", () => {
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
    expect(after).toBe(COLLECTOR_I_FULL_MONSTER_INITIATIVE_SIDES);
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
