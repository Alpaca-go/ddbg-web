import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { createBattleState, type BattleEntity, type BattleSetup } from "../battle";
import { applyCommand } from "../command";
import type { GameState } from "../command";
import type { HeroSkillCardView } from "../hero-skill";
import { applyEncounterCommand } from "../encounter";
import type { MonsterCardView } from "../monster-skill";
import type { SkillStance } from "../hero-skill";
import { createLootState } from "../loot";
import {
  SWINE_PRINCE_I_COMBAT_MONSTER_CARD_ID,
  SWINE_PRINCE_I_ENRAGED_DESTRUCTION_SKILL_SLOT,
  SWINE_PRINCE_I_SCRIPT_ID,
  SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID,
  applySwinePrinceIEnragedDestruction,
  applySwinePrinceIWilburBattleStart,
  chainSwinePrinceIEnragedDestructionAfterHeroSkill,
  clearBossScriptsForTest,
  ensureSwinePrinceIBossScriptRegistered,
  getBossScript,
  readSwinePrinceIEnragedDestructionEnabled,
  readSwinePrinceIWilburBattleStartPlan,
  runBossHook,
  swinePrinceIWilburBattleStartStance,
  FACE_THE_THREAT_QUEST_ID,
} from "./index";

const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

function cards<T>(file: string): T[] {
  return (
    JSON.parse(
      readFileSync(new URL(`../../../data/normalized/corebox/${file}.json`, import.meta.url), "utf8"),
    ) as { cards: T[] }
  ).cards;
}

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
    type_position_tags: ["Beast", "Front"],
    ...(width === 2 ? { size: "large" as const } : {}),
  } as MonsterCardView;
}

const princeLife = 84;
const wilburLife = 12;
const soldier = cards<MonsterCardView>("monster_medium").find((card) => card.id === "monster_medium:p001")!;
const smite = cards<HeroSkillCardView>("hero_skill").find((card) => card.id === "hero_skill:p001")!;
const heroProfiles = cards<NonNullable<BattleSetup["heroStats"]>[number]>("hero_stat").filter(
  (card) => card.attributesVerified && card.level === 1,
);
const enragedSkill = soldier.skills.find((skill) => skill.slot === 1)!;
const princeCard: MonsterCardView = {
  ...verifiedMonsterCard(SWINE_PRINCE_I_COMBAT_MONSTER_CARD_ID, princeLife, 2),
  skills: [{ ...enragedSkill, slot: SWINE_PRINCE_I_ENRAGED_DESTRUCTION_SKILL_SLOT }],
};
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

