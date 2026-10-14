import { expect, it } from "vitest";
import { coreQuestSources, coreParty } from "./test-helpers/core-quest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { createBattleState } from "./battle";
import type { BattleEntity } from "./battle";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { approvedExtraRuinsTiles } from "../../data/src/normalize/approved-ruins-tiles";
import { roomTileBattleAreas } from "./battle-monster-movement";
import { QUIRK_NAMES } from "./passive";
const tile = approvedExtraRuinsTiles.find((t) => t.number === 6)!;
const basePool = coreQuestSources.catalog.trinkets!;
// 真实获批整面；人工设置当前英雄回合，仅用于交互规则测试。
function setup(changes: Partial<BattleEntity> = {}, seed = 1, actions = 2): GameState {
  const d = createCoreDungeonQuest(
    seed,
    "quest:p001",
    "radiant",
    coreParty,
    coreQuestSources,
  ).dungeon!;
  const card = coreQuestSources.catalog.monsters.find((c) => c.id === "monster_medium:p001")!;
  const heroes = d.heroes.map((hero, index): BattleEntity => {
    const stat = coreQuestSources.catalog.heroStats.find((s) => s.id === hero.heroStatId)!;
    return {
      id: hero.id,
      side: "hero",
      hero: stat.name,
      heroStatId: stat.id,
      heroLevel: 1,
      life: stat.life,
      wounds: index ? 0 : 7,
      stress: 0,
      dodge: stat.dodge,
      stance: hero.stance!,
      areaId: ["T6", "T3", "T8", "T3"][index]!,
      skillIds: hero.skillIds!,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
      ...(index ? {} : changes),
    };
  });
  const s = createBattleState(seed, {
    ...coreQuestSources.catalog,
    trinkets: basePool,
    resolveCards: coreQuestSources.resolveCards,
    skills: coreQuestSources.catalog.skills,
    light: 5,
    provisions: [],
    areas: roomTileBattleAreas(tile),
    entities: [
      ...heroes,
      {
        id: "m",
        side: "monster",
        hero: null,
        life: card.life,
        monsterCardId: card.id,
        wounds: 0,
        areaId: "T2",
        stance: "aggressive",
        stanceSlots: 1,
        dodge: card.dodge,
        skillIds: [],
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
    ],
  });
  return {
    ...s,
    battle: {
      ...s.battle!,
      encounter: {
        round: 1,
        deck: ["monster"],
        actedIds: [],
        turn: { type: "hero", actorId: "hero-0", actions, usedSkillIds: [] },
      },
    },
  };
}
const use = (s: GameState) => applyCommand(s, { type: "hideAndHeal", actorId: "hero-0" });
const actor = (s: GameState) => s.battle!.entities.find((e) => e.id === "hero-0")!;
const q = (name: (typeof QUIRK_NAMES)[number]) =>
  `quirk:p${String(QUIRK_NAMES.indexOf(name) + 1).padStart(3, "0")}`;

it.each(
  [[], [q("Infirm")], [q("Fast Healer")], [q("Infirm"), q("Fast Healer")]].map((quirkIds) => ({
    quirkIds,
  })),
)("R-073：7伤口直接全部移除，不应用治疗修正 %j；可连续使用且确定性回放", ({ quirkIds }) => {
  const s = setup({ quirkIds }),
    before = structuredClone(s);
  const r = use(s);
  expect(r.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(actor(r.state)).toMatchObject({ wounds: 0, stress: 2, dead: false });
  expect(r.state.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 1 });
  expect(r.state.battle!.rngCursor).toBe(s.battle!.rngCursor);
  const done = use(r.state);
  expect(actor(done.state)).toMatchObject({ wounds: 0, stress: 4 });
  expect(done.state.battle!.encounter!.actedIds).toContain("hero-0");
  expect(use(use(s).state)).toEqual(done);
  expect(s).toEqual(before);
});
it("压力先追加Soft伤口，再清空；原在死门的存活者也能离开死门，不另掷骰", () => {
  const s = setup({ quirkIds: [q("Soft")] });
  const r = use(s);
  expect(actor(r.state)).toMatchObject({ wounds: 0, stress: 2 });
  expect(r.events.some((e) => e.type === "heroHealthResolved" && e.effect.type === "wounds")).toBe(
    true,
  );
  const atDoor = setup({ wounds: actor(s).life! });
  const healed = use(atDoor);
  expect(actor(healed.state)).toMatchObject({ wounds: 0, dead: false });
  expect(healed.state.battle!.rngCursor).toBe(atDoor.battle!.rngCursor);
});
it("Soft在死门追加伤口先掷死门；死亡取消移除，存活才清空", () => {
  const results = [1, 7].map((seed) => {
    const s = setup({ quirkIds: [q("Soft")] }, seed);
    return use({
      ...s,
      battle: {
        ...s.battle!,
        entities: s.battle!.entities.map((e) =>
          e.id === "hero-0" ? { ...e, wounds: e.life! } : e,
        ),
      },
    });
  });
  expect(results.some((r) => actor(r.state).dead)).toBe(true);
  expect(results.some((r) => !actor(r.state).dead)).toBe(true);
  for (const r of results) {
    const h = actor(r.state);
    expect(h.wounds).toBe(h.dead ? h.life : 0);
    expect(r.state.battle!.rngCursor).toBe(1);
    expect(
      r.events.some((e) => e.type === "roomInteractionResolved" && e.message.includes("移除全部")),
    ).toBe(!h.dead);
  }
});
it("压力到10先意志检定，已有意志卡则心脏病死亡，不移除伤口或复活", () => {
  const first = use(setup({ stress: 8 }));
  expect(first.events.some((e) => e.type === "resolveTested")).toBe(true);
  expect(actor(first.state)).toMatchObject({ stress: 0, wounds: 0, resolveTested: true });
  const dead = use(
    setup({ stress: 8, resolveTested: true, resolveCardId: actor(first.state).resolveCardId! }),
  );
  expect(actor(dead.state)).toMatchObject({ dead: true, wounds: 7 });
  expect(dead.events.some((e) => e.type === "heartAttack")).toBe(true);
  expect(dead.state.battle!.encounter!.actedIds).toContain("hero-0");
});
it("禁疗、同区怪物、错误英雄／区域、必须移动、零行动及死亡均原子拒绝", () => {
  const s = setup(),
    b = s.battle!,
    t = b.encounter!.turn;
  if (t.type !== "hero") throw new Error("fixture");
  const states: GameState[] = [
    setup({ areaId: "T5" }),
    setup({ dead: true }),
    setup({}, 1, 0),
    {
      ...s,
      battle: {
        ...b,
        areas: b.areas.map((a) => (a.id === "T6" ? { ...a, healingForbidden: true } : a)),
      },
    },
    {
      ...s,
      battle: {
        ...b,
        entities: b.entities.map((e) => (e.id === "m" ? { ...e, areaId: "T6" } : e)),
      },
    },
    { ...s, battle: { ...b, encounter: { ...b.encounter!, turn: { ...t, mustMove: true } } } },
    { ...s, battle: { ...b, encounter: { ...b.encounter!, turn: { ...t, actorId: "hero-1" } } } },
  ];
  for (const state of states) expect(use(state).state).toBe(state);
});
it("缺意志牌堆导致压力预检失败时，回滚整次行动、压力、伤口与RNG", () => {
  const s = setup({ stress: 8, quirkIds: [q("Soft")] });
  const broken = { ...s, battle: { ...s.battle!, resolveCards: [] } };
  expect(use(broken).state).toBe(broken);
});
