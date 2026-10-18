import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { hamletActionOptions, currentHamletHero } from "./hamlet-actions";
import { naturalAbbeyQuest } from "./test-helpers/abbey-quest";
import { coreQuestSources } from "./test-helpers/core-quest";
import { createLootState } from "./loot";
import { savedCommandSchema } from "../../data/src/quest-save";
import { FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS } from "./formal-heroes";

let baseline: ReturnType<typeof naturalAbbeyQuest>;
beforeAll(() => {
  baseline = naturalAbbeyQuest();
}, 30000);

const pilfer: Command = { type: "useHamletSkill", actorId: "hero-0", skill: "pilfer" };

function ok(g: GameState, c: Command = pilfer) {
  const r = applyCommand(g, c);
  expect(
    r.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toEqual([]);
  return r.state;
}

function refused(g: GameState, c: Command = pilfer) {
  const r = applyCommand(g, c);
  expect(r.events.some((e) => e.type === "commandRefused")).toBe(true);
  return r;
}

/** 明示机制夹具：自然回村基线，替换为获批盗墓者；不冒充正式出征。 */
function fixture(level = 1): GameState {
  const d = baseline.game.dungeon!;
  const stat = coreQuestSources.catalog.heroStats.find(
    (s) =>
      s.id === ["hero_stat:p017:front", "hero_stat:p017:back", "hero_stat:p018:front"][level - 1],
  )!;
  return {
    ...baseline.game,
    dungeon: {
      ...d,
      lootPool: { ...createLootState(), gold: d.gold },
      heroes: d.heroes.map((h, i) => ({
        ...h,
        ...(i === 0
          ? {
              heroStatId: stat.id,
              life: stat.life,
              level,
              heroLevel: level,
            }
          : {}),
        ...(h.combat && i === 0
          ? {
              combat: {
                ...h.combat,
                hero: "GRAVE ROBBER",
                heroStatId: stat.id,
                life: stat.life,
                dodge: stat.dodge,
                heroLevel: level,
              },
            }
          : {}),
      })),
    },
  };
}

/** 压缩准备日后出征首选项；不注入金币/XP/揭示。 */
function embark(game: GameState): GameState {
  const d = game.dungeon!;
  game = {
    ...game,
    dungeon: {
      ...d,
      hamlet: {
        ...d.hamlet!,
        phase: "preparationComplete",
        remainingDays: 0,
        active: null,
        heroOrder: [],
        actedHeroes: [],
      },
    },
  };
  game = ok(game, { type: "offerNextQuest" });
  return ok(game, {
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: game.dungeon!.pending!.options[0]!.id,
  });
}

it("R-096/R-098：I/II/III 抽取一枚入 claimed，消耗行动；不翻面结算", () => {
  for (const level of [1, 2, 3] as const) {
    const g = fixture(level);
    const before = g.dungeon!.lootPool!;
    const acted = g.dungeon!.hamlet!.actedHeroes?.length ?? 0;
    const result = applyCommand(g, pilfer);
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    const next = result.state;
    const pool = next.dungeon!.lootPool!;
    expect(pool.available).toHaveLength(before.available.length - 1);
    expect(pool.claimedIds).toHaveLength(1);
    const claimedId = pool.claimedIds[0]!;
    expect(before.available.some((t) => t.id === claimedId)).toBe(true);
    expect(pool.available.some((t) => t.id === claimedId)).toBe(false);
    expect(pool.placed).toEqual([]);
    expect(pool.gold).toBe(before.gold);
    expect(pool.provisionCursor).toBe(before.provisionCursor);
    expect(next.dungeon!.gold).toBe(g.dungeon!.gold);
    expect(next.dungeon!.cursor).toBe(g.dungeon!.cursor + 1);
    expect(next.dungeon!.hamlet!.actedHeroes).toHaveLength(acted + 1);
    expect(
      result.events.some(
        (e) =>
          e.type === "dungeonUpdated" &&
          e.message.includes("未翻面结算") &&
          e.message.includes("R-098"),
      ),
    ).toBe(true);
  }
});

it("同种子同命令确定性；输入不变；JSON schema 接受 pilfer", () => {
  const g = fixture();
  const a = ok(structuredClone(g));
  const b = ok(structuredClone(g));
  expect(a.dungeon!.lootPool).toEqual(b.dungeon!.lootPool);
  expect(a.dungeon!.cursor).toBe(b.dungeon!.cursor);
  expect(g.dungeon!.lootPool!.available).toHaveLength(10);
  expect(
    savedCommandSchema.parse({ type: "useHamletSkill", actorId: "hero-0", skill: "pilfer" }),
  ).toEqual(pilfer);
});

it("空堆与身份拒绝（R-098 / R-048）；UI 选项仅对获核 GR 出现", () => {
  const empty = fixture();
  const tokens = createLootState().available;
  const emptyPool = {
    ...empty,
    dungeon: {
      ...empty.dungeon!,
      lootPool: {
        ...createLootState(),
        gold: empty.dungeon!.gold,
        available: [],
        claimedIds: tokens.map((t) => t.id),
      },
    },
  };
  const emptyRefuse = refused(emptyPool);
  expect(
    emptyRefuse.events.some(
      (e) => e.type === "commandRefused" && e.message.includes("可用堆已空") && e.message.includes("R-098"),
    ),
  ).toBe(true);
  const wrong = fixture();
  const asCrusader = {
    ...wrong,
    dungeon: {
      ...wrong.dungeon!,
      heroes: wrong.dungeon!.heroes.map((h, i) =>
        i
          ? h
          : {
              ...h,
              heroStatId: "hero_stat:p001:front",
              level: 1,
              heroLevel: 1,
              life: 17,
            },
      ),
    },
  };
  expect(refused(asCrusader).events.some((e) => e.type === "commandRefused")).toBe(true);
  const g = fixture();
  expect(currentHamletHero(g)?.id).toBe("hero-0");
  expect(
    hamletActionOptions(g).some(
      (o) => o.command.type === "useHamletSkill" && o.command.skill === "pilfer",
    ),
  ).toBe(true);
  expect(
    hamletActionOptions(baseline.game).some(
      (o) => o.command.type === "useHamletSkill" && o.command.skill === "pilfer",
    ),
  ).toBe(false);
});

it("R-098：出征保留村庄 Pilfer claimedIds / 有效 lootPool", () => {
  const pilfered = ok(fixture());
  const before = pilfered.dungeon!.lootPool!;
  expect(before.claimedIds).toHaveLength(1);
  const departed = embark(pilfered);
  const after = departed.dungeon!.lootPool!;
  expect(after.claimedIds).toEqual(before.claimedIds);
  expect(after.available.map((t) => t.id).sort()).toEqual(
    before.available.map((t) => t.id).sort(),
  );
  expect(after.placed).toEqual([]);
  expect(after.gold).toBe(departed.dungeon!.gold);
});

it("GR 退出未接线名单；Occ 仍保留（R-096）", () => {
  expect(FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS).toEqual([]);
  expect(
    coreQuestSources.catalog.heroStats.some(
      (s) => s.id === "hero_stat:p017:front" && s.name === "GRAVE ROBBER",
    ),
  ).toBe(true);
});
