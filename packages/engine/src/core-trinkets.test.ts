import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { coreParty } from "./test-helpers/core-quest";
import { it, expect } from "vitest";
import { trinketBattle } from "./test-helpers/trinket-battle";
import { coreQuestSources } from "./test-helpers/core-quest";
import { applyCommand } from "./command";
import type { ApplyResult, GameState, Command } from "./command";
import type { CoreTrinketId } from "../../data/src/core-trinket-bindings";
import { nextBattleRoll } from "./battle-roll";
import { createDungeonSandbox } from "./dungeon";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import trinkets from "../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";
import { savedCommandSchema } from "../../data/src/quest-save";
const allCards = normalizedTrinketFileSchema.parse(trinkets).cards;
function ok(r: ApplyResult) {
  expect(
    r.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toEqual([]);
  return r;
}
function choose(r: ApplyResult, id: string) {
  return ok(
    applyCommand(r.state, {
      type: "resolveChoice",
      choiceId: r.pendingChoice!.id,
      optionId: id,
      allTrinkets: true,
    }),
  );
}
function use(state: GameState, cardId: CoreTrinketId) {
  return ok(
    applyCommand(state, { type: "useCoreTrinket", actorId: "h0", cardId, allTrinkets: true }),
  );
}
function battle(ids: readonly CoreTrinketId[], face: "upright" | "inverted" = "upright", seed = 7) {
  const { state } = trinketBattle(ids, "aggressive", "hero_skill:p001", face, seed);
  return { ...state, battle: { ...state.battle!, resolveCards: coreQuestSources.resolveCards } };
}
function dungeon(
  id: CoreTrinketId,
  face: "upright" | "inverted" = "upright",
  seed = 31,
): GameState {
  const heroes = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].map((name, i) => {
    const stat = coreQuestSources.catalog.heroStats.find((s) => s.name === name && s.level === 1)!;
    return {
      id: "h" + i,
      level: 1,
      life: stat.life,
      heroStatId: stat.id,
      stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
      attributesVerified: true,
      wounds: 10,
      stress: 4,
    };
  });
  const initial = createDungeonSandbox(
    seed,
    layout,
    distribution,
    "standard",
    "D",
    heroes,
    coreQuestSources.resolveCards,
    { dungeonLevel: 1, light: 5, provisions: [{ id: "food", face: "food" }] },
  );
  const base = coreQuestSources.catalog.trinkets!;
  return {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      conditions: coreQuestSources.catalog.conditions!,
      battleCatalog: coreQuestSources.catalog,
      trinkets: {
        ...base,
        cards: [...base.cards, ...allCards.filter((c) => c.level !== 1 && c.id === id)],
        held: [{ cardId: id, heroId: "h0", face }],
      },
      rooms: initial.dungeon!.rooms.map((r) => (r.id === "D" ? { ...r, cleared: true } : r)),
    },
  };
}
it.each([
  ["trinket:p017", -3],
  ["trinket:p018", -2],
  ["trinket:p036", -4],
] as const)("%s战斗外减压后可翻面，不消耗RNG", (id, delta) => {
  const state = dungeon(id),
    before = JSON.stringify(state);
  const r = use(state, id);
  expect(r.state.dungeon!.heroes[0]!.stress).toBe(4 + delta);
  expect(r.state.dungeon!.trinkets!.held[0]!.face).toBe("inverted");
  expect(r.state.dungeon!.cursor).toBe(state.dungeon!.cursor);
  expect(JSON.stringify(state)).toBe(before);
});
it.each([
  ["trinket:p025", 1],
  ["trinket:p027", 1],
  ["trinket:p030", 2],
] as const)("%s战斗外压力反面翻回正面", (id, delta) => {
  const state = dungeon(id, "inverted"),
    r = use(state, id);
  expect(r.state.dungeon!.heroes[0]!.stress).toBe(4 + delta);
  expect(r.state.dungeon!.trinkets!.held[0]!.face).toBe("upright");
});
it.each([
  ["trinket:p005", 1],
  ["trinket:p037", 2],
] as const)("%s反面实际降光并翻面", (id, amount) => {
  const state = dungeon(id, "inverted"),
    r = use(state, id);
  expect(r.state.dungeon!.explorationSetup!.light).toBe(5 - amount);
  expect(r.state.dungeon!.trinkets!.held[0]!.face).toBe("upright");
});
it("Fasting Seal反面只消耗Food，无治疗或被动补给收益", () => {
  const state = dungeon("trinket:p029", "inverted"),
    r = use(state, "trinket:p029");
  expect(r.state.dungeon!.explorationSetup!.provisions).toEqual([]);
  expect(r.state.dungeon!.heroes).toEqual(state.dungeon!.heroes);
  expect(r.state.dungeon!.trinkets!.held[0]!.face).toBe("upright");
});
it("Candle of Life战斗外恢复同行队伍，免费能力保留正式命令身份", () => {
  const state = dungeon("trinket:p037"),
    r = use(state, "trinket:p037");
  expect(r.state.dungeon!.heroes.every((h) => h.wounds === 4)).toBe(true);
  expect(
    savedCommandSchema.parse({
      type: "useCoreTrinket",
      actorId: "h0",
      cardId: "trinket:p037",
      allTrinkets: true,
    }),
  ).toMatchObject({ allTrinkets: true });
});
it("Book of Sanity反面按R-128支付非攻击伤害，Protection不减半", () => {
  const initial = battle(["trinket:p036"], "inverted");
  const state = {
    ...initial,
    battle: {
      ...initial.battle,
      entities: initial.battle.entities.map((h) =>
        h.id === "h0" ? { ...h, wounds: 0, protection: true, riposte: true } : h,
      ),
    },
  };
  const r = use(state, "trinket:p036");
  expect(r.state.battle!.entities[0]!.wounds).toBe(6);
  expect(r.state.battle!.trinkets!.held[0]!.face).toBe("upright");
  expect(r.state.battle!.rngCursor).toBe(0);
});
it("Cleansing Crystal反面真实抽负面怪癖，种子重放一致", () => {
  const state = dungeon("trinket:p038", "inverted"),
    before = JSON.stringify(state),
    r = use(state, "trinket:p038");
  expect(r.state.dungeon!.heroes[0]!.quirkIds).toHaveLength(1);
  const id = r.state.dungeon!.heroes[0]!.quirkIds![0];
  expect(r.state.dungeon!.conditions!.quirks.find((c) => c.id === id)!.polarity).toBe("negative");
  expect(use(JSON.parse(before), "trinket:p038")).toEqual(r);
  expect(JSON.stringify(state)).toBe(before);
});
it.each(["trinket:p020", "trinket:p023"] as const)(
  "%s收到治疗时有独立选择，不能把普通治疗视为自动使用",
  (id) => {
    const initial = battle(["trinket:p030", id]);
    const state = {
      ...initial,
      battle: {
        ...initial.battle,
        entities: initial.battle.entities.map((h) => (h.id === "h0" ? { ...h, wounds: 15 } : h)),
        trinkets: {
          ...initial.battle.trinkets!,
          held: initial.battle.trinkets!.held.map((h) =>
            h.cardId === id
              ? {
                  ...h,
                  face: (id === "trinket:p020" ? "inverted" : "upright") as "upright" | "inverted",
                }
              : h,
          ),
        },
      },
    };
    const open = use(state, "trinket:p030");
    const option = id === "trinket:p020" ? "trinket:p020:receive" : id;
    const skip = choose(open, "continue"),
      paid = choose(open, option);
    expect(paid.state.battle!.entities[0]!.wounds).toBe(
      skip.state.battle!.entities[0]!.wounds + (id === "trinket:p020" ? 4 : -4),
    );
  },
);
it("通用饰品重选锁定原动作和骰面；旧命令不展开新窗口", () => {
  const { state, command } = trinketBattle(
    ["trinket:p003"],
    "aggressive",
    "hero_skill:p001",
    "upright",
    7,
    "monster_medium:p024",
  );
  const open = ok(applyCommand(state, { ...command, allTrinkets: true }));
  const cancelled = choose(open, "reset-plan");
  expect(cancelled.state.battle!.entities).toEqual(state.battle!.entities);
  expect(cancelled.state.battle!.trinkets).toEqual(state.battle!.trinkets);
  expect(cancelled.state.battle!.rngCursor).toBe(0);
  expect(cancelled.state.trinketChoice).toBeDefined();
  expect(cancelled.pendingChoice!.id).not.toBe(open.pendingChoice!.id);
  expect(
    applyCommand(cancelled.state, {
      type: "changeStance",
      actorId: "h0",
      direction: "backward",
      allTrinkets: true,
    }).state,
  ).toBe(cancelled.state);
  expect(ok(applyCommand(state, command)).pendingChoice).toBeUndefined();
});

