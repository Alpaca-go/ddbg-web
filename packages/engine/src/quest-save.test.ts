import { expect, it } from "vitest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import type { QuestStart } from "../../data/src/quest-save";
import { HERO_SKILL_TRINKET_IDS } from "../../data/src/hero-skill-trinkets";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { naturalParty, naturalQuest } from "./test-helpers/natural-quest";

const start: QuestStart = {
  seed: 1,
  questId: "quest:p001",
  mode: "radiant",
  party: coreParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
};
const initial = () =>
  createCoreDungeonQuest(start.seed, start.questId, start.mode, start.party, coreQuestSources);
const roundTrip = (save: unknown) =>
  loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources);

it("技能光照顺序保留新旧起点，旧快照严格回放", () => {
  const fresh = initial();
  const { skillLightBeforeCrit: _newOrder, ...old } = fresh;
  void _newOrder;
  const variants: readonly GameState[] = [fresh, old];
  for (const game of variants) {
    const saved = createQuestSave(start, [], game, coreQuestSources);
    expect(saved.start.skillLightBeforeCrit).toBe(game.skillLightBeforeCrit);
    expect(roundTrip(saved).game).toEqual(game);
    const forged = structuredClone(saved);
    if (forged.start.skillLightBeforeCrit) delete forged.start.skillLightBeforeCrit;
    else forged.start.skillLightBeforeCrit = true;
    expect(() => roundTrip(forged)).toThrow(/不一致/);
  }
});

it.each([null, "r227", "r229", "full"] as const)("Stygian 严格存档保留开局房间规则 %s", (rules) => {
  const stygianStart = { ...start, mode: "stygian" as const, bossEdgeRooms: true };
  const initial = createCoreDungeonQuest(
    stygianStart.seed,
    stygianStart.questId,
    stygianStart.mode,
    stygianStart.party,
    coreQuestSources,
    true,
    rules,
  );
  const command = { type: "rollDungeonProvisions" } as const;
  const game = applyCommand(initial, command).state;
  const save = createQuestSave(stygianStart, [command], game, coreQuestSources);
  expect(save.start.stygianRoomRules).toBe(rules ?? undefined);
  expect(roundTrip(save).game).toEqual(game);
});

