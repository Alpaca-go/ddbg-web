import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { hamletActionOptions } from "./hamlet-actions";
import { coreQuestSources } from "./test-helpers/core-quest";
import { naturalAbbeyQuest } from "./test-helpers/abbey-quest";
import { savedCommandSchema } from "../../data/src/quest-save";
import { diseaseRules } from "../../data/src/disease";
import { prepareTestReplacement } from "./test-helpers/replacement";

let baseline: ReturnType<typeof naturalAbbeyQuest>;
beforeAll(() => {
  baseline = naturalAbbeyQuest();
}, 30000);
const scout: Command = { type: "useHamletSkill", actorId: "hero-0", skill: "scoutAhead" };
function ok(game: GameState, command: Command) {
  const r = applyCommand(game, command);
  expect(
    r.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBe(false);
  return r.state;
}
/** 明示第五英雄机制夹具；正式入口仍保留原四英雄，不冒充死亡替换或自然战役。 */
function fixture(): GameState {
  const d = baseline.game.dungeon!;
  const stat = coreQuestSources.catalog.heroStats.find((s) => s.id === "hero_stat:p005:front")!;
  const skillIds = coreQuestSources.catalog.skills
    .filter((s) => s.hero === "BOUNTY HUNTER" && s.level === 1)
    .slice(0, 3)
    .map((s) => s.id);
  return {
    ...baseline.game,
    dungeon: {
      ...d,
      conditions: {
        ...d.conditions!,
        diseaseDiscard: [
          ...d.conditions!.diseaseDiscard,
          ...(d.heroes[0]!.diseaseId ? [d.heroes[0]!.diseaseId!] : []),
        ],
        quirkDiscard: [...d.conditions!.quirkDiscard, ...(d.heroes[0]!.quirkIds ?? [])],
      },
      heroes: d.heroes.map((h, i) =>
        i
          ? h
          : {
              ...h,
              heroStatId: stat.id,
              life: stat.life,
              level: 1,
              heroLevel: 1,
              stress: 2,
              wounds: 0,
              diseaseId: null,
              quirkIds: [],
              skillIds,
              resolveTested: false,
              ...(h.combat
                ? {
                    combat: {
                      ...h.combat,
                      hero: "BOUNTY HUNTER",
                      heroStatId: stat.id,
                      life: stat.life,
                      dodge: stat.dodge,
                      stress: 2,
                      wounds: 0,
                      skillIds,
                      resolveTested: false,
                      resolveCardId: null,
                    },
                  }
                : {}),
            },
      ),
    },
  };
}
function actorPatch(
  game: GameState,
  patch: Partial<NonNullable<GameState["dungeon"]>["heroes"][number]>,
): GameState {
  return {
    ...game,
    dungeon: {
      ...game.dungeon!,
      ...(patch.diseaseId
        ? {
            conditions: {
              ...game.dungeon!.conditions!,
              diseaseDeck: (
                game.dungeon!.conditions!.diseaseDeck ??
                game
                  .dungeon!.conditions!.diseases.map((c) => c.id)
                  .filter(
                    (id) =>
                      !game.dungeon!.conditions!.diseaseDiscard.includes(id) &&
                      !game.dungeon!.heroes.some((h) => h.diseaseId === id),
                  )
              ).filter((id) => id !== patch.diseaseId),
            },
          }
        : {}),
      heroes: game.dungeon!.heroes.map((h, i) => (i ? h : { ...h, ...patch })),
    },
  };
}
function embark(game: GameState): GameState {
  const d = game.dungeon!;
  // 仅压缩剩余准备日；不注入金币、XP、牌序或揭示奖励。
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
function provisions(game: GameState): GameState {
  game = ok(game, { type: "rollDungeonProvisions" });
  for (let i = 0; game.dungeon!.phase === "awaitingProvisions" && i < 20; i++) {
    const p = game.dungeon!.pending!;
    game = ok(game, {
      type: "resolveChoice",
      choiceId: p.id,
      optionId: p.id.startsWith("dungeon-traveling-merchants:") ? "skip" : "food",
    });
  }
  return game;
}
it("自身压力+1同步combat，消耗一次当天行动；不收费/占楼/提前揭示或消耗RNG", () => {
  const game = fixture(),
    before = structuredClone(game),
    next = ok(game, scout);
  expect(next.dungeon!.heroes[0]).toMatchObject({ stress: 3, combat: { stress: 3 } });
  expect(next.dungeon!.heroes.slice(1)).toEqual(game.dungeon!.heroes.slice(1));
  expect(next.dungeon).toMatchObject({
    nextQuestRoomReveals: 1,
    cursor: game.dungeon!.cursor,
    gold: game.dungeon!.gold,
  });
  expect(next.dungeon!.hamlet!.actedHeroes).toContain("hero-0");
  expect(next.dungeon!.hamlet!.visitedBuildings).toEqual(game.dungeon!.hamlet!.visitedBuildings);
  expect(next.dungeon!.rooms).toEqual(game.dungeon!.rooms);
  expect(applyCommand(next, scout).state).toBe(next);
  expect(
    hamletActionOptions(game).some(
      (o) => o.command.type === "useHamletSkill" && o.command.skill === "scoutAhead",
    ),
  ).toBe(true);
  expect(game).toEqual(before);
  expect(ok(JSON.parse(JSON.stringify(game)), scout)).toEqual(next);
  expect(savedCommandSchema.parse(scout)).toEqual(scout);
});
it("错误英雄/未核实/高等级/坏揭示计划/越序原子拒绝", () => {
  const game = fixture();
  for (const bad of [
    baseline.game,
    actorPatch(game, { attributesVerified: false }),
    actorPatch(game, { level: 2 }),
    { ...game, dungeon: { ...game.dungeon!, nextQuestRoomReveals: -1 } },
    { ...game, dungeon: { ...game.dungeon!, nextQuestRoomReveals: 1.5 } },
  ]) {
    expect(applyCommand(bad, scout).state).toBe(bad);
  }
  expect(applyCommand(game, { ...scout, actorId: "hero-1" }).state).toBe(game);
});
it("村庄不套旧低光照；The Worries仍额外压力+1和2伤口", () => {
  let game = fixture();
  game = {
    ...game,
    dungeon: {
      ...game.dungeon!,
      explorationSetup: { ...game.dungeon!.explorationSetup!, light: 0 },
    },
  };
  expect(ok(game, scout).dungeon!.heroes[0]!.stress).toBe(3);
  const id = `disease:p${String(diseaseRules.findIndex((d) => d.name === "The Worries") + 1).padStart(3, "0")}`;
  const next = ok(actorPatch(game, { diseaseId: id }), scout);
  expect(next.dungeon!.heroes[0]).toMatchObject({
    stress: 4,
    wounds: 2,
    combat: { stress: 4, wounds: 2 },
  });
});
it("R-090：10压力立即检定后完成行动，意志卡/红面延续下一任务；已有卡则死亡待补人", () => {
  const game = actorPatch(fixture(), { stress: 9 });
  const next = ok(game, scout),
    hero = next.dungeon!.heroes[0]!;
  expect(hero.stress).toBe(0);
  expect(hero.resolveTested).toBe(true);
  expect(hero.resolveCardId).toBeTruthy();
  expect(hero.combat).toMatchObject({
    stress: 0,
    resolveTested: true,
    resolveCardId: hero.resolveCardId,
  });
  expect(next.dungeon!.phase).toBe("inHamlet");
  expect(next.dungeon!.nextQuestRoomReveals).toBe(1);
  const departed = embark(next).dungeon!.heroes[0]!;
  expect(departed.resolveCardId).toBe(hero.resolveCardId);
  expect(departed.resolveTested).toBe(true);
  let held = actorPatch(game, {
    resolveTested: true,
    resolveCardId: game.dungeon!.resolveCards[0]!.id,
  });
  held = {
    ...held,
    dungeon: { ...held.dungeon!, resolveDecks: {} },
  };
  const dead = ok(held, scout);
  expect(dead.dungeon!.heroes[0]!.dead).toBe(true);
  expect(dead.dungeon!.hamletReturn!.phase).toBe("awaitingReplacement");
  expect(dead.dungeon!.nextQuestRoomReveals).toBeUndefined();
  expect(applyCommand(dead, scout).state).toBe(dead);
  const prepared = prepareTestReplacement(dead),
    joined = ok(prepared, { type: "joinPreparedReplacements" });
  expect(joined.dungeon!.phase).toBe("inHamlet");
  expect(joined.dungeon!.hamletReturn!.phase).toBe("complete");
  expect(joined.dungeon!.hamletScoutActorId).toBeUndefined();
  expect(joined.dungeon!.nextQuestRoomReveals).toBeUndefined();
  expect(joined.dungeon!.hamlet!.actedHeroes).toContain("hero-0");
  expect(joined.dungeon!.heroes.some((h) => h.dead)).toBe(false);
  expect(joined.dungeon!.heroes[3]!.stress).toBe(0);
  expect(joined.dungeon!.waitingHeroTokens).toBe(prepared.dungeon!.waitingHeroTokens);
  expect(applyCommand(joined, scout).state).toBe(joined);
});
it("压力牌池缺失保留已付压力，其他行动锁住；补齐后续接不重复支付", () => {
  const game = actorPatch(fixture(), { stress: 9 });
  const bad = { ...game, dungeon: { ...game.dungeon!, resolveCards: [] } };
  const blocked = ok(bad, scout);
  expect(blocked.dungeon).toMatchObject({ phase: "blockedPressure", hamletScoutActorId: "hero-0" });
  expect(blocked.dungeon!.heroes[0]!.stress).toBe(10);
  expect(applyCommand(blocked, scout).state).toBe(blocked);
  const repaired = {
    ...blocked,
    dungeon: { ...blocked.dungeon!, resolveCards: game.dungeon!.resolveCards },
  };
  const next = ok(repaired, { type: "resolveDungeonPressure" });
  expect(next.dungeon!.nextQuestRoomReveals).toBe(1);
  expect(next.dungeon!.hamletScoutActorId).toBeUndefined();
});
it("跨日两次分别付费，补给及改骰后逐房待选；不提前清房/抽卡/减少探索骰，可JSON往返续接", () => {
  for (const merchant of [false, true]) {
    let game = ok(fixture(), scout);
    game = {
      ...game,
      dungeon: { ...game.dungeon!, hamlet: { ...game.dungeon!.hamlet!, day: 2, actedHeroes: [] } },
    };
    game = ok(game, scout);
    expect(game.dungeon!.heroes[0]!.stress).toBe(4);
    expect(game.dungeon!.nextQuestRoomReveals).toBe(2);
    if (merchant)
      game = { ...game, dungeon: { ...game.dungeon!, nextQuestProvisionFaceChoice: true } };
    game = embark(game);
    expect(game.dungeon!.rooms.every((r) => !r.revealed)).toBe(true);
    game = provisions(game);
    expect(game.dungeon!.phase).toBe("awaitingScoutAhead");
    const before = structuredClone(game),
      p = game.dungeon!.pending!;
    expect(p.options).toHaveLength(8);
    expect(applyCommand(game, { type: "beginDungeonExploration" }).state).toBe(game);
    expect(applyCommand(game, { type: "resolveChoice", choiceId: p.id, optionId: "S" }).state).toBe(
      game,
    );
    const command: Command = { type: "resolveChoice", choiceId: p.id, optionId: "A" };
    const once = ok(game, command);
    expect(ok(JSON.parse(JSON.stringify(game)), command)).toEqual(once);
    expect(once.dungeon!.pending!.options.some((o) => o.id === "A")).toBe(false);
    expect(applyCommand(once, command).state).toBe(once);
    game = ok(once, { type: "resolveChoice", choiceId: once.dungeon!.pending!.id, optionId: "H" });
    expect(
      game
        .dungeon!.rooms.filter((r) => r.revealed)
        .map((r) => r.id)
        .sort(),
    ).toEqual(["A", "H"]);
    expect(game.dungeon!.rooms.some((r) => r.cleared)).toBe(false);
    expect(game.dungeon).toMatchObject({
      phase: "ready",
      scoutBonus: false,
      position: "S",
      cursor: before.dungeon!.cursor,
    });
    expect(game.dungeon!.nextQuestRoomReveals).toBeUndefined();
    expect(game.dungeon!.roomCards).toEqual(before.dungeon!.roomCards);
    expect(game.dungeon!.explorationSetup).toEqual(before.dungeon!.explorationSetup);
    expect(ok(game, { type: "beginDungeonExploration" }).dungeon!.phase).not.toBe(
      "awaitingScoutAhead",
    );
  }
});
