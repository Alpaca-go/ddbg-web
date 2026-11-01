import { expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/clear_the_path_distribution.json";
import trinkets from "../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";
import {
  RUINS_DL2_APPROVED_HIGHER_COMBAT_IDS,
} from "../../data/src/normalize/ruins-pool-admission";
import { hasApprovedHigherMonsterFields } from "../../data/src/normalize/verified-monster-entry";
import { ruinsMonsterPoolThrough } from "../../data/src/monster-pool";
import { coreParty, coreQuestSources as sources } from "./test-helpers/core-quest";
import { createDungeonSandbox } from "./dungeon";
import { createTrinketPool } from "./trinket-acquisition";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { selectMonsterSkill } from "./monster-stance";
import { resolveMonsterSkill } from "./monster-skill";
import { createBattleState } from "./battle";
import type { BattleEntity } from "./battle";
import { nextBattleRoll } from "./encounter";

const spearman = sources.catalog.monsters.find((c) => c.id === "monster_medium:p013")!;
const higherTrinkets = createTrinketPool(normalizedTrinketFileSchema.parse(trinkets).cards, 2);
/** 明确DL2单房入场夹具，整张地图/九房/53张怪物池保留；不冒称自然升幕。 */
function setup(seed: number): GameState {
  const heroes = coreParty.map((h, i) => {
    const stat = sources.catalog.heroStats.find((s) => s.id === h.heroStatId)!;
    return {
      ...h,
      id: `h${i}`,
      level: 1,
      life: stat.life,
      wounds: 0,
      stress: 0,
      attributesVerified: true,
    };
  });
  const state = createDungeonSandbox(
    seed,
    layout,
    distribution,
    "standard",
    "S",
    heroes,
    sources.resolveCards,
    { dungeonLevel: 2, light: 5, provisions: [] },
    sources.curios,
    sources.rooms,
    sources.monsters,
    { ...sources.catalog, trinkets: higherTrinkets },
  );
  const position = state.dungeon!.rooms.find((r) => r.kind === "lair")!.id;
  return {
    ...state,
    dungeon: { ...state.dungeon!, campaignLevel: 2, phase: "awaitingRoom", position },
  };
}
function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return result;
}
function deploy(seed: number) {
  const initial = setup(seed);
  const room = ok(initial, { type: "prepareDungeonBattle" });
  return { initial, deployed: ok(room.state, { type: "prepareDungeonMonsters" }).state };
}
it("完整53张池真实抽到Captain/Gargoyle/Rattler/Ghoul均可入场", () => {
  for (const [id, seed, supported] of [
    ["monster_medium:p050", 3, true],
    ["monster_large:p001", 13, true],
    ["monster_medium:p053", 6, true],
    ["monster_large:p003", 91, true],
  ] as const) {
    const { initial, deployed } = deploy(seed),
      before = structuredClone(deployed);
    const pool = deployed.dungeon!.monsterPool!;
    expect(pool.active!.monsters.some((m) => m.cardId === id)).toBe(true);
    expect(
      [
        ...pool.remaining!,
        ...pool.discarded,
        ...pool.active!.monsters.map((m) => m.instanceId),
      ].sort(),
    ).toEqual(
      ruinsMonsterPoolThrough(pool.cards, 2)
        .map((m) => m.instanceId)
        .sort(),
    );
    const result = applyCommand(deployed, { type: "startDungeonBattle" });
    if (supported) {
      expect(
        result.events.some((e) => e.type === "commandRefused"),
        JSON.stringify(result.events),
      ).toBe(false);
      const entity = result.state.battle!.entities.find((e) => e.monsterCardId === id)!;
      expect(entity).toMatchObject(
        id === "monster_large:p003"
          ? { life: 26, dodge: 1, innateProtection: true, protection: true, stanceSlots: 2 }
          : id === "monster_medium:p053"
            ? { life: 22, dodge: 2, stanceSlots: 1 }
            : id === "monster_medium:p050"
              ? { life: 7, dodge: 2, innateProtection: true, protection: true, stanceSlots: 1 }
              : { life: 33, dodge: 1, innateProtection: false, protection: false, stanceSlots: 2 },
      );
      expect(result.state.battle!.rngCursor).toBe(deployed.dungeon!.cursor);
      expect(result.state.dungeon!.gold).toBe(deployed.dungeon!.gold);
      expect(
        [
          { type: "prepareDungeonBattle" },
          { type: "prepareDungeonMonsters" },
          { type: "startDungeonBattle" },
        ].reduce((s, c) => ok(s, c as Command).state, initial),
      ).toEqual(result.state);
    } else {
      expect(result.state).toBe(deployed);
      expect(result.events).toEqual([
        expect.objectContaining({
          type: "commandRefused",
          message: expect.stringContaining(id.endsWith("p053") ? "Rattler" : "Ghoul"),
        }),
      ]);
    }
    expect(deployed).toEqual(before);
  }
});
it("Gargoyle常驻Protection在状态堆消退后仍生效，真实Smite伤害8减至4；审批字段缺失拒绝", () => {
  const deployed = deploy(3).deployed;
  const entered = ok(deployed, { type: "startDungeonBattle" }).state.battle!;
  const gargoyle = entered.entities.find((e) => e.monsterCardId === "monster_medium:p050")!;
  const hero = entered.entities.find((e) => e.side === "hero" && e.hero === "CRUSADER")!;
  const initial = createBattleState(1, {
    ...sources.catalog,
    light: 5,
    entities: [
      { ...hero, areaId: "a" },
      { ...gargoyle, areaId: "a", statusStacks: [{ kind: "protection", remaining: 1 }] },
    ],
    areas: [{ id: "a", elevation: "normal", adjacent: [] }],
  });
  const awaiting: GameState = {
    ...initial,
    battle: {
      ...initial.battle!,
      encounter: {
        round: 1,
        actedIds: [],
        deck: ["monster"],
        turn: { type: "awaitingInitiative" },
      },
    },
  };
  const ticked = ok(awaiting, { type: "drawInitiative" });
  expect(ticked.state.battle!.entities.find((e) => e.id === gargoyle.id)).toMatchObject({
    statusStacks: [],
    innateProtection: true,
    protection: true,
  });
  const { encounter: _encounter, ...free } = ticked.state.battle!;
  void _encounter;
  const attacked = ok(
    { ...ticked.state, battle: { ...free, rngCursor: 0 } },
    {
      type: "playHeroSkill",
      actorId: hero.id,
      targetId: gargoyle.id,
      skillId: "hero_skill:p001",
    },
  );
  expect(attacked.state.battle!.entities.find((e) => e.id === gargoyle.id)).toMatchObject({
    wounds: 4,
    protection: true,
    dead: false,
  });
  for (const innateProtection of [undefined, false]) {
    const invalid = {
      ...deployed,
      dungeon: {
        ...deployed.dungeon!,
        battleCatalog: {
          ...deployed.dungeon!.battleCatalog!,
          monsters: deployed.dungeon!.battleCatalog!.monsters.map((c) => {
            if (c.id !== gargoyle.monsterCardId) return c;
            const { innateProtection: _protection, ...rest } = c;
            void _protection;
            return innateProtection === undefined ? rest : { ...rest, innateProtection };
          }),
        },
      },
    };
    expect(applyCommand(invalid, { type: "startDungeonBattle" }).state).toBe(invalid);
  }
});
it("R-082/083 普通卡与 C-019 死灵法师 II 限定字段获批，其余 II/III 不外推", () => {
  expect(spearman).toMatchObject({
    name: "Bone Spearman",
    level: 2,
    pages: [13, 14, 15],
    speed: 2,
    life: 15,
    dodge: 1,
  });
  expect(hasApprovedHigherMonsterFields(spearman)).toBe(true);
  for (const stance of ["aggressive", "defensive", "ranged", "support"] as const) {
    const random = stance === "aggressive" || stance === "defensive";
    expect(selectMonsterSkill(spearman, [stance]).status).toBe(random ? "needsRoll" : "selected");
    for (let roll = 1; roll <= 10; roll++)
      expect(selectMonsterSkill(spearman, [stance], roll)).toEqual({
        status: "selected",
        skillSlot: random && roll <= 5 ? 2 : 1,
        roll: random ? roll : null,
      });
  }
  for (const card of sources.catalog.monsters.filter((c) => c.level > 1))
    expect(hasApprovedHigherMonsterFields(card), card.id).toBe(
      (
        [
          ...RUINS_DL2_APPROVED_HIGHER_COMBAT_IDS,
          "monster_medium:p090", // C-019 Boss 战斗卡
          "monster_medium:p091",
          "monster_medium:p093",
          "monster_medium:p094",
          "monster_medium:p096",
          "monster_medium:p097",
          "monster_medium:p099",
          "monster_medium:p100",
          "monster_medium:p102",
          "monster_medium:p103",
          "monster_large:p006",
          "monster_large:p007",
          "monster_large:p008",
          "monster_large:p009",
          "monster_large:p010",
          "monster_large:p011",
          "monster_large:p012",
          "monster_large:p013",
          "monster_large:p018",
        ] as readonly string[]
      ).includes(card.id),
    );
  expect(
    sources.monsters.filter((c) => c.level === 2 && !c.missingBattleFields.length).map((c) => c.id),
  ).toHaveLength(5);
});
it("Captain/Gargoyle四技能印刷伤害、状态与Push黄金表完整执行，落空不施目标效果", () => {
  for (const [id, slot, range, count, crit, normal, kind, push] of [
    ["monster_large:p001", 1, 1, 1, 17, 11, null, true],
    ["monster_large:p001", 2, 0, 4, 7, 5, "stun", false],
    ["monster_medium:p050", 1, 0, 2, 6, 4, "debuff", false],
    ["monster_medium:p050", 2, 1, 1, 4, 3, "stun", true],
  ] as const) {
    const card = sources.catalog.monsters.find((c) => c.id === id)!;
    for (const [roll, damage] of [
      [1, crit],
      [3, normal],
      [10, 0],
    ]) {
      const r = resolveMonsterSkill(
        card,
        slot,
        {
          actor: { id: "m", wounds: 0 },
          target: { id: "h", side: "hero", wounds: 0, stress: 0, dodge: 0 },
          areaDistance: range,
          targetsInArea: count,
        },
        roll!,
      );
      if (r.status !== "resolved") throw new Error(r.reason);
      expect(r.resolution.skipped).toEqual([]);
      expect(r.resolution.damageDealt).toBe(roll === 10 ? null : damage);
      expect(r.resolution.targetShuffle).toEqual(
        push && roll !== 10 ? { direction: "push", distance: 1 } : null,
      );
      expect(r.resolution.targetStatusEffects ?? []).toEqual(
        kind && roll !== 10 ? [expect.objectContaining({ kind, duration: 2 })] : [],
      );
    }
  }
});
it("完整53张池seed10真实混合部署可入场，来源/资源/RNG不改，原命令可回放", () => {
  const { initial, deployed } = deploy(10),
    before = structuredClone(deployed);
  const p = deployed.dungeon!.monsterPool!;
  expect(p.active!.monsters.map((m) => m.cardId)).toEqual([
    "monster_medium:p018",
    "monster_medium:p034",
    "monster_medium:p013",
    "monster_medium:p010",
  ]);
  const ids = [...p.remaining!, ...p.discarded, ...p.active!.monsters.map((m) => m.instanceId)];
  expect(ids.sort()).toEqual(
    ruinsMonsterPoolThrough(p.cards, 2)
      .map((m) => m.instanceId)
      .sort(),
  );
  expect(ids).toHaveLength(53);
  const entered = ok(deployed, { type: "startDungeonBattle" });
  expect(entered.state.battle!.entities.find((e) => e.monsterCardId === spearman.id)).toMatchObject(
    { life: 15, dodge: 1, stanceSlots: 1 },
  );
  expect(entered.state.battle!.rngCursor).toBe(deployed.dungeon!.cursor);
  expect(entered.state.dungeon!.gold).toBe(deployed.dungeon!.gold);
  expect(deployed).toEqual(before);
  const commands: Command[] = [
    { type: "prepareDungeonBattle" },
    { type: "prepareDungeonMonsters" },
    { type: "startDungeonBattle" },
  ];
  expect(commands.reduce((s, c) => ok(s, c).state, initial)).toEqual(entered.state);
});
it("Spearman审批字段漂移整次拒绝，保留抽牌/部署/游标/奖励", () => {
  const blocked = deploy(3).deployed;
  expect(
    blocked.dungeon!.monsterPool!.active!.monsters.some((m) => m.cardId === "monster_medium:p050"),
  ).toBe(true);
  const prepared = deploy(10).deployed,
    d = prepared.dungeon!;
  const { pages: _pages, ...noPages } = spearman;
  void _pages;
  const invalid = [
    ...[
      { ...spearman, name: "Gargoyle" },
      { ...spearman, level: 1 },
      { ...spearman, speed: 3 },
      { ...spearman, pages: [14, 15] },
      noPages,
      {
        ...spearman,
        stanceGroups: [
          { stances: ["aggressive", "defensive", "ranged", "support"] as const, skill: 1 },
        ],
      },
    ].map((card): GameState => ({
      ...prepared,
      dungeon: {
        ...d,
        battleCatalog: {
          ...d.battleCatalog!,
          monsters: d.battleCatalog!.monsters.map((c) => (c.id === spearman.id ? card : c)),
        },
      },
    })),
  ];
  for (const state of invalid) {
    const before = structuredClone(state),
      result = applyCommand(state, { type: "startDungeonBattle" });
    expect(result.state).toBe(state);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(state).toEqual(before);
  }
});
it("两项印刷技能完整可读：Spear Thrust伤害/Push1，Impale四目标共享攻击视图", () => {
  const target = { id: "h", side: "hero" as const, wounds: 0, stress: 0, dodge: 0, guard: false };
  for (const [slot, roll, printed, distance] of [
    [1, 1, 12, 0],
    [1, 3, 8, 0],
    [2, 2, 7, 1],
    [2, 3, 5, 1],
  ] as const) {
    const result = resolveMonsterSkill(
      spearman,
      slot,
      {
        actor: { id: "m", wounds: 0 },
        target,
        areaDistance: distance,
        targetsInArea: slot === 2 ? 4 : 1,
      },
      roll,
    );
    expect(result.status, JSON.stringify(result)).toBe("resolved");
    if (result.status !== "resolved") throw new Error(result.reason);
    expect(result.resolution.damageDealt).toBe(printed);
    expect(result.resolution.targetShuffle).toEqual(
      slot === 1 ? { direction: "push", distance: 1 } : null,
    );
    expect(result.resolution.skipped).toEqual([]);
  }
});
it("真实命令Impale四英雄共享一骰；Spear Thrust完成伤害后区域/姿态Push1，不重掷", () => {
  const seed = Array.from({ length: 100 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === 3)!;
  for (const slot of [1, 2]) {
    const heroes: BattleEntity[] = coreParty.map((h, i) => {
      const stat = sources.catalog.heroStats.find((s) => s.id === h.heroStatId)!;
      return {
        id: `h${i}`,
        hero: stat.name,
        heroStatId: stat.id,
        heroLevel: 1,
        side: "hero",
        life: stat.life,
        wounds: 0,
        stress: 0,
        dodge: stat.dodge,
        stance: h.stance,
        areaId: "a",
        skillIds: [],
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      };
    });
    const monster: BattleEntity = {
      id: "m",
      hero: null,
      side: "monster",
      monsterCardId: spearman.id,
      life: 15,
      dodge: 1,
      wounds: 0,
      areaId: slot === 1 ? "a" : "b",
      stance: "aggressive",
      stanceSlots: 1,
      skillIds: [],
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    };
    const initial = createBattleState(seed, {
      heroStats: sources.catalog.heroStats,
      entities: [...heroes, monster],
      skills: [],
      monsters: [spearman],
      light: 5,
      areas: [
        { id: "a", capacity: 8, adjacent: ["b"], elevation: "normal" },
        { id: "b", capacity: 8, adjacent: ["a"], elevation: "normal" },
      ],
    });
    const before = structuredClone(initial);
    const command: Command = {
      type: "playMonsterSkill",
      actorId: "m",
      targetId: "h0",
      skillSlot: slot,
    };
    const result = ok(initial, command);
    expect(result.state.battle!.rngCursor).toBe(1);
    if (slot === 2) {
      expect(
        result.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.wounds),
      ).toEqual([5, 5, 5, 5]);
    } else {
      const shuffled = ok(result.state, { type: "resolveShuffles" });
      expect(shuffled.state.battle!.entities.find((e) => e.id === "h0")).toMatchObject({
        wounds: 8,
        areaId: "b",
        stance: "defensive",
      });
      expect(shuffled.state.battle!.rngCursor).toBe(1);
    }
    expect(applyCommand(initial, command)).toEqual(result);
    expect(initial).toEqual(before);
  }
});
