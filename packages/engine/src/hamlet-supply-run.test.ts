import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources as sources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { nextProvisionFace } from "./loot";
import { createRng } from "./rng";
import events from "../../data/normalized/corebox/hamlet_event.json";
import raw from "../../data/extract/corebox/raw/hamlet_event.json";
import { rawFileSchema } from "../../data/src/extract/raw";
import { buildHamletEvents } from "../../data/src/normalize/hamlet-event";

function seedFor(mode: "standard" | "radiant") {
  return Array.from({ length: 300 }, (_, i) => i + 1).find((seed) => {
    const rng = createRng(seed),
      deck = events.cards.map((c) => c.id);
    for (let i = 0; i < (mode === "radiant" ? 11 : 15); i++) rng.next();
    for (let i = 15; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    }
    return deck[0] === "hamlet_event:p001";
  })!;
}
const choose = (game: GameState, optionId = "torch"): Command => ({
  type: "resolveChoice",
  choiceId: game.dungeon!.pending!.id,
  optionId,
});
function ok(game: GameState, command: Command) {
  const r = applyCommand(game, command);
  expect(
    r.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toEqual([]);
  return r;
}

it("Supply Run限定身份和完整效果行漂移拒绝；规范化可复现", () => {
  expect(buildHamletEvents(rawFileSchema.parse(raw))).toEqual(events);
  expect(events.cards[0]).toMatchObject({ runtime: "supplyRun", days: 2 });
  for (const field of ["effect", "page", "id"] as const) {
    const changed = structuredClone(rawFileSchema.parse(raw));
    if (field === "effect")
      changed.cards[0]!.faces.front.lines.at(-2)!.text = "Party gains +3 {icon:d712688f15}";
    if (field === "page") changed.cards[0]!.faces.front.page = 2;
    if (field === "id") changed.cards[0]!.id = "hamlet_event:p003";
    expect(() => buildHamletEvents(changed)).toThrow("Supply Run身份或完整效果行漂移");
  }
});

it.each(["standard", "radiant"] as const)(
  "%s自然抽Supply Run→两天准备→出征10颗；各检查点正式存档恢复一致",
  (mode) => {
    const seed = seedFor(mode);
    const start = {
      seed,
      questId: "quest:p001" as const,
      mode,
      party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
    };
    let game = createCoreDungeonQuest(seed, start.questId, mode, coreParty, sources);
    const commands: Command[] = [];
    const step = (c: Command) => {
      const r = ok(game, c);
      game = r.state;
      commands.push(c);
      return r;
    };
    const saved = () =>
      expect(
        loadQuestSave(
          JSON.parse(JSON.stringify(createQuestSave(start, commands, game, sources))),
          sources,
        ).game,
      ).toEqual(game);
    step({ type: "rollDungeonProvisions" });
    while (game.dungeon!.pending) step(choose(game));
    step({ type: "leaveDungeon" });
    step(choose(game, "agree"));
    step({ type: "summarizeDungeonQuest" });
    step({ type: "beginReturnToHamlet" });
    step({ type: "finishReturnToHamlet" });
    const before = structuredClone(game),
      cursor = game.dungeon!.cursor;
    step({ type: "drawHamletEvent" });
    expect(game.dungeon!.hamlet).toMatchObject({
      last: "hamlet_event:p001",
      active: null,
      phase: "awaitingCaretaker",
      preparationDays: 2,
    });
    expect(game.dungeon!.hamlet!.deck).toHaveLength(16);
    expect(game.dungeon!.cursor).toBe(cursor + 30); // 抽牌洗牌15 + 完成洗回15，尚未掷奖励。
    expect(game.dungeon!.nextQuestPartyProvisionDice).toBe(2);
    expect(game.dungeon!.heroes).toEqual(before.dungeon!.heroes);
    expect(applyCommand(game, { type: "drawHamletEvent" }).state).toBe(game);
    saved();
    for (let day = 0; day < 2; day++) {
      step({ type: "rollHamletCaretaker" });
      step({ type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" });
    }
    step({ type: "offerNextQuest" });
    step(choose(game, game.dungeon!.pending!.options[0]!.id));
    expect(game.dungeon!.nextQuestPartyProvisionDice).toBe(2);
    saved();
    const rollCursor = game.dungeon!.cursor;
    const rolled = step({ type: "rollDungeonProvisions" });
    expect(rolled.events.filter((e) => e.type === "provisionRolled").map((e) => e.face)).toEqual(
      Array.from({ length: (mode === "radiant" ? 4 : 8) + 2 }, (_, i) =>
        nextProvisionFace(seed, rollCursor + i),
      ),
    );
    expect(game.dungeon!.nextQuestPartyProvisionDice).toBeUndefined();
    expect(applyCommand(game, { type: "rollDungeonProvisions" }).state).toBe(game);
    saved();
    while (game.dungeon!.pending) {
      step(choose(game));
    }
    expect(game.dungeon!.explorationSetup!.provisions).toHaveLength(10);
    expect(game.dungeon!.phase).toBe("ready");
    saved();
  },
  30000,
);

it("队伍Wild待选由party选择；英雄奖励合计满16时只掷可用槽，计划一次清除", () => {
  const base = createCoreDungeonQuest(1, "quest:p001", "radiant", coreParty, sources);
  const seed = Array.from({ length: 100 }, (_, i) => i + 1).find(
    (s) => nextProvisionFace(s, base.dungeon!.cursor + 4) === "wild",
  )!;
  const fixture = {
    ...base,
    seed,
    dungeon: { ...base.dungeon!, nextQuestPartyProvisionDice: 2 as const },
  };
  let game = ok(fixture, { type: "rollDungeonProvisions" }).state;
  while (game.dungeon!.pending?.actorId !== "party") game = ok(game, choose(game)).state;
  const pending = game.dungeon!.pending!;
  expect(pending.prompt).toContain("party");
  expect(applyCommand(game, choose(game, "invalid")).state).toBe(game);
  const chosen = choose(game);
  game = ok(game, chosen).state;
  expect(applyCommand(game, chosen).state).toBe(game);
  while (game.dungeon!.pending) game = ok(game, choose(game)).state;
  expect(
    game.dungeon!.explorationSetup!.provisions.find((p) => p.id === "dungeon-party-provision:0")!
      .face,
  ).toBe("torch");
  for (const bonus of [7, 8]) {
    const capped = {
      ...fixture,
      dungeon: {
        ...fixture.dungeon,
        heroes: fixture.dungeon.heroes.map((h, i) =>
          i === 0 ? { ...h, nextQuestProvisionDice: bonus } : h,
        ),
      },
    };
    const r = ok(capped, { type: "rollDungeonProvisions" });
    expect(r.state.dungeon!.cursor).toBe(capped.dungeon.cursor + 12);
    expect(
      r.events.filter((e) => e.type === "provisionRolled" && e.actorId === "party"),
    ).toHaveLength(8 - bonus);
    expect(r.state.dungeon!.nextQuestPartyProvisionDice).toBeUndefined();
    expect(r.state.dungeon!.heroes[0]!.nextQuestProvisionDice).toBeUndefined();
    let final = r.state;
    while (final.dungeon!.pending) final = ok(final, choose(final)).state;
    expect(final.dungeon!.explorationSetup!.provisions).toHaveLength(16);
  }
});
