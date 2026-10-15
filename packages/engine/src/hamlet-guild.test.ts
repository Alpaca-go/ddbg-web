import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { guildQuest } from "./test-helpers/guild-quest";
import { coreQuestSources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";

let baseline: ReturnType<typeof guildQuest>;
beforeAll(() => {
  baseline = guildQuest();
}, 30000);
const visit: Command = { type: "visitGuild", actorId: "hero-0" };
const choose = (g: GameState, optionId: string): Command => ({
  type: "resolveChoice",
  choiceId: g.dungeon!.pending!.id,
  optionId,
});
function ok(g: GameState, c: Command) {
  const r = applyCommand(g, c);
  expect(
    r.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBe(false);
  return r.state;
}
function fixture(xp = 6): GameState {
  const b = baseline.game,
    d = b.dungeon!;
  // 明示资源/封锁服务夹具，不称自然奖励；真实日志单列。
  return {
    ...b,
    dungeon: {
      ...d,
      gold: 100,
      heroes: d.heroes.map((h) => ({ ...h, xp })),
      hamlet: { ...d.hamlet!, blockedBuildings: [] },
    },
  };
}
it("真实四房间获得2XP，公会访问/永久升级/离开节点存档一致；无重复扣费、原卡永久移除", () => {
  let game = baseline.game;
  const commands = [...baseline.commands],
    before = structuredClone(game),
    d = game.dungeon!;
  expect(d.heroes.map((h) => h.xp)).toEqual([2, 2, 2, 2]);
  const step = (c: Command) => {
    commands.push(c);
    game = ok(game, c);
  };
  const save = () =>
    expect(
      loadQuestSave(
        JSON.parse(
          JSON.stringify(createQuestSave(baseline.start, commands, game, coreQuestSources)),
        ),
        coreQuestSources,
      ).game,
    ).toEqual(game);
  step(visit);
  save();
  const old = game.dungeon!.pending!;
  step(choose(game, "upgrade:hero_skill:p001"));
  expect(game.dungeon!.gold).toBe(d.gold - 1);
  expect(game.dungeon!.heroes[0]!.xp).toBe(0);
  expect(game.dungeon!.heroes[0]!.skillIds).toEqual([
    "hero_skill:p002",
    "hero_skill:p004",
    "hero_skill:p016",
  ]);
  expect(game.dungeon!.heroes[0]!.combat!.skillIds).toEqual(game.dungeon!.heroes[0]!.skillIds);
  expect(game.dungeon!.heroes[0]!.permanentlyRemovedSkillIds).toEqual(["hero_skill:p001"]);
  expect(game.dungeon!.hamlet!.actedHeroes ?? []).toEqual([]);
  expect(game.dungeon!.pending!.options.map((o) => o.id)).toEqual(["leave"]);
  expect(
    applyCommand(game, { type: "resolveChoice", choiceId: old.id, optionId: old.options[0]!.id })
      .state,
  ).toBe(game);
  expect(
    applyCommand(game, { type: "visitBlacksmith", actorId: "hero-0", skillId: "hero_skill:p002" })
      .state,
  ).toBe(game);
  save();
  step(choose(game, "leave"));
  save();
  expect(game.dungeon!.cursor).toBe(d.cursor);
  expect(game.dungeon!.hamlet!.guildUpgrades).toBeUndefined();
  expect(game.dungeon!.hamlet!.actedHeroes).toEqual(["hero-0"]);
  expect(game.dungeon!.hamlet!.visitedBuildings).toEqual(["guild"]);
  expect(baseline.game).toEqual(before);
}, 30000);
it("一次可升同技能I→II→III并永久移除两张；最多两项自动结束，不能第三次或回退", () => {
  const game = fixture(),
    shop = ok(game, visit);
  const first = ok(shop, choose(shop, "upgrade:hero_skill:p001"));
  const second = ok(first, choose(first, "upgrade:hero_skill:p002"));
  expect(second.dungeon!.gold).toBe(98);
  expect(second.dungeon!.heroes[0]!.xp).toBe(2);
  expect(second.dungeon!.heroes[0]!.permanentlyRemovedSkillIds).toEqual([
    "hero_skill:p001",
    "hero_skill:p002",
  ]);
  expect(second.dungeon!.heroes[0]!.skillIds![0]).toBe("hero_skill:p003");
  expect(second.dungeon!.pending).toBeNull();
  expect(second.dungeon!.hamlet!.actedHeroes).toEqual(["hero-0"]);
  expect(applyCommand(second, visit).state).toBe(second);
  const other = ok(first, choose(first, "upgrade:hero_skill:p004"));
  expect(other.dungeon!.heroes[0]!.skillIds!.slice(0, 2)).toEqual([
    "hero_skill:p002",
    "hero_skill:p005",
  ]);
});
it("缺钱/XP不足仍可查看和离开，封锁/越序/坏XP/坏移除记录拒绝；无效选项不改变资源", () => {
  const b = fixture(),
    d = b.dungeon!;
  const poor = { ...b, dungeon: { ...d, gold: 0 } };
  const shop = ok(poor, visit);
  expect(shop.dungeon!.pending!.options.map((o) => o.id)).toEqual(["leave"]);
  expect(ok(shop, choose(shop, "leave")).dungeon!.gold).toBe(0);
  for (const invalid of [-1, 1.5, null, NaN]) {
    const bad = {
      ...b,
      dungeon: { ...d, heroes: d.heroes.map((h, i) => (i === 0 ? { ...h, xp: invalid } : h)) },
    } as GameState;
    expect(applyCommand(bad, visit).state).toBe(bad);
  }
  const blocked = {
    ...b,
    dungeon: { ...d, hamlet: { ...d.hamlet!, blockedBuildings: ["guild"] } },
  };
  expect(applyCommand(blocked, visit).state).toBe(blocked);
  expect(applyCommand(b, { type: "visitGuild", actorId: "hero-1" }).state).toBe(b);
  const valid = ok(b, visit);
  for (const id of [
    "upgrade:hero_skill:p022", // 其他英雄技能
    "upgrade:hero_skill:p002", // 尚未拥有的II级
    "upgrade:hero_skill:p003", // 尚未拥有的III级
  ])
    expect(applyCommand(valid, choose(valid, id)).state).toBe(valid);
  const corrupted = {
    ...b,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) =>
        i === 0 ? { ...h, permanentlyRemovedSkillIds: ["hero_skill:p001"] } : h,
      ),
    },
  };
  expect(applyCommand(corrupted, visit).state).toBe(corrupted);
});
it("R-080临时III后永久II更新归还卡，继续永久III不恢复旧卡；其他技能计划保持", () => {
  const b = fixture(),
    d = b.dungeon!;
  const planned: GameState = {
    ...b,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) =>
        i === 0
          ? {
              ...h,
              nextQuestSkillUpgrades: [
                { originalSkillId: "hero_skill:p001", temporarySkillId: "hero_skill:p003" },
                { originalSkillId: "hero_skill:p004", temporarySkillId: "hero_skill:p005" },
              ],
            }
          : h,
      ),
    },
  };
  const shop = ok(planned, visit),
    first = ok(shop, choose(shop, "upgrade:hero_skill:p001"));
  expect(first.dungeon!.heroes[0]!.nextQuestSkillUpgrades).toEqual([
    { originalSkillId: "hero_skill:p002", temporarySkillId: "hero_skill:p003" },
    { originalSkillId: "hero_skill:p004", temporarySkillId: "hero_skill:p005" },
  ]);
  const second = ok(first, choose(first, "upgrade:hero_skill:p002"));
  expect(second.dungeon!.heroes[0]!.nextQuestSkillUpgrades![0]).toEqual({
    originalSkillId: "hero_skill:p003",
    temporarySkillId: "hero_skill:p003",
  });
  const hamlet = { ...first.dungeon!.hamlet!, visitedBuildings: [], actedHeroes: [] };
  delete hamlet.guildUpgrades;
  const nextDay = {
    ...first,
    dungeon: {
      ...first.dungeon!,
      pending: null,
      hamlet,
      buildingLevels: { blacksmith: 2 as const },
    },
  };
  expect(
    ok(nextDay, {
      type: "visitBlacksmith",
      actorId: "hero-0",
      skillId: "hero_skill:p002",
    }).dungeon!.heroes[0]!.nextQuestSkillUpgrades!.find(
      (u) => u.originalSkillId === "hero_skill:p002",
    )!.temporarySkillId,
  ).toBe("hero_skill:p003");
});
it("四英雄各自升级已装备技能，缺失/未核实高等级卡不提供选项，不消耗XP或金币", () => {
  for (const [i, old, next] of [
    [0, "hero_skill:p001", "hero_skill:p002"],
    [1, "hero_skill:p022", "hero_skill:p023"],
    [2, "hero_skill:p064", "hero_skill:p065"],
    [3, "hero_skill:p088", "hero_skill:p089"],
  ] as const) {
    const b = fixture(),
      d = b.dungeon!;
    const g = {
      ...b,
      dungeon: {
        ...d,
        hamlet: {
          ...d.hamlet!,
          heroOrder: [`hero-${i}`, ...d.hamlet!.heroOrder.filter((id) => id !== `hero-${i}`)],
        },
      },
    };
    const shop = ok(g, { type: "visitGuild", actorId: `hero-${i}` });
    expect(ok(shop, choose(shop, `upgrade:${old}`)).dungeon!.heroes[i]!.skillIds).toContain(next);
    const missing = {
      ...g,
      dungeon: {
        ...g.dungeon!,
        battleCatalog: {
          ...d.battleCatalog!,
          skills: d.battleCatalog!.skills.filter((s) => s.id !== next),
        },
      },
    };
    const blocked = ok(missing, { type: "visitGuild", actorId: `hero-${i}` });
    expect(applyCommand(blocked, choose(blocked, `upgrade:${old}`)).state).toBe(blocked);
  }
});
it("夹具4XP可升英雄I→II并保留疾病；同访可再升技能；真实2XP路径不出现英雄升级项", () => {
  // 明示4XP夹具；单个现有任务最高3XP，不称自然两任务战役验收。
  const b = fixture(4),
    d = b.dungeon!;
  const withDisease = {
    ...b,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) => (i === 0 ? { ...h, diseaseId: "disease:p001", xp: 4 } : h)),
    },
  };
  const shop = ok(withDisease, visit);
  expect(shop.dungeon!.pending!.options.map((o) => o.id)).toContain("upgrade-hero");
  const real = ok(baseline.game, visit);
  expect(real.dungeon!.pending!.options.map((o) => o.id)).not.toContain("upgrade-hero");
  const heroUp = ok(shop, choose(shop, "upgrade-hero"));
  expect(heroUp.dungeon!.heroes[0]).toMatchObject({
    level: 2,
    heroStatId: "hero_stat:p001:back",
    life: 24,
    diseaseId: "disease:p001",
    xp: 0,
  });
  expect(heroUp.dungeon!.gold).toBe(d.gold - 2);
  expect(heroUp.dungeon!.pending!.options.map((o) => o.id)).toEqual(["leave"]);
  const rich = fixture(8);
  const shop2 = ok(rich, visit);
  const afterHero = ok(shop2, choose(shop2, "upgrade-hero"));
  const afterSkill = ok(afterHero, choose(afterHero, "upgrade:hero_skill:p001"));
  expect(afterSkill.dungeon!.heroes[0]).toMatchObject({
    level: 2,
    skillIds: expect.arrayContaining(["hero_skill:p002"]),
    permanentlyRemovedSkillIds: ["hero_skill:p001"],
    xp: 2,
  });
  expect(afterSkill.dungeon!.pending).toBeNull();
  expect(afterSkill.dungeon!.gold).toBe(97);
  const noCard = {
    ...fixture(4),
    dungeon: {
      ...fixture(4).dungeon!,
      battleCatalog: {
        ...fixture(4).dungeon!.battleCatalog!,
        heroStats: fixture(4).dungeon!.battleCatalog!.heroStats.filter(
          (s) => s.id !== "hero_stat:p001:back",
        ),
      },
    },
  };
  const blocked = ok(noCard, visit);
  expect(blocked.dungeon!.pending!.options.map((o) => o.id)).not.toContain("upgrade-hero");
  expect(applyCommand(blocked, choose(blocked, "upgrade-hero")).state).toBe(blocked);
});
it("未装备拥有技能可永久升级且不改装备栏；III级英雄不再提供英雄升级", () => {
  const b = fixture(),
    unequipped = "hero_skill:p007"; // Stunning Blow I，默认未装备
  expect(b.dungeon!.heroes[0]!.skillIds).not.toContain(unequipped);
  const shop = ok(b, visit);
  expect(shop.dungeon!.pending!.options.some((o) => o.id === `upgrade:${unequipped}`)).toBe(true);
  const done = ok(shop, choose(shop, `upgrade:${unequipped}`));
  expect(done.dungeon!.heroes[0]!.skillIds).toEqual(b.dungeon!.heroes[0]!.skillIds);
  expect(done.dungeon!.heroes[0]!.permanentlyRemovedSkillIds).toEqual([unequipped]);
  const iii = {
    ...fixture(8),
    dungeon: {
      ...fixture(8).dungeon!,
      heroes: fixture(8).dungeon!.heroes.map((h, i) =>
        i === 0
          ? {
              ...h,
              level: 3,
              heroStatId: "hero_stat:p002:front",
              life: 32,
              xp: 8,
            }
          : h,
      ),
    },
  };
  const shop3 = ok(iii, visit);
  expect(shop3.dungeon!.pending!.options.map((o) => o.id)).not.toContain("upgrade-hero");
});
