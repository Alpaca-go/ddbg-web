import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { createBattleState, type BattleEntity } from "../battle";
import type { GameState } from "../command";
import type { HeroSkillCardView } from "../hero-skill";
import type { MonsterCardView } from "../monster-skill";
import { createLootState } from "../loot";
import {
  SIREN_I_COMBAT_MONSTER_CARD_ID,
  SIREN_I_HIGH_TIDE_SKILL_SLOT,
  SIREN_I_PELAGIC_MONSTER_CARD_ID,
  SIREN_I_SCRIPT_ID,
  applySirenIHighTidePelagicSummon,
  chainSirenIHighTidePelagicAfterMonsterSkill,
  clearBossScriptsForTest,
  ensureSirenIBossScriptRegistered,
  getBossScript,
  readSirenIHighTidePelagicPlan,
  runBossHook,
  sirenIPelagicHighTideStance,
  sirenIHighTideShouldSummonPelagic,
  FACE_THE_THREAT_QUEST_ID,
} from "./index";

function cards<T>(file: string): T[] {
  return (
    JSON.parse(
      readFileSync(
        new URL(`../../../data/normalized/corebox/${file}.json`, import.meta.url),
        "utf8",
      ),
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
    typeTags: ["Eldritch"],
    type_position_tags: ["Eldritch", "Front"],
    ...(width === 2 ? { size: "large" as const } : {}),
  } as MonsterCardView;
}

const soldier = cards<MonsterCardView>("monster_medium").find(
  (card) => card.id === "monster_medium:p001",
)!;
const smite = cards<HeroSkillCardView>("hero_skill").find((card) => card.id === "hero_skill:p001")!;
const heroProfiles = cards<NonNullable<import("../battle").BattleSetup["heroStats"]>[number]>(
  "hero_stat",
).filter((card) => card.attributesVerified && card.level === 1);
const crusader = heroProfiles.find((card) => card.name === "CRUSADER")!;

const sirenLife = 72;
const pelagicLife = 20;
const sirenCard: MonsterCardView = {
  ...verifiedMonsterCard(SIREN_I_COMBAT_MONSTER_CARD_ID, sirenLife, 2),
  skills: [{ ...soldier.skills[0]!, slot: SIREN_I_HIGH_TIDE_SKILL_SLOT }],
};
const pelagicCard = verifiedMonsterCard(SIREN_I_PELAGIC_MONSTER_CARD_ID, pelagicLife);

function sirenBossDungeon(): GameState["dungeon"] {
  return {
    phase: "inBattle",
    cursor: 0,
    heroes: [],
    questDistribution: { questId: FACE_THE_THREAT_QUEST_ID, campaignLevel: 1 },
    activeBossThreatScriptId: SIREN_I_SCRIPT_ID,
  } as unknown as GameState["dungeon"];
}

function sirenBattle(extra?: Partial<GameState["battle"]>): GameState {
  const siren: BattleEntity = {
    id: "siren",
    side: "monster",
    hero: null,
    monsterCardId: sirenCard.id,
    life: sirenLife,
    dodge: 0,
    areaId: "a",
    stance: "defensive",
    stanceSlots: 2,
    wounds: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  const hero: BattleEntity = {
    id: "h0",
    side: "hero",
    areaId: "a",
    stance: "aggressive",
    hero: "CRUSADER",
    heroStatId: crusader.id,
    life: crusader.life,
    skillIds: [smite.id],
    wounds: 0,
    stress: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  return {
    ...createBattleState(5, {
      entities: [hero, siren],
      monsters: [sirenCard, pelagicCard],
      areas: [
        { id: "a", elevation: "normal", adjacent: ["b"], capacity: 10 },
        { id: "b", elevation: "normal", adjacent: ["a"], capacity: 10 },
      ],
      light: 5,
      skills: [smite],
      heroStats: heroProfiles,
      lootPool: createLootState(),
      encounter: {
        round: 1,
        deck: ["monster"],
        actedIds: [],
        turn: { type: "monster", actorId: "siren" },
      },
      monsterAction: {
        actorId: "siren",
        skillSlot: SIREN_I_HIGH_TIDE_SKILL_SLOT,
        targetId: "h0",
        selectionRoll: null,
      },
      ...extra,
    }),
    dungeon: sirenBossDungeon(),
  } as GameState;
}

describe("Siren I · High Tide Pelagic 最小运行时", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureSirenIBossScriptRegistered();
  });

  it("summon(highTidePelagic) 声明 Pelagic + targetArea", () => {
    const script = getBossScript(SIREN_I_SCRIPT_ID)!;
    const plan = readSirenIHighTidePelagicPlan(script, SIREN_I_HIGH_TIDE_SKILL_SLOT);
    expect(plan).toMatchObject({
      summonMonsterCardId: SIREN_I_PELAGIC_MONSTER_CARD_ID,
      miniaturePlacement: "targetArea",
      fixedStance: sirenIPelagicHighTideStance(),
    });
    const stub = runBossHook(script, "summon", {
      scriptId: SIREN_I_SCRIPT_ID,
      skillSlot: 1,
      purpose: "skill",
    });
    expect(stub.status).toBe("stub");
  });

  it("applySirenIHighTidePelagicSummon 在目标区域写入 Pelagic", () => {
    const applied = applySirenIHighTidePelagicSummon(
      sirenBattle(),
      SIREN_I_HIGH_TIDE_SKILL_SLOT,
      "a",
    );
    const pelagic = applied.state.battle!.entities.find(
      (entity) => entity.monsterCardId === SIREN_I_PELAGIC_MONSTER_CARD_ID,
    );
    expect(pelagic).toMatchObject({
      areaId: "a",
      stance: sirenIPelagicHighTideStance(),
    });
  });

  it("sirenIHighTideShouldSummonPelagic 仅 High Tide slot", () => {
    const state = sirenBattle();
    expect(sirenIHighTideShouldSummonPelagic(state, "siren", SIREN_I_HIGH_TIDE_SKILL_SLOT)).toBe(
      true,
    );
    expect(sirenIHighTideShouldSummonPelagic(state, "siren", 1)).toBe(false);
  });

  it("chainSirenIHighTidePelagicAfterMonsterSkill 在技能结算后写入 Pelagic", () => {
    const state = sirenBattle();
    const chained = chainSirenIHighTidePelagicAfterMonsterSkill(
      { state, events: [] },
      "siren",
      SIREN_I_HIGH_TIDE_SKILL_SLOT,
      "a",
    );
    const pelagic = chained.state.battle!.entities.find(
      (entity) => entity.monsterCardId === SIREN_I_PELAGIC_MONSTER_CARD_ID,
    );
    expect(pelagic).toBeDefined();
  });
});
