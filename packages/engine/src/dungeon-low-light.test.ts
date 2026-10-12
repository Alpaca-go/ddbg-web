import { expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import resolveData from "../../data/normalized/corebox/virtue_affliction.json";
import statData from "../../data/normalized/corebox/hero_stat.json";
import diseaseData from "../../data/normalized/corebox/disease.json";
import quirkData from "../../data/normalized/corebox/quirk.json";
import { diseaseFileSchema } from "../../data/src/disease";
import { normalizedQuirkFileSchema } from "../../data/src/normalize/schema";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import { applyCommand } from "./command";
import type { ApplyResult, Command, GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";
import type { DungeonBattleCatalog, DungeonState } from "./dungeon";
import { continueDungeonExploration } from "./dungeon-exploration";
import { QUIRK_NAMES } from "./passive";
import type { ResolveCard } from "./pressure";
import { createConditionPool, conditionPoolProblem } from "./conditions";

const stats = normalizedHeroStatFileSchema
  .parse(statData)
  .cards.filter((s) => s.attributesVerified && s.level === 1) as DungeonBattleCatalog["heroStats"];
const quirk = (name: (typeof QUIRK_NAMES)[number]) =>
  `quirk:p${String(QUIRK_NAMES.indexOf(name) + 1).padStart(3, "0")}`;
function setup(light = 5, changes: Partial<DungeonState["heroes"][number]> = {}): GameState {
  const heroes = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].map((name, i) => {
    const stat = stats.find((s) => s.name === name)!;
    return {
      id: `hero-${i}`,
      heroStatId: stat.id,
      level: stat.level,
      life: stat.life,
      wounds: 0,
      stress: 0,
      attributesVerified: true,
      stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
      ...(i === 0 ? changes : {}),
    };
  });
  const initial = createDungeonSandbox(
    31,
    layout,
    distribution,
    "standard",
    "G",
    heroes,
    resolveData.cards as ResolveCard[],
    {
      light,
      dungeonLevel: 1,
      provisions: [
        ...Array.from({ length: 4 }, (_, i) => ({ id: `tool-${i}`, face: "tool" as const })),
        { id: "torch", face: "torch" },
        { id: "food", face: "food" },
      ],
    },
  );
  return {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      battleCatalog: { heroStats: stats, skills: [], monsters: [] },
      conditions: createConditionPool(
        diseaseFileSchema.parse(diseaseData).cards,
        normalizedQuirkFileSchema.parse(quirkData).cards,
      ),
      rooms: initial.dungeon!.rooms.map((r) => (r.id === "G" ? { ...r, cleared: true } : r)),
    },
  };
}
function ok(result: ApplyResult): GameState {
  expect(result.events.find((e) => e.type === "commandRefused")).toBeUndefined();
  expect(
    conditionPoolProblem(result.state.dungeon!.conditions!, result.state.dungeon!.heroes),
  ).toBeNull();
  return result.state;
}
const pick = (s: GameState, optionId: string) =>
  applyCommand(s, {
    type: "resolveChoice",
    choiceId: s.dungeon!.pending!.id,
    optionId,
  });
function roll(s: GameState): GameState {
  return ok(
    applyCommand(ok(pick(ok(applyCommand(s, { type: "beginDungeonExploration" })), "D")), {
      type: "rollDungeonExploration",
    }),
  );
}
// 显式危险场景只用于验证边界；下方真实种子回放不替换骰面。
function hazard(
  face: "darkness" | "rubble" | "hunger",
  light = 5,
  changes: Partial<DungeonState["heroes"][number]> = {},
): GameState {
  const s = roll(setup(light, changes));
  const scene = continueDungeonExploration({
    state: {
      ...s,
      dungeon: {
        ...s.dungeon!,
        pending: null,
        exploration: {
          ...s.dungeon!.exploration!,
          rolls: [
            { id: "hero-0:1", heroId: "hero-0", face, resolved: false },
            { id: "hero-0:2", heroId: "hero-0", face: "blank", resolved: false },
          ],
        },
      },
    },
    events: [],
  }).state;
  return ok(pick(scene, "hero-0:1"));
}

