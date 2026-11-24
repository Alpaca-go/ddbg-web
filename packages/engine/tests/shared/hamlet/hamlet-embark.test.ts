import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "../../../src/shared/core/command";
import type { Command, GameState } from "../../../src/shared/core/command";
import { createDungeonSandbox } from "../../../src/shared/dungeon/dungeon";
import layout from "../../../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../../../data/normalized/corebox/scout_ahead_distribution.json";
import { nextProvisionFace } from "../../../src/shared/trinkets/loot";
import { naturalAbbeyQuest } from "../../helpers/abbey-quest";
import { basicQuests } from "../../../../data/src/basic-quests";
import { coreParty, coreQuestSources } from "../../helpers/core-quest";
import { createCoreDungeonQuest } from "../../../src/shared/dungeon/dungeon-quest-entry";
import {
  applyTemporarySkillUpgrades,
  restoreTemporarySkillUpgrades,
} from "../../../src/shared/hamlet/hamlet-embark";

let baseline: ReturnType<typeof naturalAbbeyQuest>;
beforeAll(() => {
  baseline = naturalAbbeyQuest();
}, 30000);

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result.state;
}

/** 明示准备结束夹具：保留真实回村后的牌堆/金币/建筑，只把剩余天数收束到可出征。 */
function preparationReady(game: GameState): GameState {
  const d = game.dungeon!;
  return {
    ...game,
    dungeon: {
      ...d,
      hamlet: {
        ...d.hamlet!,
        phase: "preparationComplete",
        remainingDays: 0,
        actedHeroes: [],
        visitedBuildings: [],
        heroOrder: [],
        caretaker: null,
        blockedBuildings: d.hamlet!.weekBlockedBuildings ?? [],
      },
    },
  };
}

it("临时技能纯函数应用/归还；R-080归还目标可为永久II", () => {
  const catalog = coreQuestSources.catalog;
  const hero = {
    id: "hero-0",
    heroStatId: catalog.heroStats.find((s) => s.level === 1 && s.name === "CRUSADER")!.id,
    skillIds: ["hero_skill:core:h01:p002", "hero_skill:core:h01:p004", "hero_skill:core:h01:p007"],
    nextQuestSkillUpgrades: [
      { originalSkillId: "hero_skill:core:h01:p002", temporarySkillId: "hero_skill:core:h01:p003" },
    ],
    stress: 0,
  };
  const applied = applyTemporarySkillUpgrades([hero], catalog);
  expect("heroes" in applied).toBe(true);
  if (!("heroes" in applied)) return;
  expect(applied.heroes[0]!.skillIds).toEqual([
    "hero_skill:core:h01:p003",
    "hero_skill:core:h01:p004",
    "hero_skill:core:h01:p007",
  ]);
  expect(applied.heroes[0]!.nextQuestSkillUpgrades).toEqual(hero.nextQuestSkillUpgrades);
  const restored = restoreTemporarySkillUpgrades(applied.heroes);
  expect(restored[0]!.skillIds).toEqual(hero.skillIds);
  expect(restored[0]!.nextQuestSkillUpgrades).toBeUndefined();
});

it("R-041奖励补给骰在常规八颗后掷出，满16停，并清除计划字段", () => {
  const heroes = (["aggressive", "defensive", "ranged", "support"] as const).map((stance, i) => ({
    id: `h${i}`,
    stance,
    stress: 0,
    ...(i === 0 ? { nextQuestProvisionDice: 10 } : i === 1 ? { nextQuestProvisionDice: 2 } : {}),
  }));
  const initial = createDungeonSandbox(
    7,
    layout,
    distribution,
    "standard",
    "S",
    heroes,
    [],
    { dungeonLevel: 1, light: 5, provisions: [] },
    undefined,
    undefined,
    undefined,
    undefined,
    true,
  );
  const result = applyCommand(initial, { type: "rollDungeonProvisions" });
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  const d = result.state.dungeon!;
  const total = d.explorationSetup!.provisions.length + (d.startingProvisionChoices?.length ?? 0);
  expect(total).toBe(16);
  expect(d.heroes.every((h) => h.nextQuestProvisionDice === undefined)).toBe(true);
  const bonusRolls = result.events.filter(
    (e) => e.type === "provisionRolled" && String(e.message).includes("奖励"),
  );
  expect(bonusRolls).toHaveLength(8);
  expect(bonusRolls.map((e) => (e as { face: string }).face)).toEqual(
    Array.from({ length: 8 }, (_, i) => nextProvisionFace(7, initial.dungeon!.cursor + 8 + i)),
  );
});

