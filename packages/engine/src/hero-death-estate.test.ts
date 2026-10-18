import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { GameState, Command, PendingChoice } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { continueDeathEstates, replacementHeroCandidates } from "./hero-death-estate";
import { trinketPoolProblem, switchTrinketDungeonLevel } from "./trinket-acquisition";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";
import cards from "../../data/normalized/corebox/trinket.json";
import { createBattleState } from "./battle";
import { readHeroPassiveDefence } from "./battle-skill-status";

it("R-094及七技能/村庄能力接通后，瘟疫医生作为第六名正式候选", () => {
  const game = createCoreDungeonQuest(4, "quest:p001", "standard", coreParty, coreQuestSources);
  expect(
    coreQuestSources.catalog.heroStats.some(
      (s) => s.name === "PLAGUE DOCTOR" && s.attributesVerified,
    ),
  ).toBe(true);
  expect(
    coreQuestSources.catalog.skills.filter(
      (s) => s.hero === "PLAGUE DOCTOR" && s.level === 1 && !s.verification.unverified,
    ),
  ).toHaveLength(7);
  expect(replacementHeroCandidates(game.dungeon!).map((s) => s.name)).toEqual([
    "BOUNTY HUNTER",
    "PLAGUE DOCTOR",
  ]);
  const battle = { heroStats: coreQuestSources.catalog.heroStats };
  expect(
    readHeroPassiveDefence(battle, { heroStatId: "hero_stat:p013:front" })!.resistances,
  ).toEqual(["blight"]);
  expect(readHeroPassiveDefence(battle, { heroStatId: "hero_stat:p014:front" })).toMatchObject({
    resistances: [],
    immunities: ["blight"],
    diseaseImmune: true,
  });
});

