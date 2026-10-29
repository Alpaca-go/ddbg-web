import { describe, expect, it, beforeEach } from "vitest";
import layout from "../../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../../data/normalized/corebox/scout_ahead_distribution.json";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createBattleState } from "../battle";
import { createDungeonSandbox } from "../dungeon";
import { nextBattleRoll } from "../encounter";
import { resolveMonsterSkillEffects } from "../monster-skill";
import type { MonsterCardView } from "../monster-skill";
import {
  HAG_I_SCRIPT_ID,
  PROPHET_I_SCRIPT_ID,
  SIREN_I_SCRIPT_ID,
  COLLECTOR_I_SCRIPT_ID,
  FANATIC_I_SCRIPT_ID,
  FLESH_I_SCRIPT_ID,
  applyBossThreatBlackSheepBeforeHamletEvent,
  applyBossThreatCreepingSicknessEndOfHamletDay,
  applyBossThreatStressOnDungeonEntry,
  completeCurioRoomWithoutCurioDraw,
  ensureCoreBossScriptsRegistered,
  shouldSkipCurioDrawInCurioRoom,
  withLargeMonsterSpawnGuard,
} from "./index";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { rollHamletCaretaker } from "../hamlet-event";
import { currentHamletHero } from "../hamlet-actions";
import { readFileSync } from "node:fs";

const arbalist: MonsterCardView = JSON.parse(
  readFileSync(
    new URL("../../../data/normalized/corebox/monster_medium.json", import.meta.url),
    "utf8",
  ),
).cards.find((card: MonsterCardView) => card.id === "monster_medium:p007");

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result.state;
}

function finishProvisions(game: GameState) {
  let result = applyCommand(game, { type: "rollDungeonProvisions" });
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  let state = result.state;
  while (result.pendingChoice) {
    result = applyCommand(state, {
      type: "resolveChoice",
      choiceId: result.pendingChoice.id,
      optionId: result.pendingChoice.options[0]!.id,
    });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    state = result.state;
  }
  expect(state.dungeon!.phase).toBe("ready");
  return state;
}

function hamletJourney(seed = 40) {
  let game = createCoreDungeonQuest(seed, "quest:p001", "radiant", coreParty, coreQuestSources);
  let result = applyCommand(game, { type: "rollDungeonProvisions" });
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  game = result.state;
  while (result.pendingChoice) {
    result = applyCommand(game, {
      type: "resolveChoice",
      choiceId: result.pendingChoice.id,
      optionId: result.pendingChoice.options[0]!.id,
    });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    game = result.state;
  }
  result = applyCommand(game, { type: "leaveDungeon" });
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  game = ok(result.state, {
    type: "resolveChoice",
    choiceId: result.pendingChoice!.id,
    optionId: "agree",
  });
  for (const type of [
    "summarizeDungeonQuest",
    "beginReturnToHamlet",
    "finishReturnToHamlet",
    "drawHamletEvent",
    "rollHamletCaretaker",
  ] as const)
    game = ok(game, { type });
  return game;
}

