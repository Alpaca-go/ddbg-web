import { readFileSync } from "node:fs";
import { describe, expect, it, beforeEach } from "vitest";
import { createBattleState, type BattleEntity } from "../battle";
import { applyCommand, type GameState } from "../command";
import { applyEncounterCommand } from "../encounter";
import { normalizedMonsterLargeFileSchema } from "../../../data/src/normalize/schema";
import type { MonsterCardView } from "../monster-skill";
import type { SkillStance } from "../hero-skill";
import { createLootState } from "../loot";
import {
  FANATIC_I_COMBAT_MONSTER_CARD_ID,
  FANATIC_I_PYRE_MONSTER_CARD_ID,
  FANATIC_I_SCRIPT_ID,
  applyFanaticIPyreBattleStart,
  applyFanaticSentenceRendered,
  bossQuestScriptId,
  clearBossScriptsForTest,
  ensureFanaticIBossScriptRegistered,
  fanaticSentenceRenderedShouldReplaceSkill,
  getBossScript,
  readFanaticIPyreBattleStartPlan,
  readFanaticISentenceRenderedEnabled,
  runBossHook,
  FACE_THE_THREAT_QUEST_ID,
} from "./index";

const largeCards = normalizedMonsterLargeFileSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../../data/normalized/corebox/monster_large.json", import.meta.url), {
      encoding: "utf8",
    }),
  ),
).cards;

const fanaticCard = largeCards.find((card) => card.id === FANATIC_I_COMBAT_MONSTER_CARD_ID)!;
const pyreCard = largeCards.find((card) => card.id === FANATIC_I_PYRE_MONSTER_CARD_ID)!;

const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

function fanaticBossDungeon(): GameState["dungeon"] {
  return {
    phase: "inBattle",
    cursor: 0,
    heroes: [],
    questDistribution: { questId: FACE_THE_THREAT_QUEST_ID, campaignLevel: 1 },
  } as unknown as GameState["dungeon"];
}

function fanaticBattle(extra?: Partial<GameState["battle"]>): GameState {
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
  const fanatic: BattleEntity = {
    id: "fanatic",
    side: "monster",
    hero: null,
    monsterCardId: fanaticCard.id,
    life: fanaticCard.life,
    dodge: 0,
    areaId: "a",
    stance: "aggressive",
    stanceSlots: 2,
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
      entities: [...heroes, fanatic],
      monsters: [fanaticCard, pyreCard] as MonsterCardView[],
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
    dungeon: fanaticBossDungeon(),
  } as GameState;
}