function seedForRoll(roll: number) {
  let seed = 0;
  while (nextBattleRoll(seed, 0) !== roll) seed++;
  return seed;
}
function monsterTurn(
  id: CoreTrinketId,
  face: "upright" | "inverted",
  roll = 3,
  monsterId = "monster_medium:p001",
) {
  const seed = seedForRoll(roll),
    { state } = trinketBattle([id], "aggressive", "hero_skill:p001", face, seed, monsterId);
  return {
    ...state,
    battle: {
      ...state.battle!,
      resolveCards: coreQuestSources.resolveCards,
      light: 3,
      encounter: {
        round: 1,
        deck: ["hero" as const],
        actedIds: [],
        turn: { type: "monster" as const, actorId: "m" },
      },
      entities: state.battle!.entities.map((h) => (h.id === "m" ? { ...h, areaId: "b" } : h)),
    },
  };
}
const monsterAttack: Command = {
  type: "playMonsterSkill",
  actorId: "m",
  targetId: "h0",
  skillSlot: 1,
  allTrinkets: true,
};
it.each([
  ["trinket:p010", "upright"],
  ["trinket:p019", "upright"],
  ["trinket:p029", "upright"],
] as const)("%s正面Dodge增加能让边界命中落空", (id, face) => {
  const initial = monsterTurn(id, face),
    threshold = 9 - initial.battle.entities[0]!.dodge;
  const state = { ...initial, seed: seedForRoll(threshold) };
  const open = ok(applyCommand(state, monsterAttack)),
    skip = choose(open, "continue"),
    paid = choose(open, id);
  expect(skip.events.find((e) => e.type === "monsterSkillResolved")!.resolution.outcome).toBe(
    "hit",
  );
  expect(paid.events.find((e) => e.type === "monsterSkillResolved")!.resolution.outcome).toBe(
    "miss",
  );
  expect(paid.state.battle!.entities[0]!.wounds).toBe(0);
});
it.each(["trinket:p010", "trinket:p018"] as const)("%s反面Dodge减少使原本落空变为命中", (id) => {
  const initial = monsterTurn(id, "inverted"),
    threshold = 9 - initial.battle.entities[0]!.dodge;
  const state = { ...initial, seed: seedForRoll(threshold + 1) };
  const open = ok(applyCommand(state, monsterAttack)),
    skip = choose(open, "continue"),
    paid = choose(open, id);
  expect(skip.events.find((e) => e.type === "monsterSkillResolved")!.resolution.outcome).toBe(
    "miss",
  );
  expect(paid.events.find((e) => e.type === "monsterSkillResolved")!.resolution.outcome).toBe(
    "hit",
  );
});
it("Book of Holiness反面把真实命中变为暴击并走暴击压力", () => {
  const state = monsterTurn("trinket:p017", "inverted"),
    open = ok(applyCommand(state, monsterAttack)),
    paid = choose(open, "trinket:p017");
  expect(paid.events.find((e) => e.type === "monsterSkillResolved")!.resolution.outcome).toBe(
    "crit",
  );
  expect(paid.state.battle!.entities[0]!.wounds).toBe(9);
  expect(paid.state.battle!.entities[0]!.stress).toBe(state.battle.entities[0]!.stress! + 1);
});
it.each(["trinket:p010", "trinket:p016", "trinket:p022"] as const)(
  "%s负面速度可用0格移动支付，仍花一行动",
  (id) => {
    const state = battle([id], "inverted");
    const open = ok(
        applyCommand(state, { type: "moveHero", actorId: "h0", path: [], allTrinkets: true }),
      ),
      paid = choose(open, id);
    expect(paid.state.battle!.trinkets!.held[0]!.face).toBe("upright");
    expect(paid.state.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 1 });
    expect(paid.state.battle!.entities[0]!.areaId).toBe("a");
  },
);
it("Speed Stone正面允许比原Speed多一格的合法路径", () => {
  const state = battle(["trinket:p010"]);
  const actor = state.battle.entities[0]!,
    speed = state.battle.heroStats!.find((s) => s.id === actor.heroStatId)!.speed!;
  const path = Array.from({ length: speed + 1 }, (_, i) => (i % 2 ? "a" : "b"));
  const open = ok(
      applyCommand(state, { type: "moveHero", actorId: "h0", path, allTrinkets: true }),
    ),
    paid = choose(open, "trinket:p010");
  expect(paid.state.battle!.entities[0]!.areaId).toBe(path.at(-1));
});
it.each([
  ["trinket:p028", false],
  ["trinket:p035", false],
  ["trinket:p028", true],
  ["trinket:p035", true],
] as const)("%s反面在公开意志骰后降低美德机会，legacy=%s，不重掷", (id, legacy) => {
  const initial = battle(["trinket:p027", id], "inverted", seedForRoll(2));
  const state = {
    ...initial,
    battle: {
      ...initial.battle,
      light: 3,
      entities: initial.battle.entities.map((h) => (h.id === "h0" ? { ...h, stress: 9 } : h)),
    },
  };
  const open = legacy
    ? ok(
        applyCommand(state, {
          type: "useTrinket",
          actorId: "h0",
          cardId: "trinket:p027",
          allTrinkets: true,
        }),
      )
    : use(state, "trinket:p027");
  expect(open.pendingChoice?.options.some((o) => o.id === id)).toBe(true);
  const paid = choose(open, id),
    skip = choose(open, "continue");
  expect(paid.events.find((e) => e.type === "resolveTested")!.roll).toBe(
    skip.events.find((e) => e.type === "resolveTested")!.roll,
  );
  const card = (r: ApplyResult) =>
    r.state.battle!.resolveCards!.find((c) => c.id === r.state.battle!.entities[0]!.resolveCardId)!
      .role;
  expect(card(skip)).toBe("virtue");
  expect(card(paid)).toBe("affliction");
});
function exploreScene(
  id: CoreTrinketId,
  face: "upright" | "inverted",
  dieFace: "trap" | "hunger" | "blank",
) {
  const initial = dungeon(id, face);
  return {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      phase: "awaitingHazards" as const,
      pending: {
        id: "dungeon-die:1",
        prompt: "选择探索骰",
        actorId: "h0",
        options: [{ id: "roll0", label: dieFace }],
      },
      exploration: {
        from: "D",
        to: "G",
        dicePerHero: 1,
        rolls: [
          { id: "roll0", heroId: "h0", face: dieFace, resolved: false },
          { id: "roll1", heroId: "h1", face: "blank" as const, resolved: false },
        ],
      },
    },
  };
}
it("Survival Guide正面忽略Hunger；反面把空白转为Trap，战斗外可继续使用正面", () => {
  const state = exploreScene("trinket:p012", "upright", "hunger"),
    open = ok(
      applyCommand(state, {
        type: "resolveChoice",
        choiceId: state.dungeon.pending!.id,
        optionId: "roll0",
        allTrinkets: true,
      }),
    ),
    ignored = choose(open, "ignore");
  expect(ignored.state.dungeon!.exploration!.rolls![0]!.resolved).toBe(true);
  expect(ignored.state.dungeon!.heroes[0]!.wounds).toBe(10);
  const inverted = exploreScene("trinket:p012", "inverted", "blank"),
    flip = ok(
      applyCommand(inverted, {
        type: "resolveChoice",
        choiceId: inverted.dungeon.pending!.id,
        optionId: "roll0",
        allTrinkets: true,
      }),
    ),
    trap = choose(flip, "trap");
  expect(trap.pendingChoice!.options.some((o) => o.id === "ignore")).toBe(true);
  const paid = choose(trap, "continue");
  expect(paid.state.dungeon!.exploration!.rolls![0]!.face).toBe("trap");
  expect(paid.state.dungeon!.trinkets!.held[0]!.face).toBe("upright");
  expect(paid.state.dungeon!.cursor).toBe(inverted.dungeon.cursor);
});
it.each([
  ["trinket:p005", "upright", 0],
  ["trinket:p024", "inverted", 2],
] as const)("%s侦察按本次事件处理压力", (id, face, amount) => {
  const state = dungeon(id, face),
    consent = ok(applyCommand(state, { type: "scoutDungeon", allTrinkets: true })),
    agree = consent.pendingChoice!.options.find((o) => o.id !== "decline")!;
  const open = choose(consent, agree.id),
    paid = choose(open, id);
  expect(paid.state.dungeon!.heroes[0]!.stress).toBe(4 + amount);
  expect(paid.state.dungeon!.heroes[1]!.stress).toBe(5);
});
it.each([14, 15, 16])("Camper’s Helmet柴火休息容量%i：掷可容纳骰，Wild必须选面", (count) => {
  const initial = dungeon("trinket:p024");
  const state = {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      explorationSetup: {
        ...initial.dungeon!.explorationSetup!,
        provisions: Array.from({ length: count }, (_, i) => ({
          id: "pool" + i,
          face: "food" as const,
        })),
      },
    },
  };
  let result = ok(applyCommand(state, { type: "restDungeon", allTrinkets: true }));
  result = choose(result, "collective");
  for (let i = 0; i < 32 && !result.state.trinketChoice && !result.state.dungeon!.rest!.used; i++)
    result = choose(result, "heal:0");
  if (count === 16) {
    expect(result.state.dungeon!.rest!.used).toBe(true);
    expect(result.state.dungeon!.cursor).toBe(state.dungeon.cursor);
    return;
  }
  expect(result.pendingChoice!.options.some((o) => o.id === "trinket:p024")).toBe(true);
  result = choose(result, "trinket:p024");
  for (let i = 0; i < 3 && result.state.trinketChoice; i++) result = choose(result, "food");
  expect(result.state.dungeon!.explorationSetup!.provisions).toHaveLength(16);
  expect(result.state.dungeon!.cursor - state.dungeon.cursor).toBe(Math.min(2, 16 - count));
  expect(result.state.dungeon!.rest!.used).toBe(true);
  expect(result.state.dungeon!.trinkets!.held[0]!.face).toBe("inverted");
});
it.each([false, true])(
  "Book of Constitution获得疾病后立即弃掉；已有疾病=%s仍先走R27",
  (existing) => {
    const initial = monsterTurn("trinket:p016", "upright", 3, "monster_medium:p031");
    const disease = initial.battle.conditions!.diseases[0]!.id;
    const state = {
      ...initial,
      battle: {
        ...initial.battle,
        entities: initial.battle.entities.map((h) =>
          h.id === "h0" ? { ...h, diseaseId: existing ? disease : null } : h,
        ),
      },
    };
    const open = ok(applyCommand(state, monsterAttack));
    expect(open.pendingChoice!.options.some((o) => o.id === "trinket:p016")).toBe(true);
    const paid = choose(open, "trinket:p016");
    expect(paid.state.battle!.entities[0]!.diseaseId).toBeNull();
    expect(paid.state.battle!.conditions!.diseaseDiscard).toHaveLength(existing ? 2 : 1);
    if (existing) expect(paid.state.battle!.entities[0]!.quirkIds).toHaveLength(1);
    expect(paid.state.battle!.trinkets!.held[0]!.face).toBe("inverted");
  },
);

