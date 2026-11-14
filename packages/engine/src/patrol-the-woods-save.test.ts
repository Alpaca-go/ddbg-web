import { expect, it } from "vitest";
import { patrolTheWoodsJourney } from "./test-helpers/patrol-the-woods-quest";
import { disinfectionSources as sources } from "./test-helpers/disinfection-quest";
import { createRng } from "./rng";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { dungeonMonsterPoolThrough } from "./monster-pool-runtime";
import { applyCommand } from "./command";

it("R-242：六房、混池、首轮独立 d10 与后续洗牌、3 XP 回村严格回放", () => {
  const { start, run, points, rounds, deployments } = patrolTheWoodsJourney();
  let triggered = 0,
    secondRounds = 0;
  for (const { game, round } of rounds) {
    const b = game.battle!;
    const deck = b.entities.filter((e) => !e.dead && !e.necroticFungus).map((e) => e.side);
    const draws = deck.length - 1 + (round === 1 ? 1 : 0);
    const rng = createRng(game.seed);
    for (let i = 0; i < b.rngCursor - draws; i++) rng.next();
    const roll = round === 1 ? Math.floor(rng.next() * 10) + 1 : undefined;
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    }
    const trigger = roll !== undefined && roll > game.dungeon!.explorationSetup!.light;
    const expected = trigger
      ? [...deck.filter((s) => s === "monster"), ...deck.filter((s) => s === "hero")]
      : deck;
    expect(b.encounter!.deck, `round ${round}, cursor ${b.rngCursor}, roll ${roll}`).toEqual(
      expected,
    );
    if (trigger) triggered++;
    if (round === 2) secondRounds++;
  }
  expect(triggered).toBeGreaterThan(0);
  expect(secondRounds).toBeGreaterThan(0);
  // 独立的受控先攻夹具：自然场景常在低光照触发置顶，会掩盖洗牌 RNG 重用。
  const beforeStart = points.find((p) => p.game.battle && !p.game.battle.encounter)!.game;
  let untriggered = 0;
  for (let seed = 1; seed <= 8; seed++) {
    const fixture = {
      ...beforeStart,
      seed,
      dungeon: {
        ...beforeStart.dungeon!,
        explorationSetup: { ...beforeStart.dungeon!.explorationSetup!, light: 5 },
      },
      battle: { ...beforeStart.battle!, light: 5 },
    };
    const result = applyCommand(fixture, { type: "startBattle" });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    const b = result.state.battle!;
    const deck = b.entities.filter((e) => !e.dead && !e.necroticFungus).map((e) => e.side);
    const rng = createRng(seed);
    for (let i = 0; i < b.rngCursor - deck.length; i++) rng.next();
    const roll = Math.floor(rng.next() * 10) + 1;
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    }
    if (roll <= 5) {
      untriggered++;
      expect(b.encounter!.deck, `untriggered seed ${seed}, roll ${roll}`).toEqual(deck);
    }
  }
  expect(untriggered).toBeGreaterThan(0);
  const d = run.state.dungeon!;
  expect(d.rooms.filter((r) => r.cleared)).toHaveLength(6);
  expect(d.rooms.filter((r) => r.kind === "trap")).toHaveLength(2);
  expect(d.rooms.filter((r) => r.kind === "trap").every((r) => !r.cleared)).toBe(true);
  expect(deployments.flat().some((id) => /^monster-deck:p\d+$/.test(id))).toBe(true);
  expect(d.monsterPool!.monsterDrawScope).toBeUndefined();
  expect(dungeonMonsterPoolThrough(d.monsterPool!, 1)).toHaveLength(45);
  expect(d.questSummary).toMatchObject({ xpPerHero: 3, stagecoachXp: 3 });
  for (const point of [...points, { game: run.state, commands: run.commands }]) {
    const save = createQuestSave(start, point.commands, point.game, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(point.game);
  }
  let game = run.state;
  const commands = [...run.commands];
  const step = (command: (typeof commands)[number]) => {
    const result = applyCommand(game, command);
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    commands.push(command);
    game = result.state;
  };
  step({ type: "beginReturnToHamlet" });
  for (let i = 0; i < 100 && game.dungeon!.hamletReturn?.phase !== "provisions"; i++) {
    const d = game.dungeon!;
    const p = d.pending ?? d.deathTrinketChoice ?? d.replacementPreparation?.choice;
    if (p)
      step({
        type: "resolveChoice",
        choiceId: p.id,
        optionId:
          d.replacementPreparation?.stage === "upgrades" ? "finish-upgrades" : p.options[0]!.id,
      });
    else {
      expect(d.hamletReturn?.phase).toBe("awaitingReplacement");
      step({
        type:
          (d.preparedReplacements?.length ?? 0) >= d.heroes.filter((h) => h.dead).length
            ? "joinPreparedReplacements"
            : "prepareReplacementHero",
      });
    }
  }
  step({ type: "finishReturnToHamlet" });
  expect(game.dungeon!.heroes.map((h) => h.xp)).toEqual([3, 3, 3, 3]);
  expect(game.dungeon!.stagecoachXp).toBe(3);
  const save = createQuestSave(start, commands, game, sources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(game);
}, 120000);