function ok(game: GameState, command: Command) {
  const r = applyCommand(game, command);
  expect(
    r.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBe(false);
  return r;
}
/** 明示已结算G房间及压力/装备夹具；死亡由公开侦察命令产生，不冒充自然战役。 */
function fixture(n = 1): GameState {
  const game = createCoreDungeonQuest(4, "quest:p001", "standard", coreParty, coreQuestSources);
  const d = game.dungeon!,
    pool = d.trinkets!;
  return {
    ...game,
    dungeon: {
      ...d,
      phase: "ready",
      position: "G",
      heroes: d.heroes.map((h, i) =>
        i ? h : { ...h, stress: 9, resolveTested: true, resolveCardId: d.resolveCards[0]!.id },
      ),
      resolveDecks: {},
      trinkets: {
        ...pool,
        held: pool.cards
          .filter((c) => !c.verification.unverified)
          .slice(0, n)
          .map((c, i) => ({ cardId: c.id, heroId: `hero-${i}`, face: "inverted" as const })),
      },
    },
  };
}
function die(game = fixture()) {
  const consent = ok(game, { type: "scoutDungeon" }).state;
  return ok(consent, {
    type: "resolveChoice",
    choiceId: consent.dungeon!.pending!.id,
    optionId: "agree",
  });
}
function choose(game: GameState, optionId: string) {
  return ok(game, {
    type: "resolveChoice",
    choiceId: game.dungeon!.deathTrinketChoice!.id,
    optionId,
  });
}
it("公开死亡命令自动记录身份，优先饰品待选；转移立即翻正，不消耗行动/RNG/代币/XP", () => {
  const original = fixture(),
    frozen = structuredClone(original);
  const result = die(original),
    game = result.state,
    d = game.dungeon!;
  expect(d.deadHeroNames).toEqual(["CRUSADER"]);
  expect(result.pendingChoice).toEqual(d.deathTrinketChoice);
  expect(d.deathTrinketChoice!.options.some((o) => o.id === "take:hero-0")).toBe(false);
  expect(applyCommand(game, { type: "beginDungeonExploration" }).state).toBe(game);
  const next = choose(game, "take:hero-1").state;
  expect(next.dungeon!.trinkets!.held[0]).toMatchObject({ heroId: "hero-1", face: "upright" });
  expect(next.dungeon!.deathTrinketChoice).toBeUndefined();
  expect(next.dungeon!.cursor).toBe(d.cursor);
  expect(next.dungeon!.heroes).toEqual(d.heroes);
  expect(next.dungeon!.gold).toBe(d.gold);
  expect(next.dungeon!.waitingHeroTokens).toBe(d.waitingHeroTokens);
  expect(next.dungeon!.stagecoachXp).toBe(d.stagecoachXp);
  expect(next.dungeon!.deadHeroNames).toEqual(["CRUSADER"]);
  expect(trinketPoolProblem(next.dungeon!.trinkets!, next.dungeon!.heroes)).toBeNull();
  expect(original).toEqual(frozen);
  expect(die(original)).toEqual(result);
});
it("满槽不能直接接收，可弃置原装备再接收；拒绝未知/过期/伪造选项", () => {
  const game = die(fixture(2)).state,
    choice = game.dungeon!.deathTrinketChoice!;
  expect(choice.options.some((o) => o.id === "take:hero-1")).toBe(false);
  const replace = choice.options.find((o) => o.id.startsWith("replace:"))!;
  const old = game.dungeon!.trinkets!.held.find((h) => h.heroId === "hero-1")!.cardId;
  const cardId = game.dungeon!.trinkets!.held.find((h) => h.heroId === "hero-0")!.cardId;
  const command: Command = { type: "resolveChoice", choiceId: choice.id, optionId: replace.id };
  for (const bad of [
    { ...command, optionId: "take:hero-0" },
    { ...command, choiceId: "stale" },
    { ...command, optionId: "take:hero-1" },
  ])
    expect(applyCommand(game, bad).state).toBe(game);
  const next = ok(game, command).state;
  expect(next.dungeon!.trinkets!.discard).toContain(old);
  expect(next.dungeon!.trinkets!.held).toEqual([{ cardId, heroId: "hero-1", face: "upright" }]);
  expect(ok(JSON.parse(JSON.stringify(game)), command)).toEqual(ok(game, command));
  expect(applyCommand(next, command).state).toBe(next);
});
it("多人死亡逐卡处置，不给其他死者；全部弃置后不复活/补人或重复登记", () => {
  let base = fixture(3);
  base = {
    ...base,
    dungeon: {
      ...base.dungeon!,
      heroes: base.dungeon!.heroes.map((h, i) =>
        i < 2
          ? {
              ...h,
              stress: 9,
              resolveTested: true,
              resolveCardId: base.dungeon!.resolveCards[i]!.id,
            }
          : h,
      ),
    },
  };
  let game = die(base).state;
  expect(game.dungeon!.deadHeroNames).toEqual(["CRUSADER", "HELLION"]);
  for (let i = 0; i < 2; i++) {
    expect(game.dungeon!.deathTrinketChoice!.options.some((o) => o.id === "take:hero-1")).toBe(
      false,
    );
    game = choose(game, "discard").state;
  }
  expect(game.dungeon!.trinkets!.discard).toHaveLength(2);
  expect(game.dungeon!.trinkets!.held).toHaveLength(1);
  expect(game.dungeon!.heroes.filter((h) => h.dead)).toHaveLength(2);
  expect(game.dungeon!.phase).toBe("awaitingReplacement");
  const again = continueDeathEstates({ state: game, events: [] });
  expect(again.state).toBe(game);
  expect(again.events).toEqual([]);
});
it("高等级死者饰品按原等级弃置，不能混进当前牌堆", () => {
  const all = normalizedTrinketFileSchema.parse(cards).cards;
  const game = fixture(),
    d = game.dungeon!;
  const switched = switchTrinketDungeonLevel(d.trinkets!, all, 2);
  if ("reason" in switched) throw new Error(switched.reason);
  const prepared = { ...game, dungeon: { ...d, trinkets: switched } };
  const dead = die(prepared).state,
    cardId = d.trinkets!.held[0]!.cardId;
  const next = choose(dead, "discard").state;
  expect(next.dungeon!.trinkets!.discard).not.toContain(cardId);
  expect(next.dungeon!.trinkets!.inactive!.find((p) => p.level === 1)!.discard).toContain(cardId);
  expect(trinketPoolProblem(next.dungeon!.trinkets!, next.dungeon!.heroes)).toBeNull();
});
it("战斗死亡读取实时实体，饰品选择覆盖显示但保留原待选；结束后回到原选择", () => {
  const base = fixture(),
    d = base.dungeon!;
  const battle = createBattleState(4, {
    entities: d.heroes.map((h, i) => ({
      id: h.id,
      side: "hero",
      hero: coreQuestSources.catalog.heroStats.find((s) => s.id === h.heroStatId)!.name,
      heroStatId: h.heroStatId!,
      life: h.life!,
      areaId: "a",
      stance: h.stance!,
      skillIds: h.skillIds!,
      wounds: 0,
      stress: 0,
      dodge: 0,
      dead: i === 0,
      guard: false,
      bleed: [],
      blight: [],
    })),
    skills: coreQuestSources.catalog.skills,
    heroStats: coreQuestSources.catalog.heroStats,
    areas: [{ id: "a", elevation: "normal", adjacent: [], capacity: 4 }],
    light: 5,
  }).battle!;
  const pending: PendingChoice = {
    id: "underlying",
    prompt: "原流程选择",
    options: [{ id: "resume", label: "继续" }],
  };
  const state: GameState = {
    ...base,
    battle: {
      ...battle,
      trinkets: d.trinkets!,
      pending: { type: "trinketReward", actorId: "hero-1", choice: pending },
    },
  };
  const interrupted = continueDeathEstates({ state, events: [], pendingChoice: pending });
  expect(interrupted.state.dungeon!.deadHeroNames).toEqual(["CRUSADER"]);
  expect(interrupted.state.dungeon!.heroes[0]!.dead).toBeFalsy();
  const restored = choose(interrupted.state, "take:hero-1");
  expect(restored.pendingChoice).toEqual(pending);
  expect(restored.state.battle!.pending!.choice).toEqual(pending);
  expect(restored.state.battle!.trinkets).toEqual(restored.state.dungeon!.trinkets);
  expect(restored.state.battle!.entities).toEqual(battle.entities);
});
it("候选按英雄名排除在队/本战役死亡者，不能用另一等级属性面绕过；无饰品死亡仍登记", () => {
  const game = fixture(0),
    dead = die(game).state;
  expect(dead.dungeon!.deathTrinketChoice).toBeUndefined();
  const d = dead.dungeon!;
  expect(replacementHeroCandidates(d).map((s) => s.name)).toEqual([
    "BOUNTY HUNTER",
    "PLAGUE DOCTOR",
  ]);
  expect(
    replacementHeroCandidates({ ...d, deadHeroNames: [...d.deadHeroNames!, "BOUNTY HUNTER"] }),
  ).toEqual([expect.objectContaining({ name: "PLAGUE DOCTOR" })]);
});
