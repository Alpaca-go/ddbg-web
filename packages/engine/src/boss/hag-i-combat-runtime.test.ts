import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { createBattleState, type BattleEntity } from "../battle";
import { applyEncounterCommand } from "../encounter";
import type { GameState } from "../command";
import type { MonsterCardView } from "../monster-skill";
import type { SkillStance } from "../hero-skill";
import { createLootState } from "../loot";
import {
  HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
  HAG_I_COMBAT_MONSTER_CARD_ID,
  HAG_I_SCRIPT_ID,
  applyHagICauldronBattleStart,
  clearBossScriptsForTest,
  ensureHagIBossScriptRegistered,
  getBossScript,
  hagICauldronBattleStartStance,
  readHagICauldronBattleStartPlan,
  runBossHook,
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

const heroProfiles = cards<NonNullable<import("../battle").BattleSetup["heroStats"]>[number]>(
  "hero_stat",
).filter((card) => card.attributesVerified && card.level === 1);

function verifiedMonsterCard(id: string, life: number, width: 1 | 2 = 1): MonsterCardView {
  return {
    id,
    name: id,
    life,
    dodge: 0,
    speed: 1,
    verification: { unverified: false },
    skills: [],
    typeTags: ["Human"],
    type_position_tags: ["Human", "Front"],
    ...(width === 2 ? { size: "large" as const } : {}),
  } as MonsterCardView;
}

const hagLife = 60;
const cauldronLife = 100;
const hagCard = verifiedMonsterCard(HAG_I_COMBAT_MONSTER_CARD_ID, hagLife, 2);
const cauldronCard = verifiedMonsterCard(HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID, cauldronLife, 2);

function hagBossDungeon(): GameState["dungeon"] {
  return {
    phase: "inBattle",
    cursor: 0,
    heroes: [],
    questDistribution: { questId: FACE_THE_THREAT_QUEST_ID, campaignLevel: 1 },
    activeBossThreatScriptId: HAG_I_SCRIPT_ID,
  } as unknown as GameState["dungeon"];
}

function hagBattle(extra?: Partial<GameState["battle"]>): GameState {
  const hag: BattleEntity = {
    id: "hag",
    side: "monster",
    hero: null,
    monsterCardId: hagCard.id,
    life: hagLife,
    dodge: 0,
    areaId: "a",
    stance: "ranged",
    stanceSlots: 2,
    wounds: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  const names = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"] as const;
  const heroes: BattleEntity[] = names.map((name, index) => {
    const stat = heroProfiles.find((card) => card.name === name)!;
    return {
      id: `h${index}`,
      side: "hero",
      areaId: stances[index] === "aggressive" ? "a" : "b",
      stance: stances[index]!,
      hero: name,
      heroStatId: stat.id,
      life: stat.life,
      skillIds: [],
      wounds: 0,
      stress: 0,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    };
  });
  return {
    ...createBattleState(3, {
      entities: [...heroes, hag],
      monsters: [hagCard, cauldronCard],
      areas: [
        { id: "a", elevation: "normal", adjacent: ["b"], capacity: 10 },
        { id: "b", elevation: "normal", adjacent: ["a"], capacity: 10 },
      ],
      light: 5,
      skills: [],
      heroStats: heroProfiles,
      lootPool: createLootState(),
      ...extra,
    }),
    dungeon: hagBossDungeon(),
  } as GameState;
}

describe("Hag I · Cauldron Empty 最小运行时", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureHagIBossScriptRegistered();
  });

  it("summon(battleStartCauldron) 声明 Empty Cauldron + stanceArea", () => {
    const script = getBossScript(HAG_I_SCRIPT_ID)!;
    const plan = readHagICauldronBattleStartPlan(script);
    expect(plan).toMatchObject({
      summonMonsterCardId: HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
      miniaturePlacement: "stanceArea",
      fixedStance: hagICauldronBattleStartStance(),
    });
    const hook = runBossHook(script, "summon", {
      scriptId: HAG_I_SCRIPT_ID,
      skillSlot: 0,
      purpose: "skill",
    });
    expect(hook.status).toBe("stub");
  });

  it("applyHagICauldronBattleStart 写入 Cauldron 实体", () => {
    const applied = applyHagICauldronBattleStart(hagBattle());
    const cauldron = applied.state.battle!.entities.find(
      (entity) => entity.monsterCardId === HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
    );
    expect(cauldron).toMatchObject({
      stance: hagICauldronBattleStartStance(),
      stanceSlots: 2,
      areaId: "a",
    });
    expect(applied.events.some((event) => event.type === "dungeonUpdated")).toBe(true);
  });

  it("Cauldron 已在场时 applyHagICauldronBattleStart 为 no-op", () => {
    const first = applyHagICauldronBattleStart(hagBattle());
    const second = applyHagICauldronBattleStart(first.state);
    expect(second.events).toHaveLength(0);
  });

  it("缺 Cauldron 卡面时 startBattle 拒绝", () => {
    const state = hagBattle({
      monsters: [hagCard],
    });
    const started = applyEncounterCommand(state, { type: "startBattle" });
    expect(started.events.some((event) => event.type === "commandRefused")).toBe(true);
  });

  it("startBattle 写入 Cauldron（Boss 战 + 已核实卡）", () => {
    const started = applyEncounterCommand(hagBattle(), { type: "startBattle" });
    expect(started.events.some((event) => event.type === "commandRefused")).toBe(false);
    const cauldron = started.state.battle!.entities.find(
      (entity) => entity.monsterCardId === HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
    );
    expect(cauldron).toBeDefined();
  });
});
