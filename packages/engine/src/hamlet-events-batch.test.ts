import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { createRng } from "./rng";
import events from "../../data/normalized/corebox/hamlet_event.json";
import { hamletEventFileSchema } from "../../data/src/hamlet-event";
import dictionary from "../../data/dictionary/icon-dictionary-v1.8.json";

const cards = hamletEventFileSchema.parse(events).cards;
function firstEvent(seed: number) {
  const rng = createRng(seed);
  for (let i = 0; i < 11; i++) rng.next();
  const ids = cards.map((c) => c.id);
  for (let i = 15; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  return ids[0]!;
}
const seedFor = (id: string) =>
  Array.from({ length: 300 }, (_, i) => i + 1).find((seed) => firstEvent(seed) === id)!;

function returned(seed: number) {
  let game = createCoreDungeonQuest(seed, "quest:p001", "radiant", coreParty, coreQuestSources);
  const commands: Command[] = [];
  const step = (c: Command) => {
    const r = applyCommand(game, c);
    if (r.events.some((e) => e.type === "commandRefused"))
      throw new Error(JSON.stringify(r.events));
    game = r.state;
    commands.push(c);
    return r;
  };
  let r = step({ type: "rollDungeonProvisions" });
  while (r.pendingChoice)
    r = step({
      type: "resolveChoice",
      choiceId: r.pendingChoice.id,
      optionId: r.pendingChoice.options[0]!.id,
    });
  r = step({ type: "leaveDungeon" });
  step({ type: "resolveChoice", choiceId: r.pendingChoice!.id, optionId: "agree" });
  step({ type: "summarizeDungeonQuest" });
  step({ type: "beginReturnToHamlet" });
  step({ type: "finishReturnToHamlet" });
  return { game, commands, step };
}
function ok(game: GameState, command: Command) {
  const r = applyCommand(game, command);
  expect(
    r.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBe(false);
  return r;
}
function choose(game: GameState, optionId: string): Command {
  return { type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId };
}

it("三张目标卡无未审效果图标；Unsettling Darkness光照图标已确认", () => {
  for (const id of ["hamlet_event:p004", "hamlet_event:p008", "hamlet_event:p015"]) {
    const card = cards.find((c) => c.id === id)!;
    expect(card.dayBadge.status).toBe("confirmed");
    for (const iconId of card.effectIconIds) {
      const icon = dictionary.icons.find((i) => i.iconId === iconId)!;
      expect(icon.status, iconId).toBe("confirmed");
    }
  }
  expect(dictionary.icons.find((i) => i.iconId === "d13c8b76af")).toMatchObject({
    key: "light",
    status: "confirmed",
  });
});

it("真实seed12抽Unsettling Darkness：标记光照4、洗回3天，出征后开局光照4并可回放", () => {
  const seed = seedFor("hamlet_event:p004");
  expect(seed).toBe(12);
  const base = returned(seed);
  const drawn = ok(base.game, { type: "drawHamletEvent" }).state;
  expect(drawn.dungeon!.hamlet).toMatchObject({
    active: null,
    phase: "awaitingCaretaker",
    preparationDays: 3,
  });
  expect(drawn.dungeon!.nextQuestStartingLight).toBe(4);
  expect(drawn.dungeon!.hamlet!.deck).toHaveLength(16);
  const start = {
    seed,
    questId: "quest:p001" as const,
    mode: "radiant" as const,
    party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
  };
  const commands = [...base.commands, { type: "drawHamletEvent" as const }];
  expect(
    loadQuestSave(
      JSON.parse(JSON.stringify(createQuestSave(start, commands, drawn, coreQuestSources))),
      coreQuestSources,
    ).game,
  ).toEqual(drawn);
  // 明示准备完成夹具，验证出征应用光照标记。
  const ready = {
    ...drawn,
    dungeon: {
      ...drawn.dungeon!,
      hamlet: { ...drawn.dungeon!.hamlet!, phase: "preparationComplete" as const, remainingDays: 0 },
      pending: null,
    },
  };
  let game = ok(ready, { type: "offerNextQuest" }).state;
  const offer = game.dungeon!.pending!;
  game = ok(game, { type: "resolveChoice", choiceId: offer.id, optionId: offer.options[0]!.id })
    .state;
  expect(game.dungeon!.explorationSetup!.light).toBe(4);
  expect(game.dungeon!.nextQuestStartingLight).toBeUndefined();
  expect(game.dungeon!.phase).toBe("awaitingProvisions");
  game = ok(game, { type: "rollDungeonProvisions" }).state;
  while (game.dungeon!.pending)
    game = ok(game, choose(game, game.dungeon!.pending!.options[0]!.id)).state;
  expect(game.dungeon!.phase).toBe("ready");
  expect(game.dungeon!.explorationSetup!.light).toBe(4);
});

it("真实seed17抽Traveling Merchants：标记改骰、出征后四英雄可改/放弃并清除标记", () => {
  const seed = seedFor("hamlet_event:p008");
  expect(seed).toBe(17);
  const base = returned(seed);
  const drawn = ok(base.game, { type: "drawHamletEvent" }).state;
  expect(drawn.dungeon!.nextQuestProvisionFaceChoice).toBe(true);
  expect(drawn.dungeon!.hamlet).toMatchObject({
    phase: "awaitingCaretaker",
    preparationDays: 2,
    active: null,
  });
  const ready = {
    ...drawn,
    dungeon: {
      ...drawn.dungeon!,
      hamlet: { ...drawn.dungeon!.hamlet!, phase: "preparationComplete" as const, remainingDays: 0 },
      pending: null,
    },
  };
  let game = ok(ready, { type: "offerNextQuest" }).state;
  const offer = game.dungeon!.pending!;
  game = ok(game, { type: "resolveChoice", choiceId: offer.id, optionId: offer.options[0]!.id })
    .state;
  expect(game.dungeon!.nextQuestProvisionFaceChoice).toBe(true);
  game = ok(game, { type: "rollDungeonProvisions" }).state;
  while (game.dungeon!.pending?.id.startsWith("dungeon-starting-provisions:"))
    game = ok(game, choose(game, "torch")).state;
  expect(game.dungeon!.pending!.id.startsWith("dungeon-traveling-merchants:")).toBe(true);
  expect(game.dungeon!.provisionFaceChoiceRemaining).toHaveLength(4);
  const first = game.dungeon!.pending!;
  const setOpt = first.options.find((o) => o.id.startsWith("set:"))!;
  const parsed = /^set:(.+):(food|bandage|potion|torch|tool)$/.exec(setOpt.id)!;
  game = ok(game, choose(game, setOpt.id)).state;
  expect(game.dungeon!.explorationSetup!.provisions.find((p) => p.id === parsed[1])!.face).toBe(
    parsed[2],
  );
  while (game.dungeon!.pending?.id.startsWith("dungeon-traveling-merchants:"))
    game = ok(game, choose(game, "skip")).state;
  expect(game.dungeon!.phase).toBe("ready");
  expect(game.dungeon!.nextQuestProvisionFaceChoice).toBeUndefined();
  expect(game.dungeon!.provisionFaceChoiceRemaining).toBeUndefined();
});

it("真实seed8抽Guild Training：逐英雄免费升级/放弃，永久移出，金币XP不变，存档一致", () => {
  const seed = seedFor("hamlet_event:p015");
  expect(seed).toBe(8);
  const base = returned(seed);
  let game = ok(base.game, { type: "drawHamletEvent" }).state;
  expect(game.dungeon!.hamlet).toMatchObject({
    active: "hamlet_event:p015",
    phase: "eventBlocked",
    preparationDays: null,
  });
  expect(game.dungeon!.pending!.id.startsWith("hamlet-guild-training:")).toBe(true);
  const gold = game.dungeon!.gold;
  const xp = game.dungeon!.heroes.map((h) => h.xp ?? 0);
  const first = game.dungeon!.pending!;
  const upgrade = first.options.find((o) => o.id.startsWith("upgrade:"))!;
  game = ok(game, choose(game, upgrade.id)).state;
  expect(game.dungeon!.gold).toBe(gold);
  expect(game.dungeon!.heroes.map((h) => h.xp ?? 0)).toEqual(xp);
  expect(game.dungeon!.heroes[0]!.permanentlyRemovedSkillIds).toContain(
    upgrade.id.replace("upgrade:", ""),
  );
  while (game.dungeon!.pending?.id.startsWith("hamlet-guild-training:"))
    game = ok(game, choose(game, "skip")).state;
  expect(game.dungeon!.hamlet).toMatchObject({
    active: null,
    phase: "awaitingCaretaker",
    preparationDays: 2,
    permanentlyRemoved: ["hamlet_event:p015"],
  });
  expect(game.dungeon!.hamlet!.deck).toHaveLength(15);
  expect(game.dungeon!.hamlet!.deck).not.toContain("hamlet_event:p015");
  const start = {
    seed,
    questId: "quest:p001" as const,
    mode: "radiant" as const,
    party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
  };
  const afterDraw = ok(base.game, { type: "drawHamletEvent" }).state;
  const upgraded = ok(afterDraw, choose(afterDraw, upgrade.id)).state;
  expect(
    loadQuestSave(
      JSON.parse(
        JSON.stringify(
          createQuestSave(
            start,
            [
              ...base.commands,
              { type: "drawHamletEvent" },
              {
                type: "resolveChoice",
                choiceId: afterDraw.dungeon!.pending!.id,
                optionId: upgrade.id,
              },
            ],
            upgraded,
            coreQuestSources,
          ),
        ),
      ),
      coreQuestSources,
    ).game,
  ).toEqual(upgraded);
});
