import { expect, it } from "vitest";
import { hallAscensionFixture as setup } from "./test-helpers/hall-ascension";
import { coreQuestSources } from "./test-helpers/core-quest";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { questHeroSkillCount } from "./hero-loadout";
import { restoreTemporarySkillUpgrades, applyTemporarySkillUpgrades } from "./hamlet-embark";
import { savedCommandSchema } from "../../data/src/quest-save";
const actor = (s: GameState) => s.battle!.entities.find((e) => e.id === "hero-0")!;
function open(s: GameState) {
  return applyCommand(s, { type: "hallAscension", actorId: "hero-0" });
}
function choose(s: GameState, id: string) {
  const opened = open(s);
  expect(opened.pendingChoice, JSON.stringify(opened.events)).toBeDefined();
  return applyCommand(opened.state, {
    type: "resolveChoice",
    choiceId: opened.pendingChoice!.id,
    optionId: id,
  });
}
const hero = (s: GameState) => s.dungeon!.heroes[0]!;
it("R-153：三个宝箱是独立代币，C区两个；升华命令可写入存档命令日志", () => {
  const s = setup(),
    loot = s.battle!.loot!;
  expect(s.battle!.lootAreas).toEqual(["A", "C", "C"]);
  expect(loot.placed.map((t) => t.areaId)).toEqual(["A", "C", "C"]);
  expect(new Set([...loot.available, ...loot.placed].map((t) => t.id)).size).toBe(10);
  expect(savedCommandSchema.parse({ type: "hallAscension", actorId: "hero-0" })).toEqual({
    type: "hallAscension",
    actorId: "hero-0",
  });
});
function nextTurn(s: GameState): GameState {
  return {
    ...s,
    battle: {
      ...s.battle!,
      encounter: {
        ...s.battle!.encounter!,
        turn: { type: "hero", actorId: "hero-0", actions: 2, usedSkillIds: [] },
      },
    },
  };
}
it("R-154/155：升级英雄扣4XP/2金，压力+3；原伤口保留、新槽留空并可再次升级", () => {
  const initial = setup(),
    before = structuredClone(initial);
  const first = choose(initial, "hero");
  expect(first.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(initial).toEqual(before);
  expect(hero(first.state)).toMatchObject({ level: 2, xp: 16, hallAscensionVacantSlots: 1 });
  expect(actor(first.state)).toMatchObject({ heroLevel: 2, stress: 3, wounds: 7 });
  expect(actor(first.state).skillIds).toHaveLength(3);
  expect(questHeroSkillCount(hero(first.state))).toBe(3);
  expect(first.state.battle!.loot!.gold).toBe(18);
  expect(first.state.dungeon!.gold).toBe(18);
  expect(first.state.battle!.encounter!.actedIds).toContain("hero-0");
  const second = choose(nextTurn(first.state), "hero");
  expect(hero(second.state)).toMatchObject({ level: 3, xp: 12, hallAscensionVacantSlots: 2 });
  expect(actor(second.state).stress).toBe(6);
  expect(questHeroSkillCount(hero(second.state))).toBe(3);
  expect(open(nextTurn(second.state)).pendingChoice!.options.some((o) => o.id === "hero")).toBe(
    false,
  );
  expect(choose(initial, "hero")).toEqual(first);
});
it("装备及未装备技能均可永久升级；只换同名下一级、旧卡永久移出", () => {
  const s = setup(),
    old = hero(s).skillIds![0]!;
  const r = choose(s, `skill:${old}`);
  expect(r.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(hero(r.state).permanentlyRemovedSkillIds).toContain(old);
  expect(actor(r.state).skillIds).not.toContain(old);
  expect(hero(r.state).xp).toBe(18);
  expect(r.state.battle!.loot!.gold).toBe(19);
  const unowned = open(s).pendingChoice!.options.find(
    (o) => o.id.startsWith("skill:") && !hero(s).skillIds!.includes(o.id.slice(6)),
  )!;
  const other = choose(s, unowned.id);
  expect(actor(other.state).skillIds).toEqual(actor(s).skillIds);
  expect(hero(other.state).permanentlyRemovedSkillIds).toContain(unowned.id.slice(6));
});
it("R-080：临时III/永久I升级到II，任务中保留III，归还目标变为II", () => {
  const s = setup(),
    h = hero(s),
    old = coreQuestSources.catalog.skills.find((c) => c.id === h.skillIds![0])!;
  const temp = coreQuestSources.catalog.skills.find(
    (c) => c.hero === old.hero && c.name === old.name && c.level === 3,
  )!;
  const applied = applyTemporarySkillUpgrades(
    [{ ...h, nextQuestSkillUpgrades: [{ originalSkillId: old.id, temporarySkillId: temp.id }] }],
    s.dungeon!.battleCatalog!,
  );
  if (!("heroes" in applied)) throw Error(applied.reason);
  const changed = {
    ...s,
    dungeon: {
      ...s.dungeon!,
      heroes: s.dungeon!.heroes.map((a) => (a.id === h.id ? applied.heroes[0]! : a)),
    },
    battle: {
      ...s.battle!,
      entities: s.battle!.entities.map((e) =>
        e.id === h.id ? { ...e, skillIds: applied.heroes[0]!.skillIds! } : e,
      ),
    },
  };
  const r = choose(changed, `skill:${old.id}`);
  expect(r.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(actor(r.state).skillIds).toContain(temp.id);
  const restored = restoreTemporarySkillUpgrades([hero(r.state)])[0]!;
  expect(restored.skillIds).not.toContain(old.id);
  expect(restored.skillIds).not.toContain(temp.id);
});
it("压力到10先检定；心脏病死亡取消升级，行动与压力已支付但不扣升级费用", () => {
  const first = choose(setup({ stress: 7 }), "hero");
  expect(first.events.some((e) => e.type === "resolveTested")).toBe(true);
  expect(hero(first.state).level).toBe(2);
  const dead = choose(
    setup({ stress: 7, resolveTested: true, resolveCardId: actor(first.state).resolveCardId! }),
    "hero",
  );
  expect(actor(dead.state).dead).toBe(true);
  expect(hero(dead.state)).toMatchObject({ level: 1, xp: 20 });
  expect(dead.state.battle!.loot!.gold).toBe(20);
});
it("取消不付费、错误/过期choice拒绝；缺资源/少行动/错误区域原子拒绝", () => {
  const s = setup(),
    p = open(s);
  const cancelled = applyCommand(p.state, {
    type: "resolveChoice",
    choiceId: p.pendingChoice!.id,
    optionId: "cancel",
  });
  expect(actor(cancelled.state)).toEqual(actor(s));
  expect(cancelled.state.battle!.rngCursor).toBe(s.battle!.rngCursor);
  expect(
    applyCommand(cancelled.state, {
      type: "resolveChoice",
      choiceId: p.pendingChoice!.id,
      optionId: "hero",
    }).state,
  ).toBe(cancelled.state);
  const poor = { ...s, battle: { ...s.battle!, loot: { ...s.battle!.loot!, gold: 0 } } };
  for (const bad of [poor, setup({}, 1, 1), setup({ areaId: "J" })])
    expect(open(bad).state).toBe(bad);
  const invalid = applyCommand(p.state, {
    type: "resolveChoice",
    choiceId: p.pendingChoice!.id,
    optionId: "forged",
  });
  expect(invalid.state).toBe(p.state);
});
it("压力牌堆缺失原子回滚行动、升级费用与RNG", () => {
  const s = setup({ stress: 7 }),
    bad = { ...s, battle: { ...s.battle!, resolveCards: [] } };
  const p = open(bad),
    r = applyCommand(p.state, {
      type: "resolveChoice",
      choiceId: p.pendingChoice!.id,
      optionId: "hero",
    });
  expect(r.state).toBe(p.state);
});
