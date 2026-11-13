import { expect, it } from "vitest";
import medium from "../../data/normalized/extension/weald/monster_medium.json";
import large from "../../data/normalized/extension/weald/monster_large.json";
import curios from "../../data/normalized/extension/weald/curio.json";
import { wealdCurioFileSchema } from "../../data/src/curio";
import { applyCommand, type Command } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreQuestSources } from "./test-helpers/core-quest";
import { naturalParty, naturalQuest } from "./test-helpers/natural-quest";
import { currentHamletHero, hamletActionOptions } from "./hamlet-actions";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { dungeonMonsterPoolThrough } from "./monster-pool-runtime";
import { nextExpeditionLocationDecks } from "./hamlet-location-embark";
import { recoverHamletPools } from "./hamlet-return-pools";

const sources = {
  ...coreQuestSources,
  weald: { medium, large, curios: wealdCurioFileSchema.parse(curios).cards },
};
const packs = ["core", "weald"] as const;

function journey(questId: "quest:p001" | "quest:weald:p005" = "quest:p001") {
  const start = {
    seed: 2,
    questId,
    mode: "radiant" as const,
    party: naturalParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
    contentPacks: [...packs],
    bossEdgeRooms: true,
    stygianRoomRules: "full" as const,
  };
  let game = createCoreDungeonQuest(
    2,
    questId,
    "radiant",
    naturalParty,
    sources,
    true,
    "full",
    packs,
  );
  const commands: Command[] = [];
  const step = (command: Command) => {
    const result = applyCommand(game, command);
    expect(
      result.events.filter((e) => e.type === "commandRefused"),
      JSON.stringify(result.events),
    ).toEqual([]);
    commands.push(command);
    game = result.state;
  };
  const settle = () => {
    for (let i = 0; game.dungeon?.pending && i < 100; i++) {
      const pending = game.dungeon.pending;
      step({ type: "resolveChoice", choiceId: pending.id, optionId: pending.options[0]!.id });
    }
    expect(game.dungeon?.pending).toBeFalsy();
  };
  const save = () => {
    const saved = createQuestSave(start, commands, game, sources);
    const restored = loadQuestSave(JSON.parse(JSON.stringify(saved)), sources);
    expect(restored.game).toEqual(game);
    expect(restored.commands).toEqual(commands);
    game = restored.game;
    return saved;
  };
  const prepareHamlet = () => {
    step({ type: "leaveDungeon" });
    settle();
    step({ type: "summarizeDungeonQuest" });
    step({ type: "beginReturnToHamlet" });
    settle();
    step({ type: "finishReturnToHamlet" });
    step({ type: "drawHamletEvent" });
    settle();
    for (let i = 0; game.dungeon!.hamlet!.phase !== "preparationComplete" && i < 100; i++) {
      if (game.dungeon!.hamlet!.phase === "awaitingCaretaker") {
        step({ type: "rollHamletCaretaker" });
        continue;
      }
      const actorId = currentHamletHero(game)!.id;
      const speech = { type: "useHamletSkill", actorId, skill: "zealousSpeech" } as const;
      if (!applyCommand(game, speech).events.some((e) => e.type === "commandRefused")) step(speech);
      else {
        const service = hamletActionOptions(game)
          .map((o) => o.command)
          .find((c) => c.type === "visitHamletBuilding");
        if (!service) throw new Error(`村庄无可用服务 ${actorId}`);
        step(service);
        settle();
      }
    }
    expect(game.dungeon!.hamlet!.phase).toBe("preparationComplete");
  };
  const embark = (mode: "weald-two" | "ruins-two") => {
    step({ type: "offerNextQuest" });
    save();
    const draw = game.dungeon!.pending!;
    const option = draw.options.find((o) => o.id === `hamlet-quest-draw:${mode}`)!;
    expect(option).toBeDefined();
    step({ type: "resolveChoice", choiceId: draw.id, optionId: option.id });
    save();
    const pending = game.dungeon!.pending!;
    step({ type: "resolveChoice", choiceId: pending.id, optionId: pending.options[0]!.id });
    save();
  };
  return {
    start,
    commands,
    step,
    settle,
    save,
    prepareHamlet,
    embark,
    get game() {
      return game;
    },
    observe(state: typeof game, command: Command) {
      commands.push(command);
      game = state;
    },
  };
}

