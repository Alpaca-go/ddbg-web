import { expect, it } from "vitest";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "./face-the-threat-embark-runtime";
import { FANATIC_I_SCRIPT_ID, FANATIC_I_DESCRIPTION_ABILITY_CARD_ID } from "./fanatic-i";
import { nextBattleRoll } from "../battle-roll";
import { endAfterCasualties } from "../encounter";

function ok(state: GameState, command: Command) {
  const r = applyCommand(state, command);
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return r;
}

function deployed(): GameState {
  const s = createCoreDungeonQuest(17, "quest:p019", "standard", coreParty, coreQuestSources, true);
  const d = s.dungeon!;
  const context = {
    campaignLevel: 1 as const,
    activeBossThreatScriptId: FANATIC_I_SCRIPT_ID,
    imminentThreatDescriptionCardId: FANATIC_I_DESCRIPTION_ABILITY_CARD_ID,
  };
  const entered: GameState = {
    ...s,
    dungeon: {
      ...d,
      ...context,
      phase: "awaitingRoom",
      explorationSetup: { ...d.explorationSetup!, dungeonLevel: 1 },
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      rooms: d.rooms.map((r) => (r.kind === "objective" ? { ...r, revealed: true } : r)),
      faceTheThreatEmbarkPlan: {
        ...requireFaceTheThreatEmbarkPlanForSandbox(context),
        roomPlacement: "edgeRoomsR30",
      },
    },
  };
  const bound = ok(entered, { type: "prepareDungeonBattle" }).state;
  return ok(ok(bound, { type: "deployFanaticI" }).state, { type: "startBattle" }).state;
}

const finish = { type: "finishDungeonBattle" } as const;

it("Fanatic I 胜利清除威胁并清房", () => {
  const s = deployed();
  const b = s.battle!;
  const boss = b.entities.find((e) => e.id === "boss:fanatic:1")!;
  const cursor = Array.from({ length: 100 }, (_, i) => i + b.rngCursor).find(
    (i) => nextBattleRoll(s.seed, i) === 1,
  )!;
  const prepared: GameState = {
    ...s,
    battle: {
      ...b,
      rngCursor: cursor,
      entities: b.entities.map((e) =>
        e.id === boss.id
          ? { ...e, wounds: e.life! - 1, dead: true }
          : e.id === "boss:fanatic:pyre"
            ? { ...e, dead: true }
            : e.id === "hero-0"
              ? { ...e, areaId: "H" }
              : e,
      ),
      encounter: {
        ...b.encounter!,
        turn: { type: "finished", outcome: "victory" },
      },
    },
  };
  const after = ok(prepared, finish).state;
  expect(after.dungeon!.bossQuestVictory).toBe(true);
  expect(after.dungeon!.defeatedRuinsBossIdentities).toEqual(["fanatic"]);
  expect(after.dungeon!.activeBossThreatScriptId).toBeUndefined();
  expect(after.dungeon!.rooms.find((r) => r.id === after.dungeon!.position)!.cleared).toBe(true);
  expect(after.battle).toBeUndefined();
});

it("Fanatic I 英雄全灭保留战场", () => {
  const started = deployed();
  const b = started.battle!;
  const halted = endAfterCasualties({
    state: {
      ...started,
      battle: {
        ...b,
        entities: b.entities.map((e) =>
          e.side === "hero" ? { ...e, dead: true, wounds: e.life! } : e,
        ),
      },
    },
    events: [],
  })!.state;
  const after = ok(halted, finish).state;
  expect(after.battle).toBe(halted.battle);
  expect(after.dungeon!.campaignFailure).toBe("bossQuestHeroesDefeated");
});
