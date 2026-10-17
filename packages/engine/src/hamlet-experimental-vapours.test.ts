import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { hamletActionOptions, currentHamletHero } from "./hamlet-actions";
import { naturalAbbeyQuest } from "./test-helpers/abbey-quest";
import { coreQuestSources } from "./test-helpers/core-quest";
import { createConditionPool } from "./conditions";
import { prepareTestReplacement } from "./test-helpers/replacement";
import { savedCommandSchema } from "../../data/src/quest-save";

let baseline: ReturnType<typeof naturalAbbeyQuest>;
beforeAll(() => {
  baseline = naturalAbbeyQuest();
}, 30000);
type Hero = NonNullable<GameState["dungeon"]>["heroes"][number];
const command: Command = {
  type: "useHamletSkill",
  actorId: "hero-0",
  skill: "experimentalVapours",
  targetId: "hero-1",
};
function ok(g: GameState, c: Command = command) {
  const r = applyCommand(g, c);
  expect(
    r.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toEqual([]);
  return r.state;
}
/** 明示村庄机制夹具：自然回村基线，替换为获批瘟疫医生属性并清空持牌，不冒充正式出征/候选。 */
function fixture(level = 1): GameState {
  const d = baseline.game.dungeon!;
  const stat = coreQuestSources.catalog.heroStats.find(
    (s) =>
      s.id === ["hero_stat:p013:front", "hero_stat:p013:back", "hero_stat:p014:front"][level - 1],
  )!;
  return {
    ...baseline.game,
    dungeon: {
      ...d,
      conditions: createConditionPool(d.conditions!.diseases, d.conditions!.quirks),
      resolveDecks: {},
      heroes: d.heroes.map((h, i) => {
        const { resolveCardId: _resolve, ...clean } = h;
        void _resolve;
        return {
          ...clean,
          diseaseId: null,
          quirkIds: [],
          stress: 1,
          wounds: 6,
          resolveTested: false,
          ...(i === 0 ? { heroStatId: stat.id, life: stat.life, level, heroLevel: level } : {}),
          ...(h.combat
            ? {
                combat: {
                  ...h.combat,
                  wounds: 6,
                  stress: 1,
                  diseaseId: null,
                  quirkIds: [],
                  resolveCardId: null,
                  resolveTested: false,
                  ...(i === 0
                    ? {
                        hero: "PLAGUE DOCTOR",
                        heroStatId: stat.id,
                        life: stat.life,
                        dodge: stat.dodge,
                        heroLevel: level,
                      }
                    : {}),
                },
              }
            : {}),
        };
      }),
    },
  };
}
function patch(g: GameState, id: string, values: Partial<Hero>): GameState {
  return {
    ...g,
    dungeon: {
      ...g.dungeon!,
      heroes: g.dungeon!.heroes.map((h) => (h.id === id ? { ...h, ...values } : h)),
    },
  };
}
function diseased(g: GameState, name: string, id = "hero-1"): GameState {
  const pool = g.dungeon!.conditions!,
    disease = pool.diseases.find((c) => c.name === name)!;
  const next = patch(g, id, { diseaseId: disease.id });
  return {
    ...next,
    dungeon: {
      ...next.dungeon!,
      conditions: {
        ...pool,
        diseaseDeck: pool.diseases.map((c) => c.id).filter((c) => c !== disease.id),
      },
    },
  };
}
const hero = (g: GameState, id = "hero-1") => g.dungeon!.heroes.find((h) => h.id === id)!;

it.each([
  [1, 4],
  [2, 7],
  [3, 9],
])("等级%s治疗%s，除病后压力+3，一次行动/不收费占楼；JSON与命令回放一致", (level, heal) => {
  const game = diseased(fixture(level), "The Worries"),
    before = structuredClone(game);
  const diseaseId = hero(game).diseaseId!;
  const next = ok(game);
  expect(hero(next)).toMatchObject({
    wounds: Math.max(0, 6 - heal),
    stress: 4,
    diseaseId: null,
    combat: { wounds: Math.max(0, 6 - heal), stress: 4, diseaseId: null },
  });
  expect(next.dungeon!.conditions!.diseaseDiscard).toEqual([diseaseId]);
  expect(next.dungeon!.conditions!.diseaseDeck).not.toContain(diseaseId);
  expect(next.dungeon!.cursor).toBe(game.dungeon!.cursor);
  expect(next.dungeon!.gold).toBe(game.dungeon!.gold);
  expect(next.dungeon!.hamlet).toMatchObject({
    actedHeroes: ["hero-0"],
  });
  expect(next.dungeon!.hamlet!.remainingDays).toBe(game.dungeon!.hamlet!.remainingDays);
  expect(next.dungeon!.hamlet!.visitedBuildings).toEqual(game.dungeon!.hamlet!.visitedBuildings);
  expect(hero(next, "hero-0")).toEqual(hero(game, "hero-0"));
  expect(ok(JSON.parse(JSON.stringify(game)))).toEqual(next);
  expect(ok(game)).toEqual(next);
  expect(game).toEqual(before);
  expect(applyCommand(next, command).state).toBe(next);
  expect(savedCommandSchema.parse(command)).toEqual(command);
});

it("自身可选且无疾病/无伤口仍可用，治疗封底、压力与combat同步", () => {
  const game = patch(fixture(), "hero-0", { wounds: 0 });
  const self: Command = {
    type: "useHamletSkill",
    actorId: "hero-0",
    skill: "experimentalVapours",
    targetId: "hero-0",
  };
  const next = ok(game, self);
  expect(hero(next, "hero-0")).toMatchObject({
    wounds: 0,
    stress: 4,
    diseaseId: null,
    combat: { wounds: 0, stress: 4 },
  });
  expect(hero(next)).toEqual(hero(game));
  expect(next.dungeon!.conditions).toEqual(game.dungeon!.conditions);
  expect(
    hamletActionOptions(game).filter(
      (o) => o.command.type === "useHamletSkill" && o.command.skill === "experimentalVapours",
    ),
  ).toHaveLength(4);
  expect(savedCommandSchema.safeParse({ ...self, targetId: undefined }).success).toBe(false);
});

it("Fast Healer/Infirm按真实怪癖修正治疗，疾病移除先于压力被动；村庄不套旧低光照", () => {
  for (const name of ["Fast Healer", "Infirm"]) {
    let game = diseased(fixture(), "The Worries");
    const quirk = game.dungeon!.conditions!.quirks.find((q) => q.name === name)!;
    game = patch(game, "hero-1", { quirkIds: [quirk.id] });
    game = {
      ...game,
      dungeon: {
        ...game.dungeon!,
        explorationSetup: { ...game.dungeon!.explorationSetup!, light: 0 },
      },
    };
    expect(hero(ok(game))).toMatchObject({
      wounds: name === "Fast Healer" ? 1 : 3,
      stress: 4,
      diseaseId: null,
    });
  }
});

it("先治疗脱离死门，再结算Soft追加伤口，不因旧伤口掷死门骰", () => {
  const game = fixture(),
    soft = game.dungeon!.conditions!.quirks.find((q) => q.name === "Soft")!;
  const ready = patch(game, "hero-1", { wounds: hero(game).life!, quirkIds: [soft.id] });
  const next = ok(ready);
  expect(hero(next)).toMatchObject({ wounds: hero(game).life! - 3, stress: 4, dead: false });
  expect(next.dungeon!.cursor).toBe(game.dungeon!.cursor);
});

it("当天最后一人使用只结束一天，随后不重复扣天或再次使用", () => {
  const game = fixture(),
    d = game.dungeon!;
  const ready = {
    ...game,
    dungeon: { ...d, hamlet: { ...d.hamlet!, actedHeroes: ["hero-1", "hero-2", "hero-3"] } },
  };
  const next = ok(ready);
  expect(next.dungeon!.hamlet).toMatchObject({
    phase: "awaitingCaretaker",
    remainingDays: (d.hamlet!.remainingDays ?? d.hamlet!.preparationDays!) - 1,
    actedHeroes: [],
  });
  expect(applyCommand(next, command).state).toBe(next);
});

it("压力10沿R-090立即检定，持牌和combat同步；原行动只完成一次", () => {
  const game = patch(fixture(), "hero-1", { stress: 8 });
  const next = ok(game);
  expect(hero(next)).toMatchObject({ stress: 0, resolveTested: true });
  expect(hero(next).resolveCardId).toBeTruthy();
  expect(hero(next).combat).toMatchObject({
    stress: 0,
    resolveTested: true,
    resolveCardId: hero(next).resolveCardId,
  });
  expect(next.dungeon!.phase).toBe("inHamlet");
  expect(next.dungeon!.hamlet!.actedHeroes).toEqual(["hero-0"]);
  expect(next.dungeon!.hamletVapoursActorId).toBeUndefined();
});

it("缺意志牌池保留已付效果并锁住其他命令，JSON后补齐只续接不重复治疗/除病/压力", () => {
  const game = patch(diseased(fixture(), "The Worries"), "hero-1", { stress: 8 });
  const bad = { ...game, dungeon: { ...game.dungeon!, resolveCards: [] } };
  const blocked = ok(bad);
  expect(hero(blocked)).toMatchObject({ wounds: 2, stress: 10, diseaseId: null });
  expect(blocked.dungeon).toMatchObject({
    phase: "blockedPressure",
    hamletVapoursActorId: "hero-0",
  });
  expect(applyCommand(blocked, command).state).toBe(blocked);
  expect(applyCommand(blocked, { type: "rollHamletCaretaker" }).state).toBe(blocked);
  const restored = JSON.parse(JSON.stringify(blocked)) as GameState;
  const repaired = {
    ...restored,
    dungeon: { ...restored.dungeon!, resolveCards: game.dungeon!.resolveCards },
  };
  const next = ok(repaired, { type: "resolveDungeonPressure" });
  expect(hero(next).wounds).toBe(2);
  expect(next.dungeon!.conditions!.diseaseDiscard).toEqual(
    blocked.dungeon!.conditions!.diseaseDiscard,
  );
  expect(next.dungeon!.hamlet!.actedHeroes).toEqual(["hero-0"]);
});

it.each(["hero-0", "hero-1"])(
  "%s已有意志卡承压死亡，补人后只结束原行动，不重付/多发行动",
  (targetId) => {
    const c: Command = {
      type: "useHamletSkill",
      actorId: "hero-0",
      skill: "experimentalVapours",
      targetId,
    };
    const game = patch(fixture(), targetId, {
      stress: 8,
      resolveTested: true,
      resolveCardId: fixture().dungeon!.resolveCards[0]!.id,
    });
    const dead = ok(game, c);
    expect(hero(dead, targetId).dead).toBe(true);
    expect(dead.dungeon!.hamletReturn!.phase).toBe("awaitingReplacement");
    expect(dead.dungeon!.replacementResume).toBe("hamletVapours");
    expect(applyCommand(dead, c).state).toBe(dead);
    const prepared = prepareTestReplacement(dead),
      next = ok(prepared, { type: "joinPreparedReplacements" });
    expect(next.dungeon!.heroes.some((h) => h.dead)).toBe(false);
    expect(next.dungeon!.phase).toBe("inHamlet");
    expect(next.dungeon!.hamletReturn!.phase).toBe("complete");
    expect(next.dungeon!.hamlet!.actedHeroes).toContain("hero-0");
    expect(next.dungeon!.hamletVapoursActorId).toBeUndefined();
    expect(next.dungeon!.waitingHeroTokens).toBe(prepared.dungeon!.waitingHeroTokens);
    expect(currentHamletHero(next)?.id).toBe(targetId === "hero-0" ? "hero-1" : "hero-2");
    expect(hamletActionOptions(next).length).toBeGreaterThan(0);
  },
);

it("非法英雄/等级/目标/属性/牌池/越序均原子拒绝，其他英雄不出现技能按钮", () => {
  const game = fixture();
  for (const bad of [
    baseline.game,
    patch(game, "hero-0", { level: 2 }),
    patch(game, "hero-0", { attributesVerified: false }),
    patch(game, "hero-1", { dead: true }),
    patch(game, "hero-1", { life: 999 }),
    { ...game, dungeon: { ...game.dungeon!, conditions: undefined } } as unknown as GameState,
  ])
    expect(applyCommand(bad, command).state).toBe(bad);
  expect(
    applyCommand(game, {
      type: "useHamletSkill",
      actorId: "hero-0",
      skill: "experimentalVapours",
      targetId: "missing",
    }).state,
  ).toBe(game);
  expect(
    applyCommand(game, {
      type: "useHamletSkill",
      actorId: "hero-1",
      skill: "experimentalVapours",
      targetId: "hero-0",
    }).state,
  ).toBe(game);
  expect(
    hamletActionOptions(baseline.game).some(
      (o) => o.command.type === "useHamletSkill" && o.command.skill === "experimentalVapours",
    ),
  ).toBe(false);
});