it("真实铁匠/生存专家记录后出征：应用临时技能、弃置未选任务、掷奖励骰；回村归还并可存档回放", () => {
  let game = baseline.game;
  const commands = [...baseline.commands];
  const step = (c: Command) => {
    commands.push(c);
    game = ok(game, c);
  };
  step({ type: "upgradeHamletBuilding", building: "blacksmith" });
  step({ type: "upgradeHamletBuilding", building: "blacksmith" });
  // 明示看守人夹具：当天允许访问铁匠/生存专家，不改金币/牌序/临时计划。
  game = {
    ...game,
    dungeon: {
      ...game.dungeon!,
      hamlet: {
        ...game.dungeon!.hamlet!,
        caretaker: null,
        blockedBuildings: [],
        noCaretaker: true,
      },
    },
  };
  step({ type: "visitBlacksmith", actorId: "hero-0", skillId: "hero_skill:core:h01:p001" });
  expect(game.dungeon!.heroes[0]!.nextQuestSkillUpgrades).toEqual([
    { originalSkillId: "hero_skill:core:h01:p001", temporarySkillId: "hero_skill:core:h01:p003" },
  ]);
  expect(game.dungeon!.heroes[0]!.nextQuestProvisionDice).toBe(1);
  expect(game.dungeon!.heroes[0]!.skillIds![0]).toBe("hero_skill:core:h01:p001");
  step({ type: "useHamletSkill", actorId: "hero-1", skill: "sharpenSpear" });
  step({
    type: "visitHamletBuilding",
    actorId: "hero-2",
    serviceId: "survivalist1",
    quirkIds: [],
  });
  expect(game.dungeon!.heroes[2]!.nextQuestProvisionDice).toBe(1);
  step({ type: "useHamletSkill", actorId: "hero-3", skill: "chant" });
  // 天数收束夹具：不注入临时技能/奖励骰/牌序，只结束准备阶段。
  game = preparationReady(game);
  const gold = game.dungeon!.gold;
  const memoryDeck = [...game.dungeon!.hamlet!.deck];
  const embarkCommands: Command[] = [];
  const embark = (c: Command) => {
    embarkCommands.push(c);
    game = ok(game, c);
  };
  embark({ type: "offerNextQuest" });
  expect(game.dungeon!.pending?.id.startsWith("hamlet-next-quest:")).toBe(true);
  expect(game.dungeon!.nextQuestOffers).toHaveLength(2);
  expect(game.dungeon!.nextQuestOffers!.every((id) => id !== "quest:p003")).toBe(true);
  const chosen = game.dungeon!.nextQuestOffers![0]!;
  const rejected = game.dungeon!.nextQuestOffers![1]!;
  embark({
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: chosen,
  });
  expect(game.dungeon!.phase).toBe("awaitingProvisions");
  expect(game.dungeon!.hamlet).toBeUndefined();
  expect(game.dungeon!.hamletMemory!.deck).toEqual(memoryDeck);
  expect(game.dungeon!.discardedQuests).toEqual(["quest:p003", rejected]);
  expect(game.dungeon!.gold).toBe(gold);
  expect(game.dungeon!.heroes[0]!.skillIds![0]).toBe("hero_skill:core:h01:p003");
  expect(game.dungeon!.heroes[0]!.nextQuestSkillUpgrades![0]!.originalSkillId).toBe(
    "hero_skill:core:h01:p001",
  );
  expect(game.dungeon!.questDistribution!.questId).toBe(chosen);
  const cursorBefore = game.dungeon!.cursor;
  embark({ type: "rollDungeonProvisions" });
  while (game.dungeon!.pending) {
    embark({
      type: "resolveChoice",
      choiceId: game.dungeon!.pending.id,
      optionId: "torch",
    });
  }
  expect(game.dungeon!.phase).toBe("ready");
  expect(game.dungeon!.explorationSetup!.provisions.length).toBeGreaterThanOrEqual(10);
  expect(game.dungeon!.explorationSetup!.provisions.length).toBeLessThanOrEqual(16);
  expect(game.dungeon!.heroes.every((h) => h.nextQuestProvisionDice === undefined)).toBe(true);
  expect(game.dungeon!.cursor).toBeGreaterThan(cursorBefore);
  embark({ type: "leaveDungeon" });
  embark({
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: "agree",
  });
  embark({ type: "summarizeDungeonQuest" });
  embark({ type: "beginReturnToHamlet" });
  // 提前离开无清理房间：无意志转换待选；临时技能在 beginReturn 已归还。
  expect(game.dungeon!.pending).toBeNull();
  expect(game.dungeon!.heroes[0]!.skillIds![0]).toBe("hero_skill:core:h01:p001");
  expect(game.dungeon!.heroes[0]!.nextQuestSkillUpgrades).toBeUndefined();
  embark({ type: "finishReturnToHamlet" });
  embark({ type: "drawHamletEvent" });
  expect(game.dungeon!.hamletMemory).toBeUndefined();
  expect(game.dungeon!.hamlet).toBeDefined();
  // 出征后命令同种子回放（看守人/准备结束夹具不在日志内）。
  let replayed: GameState = {
    ...baseline.game,
    dungeon: {
      ...baseline.game.dungeon!,
      hamlet: {
        ...baseline.game.dungeon!.hamlet!,
        caretaker: null,
        blockedBuildings: [],
        noCaretaker: true,
      },
    },
  };
  for (const c of [
    { type: "upgradeHamletBuilding", building: "blacksmith" },
    { type: "upgradeHamletBuilding", building: "blacksmith" },
    { type: "visitBlacksmith", actorId: "hero-0", skillId: "hero_skill:core:h01:p001" },
    { type: "useHamletSkill", actorId: "hero-1", skill: "sharpenSpear" },
    {
      type: "visitHamletBuilding",
      actorId: "hero-2",
      serviceId: "survivalist1",
      quirkIds: [],
    },
    { type: "useHamletSkill", actorId: "hero-3", skill: "chant" },
  ] as Command[])
    replayed = ok(replayed, c);
  replayed = preparationReady(replayed);
  for (const c of embarkCommands) replayed = ok(replayed, c);
  expect(replayed).toEqual(game);
}, 60000);

