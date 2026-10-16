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

const ids = ["aggressive", "defensive", "ranged", "support"].flatMap((s) =>
  [0, 1].map((i) => `dungeon-starting-provision:${s}:${i}`),
);
const choose = (g: GameState, optionId: string): Command => ({
  type: "resolveChoice",
  choiceId: g.dungeon!.pending!.id,
  optionId,
});
function ok(g: GameState, c: Command) {
  const r = applyCommand(g, c);
  expect(
    r.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toEqual([]);
  return r;
}
function seedFor(mode: "standard" | "radiant") {
  return Array.from({ length: 300 }, (_, i) => i + 1).find((seed) => {
    const rng = createRng(seed),
      deck = events.cards.map((c) => c.id);
    for (let i = 0; i < (mode === "radiant" ? 11 : 15); i++) rng.next();
    for (let i = 15; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    }
    return deck[0] === "hamlet_event:p003";
  })!;
}
it("Lost Shipment完整身份/效果行守门；16张事件均启用，生成文件可复现", () => {
  expect(buildHamletEvents(rawFileSchema.parse(raw))).toEqual(events);
  expect(events.cards[2]).toMatchObject({ runtime: "lostShipment", days: 4 });
  expect(events.cards.filter((c) => c.runtime === "unimplemented")).toEqual([]);
  for (const field of ["effect", "page", "id"] as const) {
    const changed = structuredClone(rawFileSchema.parse(raw));
    if (field === "effect")
      changed.cards[2]!.faces.front.lines.at(-2)!.text = "Party rolls -3 {icon:d712688f15}";
    if (field === "page") changed.cards[2]!.faces.front.page = 1;
    if (field === "id") changed.cards[2]!.id = "hamlet_event:p001";
    expect(() => buildHamletEvents(changed)).toThrow("Lost Shipment身份或完整效果行漂移");
  }
});

it.each([
  ["standard", 0, 2, 6],
  ["radiant", 0, 2, 2],
  ["radiant", 1, 2, 3],
  ["radiant", 1, 3, 4],
] as const)(
  "%s自然事件/四天准备/出征取消%d和%d后实际掷%d颗；正式存档续接",
  (mode, a, b, rolls) => {
    const seed = seedFor(mode),
      start = {
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
    const save = () =>
      expect(
        loadQuestSave(
          JSON.parse(JSON.stringify(createQuestSave(start, commands, game, sources))),
          sources,
        ).game,
      ).toEqual(game);
    step({ type: "rollDungeonProvisions" });
    while (game.dungeon!.pending) step(choose(game, "torch"));
    step({ type: "leaveDungeon" });
    step(choose(game, "agree"));
    step({ type: "summarizeDungeonQuest" });
    step({ type: "beginReturnToHamlet" });
    step({ type: "finishReturnToHamlet" });
    const before = game;
    step({ type: "drawHamletEvent" });
    expect(game.dungeon!.hamlet).toMatchObject({
      last: "hamlet_event:p003",
      active: null,
      preparationDays: 4,
    });
    expect(game.dungeon!.hamlet!.deck).toHaveLength(16);
    expect(game.dungeon!.gold).toBe(before.dungeon!.gold);
    expect(game.dungeon!.nextQuestLostShipment).toBe(true);
    save();
    for (let day = 0; day < 4; day++) {
      step({ type: "rollHamletCaretaker" });
      step({ type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" });
    }
    step({ type: "offerNextQuest" });
    step(choose(game, game.dungeon!.pending!.options[0]!.id));
    const cursor = game.dungeon!.cursor;
    const planning = step({ type: "rollDungeonProvisions" });
    expect(planning.events.some((e) => e.type === "provisionRolled")).toBe(false);
    expect(game.dungeon!.pending!.options).toHaveLength(8);
    step(choose(game, ids[a]!));
    expect(game.dungeon!.pending!.options).toHaveLength(7);
    expect(game.dungeon!.pending!.options.some((o) => o.id === ids[a])).toBe(false);
    expect(game.dungeon!.cursor).toBe(cursor);
    save();
    const result = step(choose(game, ids[b]!));
    expect(result.events.filter((e) => e.type === "provisionRolled").map((e) => e.face)).toEqual(
      Array.from({ length: rolls }, (_, i) => nextProvisionFace(seed, cursor + i)),
    );
    expect(game.dungeon!.cursor).toBe(cursor + rolls);
    expect(game.dungeon!.nextQuestLostShipment).toBeUndefined();
    save();
    while (game.dungeon!.pending) step(choose(game, "torch"));
    const pool = game.dungeon!.explorationSetup!.provisions;
    expect(pool).toHaveLength(6);
    expect(pool.some((p) => [ids[a], ids[b]].includes(p.id))).toBe(false);
    expect(game.dungeon!.startingProvisionOmittedIds).toBeUndefined();
    expect(game.dungeon!.phase).toBe("ready");
    expect(applyCommand(game, { type: "rollDungeonProvisions" }).state).toBe(game);
    save();
  },
  20000,
);

it("R-087标准/Radiant全部28种取消组合保持原骰类型；取消同一英雄两颗也不取消其建筑奖励", () => {
  for (const mode of ["standard", "radiant"] as const) {
    const base = createCoreDungeonQuest(7, "quest:p001", mode, coreParty, sources);
    // 明示补给机制夹具，计划直接注入；自然事件路径由上面的公开命令单独验收。
    const initial = {
      ...base,
      dungeon: { ...base.dungeon!, nextQuestLostShipment: true as const },
    };
    for (let a = 0; a < 8; a++)
      for (let b = a + 1; b < 8; b++) {
        let game = ok(initial, { type: "rollDungeonProvisions" }).state;
        game = ok(game, choose(game, ids[a]!)).state;
        const rolled = ok(game, choose(game, ids[b]!));
        game = rolled.state;
        const count = mode === "standard" ? 6 : 4 - Number(a % 2 === 0) - Number(b % 2 === 0);
        expect(game.dungeon!.cursor).toBe(initial.dungeon.cursor + count);
        while (game.dungeon!.pending) game = ok(game, choose(game, "torch")).state;
        expect(game.dungeon!.explorationSetup!.provisions.map((p) => p.id).sort()).toEqual(
          ids.filter((_, i) => i !== a && i !== b).sort(),
        );
      }
    for (const bonus of [3, 20]) {
      const rewarded = {
        ...initial,
        dungeon: {
          ...initial.dungeon,
          heroes: initial.dungeon.heroes.map((h, i) =>
            i === 0 ? { ...h, nextQuestProvisionDice: bonus } : h,
          ),
        },
      };
      let game = ok(rewarded, { type: "rollDungeonProvisions" }).state;
      game = ok(game, choose(game, ids[0]!)).state;
      const result = ok(game, choose(game, ids[1]!));
      expect(
        result.events.filter((e) => e.type === "provisionRolled" && e.message.includes("奖励")),
      ).toHaveLength(Math.min(bonus, 10));
      game = result.state;
      while (game.dungeon!.pending) game = ok(game, choose(game, "torch")).state;
      expect(game.dungeon!.explorationSetup!.provisions).toHaveLength(Math.min(6 + bonus, 16));
      expect(game.dungeon!.heroes[0]!.nextQuestProvisionDice).toBeUndefined();
    }
  }
});

it("减骰待选冻结无关命令；不能取消奖励、重复/过期取消、伪造遗漏清单或非法奖励", () => {
  const base = createCoreDungeonQuest(7, "quest:p001", "radiant", coreParty, sources);
  const initial = { ...base, dungeon: { ...base.dungeon!, nextQuestLostShipment: true as const } };
  const first = ok(initial, { type: "rollDungeonProvisions" }).state;
  const command = choose(first, ids[0]!),
    second = ok(first, command).state;
  for (const c of [
    command,
    choose(second, ids[0]!),
    choose(second, "dungeon-bonus-provision:hero-0:0"),
    { type: "rollDungeonProvisions" },
    { type: "beginDungeonExploration" },
  ] as Command[])
    expect(applyCommand(second, c).state).toBe(second);
  for (const omitted of [[ids[0]!, ids[0]!], ["unknown"], [ids[0]!, ids[1]!, ids[2]!]]) {
    const fixture = {
      ...initial,
      dungeon: { ...initial.dungeon, startingProvisionOmittedIds: omitted },
    };
    expect(applyCommand(fixture, { type: "rollDungeonProvisions" }).state).toBe(fixture);
  }
  const invalid = {
    ...initial,
    dungeon: {
      ...initial.dungeon,
      heroes: initial.dungeon.heroes.map((h, i) =>
        i === 0 ? { ...h, nextQuestProvisionDice: -1 } : h,
      ),
    },
  };
  expect(applyCommand(invalid, { type: "rollDungeonProvisions" }).state).toBe(invalid);
});
