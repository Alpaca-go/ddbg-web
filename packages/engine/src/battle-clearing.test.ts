import { createLootState } from "./loot";
import { createRng } from "./rng";
import { describe, expect, it } from "vitest";
import { createBattleState, type BattleEntity } from "./battle";
import { applyCommand, type GameState } from "./command";
import { coreQuestSources } from "./test-helpers/core-quest";
import { savedCommandSchema } from "../../data/src/quest-save";

const stat = coreQuestSources.catalog.heroStats.find(
  (c) => c.name === "CRUSADER" && c.level === 1,
)!;
const card = coreQuestSources.catalog.monsters.find((c) => c.id === "monster_medium:p001")!;
function setup(version = true, stress = 2, areaId = "B"): GameState {
  const stances = ["aggressive", "defensive", "ranged", "support"] as const;
  const entities: BattleEntity[] = stances.map((stance, i) => ({
    id: `h${i}`,
    side: "hero",
    hero: "CRUSADER",
    heroStatId: stat.id,
    heroLevel: 1,
    life: stat.life,
    areaId: i === 0 ? areaId : "A",
    stance,
    skillIds: [],
    wounds: 0,
    stress,
    dodge: stat.dodge!,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  entities.push({
    id: "m",
    side: "monster",
    hero: null,
    monsterCardId: card.id,
    life: card.life,
    areaId: "B",
    stance: "aggressive",
    stanceSlots: 1,
    skillIds: [],
    wounds: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  });
  const base: GameState = {
    ...createBattleState(4, {
      entities,
      monsters: [card],
      heroStats: [stat],
      skills: [],
      light: 1,
      wealdMechanics: true,
      areas: ["A", "B"].map((id) => ({
        id,
        capacity: 8,
        elevation: "normal" as const,
        adjacent: id === "A" ? ["B"] : ["A"],
      })),
    }),
    dungeon: {
      phase: "inBattle",
      mode: "radiant",
      heroes: [],
      contentPacks: ["core", "weald"],
      roomCards: { active: { roomId: "R1", cardId: "room:weald:09" } },
    } as unknown as NonNullable<GameState["dungeon"]>,
  };
  const started = applyCommand(base, {
    type: "startBattle",
    ...(version
      ? { wealdClearingHeroes: true as const, wealdClearingMonsters: true as const }
      : {}),
  });
  const refusal = started.events.find((e) => e.type === "commandRefused");
  if (refusal) throw new Error(refusal.message);
  return {
    ...started.state,
    battle: {
      ...started.state.battle!,
      encounter: {
        ...started.state.battle!.encounter!,
        turn: { type: "hero", actorId: "h0", actions: 2, usedSkillIds: [], mustMove: false },
      },
    },
  };
}
const backward = { type: "changeStance", actorId: "h0", direction: "backward" } as const;
const forward = { ...backward, direction: "forward" } as const;
function monsterTurn(count = 4, version = true): GameState {
  const state = setup(version);
  const pool = createLootState();
  return {
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((e) => (e.id === "h1" ? { ...e, dodge: 100 } : e)),
      loot: {
        ...pool,
        available: pool.available.slice(count),
        placed: pool.available.slice(0, count).map((t) => ({ ...t, areaId: "B", revealed: false })),
      },
      encounter: { ...state.battle!.encounter!, turn: { type: "monster", actorId: "m" } },
    },
  };
}
const skill = { type: "playMonsterSkill", actorId: "m", targetId: "h1", skillSlot: 1 } as const;
describe("Clearing 怪物部分（R-234／R-238／R-260）", () => {
  it("公开技能结束回合随机归还一箱，不拾取、不发奖励、不触发 Ours", () => {
    const state = monsterTurn();
    const legacy = applyCommand(monsterTurn(4, false), skill);
    const rng = createRng(state.seed);
    for (let i = 0; i < legacy.state.battle!.rngCursor; i++) rng.next();
    const expectedId = state.battle!.loot!.placed[Math.floor(rng.next() * 4)]!.id;
    const result = applyCommand(state, skill);
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    const loot = result.state.battle!.loot!;
    expect(loot.placed).toHaveLength(3);
    expect(loot.placed.some((t) => t.id === expectedId)).toBe(false);
    expect(loot.available[loot.available.length - 1]!.id).toBe(expectedId);
    expect(loot.available).toHaveLength(7);
    expect(loot.claimedIds).toEqual([]);
    expect(loot.gold).toBe(0);
    expect(new Set([...loot.available, ...loot.placed].map((t) => t.id)).size).toBe(10);
    expect(result.state.battle!.rngCursor).toBe(legacy.state.battle!.rngCursor + 1);
    expect(result.events.some((e) => e.type === "lootResolved")).toBe(false);
    expect(
      result.events.filter((e) => e.type === "passiveTriggered" && e.trigger === "clearing"),
    ).toHaveLength(1);
    expect(applyCommand(JSON.parse(JSON.stringify(state)), skill)).toEqual(result);
    expect(state.battle!.loot!.placed).toHaveLength(4);
  });
  it("空场宝箱不耗随机数，旧版本不移箱，有限池不守恒则整条攻击回滚", () => {
    const empty = monsterTurn(0);
    const result = applyCommand(empty, skill);
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(result.state.battle!.rngCursor).toBe(
      applyCommand(monsterTurn(0, false), skill).state.battle!.rngCursor,
    );
    expect(applyCommand(monsterTurn(4, false), skill).state.battle!.loot!.placed).toHaveLength(4);
    const base = monsterTurn();
    const invalid = {
      ...base,
      battle: { ...base.battle!, loot: { ...base.battle!.loot!, available: [] } },
    };
    const refused = applyCommand(invalid, skill);
    expect(refused.events[0]!.type).toBe("commandRefused");
    expect(refused.state).toBe(invalid);
  });
});
describe("Clearing 英雄部分（R-234／R-238）", () => {
  it("仅 B 区英雄真正结束回合时恢复1压力，低光不把恢复变成伤害或额外耗骰", () => {
    const state = setup();
    const first = applyCommand(state, backward);
    expect(first.state.battle!.entities[0]!.stress).toBe(2);
    const result = applyCommand(first.state, forward);
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(result.state.battle!.entities[0]!.stress).toBe(1);
    expect(result.state.battle!.entities[1]!.stress).toBe(2);
    expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
    expect(result.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
    expect(applyCommand(JSON.parse(JSON.stringify(first.state)), forward)).toEqual(result);
    expect(applyCommand(result.state, forward).state).toBe(result.state);
  });
  it("压力0下限、非B与历史无标记命令保持原行为", () => {
    for (const [state, expected] of [
      [setup(true, 0), 0],
      [setup(true, 2, "A"), 2],
      [setup(false), 2],
    ] as const) {
      const result = applyCommand(applyCommand(state, backward).state, forward);
      expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
      expect(result.state.battle!.entities[0]!.stress).toBe(expected);
    }
  });
  it("严格命令分别保留英雄／怪物版本，拒绝错误值", () => {
    const command = { type: "startBattle", wealdClearingHeroes: true };
    expect(savedCommandSchema.parse(command)).toEqual(command);
    expect(savedCommandSchema.safeParse({ ...command, wealdClearingHeroes: false }).success).toBe(
      false,
    );
    expect(
      savedCommandSchema.safeParse({ type: "startBattle", wealdClearingMonsters: false }).success,
    ).toBe(false);
  });
});