it("未准备完成/重复抽卡/无剩余任务原子拒绝", () => {
  expect(applyCommand(baseline.game, { type: "offerNextQuest" }).state).toBe(baseline.game);
  const ready = preparationReady(baseline.game);
  const offered = ok(ready, { type: "offerNextQuest" });
  expect(applyCommand(offered, { type: "offerNextQuest" }).state).toBe(offered);
  expect(
    applyCommand(offered, {
      type: "resolveChoice",
      choiceId: offered.dungeon!.pending!.id,
      optionId: "quest:p003",
    }).state,
  ).toBe(offered);
  const { nextQuestOffers: _offers, ...dungeon } = ready.dungeon!;
  void _offers;
  const empty: GameState = {
    ...ready,
    dungeon: {
      ...dungeon,
      pending: null,
      discardedQuests: basicQuests.filter((q) => q.level === 1).map((q) => q.id),
    },
  };
  expect(applyCommand(empty, { type: "offerNextQuest" }).state).toBe(empty);
});

function wealdP019EmbarkGate(game: GameState) {
  const hamlet = preparationReady(baseline.game).dungeon!.hamlet!;
  return {
    ...game,
    dungeon: {
      ...game.dungeon!,
      phase: "inHamlet" as const,
      completedRegularQuests: [
        { questId: "quest:weald:p001", campaignLevel: 1 as const },
        { questId: "quest:weald:p002", campaignLevel: 1 as const },
      ],
      activeBossThreatScriptId: "boss:weald:hag:1" as const,
      imminentThreatDescriptionCardId: "boss_ability:weald:p013",
      questSummary: {
        questId: "quest:p001" as const,
        name: "Scout",
        clearedRoomIds: [],
        xpPerHero: 2,
        stagecoachXp: 2,
        awarded: true,
      },
      hamletReturn: {
        phase: "complete" as const,
        order: [],
        resolveRoles: {},
        convertedHeroIds: [],
      },
      pending: null,
      hamlet,
    },
  };
}

it("旧版 establishImminentThreat 出征 p019：不隐式补齐 wealdHigherBosses 生产标记", () => {
  const seed = 6;
  const packs = ["core", "weald"] as const;
  let game = createCoreDungeonQuest(
    seed,
    "quest:p001",
    "standard",
    coreParty,
    coreQuestSources,
    true,
    null,
    packs,
  );
  game = ok(game, { type: "establishImminentThreat", locationBosses: true, locationSources: true });
  const offered = ok(wealdP019EmbarkGate(game), { type: "offerNextQuest" });
  const embarked = ok(offered, {
    type: "resolveChoice",
    choiceId: offered.dungeon!.pending!.id,
    optionId: "quest:p019",
  });
  expect(embarked.dungeon!.wealdHigherBosses).toBeUndefined();
  expect(embarked.dungeon!.pounderBossBattles).toBeUndefined();
});

it("显式生产 establish 出征 p019：版本标记随村庄状态守恒进入地牢", () => {
  const packs = ["core", "weald"] as const;
  const establish = {
    type: "establishImminentThreat",
    locationBosses: true,
    locationSources: true,
    wealdHigherBosses: true,
    pounderDungeonThreats: true,
    pounderHamletThreats: true,
    pounderBossBattles: true,
    shriekerBossBattles: true,
  } as const;
  let game = createCoreDungeonQuest(
    6,
    "quest:p001",
    "standard",
    coreParty,
    coreQuestSources,
    true,
    null,
    packs,
  );
  game = ok(game, establish);
  const offered = ok(wealdP019EmbarkGate(game), { type: "offerNextQuest" });
  const after = ok(offered, {
    type: "resolveChoice",
    choiceId: offered.dungeon!.pending!.id,
    optionId: "quest:p019",
  });
  expect(after.dungeon!.wealdHigherBosses).toBe(true);
  expect(after.dungeon!.pounderBossBattles).toBe(true);
  expect(after.dungeon!.shriekerBossBattles).toBe(true);
});