it("版本存档恢复真实起点与待选开局补给，续接不重掷；输入不变", () => {
  const game = initial(),
    before = structuredClone(game);
  const commands: Command[] = [{ type: "rollDungeonProvisions" }];
  const pending = applyCommand(game, commands[0]!);
  expect(pending.pendingChoice).toBeDefined();
  const save = createQuestSave(start, commands, pending.state, coreQuestSources);
  const restored = roundTrip(save);
  expect(JSON.stringify(restored.game)).toBe(JSON.stringify(pending.state));
  const choice: Command = {
    type: "resolveChoice",
    choiceId: pending.pendingChoice!.id,
    optionId: pending.pendingChoice!.options[0]!.id,
  };
  expect(applyCommand(restored.game, choice)).toEqual(applyCommand(pending.state, choice));
  expect(game).toEqual(before);
  expect(roundTrip(createQuestSave(start, [], game, coreQuestSources)).commands).toEqual([]);
}, 20000);
it("旧存档严格验证历史前缀，续玩及重存保留规则切换点", () => {
  const command = { type: "rollDungeonProvisions" } as const;
  const before = applyCommand(initial(), command).state;
  const legacy = {
    ...createQuestSave(start, [command], before, coreQuestSources),
    rulesVersion: "core-quest-2026-10-14",
  };
  const loaded = roundTrip(legacy);
  expect(loaded.game).toEqual(before);
  expect(loaded.start.legacyCardReviewCommandCount).toBe(1);
  const pending = loaded.game.dungeon!.pending!;
  const next = {
    type: "resolveChoice",
    choiceId: pending.id,
    optionId: pending.options[0]!.id,
  } as const;
  const after = applyCommand(loaded.game, next);
  expect(after.events.some((event) => event.type === "commandRefused")).toBe(false);
  const saved = createQuestSave(loaded.start, [command, next], after.state, coreQuestSources);
  expect(roundTrip(saved).game).toEqual(after.state);
  expect(() => roundTrip({ ...legacy, snapshot: { ...before, seed: 0 } })).toThrow();
}, 20000);
it("自然任务含真实战斗的日志可恢复到摘要，牌池、金币、XP与RNG全部一致", () => {
  const run = naturalQuest(1, "quest:p001");
  const entry: QuestStart = {
    ...start,
    party: naturalParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
  };
  const saved = createQuestSave(entry, run.commands, run.state, coreQuestSources);
  expect(JSON.stringify(roundTrip(saved).game)).toBe(JSON.stringify(run.state));
  // 首场攻击尚无饰品；新版窗口标记必须随命令保存 / 恢复，旧日志仍不补默认标记。
  const firstAttack = run.commands.findIndex((command) => command.type === "playHeroSkill");
  expect(firstAttack).toBeGreaterThanOrEqual(0);
  for (const trinketWindow of [
    true,
    ["trinket:p006", "trinket:p001", "trinket:p002", "trinket:p009", "trinket:p014"],
    [
      "trinket:p006",
      "trinket:p001",
      "trinket:p002",
      "trinket:p009",
      "trinket:p014",
      "trinket:p031",
      "trinket:p032",
      "trinket:p033",
      "trinket:p034",
    ],
    [
      "trinket:p006",
      "trinket:p001",
      "trinket:p002",
      "trinket:p009",
      "trinket:p014",
      "trinket:p031",
      "trinket:p032",
      "trinket:p033",
      "trinket:p034",
      "trinket:p021",
      "trinket:p026",
    ],
    HERO_SKILL_TRINKET_IDS.filter((id) => id !== "trinket:p025"),
    HERO_SKILL_TRINKET_IDS,
  ] as const) {
    const flagged: Command[] = run.commands.map((command, index) =>
      index === firstAttack && command.type === "playHeroSkill"
        ? { ...command, trinketWindow }
        : command,
    );
    const flaggedSave = createQuestSave(entry, flagged, run.state, coreQuestSources);
    expect(roundTrip(flaggedSave).commands).toEqual(flagged);
  }
  let game = createCoreDungeonQuest(
    entry.seed,
    entry.questId,
    entry.mode,
    entry.party,
    coreQuestSources,
  );
  const log: Command[] = [];
  for (const command of run.commands) {
    game = applyCommand(game, command).state;
    log.push(command);
    if (game.battle?.pending) {
      const restored = roundTrip(createQuestSave(entry, log, game, coreQuestSources));
      expect(JSON.stringify(restored.game)).toBe(JSON.stringify(game));
      break;
    }
  }
  expect(game.battle?.pending).toBeDefined();
}, 20000);
it("未知版本、非法命令、伪造快照／种子、截断日志和错误来源拒绝", () => {
  const game = initial(),
    saved = createQuestSave(start, [], game, coreQuestSources);
  const pending = applyCommand(game, { type: "rollDungeonProvisions" });
  const played = createQuestSave(
    start,
    [{ type: "rollDungeonProvisions" }],
    pending.state,
    coreQuestSources,
  );
  for (const corrupt of [
    { ...saved, version: 2 },
    { ...saved, rulesVersion: "future" },
    { ...saved, start: { ...start, seed: -1 } },
    { ...saved, start: { ...start, seed: 2 } },
    { ...saved, snapshot: { seed: 1 } },
    { ...played, commands: [] },
    { ...saved, commands: [{ type: "moveHero", actorId: "h" }] },
    { ...saved, commands: [{ type: "rollDungeonProvisions", seed: 3 }] },
    { ...saved, commands: [{ type: "resolveChoice", choiceId: "stale", optionId: "food" }] },
  ])
    expect(() => roundTrip(corrupt)).toThrow();
  expect(() => loadQuestSave(saved, { ...coreQuestSources, rooms: [] })).toThrow();
  expect(() => createQuestSave(start, [], pending.state, coreQuestSources)).toThrow(/不一致/);
}, 20000);