it.each([0, 1, 2, 3, 4, 5])(
  "光照 %d：真实八骰降光后继续 Trap / 补给并完成 Empty，同种子回放一致",
  (light) => {
    const initial = setup(light),
      snapshot = structuredClone(initial),
      log: Command[] = [];
    let state = initial;
    const dispatch = (command: Command) => {
      log.push(command);
      state = ok(applyCommand(state, command));
    };
    const choose = (optionId: string) =>
      dispatch({ type: "resolveChoice", choiceId: state.dungeon!.pending!.id, optionId });
    dispatch({ type: "beginDungeonExploration" });
    choose("D");
    dispatch({ type: "rollDungeonExploration" });
    expect(state.dungeon!.exploration!.rolls!.map((r) => r.face)).toEqual([
      "darkness",
      "trap",
      "blank",
      "rubble",
      "trap",
      "blank",
      "hunger",
      "trap",
    ]);
    choose("hero-0:1");
    choose("light");
    expect(state.dungeon!.explorationSetup!.light).toBe(Math.max(0, light - 1));
    expect(state.dungeon).toMatchObject({ position: "G", cursor: 15 });
    choose("hero-0:2");
    choose("attack");
    expect(state.dungeon!.heroes[0]).toMatchObject({ wounds: 4, stress: light <= 3 ? 2 : 1 });
    expect(state.dungeon!.cursor).toBe(16);
    for (const option of [
      "hero-1:1",
      "hero-1:2",
      "use:tool-0",
      "hero-2:1",
      "use:tool-1",
      "hero-2:2",
      "hero-3:1",
      "use:food",
      "hero-3:2",
      "use:tool-2",
    ])
      choose(option);
    expect(state.dungeon).toMatchObject({ phase: "ready", position: "D", cursor: 16 });
    expect(state.dungeon!.heroes.slice(1).every((h) => !h.wounds && !h.stress)).toBe(true);
    expect(log.reduce((s, c) => applyCommand(s, c).state, setup(light))).toEqual(state);
    expect(initial).toEqual(snapshot);
  },
);

it("Darkness 降光触发全队具名被动，按新光照汇总一次压力，不施加基础 2 压力", () => {
  const original = hazard("darkness", 3, {
    quirkIds: [quirk("Night Blindness"), quirk("Nervous")],
  });
  const scene = {
    ...original,
    dungeon: {
      ...original.dungeon!,
      heroes: original.dungeon!.heroes.map((h, i) =>
        i === 1 ? { ...h, stress: 4, quirkIds: [quirk("Night Owl")] } : h,
      ),
    },
  };
  const done = ok(pick(scene, "light"));
  expect(done.dungeon!.explorationSetup!.light).toBe(2);
  expect(done.dungeon!.heroes.map((h) => h.stress)).toEqual([3, 3, 0, 0]);
  expect(done.dungeon).toMatchObject({ position: "G", phase: "awaitingHazards", cursor: 15 });
  expect(done.dungeon!.pending!.options.map((o) => o.id)).toEqual(["hero-0:2"]);
  expect(done.dungeon!.explorationSetup!.provisions).toEqual(
    scene.dungeon!.explorationSetup!.provisions,
  );
  expect(pick(done, "light").state).toBe(done);
});

it("光照 0 选择降光不再触发被动；Torch 抵消 Darkness 不提高光照或触发光照被动", () => {
  for (const [light, option] of [
    [0, "light"],
    [2, "use:torch"],
  ] as const) {
    const s = hazard("darkness", light, {
      quirkIds: [quirk("Night Blindness"), quirk("Nocturnal")],
    });
    const done = ok(pick(s, option));
    expect(done.dungeon!.explorationSetup!.light).toBe(light);
    expect(done.dungeon!.heroes[0]!.stress).toBe(0);
    expect(done.dungeon!.cursor).toBe(15);
    expect(done.dungeon!.explorationSetup!.provisions.some((p) => p.id === "torch")).toBe(
      option === "light",
    );
  }
});

it("低光 Darkness / Rubble 每事件额外压力只加一次；Hunger 没有基础压力不凭空加压", () => {
  for (const face of ["darkness", "rubble", "hunger"] as const) {
    const s = hazard(face, 1, { quirkIds: [quirk("Nervous")] });
    const done = ok(pick(s, "suffer"));
    expect(done.dungeon!.heroes[0]).toMatchObject({
      wounds: face === "hunger" ? 2 : face === "rubble" ? 1 : 0,
      stress: face === "darkness" ? 4 : face === "rubble" ? 3 : 0,
    });
    expect(done.dungeon!.heroes.slice(1)).toEqual(s.dungeon!.heroes.slice(1));
  }
});