describe("威胁被动运行时接线", () => {
  beforeEach(() => ensureCoreBossScriptsRegistered());

  it("Prophet I：进地牢命令路径每名英雄 +2 压力", () => {
    let game = createCoreDungeonQuest(902, "quest:p001", "standard", coreParty, coreQuestSources);
    game = ok(game, { type: "setActiveBossThreat", scriptId: PROPHET_I_SCRIPT_ID });
    game = finishProvisions(game);
    expect(game.dungeon!.heroes.every((h) => h.stress === 2)).toBe(true);
  });

  it("Prophet I：helper 进地牢压力可单独调用", () => {
    let game = createCoreDungeonQuest(903, "quest:p001", "standard", coreParty, coreQuestSources);
    game = ok(game, { type: "setActiveBossThreat", scriptId: PROPHET_I_SCRIPT_ID });
    const entry = applyBossThreatStressOnDungeonEntry(game);
    expect(entry.state.dungeon!.heroes.every((h: { stress: number }) => h.stress === 2)).toBe(true);
  });

  it("Prophet I：酒馆减压有效 −1", () => {
    let game = hamletJourney();
    game = ok(game, { type: "setActiveBossThreat", scriptId: PROPHET_I_SCRIPT_ID });
    const heroId = game.dungeon!.hamlet!.heroOrder[0]!;
    game = {
      ...game,
      dungeon: {
        ...game.dungeon!,
        hamlet: { ...game.dungeon!.hamlet!, blockedBuildings: [], caretaker: "graveyard" },
        heroes: game.dungeon!.heroes.map((h) => (h.id === heroId ? { ...h, stress: 5 } : h)),
      },
    };
    game = ok(game, {
      type: "visitHamletBuilding",
      actorId: heroId,
      serviceId: "tavern3",
      quirkIds: [],
    });
    expect(game.dungeon!.heroes.find((h) => h.id === heroId)!.stress).toBe(3);
  });

  it("Hag I：疗养院 heal5 有效 Life −3（8 伤口 → 6）", () => {
    let game = hamletJourney();
    game = ok(game, { type: "setActiveBossThreat", scriptId: HAG_I_SCRIPT_ID });
    const heroId = game.dungeon!.hamlet!.heroOrder[0]!;
    game = {
      ...game,
      dungeon: {
        ...game.dungeon!,
        hamlet: { ...game.dungeon!.hamlet!, blockedBuildings: [], caretaker: "graveyard" },
        heroes: game.dungeon!.heroes.map((h) =>
          h.id === heroId ? { ...h, wounds: 8, attributesVerified: true, life: 33 } : h,
        ),
      },
    };
    game = ok(game, {
      type: "visitHamletBuilding",
      actorId: heroId,
      serviceId: "heal5",
      quirkIds: [],
    });
    expect(game.dungeon!.heroes.find((h) => h.id === heroId)!.wounds).toBe(6);
  });

  it("Siren I：abbey 封锁并在清除威胁后 strip", () => {
    let game = hamletJourney();
    game = ok(game, { type: "setActiveBossThreat", scriptId: SIREN_I_SCRIPT_ID });
    expect(game.dungeon!.hamlet!.blockedBuildings).toContain("abbey");
    game = ok(game, { type: "setActiveBossThreat", scriptId: null });
    expect(game.dungeon!.hamlet!.blockedBuildings).not.toContain("abbey");
  });

  it("Swine Prince I：Beast 怪物攻击 threatFlatDamageBonus +2", () => {
    const beastCard: MonsterCardView = { ...arbalist, type_position_tags: ["Beast"] };
    const combat = {
      actor: { id: "m", wounds: 0 },
      target: { id: "h", side: "hero" as const, wounds: 0, dodge: 0, stress: 0 },
      areaDistance: 2,
      light: 5,
    };
    const boosted = resolveMonsterSkillEffects(
      beastCard,
      1,
      { ...combat, threatFlatDamageBonus: 2 },
      8,
    );
    const plain = resolveMonsterSkillEffects(beastCard, 1, combat, 8);
    const boostedW = boosted.healthEffects.find((e) => e.source === "attack")!.effect;
    const plainW = plain.healthEffects.find((e) => e.source === "attack")!.effect;
    if (boostedW.type !== "wounds" || plainW.type !== "wounds") throw new Error("wounds");
    expect(boostedW.amounts[0]! - plainW.amounts[0]!).toBe(2);
  });

  it("rollHamletCaretaker 合并 Siren abbey 封锁", () => {
    const state = {
      seed: 904,
      notes: [],
      dungeon: {
        phase: "inHamlet",
        cursor: 0,
        heroes: coreParty.map((h, i) => ({ ...h, id: `hero-${i}`, attributesVerified: true })),
        activeBossThreatScriptId: SIREN_I_SCRIPT_ID,
        hamlet: {
          deck: [],
          permanentlyRemoved: [],
          active: null,
          last: "hamlet_event:p001",
          phase: "awaitingCaretaker",
          preparationDays: 1,
          day: 1,
          noCaretaker: false,
          extraBlock: false,
          caretaker: null,
          blockedBuildings: [],
          heroOrder: coreParty.map((_, i) => `hero-${i}`),
        },
      },
    } as unknown as GameState;
    expect(rollHamletCaretaker(state).state.dungeon!.hamlet!.blockedBuildings).toContain("abbey");
  });

  it("Collector I：激活威胁时跳过 Curio 房间抽牌", () => {
    let game = createCoreDungeonQuest(905, "quest:p001", "standard", coreParty, coreQuestSources);
    game = ok(game, { type: "setActiveBossThreat", scriptId: COLLECTOR_I_SCRIPT_ID });
    expect(shouldSkipCurioDrawInCurioRoom(game.dungeon!)).toBe(true);
    const roomId =
      game.dungeon!.rooms.find((r) => r.kind === "curio")?.id ?? game.dungeon!.position;
    game = {
      ...game,
      dungeon: {
        ...game.dungeon!,
        position: roomId,
        phase: "awaitingRoom",
        curioRoom: { roomId, guardRoll: 8, stage: "reward" },
        rooms: game.dungeon!.rooms.map((r) =>
          r.id === roomId ? { ...r, kind: "curio" as const, cleared: false } : r,
        ),
      },
    };
    const skipped = completeCurioRoomWithoutCurioDraw(game);
    expect(skipped.state.dungeon!.phase).toBe("ready");
    expect(skipped.state.dungeon!.rooms.find((r) => r.id === roomId)!.cleared).toBe(true);
    expect("curioRoom" in skipped.state.dungeon!).toBe(false);
  });

  it("Fanatic I：drawHamletEvent 前 The Black Sheep 对 d10 最低者 +4 压力", () => {
    let game = createCoreDungeonQuest(906, "quest:p001", "standard", coreParty, coreQuestSources);
    let result = applyCommand(game, { type: "rollDungeonProvisions" });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    game = result.state;
    while (result.pendingChoice) {
      result = applyCommand(game, {
        type: "resolveChoice",
        choiceId: result.pendingChoice.id,
        optionId: result.pendingChoice.options[0]!.id,
      });
      game = result.state;
    }
    result = applyCommand(game, { type: "leaveDungeon" });
    game = ok(result.state, {
      type: "resolveChoice",
      choiceId: result.pendingChoice!.id,
      optionId: "agree",
    });
    for (const type of [
      "summarizeDungeonQuest",
      "beginReturnToHamlet",
      "finishReturnToHamlet",
    ] as const)
      game = ok(game, { type });
    game = ok(game, { type: "setActiveBossThreat", scriptId: FANATIC_I_SCRIPT_ID });
    const before = game.dungeon!.heroes.map((h) => h.stress);
    game = ok(game, { type: "drawHamletEvent" });
    const after = game.dungeon!.heroes.map((h) => h.stress);
    expect(after.some((s, i) => s > before[i]!)).toBe(true);
    const delta = after.map((s, i) => s - before[i]!);
    expect(delta.filter((d) => d === 4).length).toBeGreaterThanOrEqual(1);
    expect(delta.every((d) => d === 0 || d === 4)).toBe(true);
  });

  it("Fanatic I：The Black Sheep helper 可单独调用", () => {
    let game = createCoreDungeonQuest(907, "quest:p001", "standard", coreParty, coreQuestSources);
    game = ok(game, { type: "setActiveBossThreat", scriptId: FANATIC_I_SCRIPT_ID });
    const result = applyBossThreatBlackSheepBeforeHamletEvent(game);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(result.state.dungeon!.heroes.some((h) => h.stress === 4)).toBe(true);
  });

  it("Flesh I：日末未访建筑累积伤口，访问时转移", () => {
    let game = hamletJourney(40);
    game = ok(game, { type: "setActiveBossThreat", scriptId: FLESH_I_SCRIPT_ID });
    const endDay = applyBossThreatCreepingSicknessEndOfHamletDay({
      ...game,
      dungeon: {
        ...game.dungeon!,
        hamlet: {
          ...game.dungeon!.hamlet!,
          phase: "awaitingCaretaker",
          visitedBuildings: ["tavern"],
        },
      },
    });
    expect(endDay.state.dungeon!.hamlet!.buildingWounds?.tavern).toBeUndefined();
    expect(endDay.state.dungeon!.hamlet!.buildingWounds?.sanitarium).toBe(1);

    game = ok(endDay.state, { type: "rollHamletCaretaker" });
    const actorId = currentHamletHero(game)!.id;
    game = {
      ...game,
      dungeon: {
        ...game.dungeon!,
        gold: 999,
        hamlet: {
          ...game.dungeon!.hamlet!,
          blockedBuildings: [],
          caretaker: "graveyard",
          visitedBuildings: [],
          buildingWounds: { tavern: 2 },
        },
        heroes: game.dungeon!.heroes.map((h) =>
          h.id === actorId ? { ...h, stress: 5, wounds: 0, attributesVerified: true, life: 33 } : h,
        ),
      },
    };
    game = ok(game, {
      type: "visitHamletBuilding",
      actorId,
      serviceId: "tavern3",
      quirkIds: [],
    });
    expect(game.dungeon!.hamlet!.buildingWounds?.tavern).toBeUndefined();
    expect(game.dungeon!.heroes.find((h) => h.id === actorId)!.wounds).toBe(2);
  });

  it("Fanatic I：startBattle 对 d10 最低英雄施加 Mark 2t，并先于先攻消耗 4 次 RNG", () => {
    const names = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"] as const;
    const stances = ["aggressive", "defensive", "ranged", "support"] as const;
    const stats = names.map((name) =>
      coreQuestSources.catalog.heroStats.find((s) => s.level === 1 && s.name === name)!,
    );
    const seed = 11;
    const rolls = stances.map((_, index) => nextBattleRoll(seed, index));
    const lowest = Math.min(...rolls);
    const make = (battleSeed: number, threat: boolean) => {
      const game = createBattleState(battleSeed, {
        entities: [
          ...stats.map((stat, index) => ({
            id: `h${index}`,
            side: "hero" as const,
            areaId: "a",
            stance: stances[index]!,
            hero: stat.name,
            heroStatId: stat.id,
            life: stat.life,
            skillIds: [] as string[],
            wounds: 0,
            stress: 0,
            dodge: stat.dodge,
            guard: false,
            dead: false,
            bleed: [] as string[],
            blight: [] as string[],
          })),
          {
            id: "m0",
            side: "monster" as const,
            areaId: "a",
            stance: "aggressive" as const,
            stanceSlots: 1 as const,
            hero: null,
            monsterCardId: "m0",
            skillIds: [] as string[],
            wounds: 0,
            life: 8,
            dodge: 0,
            guard: false,
            dead: false,
            bleed: [] as string[],
            blight: [] as string[],
          },
        ],
        heroStats: stats,
        monsters: [
          {
            id: "m0",
            life: 8,
            verification: { unverified: false },
            resistances: [],
            immunities: [],
            skills: [],
          },
        ],
        areas: [{ id: "a", elevation: "normal", adjacent: [] }],
        light: 5,
        skills: [],
      });
      if (!threat) return game;
      return {
        ...game,
        dungeon: {
          phase: "inBattle",
          cursor: 0,
          heroes: [],
          activeBossThreatScriptId: FANATIC_I_SCRIPT_ID,
        },
      } as unknown as GameState;
    };
    const plain = applyCommand(make(seed, false), { type: "startBattle" });
    const marked = applyCommand(make(seed, true), { type: "startBattle" });
    expect(
      marked.events.some((e) => e.type === "commandRefused"),
      JSON.stringify(marked.events),
    ).toBe(false);
    expect(marked.state.battle!.rngCursor - plain.state.battle!.rngCursor).toBe(4);
    expect(marked).toEqual(applyCommand(make(seed, true), { type: "startBattle" }));
    for (const [index, roll] of rolls.entries()) {
      const hero = marked.state.battle!.entities.find((e) => e.id === `h${index}`)!;
      if (roll === lowest) {
        expect(hero.statusStacks).toEqual([{ kind: "mark", remaining: 2 }]);
        expect(hero.markStacks).toBe(1);
      } else {
        expect(hero.statusStacks ?? []).toEqual([]);
      }
    }
    const tieSeed = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 13, 14, 15, 16].find((candidate) => {
      const sample = stances.map((_, index) => nextBattleRoll(candidate, index));
      return sample.filter((roll) => roll === Math.min(...sample)).length >= 2;
    });
    expect(tieSeed).toBeDefined();
    const tieRolls = stances.map((_, index) => nextBattleRoll(tieSeed!, index));
    const tieLowest = Math.min(...tieRolls);
    const tiedBattle = applyCommand(make(tieSeed!, true), { type: "startBattle" });
    expect(tiedBattle.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(
      tiedBattle.state
        .battle!.entities.filter((e) => e.side === "hero" && e.markStacks === 1)
        .map((e) => e.id),
    ).toEqual(tieRolls.flatMap((roll, index) => (roll === tieLowest ? [`h${index}`] : [])));
  });

  it("Fanatic I：英雄没有已核实条件防御时开战拒绝，不留下遭遇", () => {
    const game = createBattleState(3, {
      entities: [
        ...(["aggressive", "defensive", "ranged", "support"] as const).map((stance, index) => ({
          id: `h${index}`,
          side: "hero" as const,
          areaId: "a",
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
          id: "m0",
          side: "monster" as const,
          areaId: "a",
          stance: "aggressive" as const,
          stanceSlots: 1 as const,
          hero: null,
          monsterCardId: "m0",
          skillIds: [] as string[],
          wounds: 0,
          life: 8,
          dodge: 0,
          guard: false,
          dead: false,
          bleed: [] as string[],
          blight: [] as string[],
        },
      ],
      monsters: [
        {
          id: "m0",
          life: 8,
          verification: { unverified: false },
          resistances: [],
          immunities: [],
          skills: [],
        },
      ],
      areas: [{ id: "a", elevation: "normal", adjacent: [] }],
      light: 5,
      skills: [],
    });
    const threatened = {
      ...game,
      dungeon: {
        phase: "inBattle",
        cursor: 0,
        heroes: [],
        activeBossThreatScriptId: FANATIC_I_SCRIPT_ID,
      },
    } as unknown as GameState;
    const result = applyCommand(threatened, { type: "startBattle" });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(result.state.battle!.encounter).toBeUndefined();
    expect(result.state.battle!.rngCursor).toBe(0);
  });

  it("Flesh I：Large 生成 Guard 2t；抗性减为 1t；免疫不加；小型怪不加", () => {
    const dungeon = {
      phase: "inBattle",
      cursor: 0,
      heroes: [],
      activeBossThreatScriptId: FLESH_I_SCRIPT_ID,
    } as unknown as NonNullable<GameState["dungeon"]>;
    const base = { guard: false, bleed: [] as string[], blight: [] as string[] };
    const card = {
      resistances: [{ key: "shuffle_resist", naming: "confirmed" }],
      immunities: [{ key: "stun", naming: "confirmed" }],
    };
    const large = withLargeMonsterSpawnGuard(dungeon, { ...base, stanceSlots: 2 as const }, card);
    expect(large).toMatchObject({
      status: "ok",
      entity: { guard: true, statusStacks: [{ kind: "guard", remaining: 2 }] },
    });
    const small = withLargeMonsterSpawnGuard(dungeon, { ...base, stanceSlots: 1 as const }, card);
    expect(small).toEqual({ status: "ok", entity: { ...base, stanceSlots: 1 } });
    const resisted = withLargeMonsterSpawnGuard(
      dungeon,
      { ...base, stanceSlots: 2 as const },
      { resistances: [{ key: "guard", naming: "confirmed" }], immunities: [] },
    );
    expect(resisted).toMatchObject({
      status: "ok",
      entity: { guard: true, statusStacks: [{ kind: "guard", remaining: 1 }] },
    });
    const immune = withLargeMonsterSpawnGuard(
      dungeon,
      { ...base, stanceSlots: 2 as const },
      { resistances: [], immunities: [{ key: "guard", naming: "confirmed" }] },
    );
    expect(immune).toMatchObject({ status: "ok", entity: { guard: false } });
    const unverified = withLargeMonsterSpawnGuard(
      dungeon,
      { ...base, stanceSlots: 2 as const },
      { resistances: [{ key: "guard", naming: "unreviewed" }], immunities: [] },
    );
    expect(unverified.status).toBe("refused");
  });

  it("Flesh I：自然遭遇生成的 Large 在 startDungeonBattle 上带 Guard 2t", () => {
    const stats = coreParty.map((hero) =>
      coreQuestSources.catalog.heroStats.find((s) => s.id === hero.heroStatId)!,
    );
    const heroes = coreParty.map((hero, index) => {
      const stat = stats[index]!;
      return {
        id: `hero-${index}`,
        heroStatId: stat.id,
        level: 1 as const,
        life: stat.life,
        wounds: 0,
        stress: 0,
        attributesVerified: true as const,
        stance: hero.stance,
        skillIds: hero.skillIds,
      };
    });
    const deploy = (seed: number) => {
      const sandbox = createDungeonSandbox(
        seed,
        layout,
        distribution,
        "radiant",
        "D",
        heroes,
        coreQuestSources.resolveCards,
        { dungeonLevel: 1, light: 5, provisions: [{ id: "food", face: "food" }] },
        undefined,
        coreQuestSources.rooms,
        coreQuestSources.monsters,
        coreQuestSources.catalog,
      );
      let game: GameState = {
        ...sandbox,
        dungeon: {
          ...sandbox.dungeon!,
          phase: "awaitingRoom",
          rooms: sandbox.dungeon!.rooms.map((room) =>
            room.id === "D" ? { ...room, kind: "treasure" as const } : room,
          ),
        },
      };
      game = ok(game, { type: "prepareDungeonBattle" });
      game = ok(game, { type: "prepareDungeonMonsters" });
      return game;
    };
    let entered: GameState | undefined;
    let lastRefuse = "";
    for (let seed = 1; seed <= 400 && !entered; seed++) {
      const prepared = deploy(seed);
      const spawned = prepared.dungeon!.monsterPool?.active?.monsters ?? [];
      if (!spawned.some((monster) => monster.stanceSlots === 2)) continue;
      const threatened = ok(prepared, { type: "setActiveBossThreat", scriptId: FLESH_I_SCRIPT_ID });
      const started = applyCommand(threatened, { type: "startDungeonBattle" });
      const refusal = started.events.find((event) => event.type === "commandRefused");
      if (refusal && refusal.type === "commandRefused") {
        lastRefuse = refusal.message;
        continue;
      }
      entered = started.state;
    }
    expect(entered, lastRefuse || "DL1 自然抽到 Large 后应能入场").toBeDefined();
    const monsters = entered!.battle!.entities.filter((entity) => entity.side === "monster");
    const large = monsters.filter((entity) => entity.stanceSlots === 2);
    const small = monsters.filter((entity) => entity.stanceSlots === 1);
    expect(large.length).toBeGreaterThan(0);
    expect(
      large.every((entity) => entity.guard && entity.statusStacks?.[0]?.kind === "guard"),
    ).toBe(true);
    expect(large.every((entity) => entity.statusStacks?.[0]?.remaining === 2)).toBe(true);
    expect(small.every((entity) => !entity.guard)).toBe(true);
  }, 20_000);
});
