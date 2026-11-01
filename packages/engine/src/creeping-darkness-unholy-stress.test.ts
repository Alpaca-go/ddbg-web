import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import creepingDarkness from "../../data/normalized/corebox/creeping_darkness_distribution.json";
import { createBattleState, type BattleEntity, type BattleSetup } from "./battle";
import { applyCommand, type ApplyResult, type GameState } from "./command";
import type { MonsterCardView } from "./monster-skill";
import { createLootState } from "./loot";
import {
  applyCreepingDarknessUnholySpawnStress,
  CREEPING_DARKNESS_III_QUEST_ID,
} from "./creeping-darkness-unholy-stress";

function cards<T>(file: string): T[] {
  return JSON.parse(
    readFileSync(new URL(`../../data/normalized/corebox/${file}.json`, import.meta.url), "utf8"),
  ).cards;
}

const monsters = [
  ...cards<MonsterCardView>("monster_medium"),
  ...cards<MonsterCardView>("monster_large"),
].filter((c) => c.skills);
const profiles = cards<NonNullable<BattleSetup["heroStats"]>[number]>("hero_stat");
const stances = ["aggressive", "defensive", "ranged", "support"] as const;

const UNHOLY_CARD_ID = "monster_medium:p001";
const NON_UNHOLY_CARD_ID = "monster_medium:p018";

function questDistribution(questId: string) {
  return questId === CREEPING_DARKNESS_III_QUEST_ID
    ? creepingDarkness
    : { questId, source: "fixture" as const, counts: creepingDarkness.counts };
}

function battleFixture(questId: string, monsterCardIds: readonly string[]): GameState {
  const stat = profiles.find((s) => s.name === "CRUSADER" && s.level === 1)!;
  const heroes: BattleEntity[] = stances.map((stance, i) => ({
    id: `h${i}`,
    side: "hero",
    hero: stat.name,
    heroStatId: stat.id,
    life: stat.life,
    areaId: "a",
    stance,
    skillIds: [],
    wounds: 0,
    stress: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  const monsterEntities: BattleEntity[] = monsterCardIds.map((monsterCardId, i) => {
    const card = monsters.find((c) => c.id === monsterCardId)!;
    return {
      id: `m${i}`,
      side: "monster",
      hero: null,
      monsterCardId: card.id,
      life: card.life,
      areaId: "a",
      stance: "aggressive",
      stanceSlots: 1,
      skillIds: [],
      wounds: 0,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    };
  });
  const base = createBattleState(11, {
    entities: [...heroes, ...monsterEntities],
    monsters,
    heroStats: profiles,
    skills: [],
    light: 5,
    areas: ["a", "b"].map((id, i, all) => ({
      id,
      adjacent: all.filter((_, n) => Math.abs(n - i) === 1),
      capacity: 20,
      elevation: "normal",
    })),
    lootPool: createLootState(),
  });
  return {
    ...base,
    dungeon: {
      phase: "inBattle",
      heroes: [],
      cursor: 0,
      campaignLevel: 3,
      questDistribution: questDistribution(questId),
    } as unknown as NonNullable<GameState["dungeon"]>,
  };
}

function withEncounter(state: GameState): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      encounter: {
        turn: { type: "awaitingAction", actorId: "h0" },
        round: 1,
      },
    },
  };
}

function spawnMonster(after: GameState, id: string, monsterCardId: string): ApplyResult {
  const card = monsters.find((c) => c.id === monsterCardId)!;
  return {
    state: {
      ...after,
      battle: {
        ...after.battle!,
        entities: [
          ...after.battle!.entities,
          {
            id,
            side: "monster",
            hero: null,
            monsterCardId: card.id,
            life: card.life,
            areaId: "a",
            stance: "aggressive",
            stanceSlots: 1,
            skillIds: [],
            wounds: 0,
            dodge: 0,
            guard: false,
            dead: false,
            bleed: [],
            blight: [],
          },
        ],
      },
    },
    events: [],
  };
}

describe("A-07 Creeping Darkness III · Unholy spawn 压力（quest:p014）", () => {
  it("初始部署：每只 Unholy 各触发一次全队 +1；非 Unholy 不计", () => {
    const before = withEncounter(
      battleFixture(CREEPING_DARKNESS_III_QUEST_ID, [UNHOLY_CARD_ID, NON_UNHOLY_CARD_ID, UNHOLY_CARD_ID]),
    );
    const initial = { state: before, events: [] as ApplyResult["events"] };
    const applied = applyCreepingDarknessUnholySpawnStress({ ...before, battle: undefined }, initial);
    expect(applied.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress)).toEqual([
      2, 2, 2, 2,
    ]);
    expect(
      applied.events.some((e) => e.type === "dungeonUpdated" && e.message.includes("Creeping Darkness III")),
    ).toBe(true);
  });

  it("后续召唤 Unholy 再 +1；同命令追加非 Unholy 不涨压", () => {
    const started = withEncounter(
      battleFixture(CREEPING_DARKNESS_III_QUEST_ID, [NON_UNHOLY_CARD_ID]),
    );
    const afterUnholy = spawnMonster(started, "spawn-unholy", UNHOLY_CARD_ID);
    const spawned = applyCreepingDarknessUnholySpawnStress(started, afterUnholy);
    expect(spawned.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress)).toEqual([
      1, 1, 1, 1,
    ]);
    const afterHuman = spawnMonster(spawned.state, "spawn-human", NON_UNHOLY_CARD_ID);
    const neutral = applyCreepingDarknessUnholySpawnStress(spawned.state, afterHuman);
    expect(neutral.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress)).toEqual([
      1, 1, 1, 1,
    ]);
  });

  it("非 quest:p014 任务：相同 Unholy 生成不触发", () => {
    const started = withEncounter(battleFixture("quest:p005", [NON_UNHOLY_CARD_ID]));
    const after = spawnMonster(started, "spawn-unholy", UNHOLY_CARD_ID);
    const applied = applyCreepingDarknessUnholySpawnStress(started, after);
    expect(applied).toBe(after);
    expect(applied.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress)).toEqual([
      0, 0, 0, 0,
    ]);
  });

  it("公开 applyCommand · startBattle 路径在 p014 下对初始 Unholy 生效", () => {
    const state = battleFixture(CREEPING_DARKNESS_III_QUEST_ID, [UNHOLY_CARD_ID]);
    const result = applyCommand(state, { type: "startBattle" });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(result.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress)).toEqual([
      1, 1, 1, 1,
    ]);
  });

  it("公开 applyCommand · startBattle 在非 p014 下不改动压力", () => {
    const state = battleFixture("quest:p005", [UNHOLY_CARD_ID]);
    const result = applyCommand(state, { type: "startBattle" });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(result.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress)).toEqual([
      0, 0, 0, 0,
    ]);
  });
});
