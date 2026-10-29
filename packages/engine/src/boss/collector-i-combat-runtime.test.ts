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
  COLLECTOR_I_COMBAT_MONSTER_CARD_ID,
  COLLECTOR_I_SCRIPT_ID,
  bossQuestScriptId,
  clearBossScriptsForTest,
  collectorCollectAllShouldReplaceSkill,
  ensureCollectorIBossScriptRegistered,
  getBossScript,
  readCollectorICollectAllEnabled,
  readCollectorICollectAllPartPlan,
  runBossHook,
  FACE_THE_THREAT_QUEST_ID,
} from "./index";

const mediumCards = normalizedMonsterMediumFileSchema.parse(
  JSON.parse(
    readFileSync(
      new URL("../../../data/normalized/corebox/monster_medium.json", import.meta.url),
      { encoding: "utf8" },
    ),
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
    expect(summoned.find((entity) => entity.monsterCardId === COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID)).toMatchObject({
      stance: "defensive",
      areaId: "a",
    });
    expect(summoned.find((entity) => entity.monsterCardId === COLLECTOR_I_COLLECTED_HIGHWAYMAN_CARD_ID)).toMatchObject({
      stance: "ranged",
      areaId: "b",
    });
    expect(result.events.some((event) => event.type === "dungeonUpdated" && event.message.includes("Collect All"))).toBe(
      true,
    );
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