it("公开日志：遗迹 → Weald → 遗迹，抽法／任务待选与出征补给均可恢复且来源不串池", () => {
  const run = journey();
  run.step({ type: "rollDungeonProvisions" });
  run.settle();
  run.prepareHamlet();
  run.embark("weald-two");
  const d = run.game.dungeon!;
  expect(d.roomCards!.cards.every((c) => c.location === "weald")).toBe(true);
  expect(d.curio!.cards.filter((c) => c.id.includes(":weald:"))).toHaveLength(16);
  expect(dungeonMonsterPoolThrough(d.monsterPool!, 1)).toHaveLength(
    d.monsterPool!.monsterDrawScope ? 14 : 45,
  );
  expect(d.discardedQuests).toContain("quest:p001");
  run.step({ type: "rollDungeonProvisions" });
  run.settle();
  run.save();
  run.prepareHamlet();
  run.embark("ruins-two");
  const back = run.game.dungeon!;
  expect(back.roomCards!.cards.some((c) => c.location === "weald")).toBe(false);
  expect(back.curio!.cards.some((c) => c.id.includes(":weald:"))).toBe(false);
  expect(back.monsterPool!.location).toBeUndefined();
  expect(back.monsterPool!.monsterDrawScope).toBeUndefined();
  expect(back.battleCatalog!.monsters.some((c) => c.id.includes(":weald:"))).toBe(false);
  const saved = run.save();
  const forged = JSON.parse(JSON.stringify(saved));
  forged.snapshot.dungeon.monsterPool.location = "weald";
  expect(() => loadQuestSave(forged, sources)).toThrow();
  const disabled = JSON.parse(JSON.stringify(saved));
  disabled.start.contentPacks = ["core"];
  expect(() => loadQuestSave(disabled, sources)).toThrow();
}, 120000);

it("Weald 探索与真实战斗创建停点可保存恢复，日志不得注入房间或怪物", () => {
  const run = journey("quest:weald:p005");
  const stop = new Error("已到达首场真实战斗");
  expect(() =>
    naturalQuest(2, "quest:weald:p005", false, sources, 4, {
      continueFrom: run.game,
      observe: (state, command) => {
        run.observe(state, command);
        if (state.battle) throw stop;
      },
    }),
  ).toThrow(stop);
  expect(run.game.dungeon!.phase).toBe("inBattle");
  run.save();
  run.step({ type: "startBattle" });
  run.save();
  run.step({ type: "drawInitiative" });
  const saved = run.save();
  const forged = JSON.parse(JSON.stringify(saved));
  forged.snapshot.battle.rngCursor++;
  expect(() => loadQuestSave(forged, sources)).toThrow();
}, 120000);

it("Purge 的当地专用范围不传入其它任务；旁置目标房回村守恒", () => {
  const run = journey();
  for (const questId of [
    "quest:weald:p001",
    "quest:weald:p002",
    "quest:weald:p003",
    "quest:weald:p004",
    "quest:weald:p005",
  ] as const) {
    const created = createCoreDungeonQuest(
      2,
      questId,
      "radiant",
      naturalParty,
      sources,
      true,
      "full",
      packs,
    );
    expect(recoverHamletPools(created.dungeon!, 2).status).toBe("resolved");
    const decks = nextExpeditionLocationDecks(
      {
        ...created.dungeon!,
        monsterPool: { ...created.dungeon!.monsterPool!, monsterDrawScope: "wealdLocalOnly" },
      },
      "quest:weald:p005",
    )!;
    expect(decks.monsterPool.monsterDrawScope).toBeUndefined();
    expect(dungeonMonsterPoolThrough(decks.monsterPool, 1)).toHaveLength(45);
  }
  expect(nextExpeditionLocationDecks(run.game.dungeon!, "quest:p001")).toBeNull();
});