it("R-127旧存档仅升级明确批准的卡面元数据，伪造规则状态仍拒绝", () => {
  const start = {
    seed: 1,
    questId: "quest:p001" as const,
    mode: "standard" as const,
    party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
  };
  const game = createCoreDungeonQuest(
    start.seed,
    start.questId,
    start.mode,
    start.party,
    coreQuestSources,
  );
  const save = createQuestSave(start, [], game, coreQuestSources);
  const old = JSON.parse(JSON.stringify(save));
  const visit = (v: unknown): void => {
    if (Array.isArray(v)) return v.forEach(visit);
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (o.iconId === "22c0a26f50") {
        o.key = "trinket_stat_glyph";
        o.meaning_en = "Trinket stat glyph (Speed Stone) – possibly Speed";
        o.meaning_zh = "饰品属性图标（速度石）– 可能为速度";
      }
      Object.values(o).forEach(visit);
    }
  };
  visit(old.snapshot);
  expect(loadQuestSave(old, coreQuestSources).game).toEqual(game);
  old.snapshot.dungeon.heroes[0].wounds = 1;
  expect(() => loadQuestSave(old, coreQuestSources)).toThrow();
}, 20000);
it("R-128组合：On Guard与Fragile照常触发，Damage Stone仅追加伤口，不因Protection减半", () => {
  const initial = battle(["trinket:p036", "trinket:p007"], "inverted");
  const ids = ["On Guard", "Fragile"].map(
    (name) => initial.battle.conditions!.quirks.find((q) => q.name === name)!.id,
  );
  const state = {
    ...initial,
    battle: {
      ...initial.battle,
      entities: initial.battle.entities.map((h) =>
        h.id === "h0" ? { ...h, wounds: 0, protection: true, quirkIds: ids } : h,
      ),
    },
  };
  const open = use(state, "trinket:p036"),
    paid = choose(open, "trinket:p007");
  expect(paid.state.battle!.entities[0]!.wounds).toBe(8);
  expect(paid.state.battle!.trinkets!.held.every((h) => h.face === "upright")).toBe(true);
});
it("R-130疾病引发第四怪癖时，先选择替换，再提供Book of Constitution弃新病", () => {
  const initial = monsterTurn("trinket:p016", "upright", 3, "monster_medium:p031");
  const pool = initial.battle.conditions!,
    disease = pool.diseases[0]!.id;
  const ids = ["Evasive", "Resilient", "Hoarder"].map(
    (name) => pool.quirks.find((q) => q.name === name)!.id,
  );
  const state = {
    ...initial,
    battle: {
      ...initial.battle,
      entities: initial.battle.entities.map((h) =>
        h.id === "h0" ? { ...h, diseaseId: disease, quirkIds: ids } : h,
      ),
    },
  };
  const replace = ok(applyCommand(state, monsterAttack));
  expect(replace.pendingChoice!.options.some((o) => o.id === "continue")).toBe(false);
  const replacement = replace.pendingChoice!.options.find((o) => ids.includes(o.id))!;
  const book = choose(replace, replacement.id);
  expect(book.pendingChoice!.options.some((o) => o.id === "trinket:p016")).toBe(true);
  const paid = choose(book, "trinket:p016");
  expect(paid.state.battle!.entities[0]!.diseaseId).toBeNull();
  expect(paid.state.battle!.entities[0]!.quirkIds).toHaveLength(3);
  expect(paid.state.battle!.conditions!.diseaseDiscard).toHaveLength(2);
});
