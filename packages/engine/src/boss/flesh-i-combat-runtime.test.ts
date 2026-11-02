import { describe, expect, it, beforeEach } from "vitest";
import { createBattleState, type BattleEntity } from "../battle";
import type { GameState } from "../command";
import { applyEncounterCommand } from "../encounter";
import type { MonsterCardView } from "../monster-skill";
import type { SkillStance } from "../hero-skill";
import { createLootState } from "../loot";
import {
  FLESH_I_HEAD_MONSTER_CARD_ID,
  FLESH_I_ONE_BODY_POOL_ID,
  FLESH_I_SCRIPT_ID,
  applyFleshIOneBodyBattleStart,
  applyFleshOneBodyMorphAtRoundStart,
  clearBossScriptsForTest,
  ensureFleshIBossScriptRegistered,
  getBossScript,
  readFleshIOneBodyMorphEnabled,
  readFleshIOneBodyPartBattleStartPlan,
  reconcileFleshOneBodyPools,
  FACE_THE_THREAT_QUEST_ID,
} from "./index";

const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

function verifiedFleshPartCard(id: string, life: number): MonsterCardView {
  return {
    id,
    name: id,
    life,
    dodge: 0,
    speed: 1,
    verification: { unverified: false },
    skills: [],
    typeTags: ["Beast"],
  } as MonsterCardView;
}

const sharedLife = 30;
const fleshCards = [
  verifiedFleshPartCard("monster_medium:warrens:flesh_head:p001", sharedLife),
  verifiedFleshPartCard("monster_medium:warrens:flesh_bone:p001", sharedLife),
  verifiedFleshPartCard("monster_medium:warrens:flesh_heart:p001", sharedLife),
  verifiedFleshPartCard("monster_medium:warrens:flesh_butt:p001", sharedLife),
];

function fleshBossDungeon(): GameState["dungeon"] {
  return {
    phase: "inBattle",
    cursor: 0,
    heroes: [],
    questDistribution: { questId: FACE_THE_THREAT_QUEST_ID, campaignLevel: 1 },
    activeBossThreatScriptId: FLESH_I_SCRIPT_ID,
  } as unknown as GameState["dungeon"];
}

function fleshBattle(extra?: Partial<GameState["battle"]>): GameState {
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
  const head: BattleEntity = {
    id: "flesh:head",
    side: "monster",
    hero: null,
    monsterCardId: FLESH_I_HEAD_MONSTER_CARD_ID,
    life: sharedLife,
    wounds: 0,
    dodge: 0,
    areaId: "a",
    stance: "aggressive",
    stanceSlots: 1,
    shuffleResist: false,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  return {
    ...createBattleState(7, {
      entities: [...heroes, head],
      monsters: fleshCards,
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
    dungeon: fleshBossDungeon(),
  } as GameState;
}

describe("The Flesh I · One Body 最小运行时", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureFleshIBossScriptRegistered();
  });

  it("readFleshIOneBodyPartBattleStartPlan 四部位 ok", () => {
    const script = getBossScript(FLESH_I_SCRIPT_ID)!;
    for (const part of ["head", "bone", "heart", "butt"] as const) {
      const plan = readFleshIOneBodyPartBattleStartPlan(script, part);
      expect(plan?.oneBodyPart).toBe(part);
      expect(plan?.miniaturePlacement).toBe("stanceArea");
    }
    expect(readFleshIOneBodyMorphEnabled(script)).toBe(true);
  });

  it("startBattle 写入四部位并挂共享 Life 池", () => {
    const state = fleshBattle();
    const started = applyEncounterCommand(state, { type: "startBattle" });
    expect(started.events.some((event) => event.type === "commandRefused")).toBe(false);
    const monsters = started.state.battle!.entities.filter((entity) => entity.side === "monster");
    expect(monsters).toHaveLength(4);
    expect(monsters.every((entity) => entity.oneBodyPoolId === FLESH_I_ONE_BODY_POOL_ID)).toBe(
      true,
    );
    expect(started.state.battle!.oneBodyPools?.[FLESH_I_ONE_BODY_POOL_ID]).toEqual({
      life: sharedLife,
      wounds: 0,
    });
  });

  it("共享 Life：任一部位受伤同步到全池", () => {
    const battle = fleshBattle().battle!;
    const withParts = applyFleshIOneBodyBattleStart({
      battle,
      seed: 1,
      dungeon: fleshBossDungeon(),
    } as GameState);
    expect(withParts.events.some((event) => event.type === "commandRefused")).toBe(false);
    const entities = withParts.state.battle!.entities.map((entity) =>
      entity.id === "flesh:bone" ? { ...entity, wounds: 5 } : entity,
    );
    const synced = reconcileFleshOneBodyPools(withParts.state.battle!, entities);
    const flesh = synced.filter((entity) => entity.oneBodyPoolId === FLESH_I_ONE_BODY_POOL_ID);
    expect(flesh.every((entity) => entity.wounds === 5)).toBe(true);
  });

  it("morph 第 2 轮起拒绝且不改状态", () => {
    const state = fleshBattle();
    const morph = applyFleshOneBodyMorphAtRoundStart(state, 2);
    expect(morph.events.some((event) => event.type === "commandRefused")).toBe(true);
    expect(morph.state).toBe(state);
  });
});
