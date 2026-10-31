import {
  FREE_TRINKET_IDS,
  FREE_TRINKET_INVERTED_ACTIVE_USE,
  FREE_TRINKET_INVERTED_DEFENCE_REACTION,
  freeTrinketUseProblem,
} from "./battle-free-trinkets";
import type { FreeTrinketId } from "./battle-free-trinkets";
import { expect, it } from "vitest";
import rawTrinkets from "../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";
import { HERO_SKILL_TRINKET_IDS } from "../../data/src/hero-skill-trinkets";
import type { HeroSkillTrinketId } from "../../data/src/hero-skill-trinkets";
import { savedCommandSchema } from "../../data/src/quest-save";
import { applyCommand } from "./command";
import type { ApplyResult, GameState, Command } from "./command";
import { createBattleState } from "./battle";
import type { BattleEntity, PlayHeroSkillCommand } from "./battle";
import type { SkillStance } from "./hero-skill";
import { coreQuestSources } from "./test-helpers/core-quest";
import { trinketBattle } from "./test-helpers/trinket-battle";
import { nextBattleRoll } from "./battle-roll";

const cards = normalizedTrinketFileSchema.parse(rawTrinkets).cards;
// 明示战斗机制夹具；完整牌池、技能和属性均来自目录，不冒称自然获得路径。
function fixture(
  ids: readonly (HeroSkillTrinketId | FreeTrinketId)[],
  stance: SkillStance = "aggressive",
  skillId = "hero_skill:p001",
  face: "upright" | "inverted" = "upright",
  seed = 4,
  monsterId = "monster_medium:p001",
  light = 5,
) {
  const catalog = coreQuestSources.catalog,
    skill = catalog.skills.find((s) => s.id === skillId)!;
  const level = 3;
  const names = [
    skill.hero!,
    ...["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].filter((n) => n !== skill.hero),
  ].slice(0, 4);
  const stances = [
    stance,
    ...(["aggressive", "defensive", "ranged", "support"] as const).filter((s) => s !== stance),
  ];
  const entities: BattleEntity[] = names.map((name, i) => {
    const stat = catalog.heroStats.find((s) => s.name === name && s.level === (i ? 1 : level))!;
    return {
      id: `h${i}`,
      side: "hero",
      hero: name,
      heroStatId: stat.id,
      heroLevel: stat.level,
      life: stat.life,
      stance: stances[i]!,
      areaId: "a",
      skillIds: i ? [] : [skillId, ...(name === "CRUSADER" ? ["hero_skill:p007"] : [])],
      wounds: 0,
      stress: 3,
      dodge: stat.dodge!,
      dead: false,
      guard: false,
      bleed: [],
      blight: [],
    };
  });
  const monster = catalog.monsters.find((m) => m.id === monsterId)!;
  entities.push({
    id: "m",
    side: "monster",
    hero: null,
    monsterCardId: monster.id,
    life: monster.life,
    stance: "aggressive",
    stanceSlots: 1,
    areaId: ["hero_skill:p001", "hero_skill:p070", "hero_skill:p028"].includes(skillId) ? "a" : "b",
    skillIds: [],
    wounds: 0,
    dodge: monster.dodge,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  });
  entities.push({ ...entities[entities.length - 1]!, id: "m2", stance: "defensive" });
  const initial = createBattleState(seed, {
    ...catalog,
    entities,
    light,
    areas: [
      { id: "a", adjacent: ["b"], elevation: "normal", capacity: 8 },
      { id: "b", adjacent: ["a"], elevation: "normal", capacity: 8 },
    ],
    trinkets: {
      ...catalog.trinkets!,
      cards: [
        ...catalog.trinkets!.cards,
        ...cards.filter((c) => c.level !== 1 && ids.includes(c.id as HeroSkillTrinketId)),
      ],
      held: ids.map((cardId) => ({ cardId, heroId: "h0", face })),
    },
  });
  const state = {
    ...initial,
    battle: {
      ...initial.battle!,
      encounter: {
        round: 1,
        deck: ["monster" as const],
        actedIds: [],
        turn: { type: "hero" as const, actorId: "h0", actions: 2, usedSkillIds: [] },
      },
    },
  };
  const command: PlayHeroSkillCommand = {
    type: "playHeroSkill",
    actorId: "h0",
    targetId: "m",
    skillId,
    trinketWindow: HERO_SKILL_TRINKET_IDS,
  };
  return { state, command };
}

const use = (state: GameState, id: FreeTrinketId) =>
  applyCommand(state, { type: "useTrinket", actorId: "h0", cardId: id });
function ready(id: FreeTrinketId, face: "upright" | "inverted" = "upright") {
  const { state } = fixture([id], "aggressive", "hero_skill:p001", face);
  return {
    ...state,
    battle: {
      ...state.battle!,
      light: 3,
      provisions: [{ id: "food1", face: "food" as const }],
      entities: state.battle!.entities.map((e) =>
        e.side === "hero" ? { ...e, wounds: 10, stress: 9 } : e,
      ),
    },
  };
}
it.each(FREE_TRINKET_IDS)("%s：真实目录正面结算、限次、不可变与 JSON 命令回放", (id) => {
  const state = ready(id),
    before = JSON.stringify(state),
    command = { type: "useTrinket", actorId: "h0", cardId: id };
  expect(savedCommandSchema.parse(command)).toEqual(command);
  const result = use(state, id);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(JSON.stringify(state)).toBe(before);
  expect(use(JSON.parse(before), id)).toEqual(result);
  expect(result.state.battle!.trinkets!.held[0]!.face).toBe("inverted");
  expect(result.state.battle!.usedTrinketIds).toContain(id);
  expect(freeTrinketUseProblem(result.state, "h0", id)).toContain("已使用");
  expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
});
it.each([
  ["trinket:p017", 6],
  ["trinket:p018", 7],
  ["trinket:p028", 0],
  ["trinket:p035", 6],
  ["trinket:p036", 5],
] as const)("%s 正面压力值", (id, stress) => {
  expect(use(ready(id), id).state.battle!.entities[0]!.stress).toBe(stress);
});
it.each([
  ["trinket:p015", 0],
  ["trinket:p030", 1],
  ["trinket:p037", 4],
] as const)("%s 治疗伤口", (id, wounds) => {
  const r = use(ready(id), id);
  expect(r.state.battle!.entities[0]!.wounds).toBe(wounds);
  expect(r.state.battle!.entities[1]!.wounds).toBe(id === "trinket:p037" ? 4 : 10);
  if (id === "trinket:p015") expect(r.state.battle!.provisions).toEqual([]);
});
it("Berserk只增加行动，不恢复已用技能", () => {
  const s = ready("trinket:p027"),
    r = use(s, "trinket:p027");
  expect(r.state.battle!.encounter!.turn).toEqual({ ...s.battle!.encounter!.turn, actions: 3 });
});
it.each([
  ["trinket:p028", 4],
  ["trinket:p035", 2],
] as const)("%s 光照不符无副作用", (id, light) => {
  const s = ready(id);
  s.battle.light = light;
  const r = use(s, id);
  expect(r.state).toEqual(s);
  expect(r.events[0]!.type).toBe("commandRefused");
});
it.each(["trinket:p027", "trinket:p030", "trinket:p037", "trinket:p036"] as const)(
  "%s 已开放反面主动使用",
  (id) => {
  const s = ready(id, "inverted");
  s.battle.entities = s.battle.entities.map((e) => ({ ...e, stress: 3, wounds: id === "trinket:p036" ? 0 : e.wounds }));
  const r = use(s, id);
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(r.state.battle!.trinkets!.held[0]!.face).toBe("upright");
  if (id === "trinket:p037") expect(r.state.battle!.light).toBe(1);
  else if (id === "trinket:p036") expect(r.state.battle!.entities[0]!.wounds).toBeGreaterThan(0);
  else expect(r.state.battle!.entities[0]!.stress).toBe(id === "trinket:p030" ? 5 : 4);
  },
);
it.each(FREE_TRINKET_INVERTED_DEFENCE_REACTION)(
  "%s 反面在受击窗接通，useTrinket 明确拒绝",
  (id) => {
    const s = ready(id, "inverted");
    expect(freeTrinketUseProblem(s, "h0", id)).toContain("受击防御窗");
    expect(use(s, id).events[0]!.type).toBe("commandRefused");
  },
);
it("Book of Sanity 反面 useTrinket 与 core 路径一致支付 6 非攻击伤害", () => {
  const s = ready("trinket:p036", "inverted");
  s.battle.entities = s.battle.entities.map((e) =>
    e.id === "h0" ? { ...e, wounds: 0, protection: true } : e,
  );
  expect(use(s, "trinket:p036").state.battle!.entities[0]!.wounds).toBe(6);
});
function ok(r: ApplyResult) {
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
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
function seedForRoll(roll: number) {
  let seed = 0;
  while (nextBattleRoll(seed, 0) !== roll) seed++;
  return seed;
}
function monsterTurn(id: FreeTrinketId, face: "upright" | "inverted", roll = 3) {
  const seed = seedForRoll(roll),
    { state } = trinketBattle([id], "aggressive", "hero_skill:p001", face, seed);
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
it("Bloodthirst Ring 反面受击可选 3 Bleed 2t", () => {
  const open = ok(applyCommand(monsterTurn("trinket:p015", "inverted"), monsterAttack));
  const paid = choose(open, "trinket:p015");
  expect(paid.state.battle!.trinkets!.held[0]!.face).toBe("upright");
  expect(paid.state.battle!.entities[0]!.statusStacks!.some((s) => s.kind === "bleed")).toBe(true);
});
it("Book of Holiness 反面把命中变为暴击", () => {
  const paid = choose(ok(applyCommand(monsterTurn("trinket:p017", "inverted"), monsterAttack)), "trinket:p017");
  expect(paid.events.find((e) => e.type === "monsterSkillResolved")!.resolution.outcome).toBe("crit");
});
it("Book of Relaxation 反面 Dodge-2 在防御窗生效", () => {
  const initial = monsterTurn("trinket:p018", "inverted"),
    threshold = 9 - initial.battle!.entities[0]!.dodge;
  const paid = choose(
    ok(applyCommand({ ...initial, seed: seedForRoll(threshold + 1) }, monsterAttack)),
    "trinket:p018",
  );
  expect(paid.events.find((e) => e.type === "monsterSkillResolved")!.resolution.outcome).toBe("hit");
});
it.each(FREE_TRINKET_IDS)("%s 卡面漂移拒绝", (id) => {
  const s = ready(id);
  const card = s.battle.trinkets!.cards.find((c) => c.id === id)!;
  const bad = {
    ...s,
    battle: {
      ...s.battle,
      trinkets: {
        ...s.battle.trinkets!,
        cards: s.battle.trinkets!.cards.map((c) => (c === card ? { ...c, name: "drift" } : c)),
      },
    },
  };
  expect(use(bad, id).state).toEqual(bad);
  expect(use(bad, id).events[0]!.type).toBe("commandRefused");
});
it("血戒无食物不治疗；Candle 禁疗区不恢复伤口", () => {
  const s = ready("trinket:p015");
  s.battle.provisions = [];
  expect(use(s, "trinket:p015").state).toEqual(s);
  const c = ready("trinket:p037");
  c.battle.areas = c.battle.areas.map((a) => ({ ...a, healingForbidden: true }));
  const r = use(c, "trinket:p037");
  expect(r.state.battle!.entities[0]!.wounds).toBe(10);
  expect(r.events.some((e) => e.type === "healingPrevented")).toBe(true);
});

it("Cleansing移除五类全部堆、保留保护与增益，不影响怪物", () => {
  const s = ready("trinket:p038");
  const stacks = [
    { kind: "bleed" as const, remaining: 2, amount: 2 },
    { kind: "blight" as const, remaining: 3, amount: 1 },
    ...(["stun", "debuff", "mark", "protection", "buff"] as const).map((kind) => ({
      kind,
      remaining: 2,
    })),
  ];
  s.battle.entities = s.battle.entities.map((e) => ({
    ...e,
    statusStacks: stacks,
    bleed: ["b"],
    blight: ["p"],
    protection: true,
    markStacks: 1,
    debuffStacks: 1,
    buffStacks: 1,
  }));
  const r = use(s, "trinket:p038");
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  for (const hero of r.state.battle!.entities.filter((e) => e.side === "hero")) {
    expect(hero.statusStacks?.map((s) => s.kind)).toEqual(["protection", "buff"]);
    expect(hero.protection).toBe(true);
    expect(hero.bleed).toEqual([]);
    expect(hero.markStacks).toBe(0);
  }
  expect(r.state.battle!.entities.find((e) => e.side === "monster")!.statusStacks).toEqual(stacks);
});
it("仍 hold 的反面拒绝 useTrinket，不提供虚假翻面", () => {
  for (const id of FREE_TRINKET_IDS.filter(
    (id) =>
      !(FREE_TRINKET_INVERTED_ACTIVE_USE as readonly string[]).includes(id) &&
      !(FREE_TRINKET_INVERTED_DEFENCE_REACTION as readonly string[]).includes(id),
  )) {
    const s = ready(id, "inverted");
    expect(use(s, id).state).toEqual(s);
    expect(use(s, id).events[0]!.type).toBe("commandRefused");
    expect(freeTrinketUseProblem(s, "h0", id)).toContain("尚未接通");
  }
});
