import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { naturalAbbeyQuest } from "./test-helpers/abbey-quest";
import { coreQuestSources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { blacksmithOptions } from "./hamlet-blacksmith";

let baseline: ReturnType<typeof naturalAbbeyQuest>;
beforeAll(() => {
  baseline = naturalAbbeyQuest();
}, 30000);
const visit: Command = { type: "visitBlacksmith", actorId: "hero-0", skillId: "hero_skill:p001" };
function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result.state;
}
function fixture(level: 1 | 2 | 3 = 1): GameState {
  const b = baseline.game,
    d = b.dungeon!;
  // 明示建筑等级/金币/封锁服务夹具，与真实命令回放场景区分。
  return {
    ...b,
    dungeon: {
      ...d,
      gold: 100,
      buildingLevels: { ...d.buildingLevels, blacksmith: level },
      hamlet: {
        ...d.hamlet!,
        blockedBuildings: [],
        caretaker: null,
        noCaretaker: true,
        extraBlock: false,
      },
    },
  };
}
it("铁匠I/II/III均1金，记录已核实II/III技能；III奖励骰累加且不改原卡/当前状态/RNG", () => {
  for (const level of [1, 2, 3] as const) {
    const game = fixture(level),
      d = game.dungeon!,
      before = structuredClone(game);
    const next = ok(game, visit),
      n = next.dungeon!;
    expect(n.gold).toBe(99);
    expect(n.heroes[0]!.nextQuestSkillUpgrades).toEqual([
      {
        originalSkillId: "hero_skill:p001",
        temporarySkillId: level === 1 ? "hero_skill:p002" : "hero_skill:p003",
      },
    ]);
    expect(n.heroes[0]!.nextQuestProvisionDice ?? 0).toBe(level === 3 ? 1 : 0);
    expect(n.heroes[0]!.skillIds).toEqual(d.heroes[0]!.skillIds);
    expect(n.heroes[0]!.combat).toEqual(d.heroes[0]!.combat);
    expect(n.heroes[0]!.xp).toBe(d.heroes[0]!.xp);
    expect(n.heroes[0]!.wounds).toBe(d.heroes[0]!.wounds);
    expect(n.heroes[0]!.stress).toBe(d.heroes[0]!.stress);
    expect(n.cursor).toBe(d.cursor);
    expect(n.explorationSetup).toEqual(d.explorationSetup);
    expect(n.hamlet!.visitedBuildings).toEqual(["blacksmith"]);
    expect(n.hamlet!.actedHeroes).toEqual(["hero-0"]);
    expect(game).toEqual(before);
    expect(ok(game, visit)).toEqual(next);
    expect(blacksmithOptions(game).map((o) => o.command.skillId)).toEqual(d.heroes[0]!.skillIds);
  }
  const game = fixture(3),
    d = game.dungeon!;
  const existing = {
    ...game,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) => (i === 0 ? { ...h, nextQuestProvisionDice: 2 } : h)),
    },
  };
  expect(ok(existing, visit).dungeon!.heroes[0]!.nextQuestProvisionDice).toBe(3);
});
it("四英雄各自技能映射到同名III级卡，不把其他英雄/未核实属性当作所属技能", () => {
  for (const [index, originalSkillId, temporarySkillId] of [
    [0, "hero_skill:p001", "hero_skill:p003"],
    [1, "hero_skill:p022", "hero_skill:p024"],
    [2, "hero_skill:p064", "hero_skill:p066"],
    [3, "hero_skill:p088", "hero_skill:p090"],
  ] as const) {
    const b = fixture(2),
      d = b.dungeon!;
    // 明示当前行动顺序夹具，仅校验每位英雄的技能所属和对应卡，不替代自然跨日。
    const game = {
      ...b,
      dungeon: {
        ...d,
        hamlet: {
          ...d.hamlet!,
          heroOrder: [
            `hero-${index}`,
            ...d.hamlet!.heroOrder.filter((id) => id !== `hero-${index}`),
          ],
        },
      },
    };
    expect(
      ok(game, { type: "visitBlacksmith", actorId: `hero-${index}`, skillId: originalSkillId })
        .dungeon!.heroes[index]!.nextQuestSkillUpgrades,
    ).toEqual([{ originalSkillId, temporarySkillId }]);
  }
});
it("缺钱/封锁/占用/越序/未装备/外英雄/未核实卡/重复或坏计划原子拒绝", () => {
  const game = fixture(),
    d = game.dungeon!;
  for (const bad of [
    { ...game, dungeon: { ...d, gold: 0 } },
    { ...game, dungeon: { ...d, hamlet: { ...d.hamlet!, blockedBuildings: ["blacksmith"] } } },
    { ...game, dungeon: { ...d, hamlet: { ...d.hamlet!, visitedBuildings: ["blacksmith"] } } },
    {
      ...game,
      dungeon: {
        ...d,
        battleCatalog: {
          ...d.battleCatalog!,
          skills: d.battleCatalog!.skills.filter((c) => c.id !== "hero_skill:p002"),
        },
      },
    },
    {
      ...game,
      dungeon: {
        ...d,
        heroes: d.heroes.map((h, i) =>
          i === 0 ? { ...h, skillIds: ["hero_skill:p001", "hero_skill:p001"] } : h,
        ),
      },
    },
    {
      ...game,
      dungeon: {
        ...d,
        heroes: d.heroes.map((h, i) =>
          i === 0
            ? {
                ...h,
                nextQuestSkillUpgrades: [
                  { originalSkillId: "hero_skill:p001", temporarySkillId: "hero_skill:p002" },
                  { originalSkillId: "hero_skill:p001", temporarySkillId: "hero_skill:p002" },
                ],
              }
            : h,
        ),
      },
    },
    {
      ...game,
      dungeon: {
        ...d,
        heroes: d.heroes.map((h, i) =>
          i === 0
            ? {
                ...h,
                nextQuestSkillUpgrades: [
                  { originalSkillId: "hero_skill:p001", temporarySkillId: "hero_skill:p023" },
                ],
              }
            : h,
        ),
      },
    },
  ])
    expect(applyCommand(bad, visit).state).toBe(bad);
  for (const c of [
    { ...visit, actorId: "hero-1" },
    { ...visit, skillId: "hero_skill:p022" },
    { ...visit, skillId: "hero_skill:p007" },
    { ...visit, skillId: "hero_skill:p002" },
  ])
    expect(applyCommand(game, c).state).toBe(game);
  const pending = ok(game, { type: "visitNomadWagon", actorId: "hero-0" });
  expect(blacksmithOptions(pending)).toEqual([]);
  expect(applyCommand(pending, visit).state).toBe(pending);
});
it("多日不同技能保留原计划；III坏奖励骰不付款，升级建筑不提前改变已付服务等级", () => {
  const game = fixture(),
    d = game.dungeon!;
  const upgraded = ok(game, visit);
  const nextDay = {
    ...upgraded,
    dungeon: {
      ...upgraded.dungeon!,
      hamlet: { ...upgraded.dungeon!.hamlet!, actedHeroes: [], visitedBuildings: [] },
    },
  };
  const building = ok(nextDay, { type: "upgradeHamletBuilding", building: "blacksmith" });
  expect(building.dungeon!.heroes[0]!.nextQuestSkillUpgrades![0]!.temporarySkillId).toBe(
    "hero_skill:p002",
  );
  const second = ok(building, {
    type: "visitBlacksmith",
    actorId: "hero-0",
    skillId: "hero_skill:p004",
  });
  expect(second.dungeon!.heroes[0]!.nextQuestSkillUpgrades).toEqual([
    { originalSkillId: "hero_skill:p001", temporarySkillId: "hero_skill:p002" },
    { originalSkillId: "hero_skill:p004", temporarySkillId: "hero_skill:p006" },
  ]);
  for (const value of [-1, 1.5, null, Number.MAX_SAFE_INTEGER]) {
    const bad = {
      ...game,
      dungeon: {
        ...d,
        buildingLevels: { ...d.buildingLevels, blacksmith: 3 },
        heroes: d.heroes.map((h, i) => (i === 0 ? { ...h, nextQuestProvisionDice: value } : h)),
      },
    } as GameState;
    expect(applyCommand(bad, visit).state).toBe(bad);
  }
});
it("R-079重复同一技能仍支付1金，按当前铁匠等级覆盖，原卡只保留一份；III每次给一颗骰", () => {
  for (const level of [1, 3] as const) {
    const first = ok(fixture(level), visit);
    const reset = (g: GameState): GameState => ({
      ...g,
      dungeon: {
        ...g.dungeon!,
        hamlet: { ...g.dungeon!.hamlet!, actedHeroes: [], visitedBuildings: [] },
      },
    });
    const same = ok(reset(first), visit);
    expect(same.dungeon!.gold).toBe(98);
    expect(same.dungeon!.heroes[0]!.nextQuestSkillUpgrades).toHaveLength(1);
    expect(same.dungeon!.heroes[0]!.nextQuestSkillUpgrades![0]!.originalSkillId).toBe(
      "hero_skill:p001",
    );
    expect(same.dungeon!.heroes[0]!.skillIds).toContain("hero_skill:p001");
    expect(same.dungeon!.heroes[0]!.nextQuestProvisionDice ?? 0).toBe(level === 3 ? 2 : 0);
    if (level === 1) {
      const higher = ok(reset(same), { type: "upgradeHamletBuilding", building: "blacksmith" });
      const replaced = ok(higher, visit);
      expect(replaced.dungeon!.gold).toBe(87);
      expect(replaced.dungeon!.heroes[0]!.nextQuestSkillUpgrades).toEqual([
        { originalSkillId: "hero_skill:p001", temporarySkillId: "hero_skill:p003" },
      ]);
    }
  }
});
it("真实回村第一天购买Smite II记录，保存/刷新/跨日回放不重复支付或改原卡", () => {
  let game = baseline.game;
  const commands = [...baseline.commands],
    gold = game.dungeon!.gold;
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
  step({ type: "useHamletSkill", actorId: "hero-1", skill: "sharpenSpear" });
  step({ type: "visitHamletBuilding", actorId: "hero-2", serviceId: "tavern3", quirkIds: [] });
  step({ type: "useHamletSkill", actorId: "hero-3", skill: "chant" });
  step({ type: "rollHamletCaretaker" });
  expect(game.dungeon!.gold).toBe(gold - 2);
  expect(game.dungeon!.heroes[0]!.nextQuestSkillUpgrades).toEqual([
    { originalSkillId: "hero_skill:p001", temporarySkillId: "hero_skill:p002" },
  ]);
  expect(game.dungeon!.heroes[0]!.skillIds).toContain("hero_skill:p001");
  save();
}, 30000);