it("降光压力到 10 保存已完成骰与光照；补齐意志资料后仅续接剩余骰，与完整路径一致", () => {
  const initial = hazard("darkness", 3, { stress: 8, quirkIds: [quirk("Night Blindness")] });
  const missing = { ...initial, dungeon: { ...initial.dungeon!, resolveCards: [] } };
  const blocked = ok(pick(missing, "light"));
  expect(blocked.dungeon).toMatchObject({
    phase: "blockedPressure",
    position: "G",
    cursor: 15,
    pressureSource: "exploration",
    explorationSetup: { light: 2 },
  });
  expect(blocked.dungeon!.exploration!.rolls!.map((r) => r.resolved)).toEqual([true, false]);
  expect(
    applyCommand(blocked, {
      type: "resolveChoice",
      choiceId: initial.dungeon!.pending!.id,
      optionId: "light",
    }).state,
  ).toBe(blocked);
  const repaired = {
    ...blocked,
    dungeon: { ...blocked.dungeon!, resolveCards: initial.dungeon!.resolveCards },
  };
  const recovered = ok(applyCommand(repaired, { type: "resolveDungeonPressure" }));
  expect(recovered).toEqual(ok(pick(initial, "light")));
  expect(recovered.dungeon).toMatchObject({
    phase: "awaitingHazards",
    scoutBonus: false,
    position: "G",
  });
  expect(recovered.dungeon!.heroes[0]).toMatchObject({ stress: 0, resolveTested: true });
  expect(recovered.dungeon!.rooms).toEqual(initial.dungeon!.rooms);
});

it("降光触发同伴心脏病：骰已完成但不移动，不重掷、不把结算误续接为房间 / 侦察", () => {
  const initial = hazard("darkness", 3);
  const scene = {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      heroes: initial.dungeon!.heroes.map((h, i) =>
        i === 1
          ? {
              ...h,
              stress: 8,
              quirkIds: [quirk("Night Blindness")],
              resolveTested: true,
              resolveCardId: resolveData.cards[0]!.id,
            }
          : h,
      ),
    },
  };
  const result = pick(scene, "light"),
    done = ok(result);
  expect(done.dungeon).toMatchObject({ phase: "awaitingReplacement", position: "G", cursor: 15 });
  expect(done.dungeon!.heroes[1]!.dead).toBe(true);
  expect(done.dungeon!.exploration!.rolls![0]!.resolved).toBe(true);
  expect(result.events.filter((e) => e.type === "heartAttack")).toHaveLength(1);
});

it("全队降光 Q-66 原子拒绝，即使前一英雄已有被动变化也不提交光照 / RNG / 骰面", () => {
  const initial = hazard("darkness", 3, { stress: 4, quirkIds: [quirk("Night Owl")] });
  const scene = {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      heroes: initial.dungeon!.heroes.map((h, i) =>
        i === 1 ? { ...h, stress: 8, quirkIds: [quirk("Night Blindness"), quirk("Soft")] } : h,
      ),
    },
  };
  const snapshot = structuredClone(scene),
    result = pick(scene, "light");
  expect(result.state).toBe(scene);
  expect(result.events[0]!.message).toContain("Q-66");
  expect(scene).toEqual(snapshot);
});

it("低光 Q-67 陷阱暴击仍原子拒绝；Darkness 承压 Q-66 不消费骰或补给", () => {
  const s = roll(setup(2, { quirkIds: [quirk("Off Guard")] }));
  const attack = ok(pick(s, "hero-0:2")),
    refused = pick(attack, "attack");
  expect(refused.state).toBe(attack);
  expect(refused.events[0]!.message).toContain("Q-67");
  const darkness = hazard("darkness", 2, { stress: 7, quirkIds: [quirk("Soft")] });
  expect(pick(darkness, "suffer").state).toBe(darkness);
});

it("低光 Trap 房间分配用实际压力判断 Q-64；纯压力完成后可继续下一英雄", () => {
  const initial = setup(2, { stress: 8 });
  const scene = {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      position: "D",
      phase: "awaitingRoom" as const,
      explorationSetup: { ...initial.dungeon!.explorationSetup!, dungeonLevel: 2 },
      rooms: initial.dungeon!.rooms.map((r) =>
        r.id === "D" ? { ...r, kind: "trap" as const } : r,
      ),
    },
  };
  const selected = ok(pick(ok(applyCommand(scene, { type: "resolveDungeonRoom" })), "hero-0"));
  const refused = pick(selected, "1");
  expect(refused.state).toBe(selected);
  expect(refused.events[0]!.message).toContain("Q-64");
  const pure = ok(pick(selected, "0"));
  expect(pure.dungeon!.heroes[0]).toMatchObject({ wounds: 0, stress: 0, resolveTested: true });
  expect(pure.dungeon!.roomResolution!.resolvedHeroIds).toEqual(["hero-0"]);
  const next = ok(pick(ok(pick(pure, "hero-1")), "1"));
  expect(next.dungeon!.heroes[1]).toMatchObject({ wounds: 1, stress: 2 });
});
