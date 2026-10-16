import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { currentHamletHero, hamletActionOptions } from "./hamlet-actions";
import { canSetHamletStances } from "./hamlet-stances";
import { createQuestSave, loadQuestSave } from "./quest-save";

const start = {
  seed: 40,
  questId: "quest:p001" as const,
  mode: "radiant" as const,
  party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
};
const reverse: Command = {
  type: "setHamletStances",
  heroIds: ["hero-3", "hero-2", "hero-1", "hero-0"],
};
function journey() {
  let game = createCoreDungeonQuest(
    start.seed,
    start.questId,
    start.mode,
    coreParty,
    coreQuestSources,
  );
  const commands: Command[] = [];
  function step(c: Command) {
    const r = applyCommand(game, c);
    expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    game = r.state;
    commands.push(c);
    return r;
  }
  let r = step({ type: "rollDungeonProvisions" });
  while (r.pendingChoice)
    r = step({
      type: "resolveChoice",
      choiceId: r.pendingChoice.id,
      optionId: r.pendingChoice.options[0]!.id,
    });
  r = step({ type: "leaveDungeon" });
  step({ type: "resolveChoice", choiceId: r.pendingChoice!.id, optionId: "agree" });
  for (const type of [
    "summarizeDungeonQuest",
    "beginReturnToHamlet",
    "finishReturnToHamlet",
  ] as const)
    step({ type });
  return {
    get game() {
      return game;
    },
    commands,
    step,
    day() {
      step({ type: "drawHamletEvent" });
      step({ type: "rollHamletCaretaker" });
    },
    choose(optionId: string) {
      return step({ type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId });
    },
    save() {
      const save = createQuestSave(start, commands, game, coreQuestSources);
      expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(game);
    },
  };
}
function firstVisit(game: GameState): Command {
  return hamletActionOptions(game).find(
    (o) =>
      o.command.type === "visitHamletBuilding" &&
      ["tavern3", "heal5"].includes(o.command.serviceId),
  )!.command;
}
it("事件前和当日首人前均免费换位，后续看守人队列按新姿态生成且存档回放", () => {
  const s = journey(),
    before = s.game.dungeon!;
  expect(canSetHamletStances(s.game)).toBe(true);
  s.step(reverse);
  expect(s.game.dungeon!.cursor).toBe(before.cursor);
  expect(s.game.dungeon!.gold).toBe(before.gold);
  s.day();
  expect(s.game.dungeon!.hamlet!.heroOrder).toEqual(["hero-3", "hero-2", "hero-1", "hero-0"]);
  s.step({ type: "setHamletStances", heroIds: ["hero-0", "hero-1", "hero-2", "hero-3"] });
  expect(currentHamletHero(s.game)!.id).toBe("hero-0");
  expect(s.game.dungeon!.pending).toBeNull();
  s.save();
});
it.each(["new-stances", "keep-day-order", "cancel"])(
  "日中%s协商前不换位，保留已花行动/建筑/费用；JSON与正式待选存档续接",
  (option) => {
    const s = journey();
    s.day();
    s.step(firstVisit(s.game));
    const before = structuredClone(s.game),
      d = before.dungeon!;
    s.step(reverse);
    expect(s.game.dungeon!.heroes).toEqual(d.heroes);
    expect(s.game.dungeon!.hamlet).toEqual(d.hamlet);
    expect(canSetHamletStances(s.game)).toBe(false);
    expect(applyCommand(s.game, reverse).state).toBe(s.game);
    const pending = s.game.dungeon!.pending!;
    for (const c of [
      { type: "resolveChoice", choiceId: "stale", optionId: option },
      { type: "resolveChoice", choiceId: pending.id, optionId: "invented" },
    ] as const)
      expect(applyCommand(s.game, c).state).toBe(s.game);
    s.save();
    const json = JSON.parse(JSON.stringify(s.game));
    const result = s.choose(option);
    expect(
      applyCommand(json, { type: "resolveChoice", choiceId: pending.id, optionId: option }),
    ).toEqual(result);
    const next = s.game.dungeon!;
    expect(next.hamletStanceProposal).toBeUndefined();
    expect(next.cursor).toBe(d.cursor);
    expect(next.gold).toBe(d.gold);
    expect(next.hamlet).toEqual({
      ...d.hamlet,
      heroOrder:
        option === "new-stances" ? ["hero-0", "hero-3", "hero-2", "hero-1"] : d.hamlet!.heroOrder,
    });
    expect(currentHamletHero(s.game)!.id).toBe(option === "new-stances" ? "hero-3" : "hero-1");
    expect(next.heroes.map((h) => h.id)).toEqual(
      option === "cancel" ? d.heroes.map((h) => h.id) : ["hero-3", "hero-2", "hero-1", "hero-0"],
    );
    for (const hero of next.heroes) {
      const old = d.heroes.find((h) => h.id === hero.id)!;
      expect(hero).toEqual({
        ...old,
        stance: hero.stance,
        ...(old.combat ? { combat: { ...old.combat, stance: hero.stance! } } : {}),
      });
    }
    s.save();
  },
);
it("协商重排余下三人后仍只花一天，下日按新姿态；已行动者不再行动或触发Zealous Speech", () => {
  const s = journey();
  s.day();
  s.step(firstVisit(s.game));
  const days = s.game.dungeon!.hamlet!.remainingDays ?? s.game.dungeon!.hamlet!.preparationDays!;
  s.step(reverse);
  s.choose("new-stances");
  expect(
    applyCommand(s.game, { type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" })
      .state,
  ).toBe(s.game);
  const actors: string[] = [];
  while (s.game.dungeon!.hamlet!.phase === "heroActions") {
    actors.push(currentHamletHero(s.game)!.id);
    const action =
      hamletActionOptions(s.game).find(
        (o) => o.command.type === "useHamletSkill" && o.command.skill !== "zealousSpeech",
      ) ?? hamletActionOptions(s.game)[0]!;
    s.step(action.command);
    while (s.game.dungeon!.pending) s.choose(s.game.dungeon!.pending!.options[0]!.id);
  }
  expect(actors).toEqual(["hero-3", "hero-2", "hero-1"]);
  expect(s.game.dungeon!.hamlet!.remainingDays).toBe(days - 1);
  s.step({ type: "rollHamletCaretaker" });
  expect(currentHamletHero(s.game)!.id).toBe("hero-3");
  s.save();
});
it("非法排列、死亡、待选、未结算事件及回村中不接换位，拒绝不改状态", () => {
  const s = journey();
  s.day();
  const game = s.game;
  for (const heroIds of [
    ["hero-0"],
    ["hero-0", "hero-1", "hero-2", "hero-2"],
    ["hero-0", "hero-1", "hero-2", "other"],
  ])
    expect(applyCommand(game, { type: "setHamletStances", heroIds }).state).toBe(game);
  for (const fields of [
    { phase: "returningToHamlet" as const },
    { pending: { id: "other", prompt: "pending", options: [] } },
    { heroes: game.dungeon!.heroes.map((h, i) => (i ? h : { ...h, dead: true })) },
    { hamlet: { ...game.dungeon!.hamlet!, active: "event" } },
    { hamlet: { ...game.dungeon!.hamlet!, heroOrder: ["hero-0", "hero-1", "hero-2", "other"] } },
  ]) {
    const bad: GameState = { ...game, dungeon: { ...game.dungeon!, ...fields } };
    expect(canSetHamletStances(bad)).toBe(false);
    expect(applyCommand(bad, reverse).state).toBe(bad);
  }
  expect(applyCommand(game, { ...reverse, type: "setDungeonStances" }).state).toBe(game);
});
