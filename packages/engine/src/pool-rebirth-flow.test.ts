import { expect, it } from "vitest";
import { naturalParty, naturalQuest } from "./test-helpers/natural-quest";
import { coreQuestSources } from "./test-helpers/core-quest";
import { applyCommand, type Command, type GameState } from "./command";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { conditionPoolProblem } from "./conditions";
import { trinketPoolProblem } from "./trinket-acquisition";

const start = {
  seed: 916,
  questId: "quest:p016" as const,
  mode: "radiant" as const,
  party: naturalParty,
};
let prefix: ReturnType<typeof naturalQuest> | undefined;
function journey() {
  prefix ??= naturalQuest(916, "quest:p016", true, coreQuestSources, 2, {
    observe(state) {
      if (state.dungeon?.pending?.id.startsWith("pool-rebirth:")) throw Error("pool-checkpoint");
    },
  });
  expect(prefix.stopReason).toBe("pool-checkpoint");
  return {
    game: structuredClone(prefix.state),
    commands: [...prefix.commands],
    events: prefix.events,
  };
}
function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.find((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBeUndefined();
  return result;
}

it("seed916公开探索/真实重生池战斗死亡胜利→选择复活→免费补位→入队，各停点严格存档回放", () => {
  const journeyState = journey();
  let game = journeyState.game;
  const { commands, events } = journeyState;
  const checkpoint = () => {
    const save = createQuestSave(start, commands, game, coreQuestSources);
    const loaded = loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game;
    expect(loaded).toEqual(game);
    game = loaded;
  };
  const step = (c: Command) => {
    const r = ok(game, c);
    game = r.state;
    commands.push(c);
    return r;
  };
  expect(events.some((e) => e.type === "battleFinished" && e.outcome === "victory")).toBe(true);
  const d = game.dungeon!,
    archived = structuredClone(d.fallenHeroes![0]!);
  expect(archived.hero.id).toBe("hero-0");
  expect(d.rooms.find((r) => r.id === d.position)!.cleared).toBe(true);
  const tokens = d.waitingHeroTokens;
  const originalChoice = d.pending!;
  checkpoint();
  step({ type: "resolveChoice", choiceId: originalChoice.id, optionId: archived.hero.id });
  expect(game.dungeon!.poolRebirthRooms).toEqual([{ roomId: d.position, status: "used" }]);
  const revived = game.dungeon!.stagecoachHeroes![0]!;
  expect(revived).toMatchObject({
    level: archived.hero.level,
    wounds: archived.hero.wounds,
    stress: archived.hero.stress,
    dead: false,
    skillIds: archived.hero.skillIds,
  });
  expect(game.dungeon!.waitingHeroTokens).toBe(tokens);
  checkpoint();
  const before = game;
  const stale = applyCommand(game, {
    type: "resolveChoice",
    choiceId: originalChoice.id,
    optionId: archived.hero.id,
  });
  expect(stale.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(stale.state).toBe(before);
  step({ type: "prepareReplacementHero" });
  checkpoint();
  step({
    type: "resolveChoice",
    choiceId: game.dungeon!.replacementPreparation!.choice.id,
    optionId: `stagecoach:${revived.id}`,
  });
  expect(game.dungeon!.waitingHeroTokens).toBe(tokens);
  checkpoint();
  expect(game.dungeon!.preparedReplacements).toHaveLength(1);
  step({ type: "joinPreparedReplacements" });
  expect(game.dungeon!.heroes).toHaveLength(4);
  expect(game.dungeon!.heroes.find((h) => h.id === revived.id)).toMatchObject({
    wounds: archived.hero.wounds,
    stress: archived.hero.stress,
    skillIds: archived.hero.skillIds,
  });
  expect(game.dungeon!.stagecoachHeroes).toEqual([]);
  expect(game.dungeon!.heroes.every((h) => !h.dead)).toBe(true);
  expect(game.dungeon!.waitingHeroTokens).toBe(tokens);
  expect(conditionPoolProblem(game.dungeon!.conditions!, game.dungeon!.heroes)).toBeNull();
  expect(trinketPoolProblem(game.dungeon!.trinkets!, game.dungeon!.heroes)).toBeNull();
  expect(game.dungeon!.pending?.id).toMatch(/^dungeon-room-curio-draw:/);
  for (let i = 0; i < 40; i++) {
    const d = game.dungeon!,
      pending = d.deathTrinketChoice ?? d.pending;
    if (pending) {
      const option =
        pending.options.find((o) => o.id.startsWith("use:")) ??
        pending.options.find((o) => o.id === "hero-3") ??
        pending.options.find((o) => ["continue", "gold", "discard-new"].includes(o.id)) ??
        pending.options[0]!;
      step({ type: "resolveChoice", choiceId: pending.id, optionId: option.id });
    } else if (d.phase === "awaitingCurio") step({ type: "resolveDungeonCurio" });
    else if (d.phase === "blockedPressure") step({ type: "resolveDungeonPressure" });
    else break;
  }
  expect(game.dungeon!.phase).toBe("ready");
  expect(game.dungeon!.curio!.active).toBeNull();
  step({ type: "ping", message: "复活后继续" });
  expect(game.dungeon!.pending).toBeNull();
  checkpoint();
}, 60000);

it("R-150放弃后机会消耗，后续命令不重新展示且旧选择原子拒绝", () => {
  const { game } = journey(),
    choice = game.dungeon!.pending!;
  const declined = ok(game, {
    type: "resolveChoice",
    choiceId: choice.id,
    optionId: "decline",
  }).state;
  expect(declined.dungeon!.poolRebirthRooms![0]!.status).toBe("declined");
  const continued = ok(declined, { type: "ping", message: "重返同一已清理房间" }).state;
  expect(continued.dungeon!.pending).toBeNull();
  const repeated = applyCommand(continued, {
    type: "resolveChoice",
    choiceId: choice.id,
    optionId: "hero-0",
  });
  expect(repeated.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(repeated.state).toBe(continued);
});

it("R-152零等待代币也能选择复活英雄，普通新招募不会出现在选项", () => {
  const { game } = journey(),
    choice = game.dungeon!.pending!;
  const revived = ok(game, {
    type: "resolveChoice",
    choiceId: choice.id,
    optionId: "hero-0",
  }).state;
  const boundary = { ...revived, dungeon: { ...revived.dungeon!, waitingHeroTokens: 0 } };
  const prepared = ok(boundary, { type: "prepareReplacementHero" }).state;
  const pending = prepared.dungeon!.replacementPreparation!.choice;
  expect(pending.options).toHaveLength(1);
  expect(pending.options[0]!.id).toBe(`stagecoach:${revived.dungeon!.stagecoachHeroes![0]!.id}`);
  const selected = ok(prepared, {
    type: "resolveChoice",
    choiceId: pending.id,
    optionId: pending.options[0]!.id,
  }).state;
  const joined = ok(selected, { type: "joinPreparedReplacements" }).state;
  expect(joined.dungeon!.waitingHeroTokens).toBe(0);
  expect(joined.dungeon!.campaignFailure).toBeUndefined();
});

it("R-151付款死亡边界：三名存活队员全死也完成复活，旧机会不重新开启", () => {
  const { game } = journey(),
    d = game.dungeon!,
    choice = d.pending!;
  const cards = d.resolveCards.filter((c) => c.role === "affliction");
  let index = 0;
  const heroes = d.heroes.map((h) =>
    h.dead ? h : { ...h, stress: 9, resolveTested: true, resolveCardId: cards[index++]!.id },
  );
  const held = heroes.flatMap((h) => (h.resolveCardId ? [h.resolveCardId] : []));
  // 明确的压力边界注入；实际死亡/胜利/免费入队的自然日志由上方黄金场景覆盖。
  const state = {
    ...game,
    dungeon: {
      ...d,
      heroes,
      resolveDecks: Object.fromEntries(
        (["virtue", "affliction"] as const).map((role) => [
          role,
          d.resolveCards.filter((c) => c.role === role && !held.includes(c.id)).map((c) => c.id),
        ]),
      ),
    },
  };
  const result = ok(state, { type: "resolveChoice", choiceId: choice.id, optionId: "hero-0" });
  expect(result.state.dungeon!.heroes.every((h) => h.dead)).toBe(true);
  expect(result.state.dungeon!.stagecoachHeroes![0]!.dead).toBe(false);
  expect(result.state.dungeon!.poolRebirthRooms![0]!.status).toBe("used");
  expect(result.state.dungeon!.campaignFailure).toBeUndefined();
});
