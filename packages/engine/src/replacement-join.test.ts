import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { prepareTestReplacement, replacementStep as ok } from "./test-helpers/replacement";
import { conditionPoolProblem } from "./conditions";
import { savedCommandSchema } from "../../data/src/quest-save";

const join = { type: "joinPreparedReplacements" } as const;
/** 明示已结算G房间/压力夹具；公开侦察产生死亡，再以公开命令准备替补。 */
function prepared(): GameState {
  const base = createCoreDungeonQuest(4, "quest:p001", "standard", coreParty, coreQuestSources);
  let game: GameState = {
    ...base,
    dungeon: {
      ...base.dungeon!,
      phase: "ready",
      position: "G",
      heroes: base.dungeon!.heroes.map((h, i) =>
        i
          ? h
          : {
              ...h,
              stress: 9,
              resolveTested: true,
              resolveCardId: base.dungeon!.resolveCards[0]!.id,
            },
      ),
    },
  };
  game = ok(game, { type: "scoutDungeon" });
  game = ok(game, {
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: "agree",
  });
  return prepareTestReplacement(game);
}
const patch = (game: GameState, fields: Partial<DungeonState>): GameState => ({
  ...game,
  dungeon: { ...game.dungeon!, ...fields },
});
it("正式入队移除死者全部实体/技能/临时记录，存活者只改姿态，新英雄在最后且不再扣资源", () => {
  const game = prepared(),
    before = structuredClone(game),
    d = game.dungeon!,
    next = ok(game, join).dungeon!;
  expect(next.heroes.map((h) => h.id)).toEqual([
    ...d.heroes.slice(1).map((h) => h.id),
    d.preparedReplacements![0]!.hero.id,
  ]);
  expect(next.heroes.map((h) => h.stance)).toEqual([
    "aggressive",
    "defensive",
    "ranged",
    "support",
  ]);
  for (let i = 0; i < 3; i++)
    expect(next.heroes[i]).toEqual({ ...d.heroes[i + 1]!, stance: next.heroes[i]!.stance });
  expect(next.heroes[3]).toMatchObject({
    wounds: 0,
    stress: 0,
    xp: 0,
    dead: false,
    stance: "support",
  });
  expect(next.heroes[3]!.combat).toBeUndefined();
  expect(next.heroes.some((h) => h.id === "hero-0")).toBe(false);
  expect(next.preparedReplacements).toBeUndefined();
  expect(next.replacementResume).toBeUndefined();
  expect(next.deadHeroNames).toEqual(d.deadHeroNames);
  for (const key of [
    "cursor",
    "gold",
    "waitingHeroTokens",
    "stagecoachXp",
    "conditions",
    "trinkets",
  ] as const)
    expect(next[key]).toEqual(d[key]);
  expect(next.phase).toBe("ready");
  expect(next.scoutBonus).toBe(true); // 续接已支付侦察，不再加任何人的压力。
  expect(conditionPoolProblem(next.conditions!, next.heroes)).toBeNull();
  expect(ok(JSON.parse(JSON.stringify(game)), join)).toEqual(ok(game, join));
  expect(applyCommand({ ...game, dungeon: next }, join).state.dungeon).toBe(next);
  expect(game).toEqual(before);
  expect(savedCommandSchema.parse(join)).toEqual(join);
});
it("缺少准备、重复/错配死者、坏技能/身份/属性、未回收持牌或缺续接记录均原子拒绝", () => {
  const game = prepared(),
    d = game.dungeon!,
    p = d.preparedReplacements![0]!;
  const { replacementResume: _resume, ...withoutResume } = d;
  void _resume;
  for (const bad of [
    patch(game, { preparedReplacements: [] }),
    patch(game, { preparedReplacements: [p, p] }),
    patch(game, { preparedReplacements: [{ ...p, deadHeroId: "stale" }] }),
    patch(game, { preparedReplacements: [{ ...p, hero: { ...p.hero, id: "hero-1" } }] }),
    patch(game, { preparedReplacements: [{ ...p, hero: { ...p.hero, wounds: 1 } }] }),
    patch(game, {
      preparedReplacements: [
        {
          ...p,
          hero: {
            ...p.hero,
            skillIds: [p.hero.skillIds![0]!, p.hero.skillIds![0]!, p.hero.skillIds![0]!],
          },
        },
      ],
    }),
    patch(game, {
      heroes: d.heroes.map((h, i) => (i ? h : { ...h, resolveCardId: d.resolveCards[0]!.id })),
    }),
    { ...game, dungeon: withoutResume },
    patch(game, { pending: { id: "original", prompt: "未完成待选", options: [] } }),
    patch(game, { replacementResume: "backtracking", backtracking: null }),
  ]) {
    const before = structuredClone(bad),
      result = applyCommand(bad, join);
    expect(result.events[0]!.type).toBe("commandRefused");
    expect(result.state).toBe(bad);
    expect(bad).toEqual(before);
  }
});
it("R-092探索余项取消死者骰，不替新英雄掷骰；原英雄继续，全部结算后只移动一次", () => {
  const base = prepared(),
    d = base.dungeon!;
  const game = patch(base, {
    replacementResume: "exploration",
    exploration: {
      from: "G",
      to: "D",
      dicePerHero: 2,
      rolls: [
        { id: "dead-roll", heroId: "hero-0", face: "curio", resolved: false },
        { id: "live-roll", heroId: "hero-1", face: "blank", resolved: false },
      ],
    },
    pendingCurioDraw: { rollId: "dead-roll", optionId: "draw" },
  });
  let next = ok(game, join);
  expect(next.dungeon!.pendingCurioDraw).toBeUndefined();
  expect(next.dungeon!.exploration!.rolls![0]!.resolved).toBe(true);
  expect(next.dungeon!.pending!.options.map((o) => o.id)).toEqual(["live-roll"]);
  expect(next.dungeon!.cursor).toBe(d.cursor);
  next = ok(next, {
    type: "resolveChoice",
    choiceId: next.dungeon!.pending!.id,
    optionId: "live-roll",
  });
  expect(next.dungeon!.position).toBe("D");
  expect(next.dungeon!.cursor).toBe(d.cursor);
  expect(next.dungeon!.exploration!.rolls!.every((r) => r.resolved)).toBe(true);
});
it("R-092 Trap只让原存活英雄继续分配，替补不重付陷阱，原分配标记保留", () => {
  const base = prepared(),
    d = base.dungeon!;
  let next = ok(
    patch(base, {
      replacementResume: "trap",
      roomResolution: {
        roomId: "G",
        dungeonLevel: 1,
        resolvedHeroIds: ["hero-0"],
        completed: false,
      },
    }),
    join,
  );
  expect(next.dungeon!.pending!.options.map((o) => o.id)).toEqual(["hero-1", "hero-2", "hero-3"]);
  for (const actor of ["hero-1", "hero-2", "hero-3"]) {
    next = ok(next, {
      type: "resolveChoice",
      choiceId: next.dungeon!.pending!.id,
      optionId: actor,
    });
    next = ok(next, { type: "resolveChoice", choiceId: next.dungeon!.pending!.id, optionId: "0" });
  }
  expect(next.dungeon!.phase).toBe("ready");
  expect(next.dungeon!.heroes[3]!.stress).toBe(0);
  expect(next.dungeon!.heroes.slice(0, 3).map((h) => h.stress)).toEqual(
    d.heroes.slice(1).map((h) => h.stress + 1),
  );
  expect(next.dungeon!.cursor).toBe(d.cursor);
});
it("原路返回只完成原已支付移动；普通就绪与Dark完成路径不额外揭示/减光/给侦察奖励", () => {
  const game = prepared(),
    d = game.dungeon!;
  const back = ok(
    patch(game, {
      replacementResume: "backtracking",
      backtracking: { from: "G", to: "S" },
      exploration: null,
    }),
    join,
  ).dungeon!;
  expect(back.position).toBe("S");
  expect(back.backtracking).toBeNull();
  expect(back.heroes.map((h) => h.stress)).toEqual([...d.heroes.slice(1).map((h) => h.stress), 0]);
  const ready = ok(
    patch(game, {
      replacementResume: "ready",
      scoutBonus: false,
      roomResolution: {
        kind: "dark",
        roomId: "G",
        dungeonLevel: 1,
        resolvedHeroIds: [],
        completed: true,
      },
    }),
    join,
  ).dungeon!;
  expect(ready.phase).toBe("ready");
  expect(ready.scoutBonus).toBe(false);
  expect(ready.explorationSetup).toEqual(d.explorationSetup);
  expect(ready.cursor).toBe(d.cursor);
});
it.each(["hamletConvert", "hamletProvisions"] as const)(
  "回村%s只续接原队余项，不先发XP/金币、不让新英雄转换死者意志",
  (replacementResume) => {
    const game = prepared(),
      d = game.dungeon!;
    const next = ok(
      patch(game, {
        replacementResume,
        hamletReturn: {
          phase: "awaitingReplacement",
          order: d.heroes.map((h) => h.id),
          resolveRoles: { "hero-0": "affliction" },
          convertedHeroIds: [],
        },
      }),
      join,
    ).dungeon!;
    expect(next.hamletReturn!.phase).toBe("provisions");
    expect(next.hamletReturn!.order).not.toContain("hero-0");
    expect(next.heroes[3]!.quirkIds).toEqual([]);
    expect(next.gold).toBe(d.gold);
    expect(next.stagecoachXp).toBe(d.stagecoachXp);
    expect(next.explorationSetup!.provisions).toEqual(d.explorationSetup!.provisions);
  },
);
it("回村补给死亡停点的原存活者压力10先检定再转换，不带未结算压力进入村庄", () => {
  const game = prepared(),
    d = game.dungeon!;
  const next = ok(
    patch(game, {
      replacementResume: "hamletProvisions",
      heroes: d.heroes.map((h, i) =>
        i === 1 ? { ...h, stress: 10, resolveTested: false, resolveCardId: undefined } : h,
      ),
      hamletReturn: {
        phase: "awaitingReplacement",
        order: d.heroes.map((h) => h.id),
        resolveRoles: {},
        convertedHeroIds: [],
      },
    }),
    join,
  ).dungeon!;
  expect(next.heroes.find((h) => h.id === "hero-1")!.stress).toBe(0);
  expect(next.heroes.find((h) => h.id === "hero-1")!.resolveCardId).toBeUndefined();
  expect(next.hamletReturn!.phase).toBe("provisions");
  expect(next.gold).toBe(d.gold);
  expect(next.explorationSetup!.provisions).toEqual(d.explorationSetup!.provisions);
  expect(next.heroes[3]!.stress).toBe(0);
});
