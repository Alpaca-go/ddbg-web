import { disruptionRoomFixture as fixture } from "./test-helpers/disruption-room";
import { expect, it } from "vitest";
import { basicQuests } from "../../data/src/basic-quests";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import {
  allRuinsRoomCardIds,
  readSetAsideRoomCardIds,
  ruinsRoomDeckWithoutSetAside,
} from "./dungeon-objective";
import { closeBattleLoot } from "./loot";
import { readDungeonQuestProgress } from "./dungeon-quest";
import { readRoomTile } from "./room-tile-selection";

const quest = basicQuests.find((q) => q.id === "quest:p006")!;
const prepare = { type: "prepareDungeonBattle" } as const;
it("Disruption sets aside rooms 4 and 8, while ordinary encounters shuffle only the other seven", () => {
  const base = fixture(1, "lair"),
    d = base.dungeon!;
  expect(readSetAsideRoomCardIds(d)).toEqual(["room:p004", "room:p008"]);
  const deck = ruinsRoomDeckWithoutSetAside(d.roomCards!.cards, readSetAsideRoomCardIds(d));
  expect(deck).toHaveLength(7);
  expect(deck).not.toContain("room:p004");
  expect(deck).not.toContain("room:p008");
  for (let seed = 0; seed < 16; seed++) {
    const before = fixture(seed, "lair"),
      result = applyCommand(before, prepare);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    const next = result.state.dungeon!;
    expect(readSetAsideRoomCardIds(next)).not.toContain(next.roomCards!.active!.cardId);
    expect(next.roomCards!.deck).toHaveLength(6);
    expect(allRuinsRoomCardIds(next)).toHaveLength(9);
    expect(new Set(allRuinsRoomCardIds(next)).size).toBe(9);
  }
});
it("each Objective entry makes one deterministic draw from both cards; repeat clicks do not reroll or consume RNG", () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 16; seed++) {
    const base = fixture(seed),
      snapshot = structuredClone(base),
      before = base.dungeon!;
    const result = applyCommand(base, prepare),
      d = result.state.dungeon!,
      active = d.roomCards!.active!;
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    seen.add(active.cardId);
    expect(readSetAsideRoomCardIds(d)).toContain(active.cardId);
    expect(d.cursor).toBe(before.cursor + 1);
    expect(d.roomCards!.deck).toBeNull();
    expect(d.rooms.find((r) => r.id === d.position)!.cleared).not.toBe(true);
    expect(d.gold).toBe(before.gold);
    expect(d.monsterPool!.active).toBeNull();
    expect(applyCommand(base, prepare)).toEqual(result);
    expect(base).toEqual(snapshot);
    expect(applyCommand(result.state, prepare).state).toBe(result.state);
    expect(applyCommand(JSON.parse(JSON.stringify(base)), prepare)).toEqual(result);
    const card = d.roomCards!.cards.find((c) => c.id === active.cardId)!;
    const tile = readRoomTile(card);
    if (tile.status === "matched") expect(active.tileId).toBe(tile.tile.id);
    else expect(active.tileId).toBeUndefined();
  }
  expect([...seen].sort()).toEqual(["room:p004", "room:p008"]);
}, 15000);
it("both cards remain available on later entries; ordinary room discards cannot contain set-aside cards", () => {
  let game = fixture();
  const draws: string[] = [];
  for (let entry = 0; entry < 8; entry++) {
    const r = applyCommand(game, prepare);
    expect(r.events.some((e) => e.type === "commandRefused")).toBe(false);
    draws.push(r.state.dungeon!.roomCards!.active!.cardId);
    // Entry boundary fixture: release the previous selected card without consuming either set-aside card.
    game = {
      ...r.state,
      dungeon: { ...r.state.dungeon!, roomCards: { ...r.state.dungeon!.roomCards!, active: null } },
    };
    expect(allRuinsRoomCardIds(game.dungeon!)).toHaveLength(9);
  }
  expect(new Set(draws).size).toBe(2);
  const base = fixture(),
    d = base.dungeon!;
  for (const patch of [
    {
      deck: [
        "room:p004",
        "room:p001",
        "room:p002",
        "room:p003",
        "room:p005",
        "room:p006",
        "room:p009",
      ],
      discard: [],
    },
    { deck: [], discard: ["room:p008"] },
  ]) {
    const bad = { ...base, dungeon: { ...d, roomCards: { ...d.roomCards!, ...patch } } };
    expect(applyCommand(bad, prepare).state).toBe(bad);
  }
  expect(() =>
    ruinsRoomDeckWithoutSetAside(d.roomCards!.cards, ["room:p004", "room:p004"]),
  ).toThrow();
});
it.each(["victory", "retreat"] as const)(
  "guard battle %s returns the selected room to the set-aside pair, never the ordinary discard",
  (outcome) => {
    let entered: GameState | undefined;
    const errors = new Set<string>();
    for (let seed = 0; seed < 24 && !entered; seed++) {
      let candidate = fixture(seed);
      for (const command of [
        prepare,
        { type: "prepareDungeonMonsters" },
        { type: "startDungeonBattle" },
        { type: "startBattle" },
      ] as const) {
        const r = applyCommand(candidate, command);
        candidate = r.state;
        if (r.events.some((e) => e.type === "commandRefused")) {
          errors.add(JSON.stringify(r.events));
          break;
        }
      }
      if (candidate.battle?.encounter && candidate.battle.loot) entered = candidate;
    }
    expect(entered, [...errors].join("\n")).toBeDefined();
    const before = entered!,
      d = before.dungeon!,
      b = before.battle!,
      cardId = d.roomCards!.active!.cardId;
    const terminal = {
      ...before,
      battle: {
        ...b,
        loot: closeBattleLoot(b.loot!),
        pending: null,
        shuffleIntents: [],
        encounter: { ...b.encounter!, turn: { type: "finished" as const, outcome } },
      },
    };
    const result = applyCommand(terminal, { type: "finishDungeonBattle" });
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    const next = result.state.dungeon!;
    expect(next.roomCards!.active).toBeNull();
    expect(next.roomCards!.discard ?? []).not.toContain(cardId);
    expect(readSetAsideRoomCardIds(next)).toContain(cardId);
    expect(new Set(allRuinsRoomCardIds(next)).size).toBe(9);
    expect(next.rooms.find((r) => r.id === next.position)!.cleared ?? false).toBe(
      outcome === "victory",
    );
    if (outcome === "victory") {
      const progress = readDungeonQuestProgress(next);
      expect(progress.status).toBe("matched");
      if (progress.status === "matched") expect(progress.completedRoomIds).toContain(next.position);
    } else expect(applyCommand(result.state, prepare).state).toBe(result.state);
    const other = next.rooms.find((r) => r.kind === "objective" && r.id !== next.position)!;
    const reentry = {
      ...result.state,
      dungeon: {
        ...next,
        phase: "awaitingRoom" as const,
        position: other.id,
        rooms: next.rooms.map((r) => (r.id === other.id ? { ...r, revealed: true } : r)),
      },
    };
    const picked = applyCommand(reentry, prepare);
    expect(picked.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(readSetAsideRoomCardIds(next)).toContain(
      picked.state.dungeon!.roomCards!.active!.cardId,
    );
  },
);
it("Disruption's three printed Objective tokens yield 3 pending XP, without awarding before return", () => {
  const game = fixture(),
    d = game.dungeon!;
  const completed = {
    ...game,
    dungeon: {
      ...d,
      phase: "exited" as const,
      rooms: d.rooms.map((r) =>
        r.kind === "objective" ? { ...r, revealed: true, cleared: true } : r,
      ),
    },
  };
  expect(quest.maxRooms).toBe(3);
  const result = applyCommand(completed, { type: "summarizeDungeonQuest" });
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(result.state.dungeon!.questSummary).toMatchObject({
    questId: "quest:p006",
    xpPerHero: 3,
    stagecoachXp: 3,
    awarded: false,
  });
  expect(result.state.dungeon!.questSummary!.clearedRoomIds).toHaveLength(3);
  expect(result.state.dungeon!.heroes.map((h) => h.xp)).toEqual(d.heroes.map((h) => h.xp));
  expect(applyCommand(result.state, { type: "summarizeDungeonQuest" }).state).toBe(result.state);
});
it("invalid RNG cursors refuse the whole Objective selection", () => {
  const base = fixture();
  for (const cursor of [-1, 0.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
    const bad = { ...base, dungeon: { ...base.dungeon!, cursor } };
    expect(applyCommand(bad, prepare).state).toBe(bad);
  }
});