describe("Fanatic I 战斗运行时", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureFanaticIBossScriptRegistered();
    bossQuestScriptId[FACE_THE_THREAT_QUEST_ID] = FANATIC_I_SCRIPT_ID;
  });

  it("summon(battleStartPyre) 声明 Pyre 远程姿态 + stanceArea", () => {
    const script = getBossScript(FANATIC_I_SCRIPT_ID)!;
    const plan = readFanaticIPyreBattleStartPlan(script);
    expect(plan).toMatchObject({
      summonMonsterCardId: FANATIC_I_PYRE_MONSTER_CARD_ID,
      miniaturePlacement: "stanceArea",
      fixedStance: "ranged",
    });
    const hook = runBossHook(script, "summon", {
      scriptId: FANATIC_I_SCRIPT_ID,
      skillSlot: 0,
      purpose: "skill",
    });
    expect(hook.status).toBe("stub");
  });

  it("sentenceRendered 钩子 ok", () => {
    const script = getBossScript(FANATIC_I_SCRIPT_ID)!;
    expect(readFanaticISentenceRenderedEnabled(script)).toBe(true);
  });

  it("startBattle 写入 Pyre 实体（Boss 战 + 已核实 p011）", () => {
    const initial = fanaticBattle();
    const started = applyEncounterCommand(initial, { type: "startBattle" });
    expect(started.events.some((event) => event.type === "commandRefused")).toBe(false);
    const pyre = started.state.battle!.entities.find(
      (entity) => entity.monsterCardId === FANATIC_I_PYRE_MONSTER_CARD_ID,
    );
    expect(pyre).toMatchObject({ stance: "ranged", stanceSlots: 2, areaId: "b", dead: false });
  });

  it("缺 Pyre 卡面时 startBattle 拒绝，不消耗先攻 RNG", () => {
    const initial = fanaticBattle();
    const withoutPyre = {
      ...initial,
      battle: {
        ...initial.battle!,
        monsters: [fanaticCard] as MonsterCardView[],
      },
    };
    const before = withoutPyre.battle!.rngCursor ?? 0;
    const started = applyEncounterCommand(withoutPyre, { type: "startBattle" });
    expect(started.events.some((event) => event.type === "commandRefused")).toBe(true);
    expect(started.state.battle!.rngCursor ?? before).toBe(before);
    expect(
      started.state.battle!.entities.some(
        (entity) => entity.monsterCardId === FANATIC_I_PYRE_MONSTER_CARD_ID,
      ),
    ).toBe(false);
  });

  it("Sentence Rendered：Fanatic 回合向最近英雄移动一步", () => {
    let state = fanaticBattle({
      entities: [
        ...stances.map((stance, index) => ({
          id: `h${index}`,
          side: "hero" as const,
          areaId: "b",
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
          id: "fanatic",
          side: "monster" as const,
          hero: null,
          monsterCardId: fanaticCard.id,
          life: fanaticCard.life,
          dodge: 0,
          areaId: "a",
          stance: "aggressive" as const,
          stanceSlots: 2 as const,
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
    state = applyFanaticIPyreBattleStart(state).state;
    state = {
      ...state,
      battle: {
        ...state.battle!,
        encounter: {
          round: 1,
          deck: [],
          actedIds: [],
          turn: { type: "monster", actorId: "fanatic" },
        },
      },
    };
    expect(fanaticSentenceRenderedShouldReplaceSkill(state, "fanatic")).toBe(true);
    const moved = applyCommand(state, { type: "prepareMonsterAction", actorId: "fanatic" });
    expect(moved.events.some((event) => event.type === "commandRefused")).toBe(false);
    expect(moved.state.battle!.entities.find((entity) => entity.id === "fanatic")!.areaId).toBe(
      "b",
    );
  });

  it("Sentence Rendered：与英雄同区时丢入 Pyre 区域", () => {
    let state = fanaticBattle({
      entities: [
        {
          id: "h2",
          side: "hero" as const,
          areaId: "a",
          stance: "ranged" as const,
          hero: "CRUSADER",
          skillIds: [] as string[],
          wounds: 0,
          stress: 0,
          dodge: 0,
          guard: false,
          dead: false,
          bleed: [] as string[],
          blight: [] as string[],
        },
        {
          id: "fanatic",
          side: "monster" as const,
          hero: null,
          monsterCardId: fanaticCard.id,
          life: fanaticCard.life,
          dodge: 0,
          areaId: "a",
          stance: "aggressive" as const,
          stanceSlots: 2 as const,
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
    state = applyFanaticIPyreBattleStart(state).state;
    expect(state.battle!.entities.find((entity) => entity.monsterCardId === FANATIC_I_PYRE_MONSTER_CARD_ID)!.areaId).toBe("a");
    state = {
      ...state,
      battle: {
        ...state.battle!,
        encounter: {
          round: 1,
          deck: [],
          actedIds: [],
          turn: { type: "monster", actorId: "fanatic" },
        },
      },
    };
    const tossed = applyFanaticSentenceRendered(state, "fanatic");
    expect(tossed.events.some((event) => event.type === "commandRefused")).toBe(false);
    expect(tossed.state.battle!.entities.find((entity) => entity.id === "h2")!.areaId).toBe("a");
    expect(tossed.events.some((event) => event.type === "dungeonUpdated" && event.message.includes("丢入 Pyre"))).toBe(true);
  });
});
