import { expect, it } from "vitest";
import { basicQuests } from "../../data/src/basic-quests";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { applyCommand, type GameState, type Command } from "./command";
import { placeDarkestRooms } from "./darkest-setup";

const quests = ["quest:p016", "quest:p017", "quest:p018"] as const;
const start = (seed = 7, questId: (typeof quests)[number] = "quest:p016") => ({
  seed,
  questId,
  mode: "radiant" as const,
  party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
});
const entry = (seed = 7, questId: (typeof quests)[number] = "quest:p016") =>
  createCoreDungeonQuest(seed, questId, "radiant", coreParty, coreQuestSources);
function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result;
}

it("R36 两张16房图均可选，唯一目标只能洗入三 Boss 位，三枚挖掘点仍在完整池内", () => {
  const kinds = basicQuests
    .find((q) => q.id === "quest:p016")!
    .distribution.counts.flatMap((c) => Array.from({ length: c.count }, () => c.kind));
  const seen = new Set<string>();
  for (let seed = 0; seed < 32; seed++) {
    const p = placeDarkestRooms(seed, kinds);
    seen.add(p.layout.id);
    expect(p.rooms).toHaveLength(16);
    expect(
      p.layout.nodes.find((n) => n.id === p.rooms.find((r) => r.kind === "objective")!.id)!
        .slotKind,
    ).toBe("boss");
    expect(p.rooms.filter((r) => r.kind === "empty")).toHaveLength(3);
    expect(p.rooms.map((r) => r.kind).sort()).toEqual([...kinds].sort());
    expect(p.rooms).toEqual(placeDarkestRooms(seed, kinds).rooms);
  }
  expect([...seen].sort()).toEqual(["quest_map:p011", "quest_map:p012"]);
});

it.each(quests)(
  "%s 切换独立26张怪物/8张房间/III饰品，保留Ruins Curio与条件池；存档可续补给",
  (questId) => {
    const game = entry(7, questId),
      d = game.dungeon!;
    expect(d.monsterPool).toBeUndefined();
    expect(d.darkest!.monsterDeck).toHaveLength(26);
    expect(d.roomCards!.deck).toHaveLength(8);
    expect(
      d.roomCards!.deck!.every(
        (id) => d.roomCards!.cards.find((c) => c.id === id)?.location === "darkestDungeon",
      ),
    ).toBe(true);
    expect(d.trinkets!.level).toBe(3);
    expect(d.curio!.cards).toEqual(coreQuestSources.curios);
    const commands: Command[] = [{ type: "rollDungeonProvisions" }];
    let result = ok(game, commands[0]!);
    while (result.pendingChoice) {
      const c: Command = {
        type: "resolveChoice",
        choiceId: result.pendingChoice.id,
        optionId: result.pendingChoice.options[0]!.id,
      };
      commands.push(c);
      result = ok(result.state, c);
    }
    const save = createQuestSave(start(7, questId), commands, result.state, coreQuestSources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(
      result.state,
    );
  },
  20000,
);

/** 明示房间机制夹具，不冒称已自然打通最暗战役。 */
function excavationFixture(used = false): GameState {
  const game = entry(),
    d = game.dungeon!;
  const room = d.rooms.find((r) => r.kind === "empty")!;
  const rest = used
    ? {
        ...d.rest!,
        used: true,
        plan: {
          mode: "collective" as const,
          spend: d.heroes.map((h) => ({ heroId: h.id, heal: 5, stress: 0 })),
        },
      }
    : d.rest!;
  return {
    ...game,
    dungeon: {
      ...d,
      phase: "awaitingRoom",
      position: room.id,
      rest,
      rooms: d.rooms.map((r) => (r.id === room.id ? { ...r, revealed: true } : r)),
      heroes: d.heroes.map((h) => ({ ...h, wounds: 4, stress: 4 })),
      explorationSetup: {
        ...d.explorationSetup!,
        provisions: Array.from({ length: 16 }, (_, i) => ({
          id: `old:${i}`,
          face: "tool" as const,
        })),
      },
    },
  };
}

it.each([false, true])(
  "挖掘点四骰+8点免费均分休息；满池弃旧，Wild续接不重掷，原柴火used=%s不变",
  (used) => {
    const state = excavationFixture(used),
      before = JSON.stringify(state);
    let result = ok(state, { type: "resolveDungeonRoom" });
    expect(result.pendingChoice!.options.every((o) => o.id.startsWith("discard:"))).toBe(true);
    const first = result.state;
    const c = {
      type: "resolveChoice" as const,
      choiceId: result.pendingChoice!.id,
      optionId: result.pendingChoice!.options[0]!.id,
    };
    expect(ok(first, c)).toEqual(ok(JSON.parse(JSON.stringify(first)), c));
    let discards = 0;
    for (let i = 0; result.pendingChoice && i < 40; i++) {
      const p = result.pendingChoice;
      const option =
        p.options.find((o) => o.id === "equal") ??
        p.options.find((o) => o.id.startsWith("stress:")) ??
        p.options[0]!;
      if (option.id.startsWith("discard:")) discards++;
      result = ok(JSON.parse(JSON.stringify(result.state)), {
        type: "resolveChoice",
        choiceId: p.id,
        optionId: option.id,
      });
    }
    expect(result.pendingChoice).toBeUndefined();
    const d = result.state.dungeon!;
    expect(discards).toBe(4);
    expect(d.cursor).toBe(state.dungeon!.cursor + 4);
    expect(d.explorationSetup!.provisions).toHaveLength(16);
    expect(d.heroes.map((h) => h.stress)).toEqual([2, 2, 2, 2]);
    expect(d.rest).toEqual(state.dungeon!.rest);
    expect(d.rooms.find((r) => r.id === d.position)!.cleared).toBe(true);
    expect(d.darkest!.excavation).toBeUndefined();
    expect(applyCommand(result.state, { type: "resolveDungeonRoom" }).state).toBe(result.state);
    expect(JSON.stringify(state)).toBe(before);
  },
);

it("最暗普通/目标房都保留正确房间牌，缺几何不替换为Ruins，不消耗普通怪物", () => {
  for (const quest of quests) {
    const state = entry(7, quest),
      d = state.dungeon!;
    for (const kind of ["lair", "objective"] as const) {
      const room = d.rooms.find((r) => r.kind === kind)!;
      const input = {
        ...state,
        dungeon: { ...d, phase: "awaitingRoom" as const, position: room.id },
      };
      const result = ok(input, { type: "prepareDungeonBattle" });
      expect(
        result.state.dungeon!.roomCards!.cards.find(
          (c) => c.id === result.state.dungeon!.roomCards!.active!.cardId,
        )!.location,
      ).toBe("darkestDungeon");
      expect(result.state.dungeon!.cursor).toBe(d.cursor);
      expect(applyCommand(result.state, { type: "prepareDungeonBattle" }).state).toBe(result.state);
      const monsters = ok(result.state, { type: "prepareDungeonMonsters" });
      if (kind === "objective") {
        expect(monsters.state.dungeon!.darkest!.bossDeployment?.monsters.length).toBeGreaterThan(0);
      } else {
        expect(
          monsters.state.dungeon!.darkest!.ordinaryDeployment!.monsters.reduce(
            (n, m) => n + m.stanceSlots,
            0,
          ),
        ).toBe(4);
        expect(monsters.state.dungeon!.darkest!.monsterDeckRemaining!.length).toBeLessThan(26);
      }
    }
  }
});
