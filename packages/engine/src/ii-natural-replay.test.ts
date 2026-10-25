import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameEvent, GameState } from "./command";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { savedCommandSchema } from "../../data/src/quest-save";
import { ruinsMonsterPoolThrough } from "../../data/src/monster-pool";
import { conditionPoolProblem } from "./conditions";
import { trinketPoolProblem } from "./trinket-acquisition";
import { coreQuestSources as sources } from "./test-helpers/core-quest";
import { naturalAbbeyQuest } from "./test-helpers/abbey-quest";
import { guildQuest } from "./test-helpers/guild-quest";
import { naturalQuest } from "./test-helpers/natural-quest";
import { scoutThenDualIiOfferSeed } from "./test-helpers/quest-offer-seed";

let scout: ReturnType<typeof guildQuest>;
beforeAll(() => {
  const seed = scoutThenDualIiOfferSeed(sources, 0, 800);
  scout = guildQuest(sources, seed);
}, 120000);

/** 与既有II级出征测试相同的准备结束夹具；仅收束天数，不改资源/英雄/牌序。 */
function preparationReady(game: GameState): GameState {
  const d = game.dungeon!,
    h = d.hamlet!;
  return {
    ...game,
    dungeon: {
      ...d,
      pending: null,
      hamlet: {
        ...h,
        phase: "preparationComplete",
        remainingDays: 0,
        actedHeroes: [],
        visitedBuildings: [],
        heroOrder: [],
        caretaker: null,
        blockedBuildings: h.weekBlockedBuildings ?? [],
        active: null,
      },
    },
  };
}
function ok(state: GameState, command: Command) {
  const r = applyCommand(state, command);
  expect(
    r.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toEqual([]);
  return r;
}
/** 检查点不嵌入重复的完整卡牌目录；最终状态仍逐项比较。 */
function progress(s: GameState) {
  const d = s.dungeon!,
    b = s.battle;
  return {
    dungeon: {
      phase: d.phase,
      position: d.position,
      cursor: d.cursor,
      decision: d.decision,
      pending: d.pending,
      rooms: d.rooms,
      heroes: d.heroes,
      gold: d.gold,
      summary: d.questSummary,
      return: d.hamletReturn,
      monsterPool: d.monsterPool,
      conditions: d.conditions,
      trinkets: d.trinkets,
      provisions: d.explorationSetup?.provisions,
      light: d.explorationSetup?.light,
    },
    battle: b
      ? {
          entities: b.entities,
          cursor: b.rngCursor,
          light: b.light,
          pending: b.pending,
          encounter: b.encounter,
          action: b.monsterAction,
          shuffles: b.shuffleIntents,
          conditions: b.conditions,
        }
      : null,
  };
}
function journey(base: GameState, questId: "quest:p007" | "quest:p008") {
  const initial = preparationReady(base),
    before = structuredClone(initial);
  let state = initial;
  const commands: Command[] = [],
    events: GameEvent[] = [];
  const checkpoints = new Map<number, ReturnType<typeof progress>>();
  const battles: string[][] = [];
  const record = (s: GameState, c: Command) => {
    commands.push(c);
    if (
      [
        "rollDungeonProvisions",
        "startDungeonBattle",
        "prepareMonsterAction",
        "playMonsterSkill",
        "finishDungeonBattle",
        "summarizeDungeonQuest",
        "beginReturnToHamlet",
        "finishReturnToHamlet",
      ].includes(c.type) ||
      s.battle?.pending ||
      s.dungeon?.pending
    )
      checkpoints.set(commands.length, progress(s));
    if (c.type === "startDungeonBattle")
      battles.push(
        s.battle!.entities.filter((e) => e.side === "monster").map((e) => e.monsterCardId!),
      );
  };
  const step = (c: Command) => {
    const r = ok(state, c);
    state = r.state;
    events.push(...r.events);
    record(state, c);
  };
  step({ type: "advanceCampaignLevel" }); // 明示沙盒Boss跳过，不算正式升幕。
  step({ type: "offerNextQuest" });
  expect(state.dungeon!.nextQuestOffers).toContain(questId);
  step({ type: "resolveChoice", choiceId: state.dungeon!.pending!.id, optionId: questId });
  const run = naturalQuest(state.seed, questId, false, sources, 2, {
    continueFrom: state,
    exitAfterBattles: 1,
    observe: record,
  });
  state = run.state;
  events.push(...run.events);
  const exited = state;
  step({ type: "beginReturnToHamlet" });
  while (state.dungeon!.pending)
    step({
      type: "resolveChoice",
      choiceId: state.dungeon!.pending.id,
      optionId: state.dungeon!.pending.options[0]!.id,
    });
  const beforePayment = state;
  if (state.dungeon!.hamletReturn!.phase === "provisions") step({ type: "finishReturnToHamlet" });
  expect(initial).toEqual(before);
  return { initial, state, exited, beforePayment, commands, checkpoints, events, battles };
}
function replay(run: ReturnType<typeof journey>) {
  // JSON传输命令，从同一明示准备夹具重放；不把快照当可执行入口或正式存档。
  const wire = JSON.parse(JSON.stringify({ commands: run.commands }));
  let state = preparationReady(run.initial);
  for (const [i, c] of (wire.commands as Command[]).entries()) {
    state = ok(state, c).state;
    const checkpoint = run.checkpoints.get(i + 1);
    if (checkpoint) expect(progress(state)).toEqual(checkpoint);
  }
  expect(state).toEqual(run.state);
}
function conserved(s: GameState) {
  const d = s.dungeon!,
    p = d.monsterPool!;
  expect(conditionPoolProblem(d.conditions!, d.heroes)).toBeNull();
  expect(trinketPoolProblem(d.trinkets!, d.heroes)).toBeNull();
  expect(p.active).toBeNull();
  expect([...(p.remaining ?? []), ...p.discarded].sort()).toEqual(
    ruinsMonsterPoolThrough(p.cards, 2)
      .map((c) => c.instanceId)
      .sort(),
  );
  expect([...(p.remaining ?? []), ...p.discarded]).toHaveLength(53);
}

it.each(["quest:p007", "quest:p008"] as const)(
  "seed14 %s：自然I/II混合遭遇胜利→提前退出→一次回村，检查点逐命令重放一致",
  (questId) => {
    const before = structuredClone(scout.game),
      run = journey(scout.game, questId);
    expect(run.battles).toEqual([
      ["monster_medium:p046", "monster_medium:p001", "monster_medium:p024", "monster_medium:p001"],
    ]);
    expect(run.events.filter((e) => e.type === "battleFinished")).toEqual([
      expect.objectContaining({ outcome: "victory", round: 3 }),
    ]);
    expect(run.commands.some((c) => c.type === "rollDungeonExploration")).toBe(true);
    expect(run.commands.some((c) => c.type === "restDungeon")).toBe(true);
    const xp = questId === "quest:p007" ? 0 : 1;
    expect(run.exited.dungeon!.questSummary).toMatchObject({
      questId,
      clearedRoomIds: ["G"],
      xpPerHero: xp,
      awarded: false,
    });
    const d = run.state.dungeon!,
      payment = run.beforePayment.dungeon!;
    expect(d).toMatchObject({
      phase: "inHamlet",
      campaignLevel: 2,
      hamletReturn: { phase: "complete" },
      questSummary: { awarded: true },
    });
    expect(d.gold).toBe(payment.gold + payment.explorationSetup!.provisions.length);
    expect(d.heroes.map((h) => h.xp)).toEqual(payment.heroes.map((h) => (h.xp ?? 0) + xp));
    expect(d.stagecoachXp).toBe((payment.stagecoachXp ?? 0) + xp);
    expect(d.heroes.map((h) => [h.wounds, h.stress, h.diseaseId, h.quirkIds])).toEqual(
      payment.heroes.map((h) => [h.wounds, h.stress, h.diseaseId, h.quirkIds]),
    );
    expect(d.explorationSetup).toMatchObject({ light: 5, provisions: [] });
    expect(d.trinkets!.level).toBe(2);
    expect(d.conditions!.diseaseDiscard).toEqual([]);
    expect(d.conditions!.quirkDiscard).toEqual([]);
    expect(applyCommand(run.state, { type: "finishReturnToHamlet" }).state).toBe(run.state);
    expect(applyCommand(run.state, { type: "beginReturnToHamlet" }).state).toBe(run.state);
    conserved(run.state);
    replay(run);
    expect(scout.game).toEqual(before);
  },
  60000,
);

it.skip("seed2：真实Ghoul Howl/重复感染后战斗胜利，回村第四负面永久死亡停在补人门，不发XP/补给金", () => {
  let run: ReturnType<typeof journey> | undefined;
  for (let seed = 2; seed < 800; seed++) {
    const abbey = naturalAbbeyQuest(undefined, seed);
    const candidate = journey(abbey.game, "quest:p007");
    if (candidate.state.dungeon!.phase !== "awaitingReplacement") continue;
    if (candidate.events.filter((e) => e.type === "diseaseAcquired").length < 2) continue;
    if (!candidate.exited.dungeon!.heroes.every((h) => !h.dead)) continue;
    run = candidate;
    break;
  }
  if (!run) throw new Error("未找到 Ghoul/感染停在补人门的 Fundraiser 种子（2+）");
  const d = run.state.dungeon!;
  expect(run.battles).toEqual([
    ["monster_medium:p018", "monster_medium:p053", "monster_large:p003"],
  ]);
  expect(run.events.some((e) => e.type === "monsterTargetEffectsResolved")).toBe(true);
  expect(run.events.filter((e) => e.type === "diseaseAcquired").length).toBeGreaterThanOrEqual(2);
  expect(run.events.some((e) => e.type === "battleFinished" && e.outcome === "victory")).toBe(true);
  expect(run.exited.dungeon!.heroes.every((h) => !h.dead)).toBe(true);
  expect(d).toMatchObject({
    phase: "awaitingReplacement",
    hamletReturn: { phase: "awaitingReplacement" },
    questSummary: { awarded: false },
  });
  expect(d.heroes.some((h) => h.dead && h.deathReason === "madness")).toBe(true);
  expect(d.gold).toBe(run.exited.dungeon!.gold);
  expect(d.heroes.map((h) => h.xp)).toEqual(run.exited.dungeon!.heroes.map((h) => h.xp));
  expect(d.stagecoachXp).toBe(run.exited.dungeon!.stagecoachXp);
  expect(d.explorationSetup!.provisions).toEqual(run.exited.dungeon!.explorationSetup!.provisions);
  expect(applyCommand(run.state, { type: "finishReturnToHamlet" }).state).toBe(run.state);
  conserved(run.state);
  replay(run);
}, 60000);

it("正式I级前缀可保存恢复；Boss跳过预览命令/伪造II级快照仍拒绝", () => {
  const loaded = loadQuestSave(JSON.parse(JSON.stringify(scout.save)), sources);
  expect(loaded.game).toEqual(scout.game);
  const ready = preparationReady(loaded.game);
  const advanced = ok(ready, { type: "advanceCampaignLevel" }).state;
  expect(savedCommandSchema.safeParse({ type: "advanceCampaignLevel" }).success).toBe(false);
  expect(() =>
    createQuestSave(
      scout.start,
      [...scout.commands, { type: "advanceCampaignLevel" }],
      advanced,
      sources,
    ),
  ).toThrow();
  expect(() =>
    loadQuestSave({ ...scout.save, snapshot: JSON.parse(JSON.stringify(advanced)) }, sources),
  ).toThrow("快照与回放不一致");
  expect(loaded.game).toEqual(scout.game);
}, 60000);
