import { readFileSync } from "node:fs";
import { describe, expect, it, beforeEach } from "vitest";
import { createBattleState, type BattleEntity } from "../battle";
import { applyCommand, type GameState } from "../command";
import { normalizedMonsterLargeFileSchema } from "../../../data/src/normalize/schema";
import { createLootState } from "../loot";
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
    readFileSync(
      new URL("../../../data/normalized/corebox/monster_large.json", import.meta.url),
      { encoding: "utf8" },
    ),
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
    expect(result.events.some((event) => event.type === "dungeonUpdated" && event.message.includes("Wooden Pew 区域 d10"))).toBe(
      true,
    );
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
    expect(result.events.some((event) => event.type === "monsterSkillResolved")).toBe(true);
    expect(result.events.some((event) => event.type === "dungeonUpdated" && event.message.includes("Rubble of Ruin"))).toBe(
      true,
    );
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
    expect(result.events.some((event) => event.type === "dungeonUpdated" && event.message.includes("Rubble of Ruin"))).toBe(
      true,
    );
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