function swinePrinceBattleWithSmite(extra?: Partial<GameState["battle"]>): GameState {
  const names = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"] as const;
  const heroes: BattleEntity[] = names.map((name, index) => {
    const stat = heroProfiles.find((card) => card.name === name)!;
    return {
      id: `h${index}`,
      side: "hero",
      areaId: stances[index] === "support" ? "b" : "a",
      stance: stances[index]!,
      hero: name,
      heroStatId: stat.id,
      life: stat.life,
      skillIds: index === 0 ? [smite.id] : [],
      wounds: 0,
      stress: 0,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    };
  });
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
      heroStats: heroProfiles,
      skills: [smite],
      areas: [
        { id: "a", elevation: "normal", adjacent: ["b"], capacity: 10 },
        { id: "b", elevation: "normal", adjacent: ["a"], capacity: 8 },
      ],
      light: 5,
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

describe("Swine Prince I · Enraged Destruction 最小运行时", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureSwinePrinceIBossScriptRegistered();
  });

  it("enragedDestruction 钩子与 slot 常量已声明", () => {
    const script = getBossScript(SWINE_PRINCE_I_SCRIPT_ID)!;
    expect(readSwinePrinceIEnragedDestructionEnabled(script)).toBe(true);
    expect(SWINE_PRINCE_I_ENRAGED_DESTRUCTION_SKILL_SLOT).toBe(3);
    const hook = runBossHook(script, "enragedDestruction", { scriptId: SWINE_PRINCE_I_SCRIPT_ID });
    expect(hook).toMatchObject({
      status: "ok",
      effect: "princeUsesSkillWhenWilburDamaged",
      targetPolicy: "offendingHero",
      skillSlot: 3,
    });
  });

  it("applySwinePrinceIEnragedDestruction：Wilbur 受伤后 Prince 反击施法英雄", () => {
    let state = applySwinePrinceIWilburBattleStart(swinePrinceBattleWithSmite()).state;
    const wilburId = state.battle!.entities.find(
      (entity) => entity.monsterCardId === SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID,
    )!.id;
    state = {
      ...state,
      battle: {
        ...state.battle!,
        rngCursor: 0,
        entities: state.battle!.entities.map((entity) => {
          if (entity.id === wilburId) return { ...entity, wounds: 2 };
          if (entity.id === "h0") return { ...entity, areaId: "b" };
          return entity;
        }),
        encounter: {
          round: 1,
          deck: ["hero"],
          actedIds: [],
          turn: { type: "hero", actorId: "h0", actions: 1, usedSkillIds: [] },
        },
      },
    };
    const heroBefore = state.battle!.entities.find((entity) => entity.id === "h0")!.wounds;
    const result = applySwinePrinceIEnragedDestruction(state, "h0");
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    expect(
      result.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("Enraged Destruction"),
      ),
    ).toBe(true);
    expect(result.events.some((event) => event.type === "monsterSkillResolved")).toBe(true);
    const heroAfter = result.state.battle!.entities.find((entity) => entity.id === "h0")!.wounds;
    expect(heroAfter).toBeGreaterThanOrEqual(heroBefore);
  });

  it("Wilbur 伤口未增加时不链接 Enraged Destruction", () => {
    const state = applySwinePrinceIWilburBattleStart(swinePrinceBattleWithSmite()).state;
    const result = chainSwinePrinceIEnragedDestructionAfterHeroSkill(
      { state, events: [] },
      state.battle!.entities,
      "h0",
    );
    expect(result.events).toHaveLength(0);
    expect(result.state).toBe(state);
  });

  it("英雄技能命中 Wilbur 后自动触发 Prince Enraged Destruction", () => {
    let state = applySwinePrinceIWilburBattleStart(swinePrinceBattleWithSmite()).state;
    const wilbur = state.battle!.entities.find(
      (entity) => entity.monsterCardId === SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID,
    )!;
    state = {
      ...state,
      battle: {
        ...state.battle!,
        rngCursor: 0,
        entities: state.battle!.entities.map((entity) =>
          entity.id === "h0" || entity.id === wilbur.id ? { ...entity, areaId: "b" } : entity,
        ),
        encounter: {
          round: 1,
          deck: ["hero"],
          actedIds: [],
          turn: { type: "hero", actorId: "h0", actions: 1, usedSkillIds: [] },
        },
      },
    };
    const heroWoundsBefore = state.battle!.entities.find((entity) => entity.id === "h0")!.wounds;
    const played = applyCommand(state, {
      type: "playHeroSkill",
      actorId: "h0",
      targetId: wilbur.id,
      skillId: smite.id,
    });
    const refused = played.events.find((event) => event.type === "commandRefused");
    expect(refused, refused?.message).toBeUndefined();
    expect(
      played.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("Enraged Destruction"),
      ),
    ).toBe(true);
    const wilburAfter = played.state.battle!.entities.find((entity) => entity.id === wilbur.id)!;
    expect(wilburAfter.wounds).toBeGreaterThan(wilbur.wounds);
    const heroWoundsAfter = played.state.battle!.entities.find((entity) => entity.id === "h0")!.wounds;
    expect(heroWoundsAfter).toBeGreaterThanOrEqual(heroWoundsBefore);
  });
});
