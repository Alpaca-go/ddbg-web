import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { GameState, Command } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { replacementHeroCandidates } from "./hero-death-estate";
import { savedCommandSchema } from "../../data/src/quest-save";
import { naturalQuest, naturalParty } from "./test-helpers/natural-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";

function ok(game: GameState, command: Command) {
  const r = applyCommand(game, command);
  expect(
    r.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBe(false);
  return r.state;
}
/** 明示房间与压力/驿站XP夹具；公开侦察命令造成死亡，不冒充自然连续战役。 */
function fixture(xp = 9): GameState {
  const base = createCoreDungeonQuest(4, "quest:p001", "standard", coreParty, coreQuestSources);
  let game: GameState = {
    ...base,
    dungeon: {
      ...base.dungeon!,
      phase: "ready",
      position: "G",
      stagecoachXp: xp,
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
      resolveDecks: {},
    },
  };
  game = ok(game, { type: "scoutDungeon" });
  return ok(game, {
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: "agree",
  });
}
const begin: Command = { type: "prepareReplacementHero" };
function choose(game: GameState, optionId: string) {
  return ok(game, {
    type: "resolveChoice",
    choiceId: game.dungeon!.replacementPreparation!.choice.id,
    optionId,
  });
}
function select(game = fixture()) {
  return choose(ok(game, begin), "hero_stat:p005:front");
}
function equipAll(game: GameState) {
  for (let n = 0; game.dungeon!.replacementPreparation && n < 5; n++)
    game = choose(game, game.dungeon!.replacementPreparation!.choice.options[0]!.id);
  return game;
}
it("选英雄才扣一枚、继承全部XP但不扣驿站余额；保持新英雄空白状态与原队伍不变", () => {
  const base = fixture(),
    before = structuredClone(base),
    offered = ok(base, begin);
  expect(offered.dungeon!.waitingHeroTokens).toBeUndefined();
  expect(offered.dungeon!.replacementPreparation!.choice.options.map((o) => o.id)).toEqual([
    "hero_stat:p005:front",
  ]);
  const game = choose(offered, "hero_stat:p005:front"),
    p = game.dungeon!.replacementPreparation!;
  expect(game.dungeon!.waitingHeroTokens).toBe(1);
  expect(game.dungeon!.stagecoachXp).toBe(9);
  expect(game.dungeon!.heroes).toEqual(base.dungeon!.heroes);
  expect(p.hero).toMatchObject({
    heroStatId: "hero_stat:p005:front",
    life: 14,
    level: 1,
    xp: 9,
    wounds: 0,
    stress: 0,
    dead: false,
    quirkIds: [],
    diseaseId: null,
    resolveTested: false,
    skillIds: [],
  });
  expect(p.hero!.resolveCardId).toBeUndefined();
  expect(p.hero!.combat).toBeUndefined();
  expect(p.hero!.id).not.toBe(p.deadHeroId);
  expect(game.dungeon!.cursor).toBe(base.dungeon!.cursor);
  expect(game.dungeon!.gold).toBe(base.dungeon!.gold);
  expect(base).toEqual(before);
  expect(savedCommandSchema.parse(begin)).toEqual(begin);
});
it("两次英雄升级只扣8XP免金币，III级5槽自选且剩余XP保留；准备完不提前入队", () => {
  const base = fixture(),
    first = select(base);
  let game = choose(first, "upgrade-hero");
  game = choose(game, "upgrade-hero");
  expect(game.dungeon!.replacementPreparation).toMatchObject({
    stage: "skills",
    upgrades: 2,
    hero: { level: 3, life: 23, xp: 1 },
  });
  expect(
    game.dungeon!.replacementPreparation!.choice.options.some((o) => o.id === "upgrade-hero"),
  ).toBe(false);
  const skillChoice = game.dungeon!.replacementPreparation!.choice;
  const once = choose(game, skillChoice.options[0]!.id);
  expect(
    once.dungeon!.replacementPreparation!.choice.options.some(
      (o) => o.id === skillChoice.options[0]!.id,
    ),
  ).toBe(false);
  game = equipAll(once);
  expect(game.dungeon!.replacementPreparation).toBeUndefined();
  expect(game.dungeon!.preparedReplacements).toHaveLength(1);
  expect(game.dungeon!.preparedReplacements![0]!.hero.skillIds).toHaveLength(5);
  expect(game.dungeon!.preparedReplacements![0]!.hero.xp).toBe(1);
  expect(game.dungeon!.heroes).toEqual(base.dungeon!.heroes);
  expect(game.dungeon!.waitingHeroTokens).toBe(1);
  expect(game.dungeon!.stagecoachXp).toBe(9);
  expect(game.dungeon!.gold).toBe(base.dungeon!.gold);
  expect(applyCommand(game, begin).state).toBe(game);
});
it("同一技能可连续两次升级至III，旧卡永久移除；不升级时允许保留全部XP", () => {
  let game = select();
  game = choose(game, "upgrade:hero_skill:p043");
  game = choose(game, "upgrade:hero_skill:p044");
  expect(game.dungeon!.replacementPreparation!.hero).toMatchObject({
    xp: 5,
    permanentlyRemovedSkillIds: ["hero_skill:p043", "hero_skill:p044"],
  });
  expect(
    game.dungeon!.replacementPreparation!.choice.options.some((o) => o.id === "hero_skill:p045"),
  ).toBe(true);
  expect(
    game.dungeon!.replacementPreparation!.choice.options.some((o) => o.id === "hero_skill:p043"),
  ).toBe(false);
  game = equipAll(game);
  expect(game.dungeon!.preparedReplacements![0]!.hero.skillIds).toHaveLength(3);
  const zero = equipAll(choose(select(), "finish-upgrades"));
  expect(zero.dungeon!.preparedReplacements![0]!.hero.xp).toBe(9);
});
it("可混合英雄/技能升级，XP不足不显示升级；旧/重复/未知选择与其他命令原子拒绝", () => {
  let game = choose(select(), "upgrade-hero");
  game = choose(game, "upgrade:hero_skill:p043");
  expect(game.dungeon!.replacementPreparation!.hero).toMatchObject({ level: 2, xp: 3 });
  expect(equipAll(game).dungeon!.preparedReplacements![0]!.hero.skillIds).toHaveLength(4);
  const low = select(fixture(1));
  expect(low.dungeon!.replacementPreparation!.choice.options.map((o) => o.id)).toEqual([
    "finish-upgrades",
  ]);
  const p = low.dungeon!.replacementPreparation!.choice;
  for (const command of [
    begin,
    { type: "ping", message: "locked" } as const,
    { type: "resolveChoice", choiceId: p.id, optionId: "upgrade-hero" } as const,
    { type: "resolveChoice", choiceId: "stale", optionId: "finish-upgrades" } as const,
  ])
    expect(applyCommand(low, command).state).toBe(low);
});
it("代币耗尽明确失败并锁住战役；目录不足不扣代币或冒充失败；坏资源拒绝", () => {
  const base = fixture();
  const zero = { ...base, dungeon: { ...base.dungeon!, waitingHeroTokens: 0 } };
  const failed = ok(zero, begin);
  expect(failed.dungeon!.campaignFailure).toBe("noWaitingHeroes");
  expect(applyCommand(failed, { type: "ping", message: "stop" }).state).toBe(failed);
  const none = {
    ...base,
    dungeon: {
      ...base.dungeon!,
      deadHeroNames: [...base.dungeon!.deadHeroNames!, "BOUNTY HUNTER"],
    },
  };
  expect(applyCommand(none, begin).state).toBe(none);
  for (const patch of [
    { stagecoachXp: -1 },
    { stagecoachXp: 1.5 },
    { waitingHeroTokens: -1 },
    { waitingHeroTokens: 3 },
  ]) {
    const bad = { ...base, dungeon: { ...base.dungeon!, ...patch } };
    expect(applyCommand(bad, begin).state).toBe(bad);
  }
});
it("暂存英雄不被再次提供；JSON往返和同命令序列结果一致，异常准备状态不继续扣资源", () => {
  const base = select(),
    before = structuredClone(base);
  const p = base.dungeon!.replacementPreparation!.choice;
  const command: Command = { type: "resolveChoice", choiceId: p.id, optionId: "upgrade-hero" };
  expect(ok(JSON.parse(JSON.stringify(base)), command)).toEqual(ok(base, command));
  const prepared = equipAll(choose(base, "finish-upgrades"));
  expect(replacementHeroCandidates(prepared.dungeon!)).toEqual([]);
  const bad = {
    ...base,
    dungeon: {
      ...base.dungeon!,
      replacementPreparation: {
        ...base.dungeon!.replacementPreparation!,
        hero: { ...base.dungeon!.replacementPreparation!.hero!, xp: -1 },
      },
    },
  };
  expect(applyCommand(bad, command).state).toBe(bad);
  expect(base).toEqual(before);
});

it("真实入口命令日志：走到房间后侦察至死亡，替补选择/初始技能待选和准备完成均可正式存档重放", () => {
  const journey = naturalQuest(14, "quest:p001", true, coreQuestSources, 2, {
    observe(game) {
      if (!game.battle && game.dungeon!.phase === "ready" && game.dungeon!.position !== "S")
        throw new Error("observed-room");
    },
  });
  expect(journey.stopReason).toBe("observed-room");
  let game = journey.state;
  const commands: Command[] = [...journey.commands];
  const step = (command: Command) => {
    game = ok(game, command);
    commands.push(command);
  };
  for (let n = 0; !game.dungeon!.heroes.some((h) => h.dead) && n < 25; n++) {
    step({ type: "scoutDungeon" });
    step({ type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: "agree" });
  }
  expect(game.dungeon!.heroes.some((h) => h.dead)).toBe(true);
  while (game.dungeon!.deathTrinketChoice)
    step({
      type: "resolveChoice",
      choiceId: game.dungeon!.deathTrinketChoice!.id,
      optionId: "discard",
    });
  const start = {
    seed: 14,
    questId: "quest:p001" as const,
    mode: "radiant" as const,
    party: naturalParty,
  };
  const saved = () => {
    const save = createQuestSave(start, commands, game, coreQuestSources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(game);
  };
  step(begin);
  saved();
  step({
    type: "resolveChoice",
    choiceId: game.dungeon!.replacementPreparation!.choice.id,
    optionId: "hero_stat:p005:front",
  });
  saved();
  step({
    type: "resolveChoice",
    choiceId: game.dungeon!.replacementPreparation!.choice.id,
    optionId: "finish-upgrades",
  });
  saved();
  while (game.dungeon!.replacementPreparation)
    step({
      type: "resolveChoice",
      choiceId: game.dungeon!.replacementPreparation!.choice.id,
      optionId: game.dungeon!.replacementPreparation!.choice.options[0]!.id,
    });
  expect(game.dungeon!.preparedReplacements).toHaveLength(1);
  saved();
}, 30000);
