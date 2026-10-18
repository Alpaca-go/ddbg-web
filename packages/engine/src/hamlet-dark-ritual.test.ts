import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { hamletActionOptions } from "./hamlet-actions";
import { naturalAbbeyQuest } from "./test-helpers/abbey-quest";
import { coreQuestSources } from "./test-helpers/core-quest";
import { createConditionPool } from "./conditions";
import { savedCommandSchema } from "../../data/src/quest-save";
import { FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS } from "./formal-heroes";

let baseline: ReturnType<typeof naturalAbbeyQuest>;
beforeAll(() => {
  baseline = naturalAbbeyQuest();
}, 30000);

type Hero = NonNullable<GameState["dungeon"]>["heroes"][number];
const command: Command = {
  type: "useHamletSkill",
  actorId: "hero-0",
  skill: "darkRitual",
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

function refused(g: GameState, c: Command = command) {
  const r = applyCommand(g, c);
  expect(r.events.some((e) => e.type === "commandRefused")).toBe(true);
  return r;
}

/** 明示机制夹具：自然回村基线，替换为获批秘术师；不冒充正式出征。 */
function fixture(level: 1 | 2 | 3 = 1): GameState {
  const d = baseline.game.dungeon!;
  const stat = coreQuestSources.catalog.heroStats.find(
    (s) =>
      s.id === ["hero_stat:p019:front", "hero_stat:p019:back", "hero_stat:p020:front"][level - 1],
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
          ...(i === 0
            ? {
                heroStatId: stat.id,
                life: stat.life,
                level,
                heroLevel: level,
              }
            : {}),
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
                        hero: "OCCULTIST",
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

const hero = (g: GameState, id = "hero-1") => g.dungeon!.heroes.find((h) => h.id === id)!;

it.each([
  [1, 2],
  [2, 4],
  [3, 5],
] as const)("等级%s：自身压力+1；目标治疗%s、压力−2、Buff 3t；JSON回放一致", (level, heal) => {
  const game = fixture(level);
  const before = structuredClone(game);
  const next = ok(game);
  expect(hero(next, "hero-0")).toMatchObject({ stress: 2 });
  expect(hero(next)).toMatchObject({
    wounds: Math.max(0, 6 - heal),
    stress: 0,
    statusStacks: [{ kind: "buff", remaining: 3 }],
  });
  expect(next.dungeon!.hamlet).toMatchObject({ actedHeroes: ["hero-0"] });
  expect(next.dungeon!.gold).toBe(game.dungeon!.gold);
  expect(ok(JSON.parse(JSON.stringify(game)))).toEqual(next);
  expect(game).toEqual(before);
  expect(savedCommandSchema.parse(command)).toEqual(command);
});

it("自身可选（I）；III 对获批 Buff 目标成功；UI I–III 均出现（R-097）", () => {
  const self: Command = {
    type: "useHamletSkill",
    actorId: "hero-0",
    skill: "darkRitual",
    targetId: "hero-0",
  };
  const next = ok(fixture(1), self);
  // Self +1 再目标行 −2 → 净 −1；治疗 2；Buff 3t
  expect(hero(next, "hero-0")).toMatchObject({
    stress: 0,
    wounds: 4,
    statusStacks: [{ kind: "buff", remaining: 3 }],
  });
  const iii = ok(fixture(3));
  expect(hero(iii, "hero-0")).toMatchObject({ stress: 2 });
  expect(hero(iii)).toMatchObject({
    wounds: 1,
    stress: 0,
    statusStacks: [{ kind: "buff", remaining: 3 }],
  });
  for (const level of [1, 2, 3] as const)
    expect(
      hamletActionOptions(fixture(level)).filter(
        (o) => o.command.type === "useHamletSkill" && o.command.skill === "darkRitual",
      ).length,
    ).toBeGreaterThan(0);
  expect(FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS).toEqual([]);
});

it("目标缺 Buff 防御或死亡拒绝；压力10走意志续接", () => {
  const noBuff = patch(fixture(1), "hero-1", {
    heroStatId: "hero_stat:p019:back",
    level: 2,
    heroLevel: 2,
    life: 14,
    attributesVerified: true,
  });
  // Occ II 无 verified_buff_defence → 作目标拒绝
  expect(refused(noBuff).events[0]).toMatchObject({ type: "commandRefused" });
  const dead = patch(fixture(1), "hero-1", { dead: true });
  expect(refused(dead).events[0]).toMatchObject({ type: "commandRefused" });
  const high = patch(fixture(1), "hero-0", { stress: 9 });
  const next = ok(high);
  expect(hero(next, "hero-0").resolveTested).toBe(true);
  expect(next.dungeon!.phase).toBe("inHamlet");
  expect(next.dungeon!.hamlet).toMatchObject({ actedHeroes: ["hero-0"] });
});
