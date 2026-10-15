import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { guildQuest } from "./test-helpers/guild-quest";
import {
  heroSkillSlotCount,
  heroTrinketSlotCount,
  ownedHeroSkills,
  unequippedHeroSkills,
} from "./hero-loadout";

let baseline: ReturnType<typeof guildQuest>;
beforeAll(() => {
  baseline = guildQuest();
}, 30000);

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
  // 明示资源夹具；不称自然两任务攒满4XP。
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

it("R-051槽数与拥有七技能推导：永久移除阶梯指向当前拥有卡，含未装备", () => {
  expect(heroSkillSlotCount(1)).toBe(3);
  expect(heroSkillSlotCount(2)).toBe(4);
  expect(heroSkillSlotCount(3)).toBe(5);
  expect(heroTrinketSlotCount(1)).toBe(1);
  expect(heroTrinketSlotCount(3)).toBe(3);
  const hero = fixture().dungeon!.heroes[0]!,
    catalog = fixture().dungeon!.battleCatalog!;
  const owned = ownedHeroSkills(hero, catalog)!;
  expect(owned).toHaveLength(7);
  expect(owned.filter((s) => hero.skillIds!.includes(s.id))).toHaveLength(3);
  expect(unequippedHeroSkills(hero, catalog)).toHaveLength(4);
  const unequippedOwned = {
    heroStatId: hero.heroStatId!,
    skillIds: hero.skillIds!.filter((id) => id !== "hero_skill:p001"),
    permanentlyRemovedSkillIds: ["hero_skill:p001"] as const,
  };
  expect(ownedHeroSkills(unequippedOwned, catalog)!.find((s) => s.name === "Smite")!.id).toBe(
    "hero_skill:p002",
  );
  expect(
    unequippedHeroSkills(unequippedOwned, catalog)!.some((s) => s.id === "hero_skill:p002"),
  ).toBe(true);
});

it("村庄随时换装：升级未装备技能后可换入；槽数不符/待选中拒绝；同命令回放一致", () => {
  let game = fixture();
  const before = structuredClone(game),
    hero = game.dungeon!.heroes[0]!;
  const unequipped = unequippedHeroSkills(hero, game.dungeon!.battleCatalog!)![0]!;
  game = ok(game, { type: "visitGuild", actorId: "hero-0" });
  const upgrade = {
    type: "resolveChoice" as const,
    choiceId: game.dungeon!.pending!.id,
    optionId: `upgrade:${unequipped.id}`,
  };
  game = ok(game, upgrade);
  expect(game.dungeon!.heroes[0]!.skillIds).toEqual(hero.skillIds);
  expect(game.dungeon!.heroes[0]!.permanentlyRemovedSkillIds).toContain(unequipped.id);
  game = ok(game, {
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: "leave",
  });
  const owned = ownedHeroSkills(game.dungeon!.heroes[0]!, game.dungeon!.battleCatalog!)!;
  const nextLevel = owned.find((s) => s.name === unequipped.name)!;
  expect(nextLevel.level).toBe(unequipped.level + 1);
  const loadout = [nextLevel.id, ...hero.skillIds!.slice(1)];
  const swap: Command = { type: "setEquippedSkills", actorId: "hero-0", skillIds: loadout };
  const preSwap = structuredClone(game);
  const once = applyCommand(game, swap);
  expect(once.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(once.state.dungeon!.heroes[0]!.skillIds).toEqual(loadout);
  expect(applyCommand(game, swap)).toEqual(once);
  expect(game).toEqual(preSwap); // applyCommand不突变输入
  expect(before.dungeon!.gold).toBe(100);
  expect(
    applyCommand(once.state, {
      type: "setEquippedSkills",
      actorId: "hero-0",
      skillIds: [...loadout, owned.find((s) => !loadout.includes(s.id))!.id],
    }).state,
  ).toBe(once.state);
  const pending = ok(fixture(), { type: "visitGuild", actorId: "hero-0" });
  expect(
    applyCommand(pending, {
      type: "setEquippedSkills",
      actorId: "hero-0",
      skillIds: hero.skillIds!,
    }).state,
  ).toBe(pending);
});

it("英雄升II后技能槽4须装满；饰品容量随HL；已有疾病不因升级清除", () => {
  const base = fixture(8),
    d = base.dungeon!;
  const diseased: GameState = {
    ...base,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) => (i === 0 ? { ...h, diseaseId: "disease:p001", xp: 8 } : h)),
    },
  };
  const shop = ok(diseased, { type: "visitGuild", actorId: "hero-0" });
  expect(shop.dungeon!.pending!.options.some((o) => o.id === "upgrade-hero")).toBe(true);
  const upgraded = ok(shop, {
    type: "resolveChoice",
    choiceId: shop.dungeon!.pending!.id,
    optionId: "upgrade-hero",
  });
  const left = ok(upgraded, {
    type: "resolveChoice",
    choiceId: upgraded.dungeon!.pending!.id,
    optionId: "leave",
  });
  const hero = left.dungeon!.heroes[0]!;
  expect(hero).toMatchObject({
    level: 2,
    heroStatId: "hero_stat:p001:back",
    life: 24,
    diseaseId: "disease:p001",
    xp: 4,
  });
  expect(left.dungeon!.gold).toBe(98);
  expect(hero.skillIds).toHaveLength(3);
  expect(
    applyCommand(left, {
      type: "setEquippedSkills",
      actorId: "hero-0",
      skillIds: hero.skillIds!,
    }).state,
  ).toBe(left);
  const owned = ownedHeroSkills(hero, left.dungeon!.battleCatalog!)!;
  const four = [...hero.skillIds!, owned.find((s) => !hero.skillIds!.includes(s.id))!.id];
  const filled = ok(left, { type: "setEquippedSkills", actorId: "hero-0", skillIds: four });
  expect(filled.dungeon!.heroes[0]!.skillIds).toHaveLength(4);
  expect(heroTrinketSlotCount(2)).toBe(2);
  // 正式地牢入口仍只接I级：升到II后不能宣称可自然开战。
  expect(hero.level).toBe(2);
});
