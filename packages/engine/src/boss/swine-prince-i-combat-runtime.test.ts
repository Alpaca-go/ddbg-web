import { describe, expect, it, beforeEach } from "vitest";
import { createBattleState, type BattleEntity } from "../battle";
import type { GameState } from "../command";
import { applyEncounterCommand } from "../encounter";
import type { MonsterCardView } from "../monster-skill";
import type { SkillStance } from "../hero-skill";
import { createLootState } from "../loot";
import {
  SWINE_PRINCE_I_COMBAT_MONSTER_CARD_ID,
  SWINE_PRINCE_I_SCRIPT_ID,
  SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID,
  applySwinePrinceIWilburBattleStart,
  clearBossScriptsForTest,
  ensureSwinePrinceIBossScriptRegistered,
  getBossScript,
  readSwinePrinceIWilburBattleStartPlan,
  runBossHook,
  swinePrinceIWilburBattleStartStance,
  FACE_THE_THREAT_QUEST_ID,
} from "./index";

const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

function verifiedMonsterCard(id: string, life: number, width: 1 | 2 = 1): MonsterCardView {
  return {
    id,
    name: id,
    life,
    dodge: 0,
    speed: 1,
    verification: { unverified: false },
    skills: [],
    typeTags: ["Beast"],
    ...(width === 2 ? { size: "large" as const } : {}),
  } as MonsterCardView;
}

const princeLife = 84;
const wilburLife = 12;
const princeCard = verifiedMonsterCard(SWINE_PRINCE_I_COMBAT_MONSTER_CARD_ID, princeLife, 2);
const wilburCard = verifiedMonsterCard(SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID, wilburLife);

function swinePrinceBossDungeon(): GameState["dungeon"] {
  return {
    phase: "inBattle",
    cursor: 0,
    heroes: [],
    questDistribution: { questId: FACE_THE_THREAT_QUEST_ID, campaignLevel: 1 },
    activeBossThreatScriptId: SWINE_PRINCE_I_SCRIPT_ID,
  } as unknown as GameState["dungeon"];
}

function swinePrinceBattle(extra?: Partial<GameState["battle"]>): GameState {
  const heroes: BattleEntity[] = stances.map((stance, index) => ({
    id: `h${index}`,
    side: "hero",
    areaId: stance === "support" ? "b" : "a",
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
  const prince: BattleEntity = {
    id: "swine-prince",
    side: "monster",
    hero: null,
    monsterCardId: princeCard.id,
    life: princeLife,
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
      entities: [...heroes, prince],
      monsters: [princeCard, wilburCard],
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
    dungeon: swinePrinceBossDungeon(),
  } as GameState;
}

describe("Swine Prince I · Wilbur 最小运行时", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureSwinePrinceIBossScriptRegistered();
  });

  it("summon(battleStartWilbur) 声明 Wilbur 支援姿态 + stanceArea", () => {
    const script = getBossScript(SWINE_PRINCE_I_SCRIPT_ID)!;
    const plan = readSwinePrinceIWilburBattleStartPlan(script);
    expect(plan).toMatchObject({
      summonMonsterCardId: SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID,
      miniaturePlacement: "stanceArea",
      fixedStance: swinePrinceIWilburBattleStartStance(),
    });
    const hook = runBossHook(script, "summon", {
      scriptId: SWINE_PRINCE_I_SCRIPT_ID,
      skillSlot: 0,
      purpose: "skill",
    });
    expect(hook.status).toBe("stub");
  });

  it("applySwinePrinceIWilburBattleStart 写入 Wilbur 实体", () => {
    const state = swinePrinceBattle();
    const applied = applySwinePrinceIWilburBattleStart(state);
    expect(applied.events.some((event) => event.type === "commandRefused")).toBe(false);
    const wilbur = applied.state.battle!.entities.find(
      (entity) => entity.monsterCardId === SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID,
    );
    expect(wilbur).toMatchObject({
      stance: "support",
      stanceSlots: 1,
      areaId: "b",
      dead: false,
      life: wilburLife,
    });
  });

  it("Wilbur 已在场时 applySwinePrinceIWilburBattleStart 为 no-op", () => {
    const state = swinePrinceBattle();
    const first = applySwinePrinceIWilburBattleStart(state);
    const second = applySwinePrinceIWilburBattleStart(first.state);
    expect(second.events).toHaveLength(0);
    expect(second.state).toBe(first.state);
  });

  it("缺 Wilbur 卡面时 startBattle 拒绝", () => {
    const state = swinePrinceBattle({
      monsters: [princeCard],
    });
    const started = applyEncounterCommand(state, { type: "startBattle" });
    expect(started.events.some((event) => event.type === "commandRefused")).toBe(true);
    expect(
      started.state.battle!.entities.some(
        (entity) => entity.monsterCardId === SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID,
      ),
    ).toBe(false);
  });

  it("startBattle 写入 Wilbur 实体（Boss 战 + 已核实 Wilbur 卡）", () => {
    const state = swinePrinceBattle();
    const started = applyEncounterCommand(state, { type: "startBattle" });
    expect(started.events.some((event) => event.type === "commandRefused")).toBe(false);
    const wilbur = started.state.battle!.entities.find(
      (entity) => entity.monsterCardId === SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID,
    );
    expect(wilbur).toBeTruthy();
    expect(started.state.battle!.encounter?.round).toBe(1);
  });
});
