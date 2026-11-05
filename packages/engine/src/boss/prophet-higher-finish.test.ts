import { expect, it } from "vitest";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "./face-the-threat-embark-runtime";
import { RUINS_COMBAT_LEVELS } from "./ruins-combat-levels";

function ok(state: GameState, command: Command) {
  const r = applyCommand(state, command);
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return r.state;
}

function deployed(level: 2 | 3): GameState {
  const row = RUINS_COMBAT_LEVELS.prophet[level - 1]!;
  const s = createCoreDungeonQuest(17, "quest:p019", "standard", coreParty, coreQuestSources, true);
  const d = s.dungeon!;
  const context = {
    campaignLevel: level,
    activeBossThreatScriptId: row.script,
    imminentThreatDescriptionCardId: row.description,
  };
  const entered: GameState = {
    ...s,
    dungeon: {
      ...d,
      ...context,
      phase: "awaitingRoom",
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      explorationSetup: { ...d.explorationSetup!, dungeonLevel: level },
      rooms: d.rooms.map((r) => (r.kind === "objective" ? { ...r, revealed: true } : r)),
      defeatedRuinsBossIdentities: ["necromancer"],
      faceTheThreatEmbarkPlan: {
        ...requireFaceTheThreatEmbarkPlanForSandbox(context),
        roomPlacement: "edgeRoomsR30",
      },
    },
  };
  const bound = ok(entered, { type: "prepareDungeonBattle" });
  return ok(ok(bound, { type: level === 2 ? "deployProphetII" : "deployProphetIII" }), {
    type: "startBattle",
  });
}

function victory(level: 2 | 3): GameState {
  const s = deployed(level),
    b = s.battle!,
    boss = b.entities.find((e) => e.id === `boss:prophet:${level}`)!;
  return {
    ...s,
    battle: {
      ...b,
      entities: b.entities.map((e) =>
        e.id === boss.id ? { ...e, dead: true, wounds: e.life ?? 0 } : e,
      ),
      encounter: {
        ...b.encounter!,
        turn: { type: "finished", outcome: "victory" } as NonNullable<
          NonNullable<GameState["battle"]>["encounter"]
        >["turn"],
      },
    },
  };
}

it.each([2, 3] as const)("Prophet %i 胜利：清目标房、清威胁、追加击败身份", (level) => {
  const r = applyCommand(victory(level), { type: "finishDungeonBattle" });
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  const d = r.state.dungeon!;
  expect(d.bossQuestVictory).toBe(true);
  expect(d.defeatedRuinsBossIdentities).toEqual(["necromancer", "prophet"]);
  expect(d.activeBossThreatScriptId).toBeUndefined();
  expect(d.roomCards!.active).toBeNull();
  expect(d.rooms.find((room) => room.id === d.position)!.cleared).toBe(true);
  expect(d.phase).toBe("ready");
  expect(r.events.some((e) => e.type === "dungeonUpdated" && e.message.includes("Prophet"))).toBe(
    true,
  );
});

it.each([2, 3] as const)("Prophet %i 未真实胜利/错等级时拒绝交接", (level) => {
  const s = deployed(level);
  const notVictory = { ...s, battle: { ...s.battle!, encounter: undefined } };
  for (const bad of [
    notVictory,
    { ...s, dungeon: { ...s.dungeon!, campaignLevel: level === 2 ? 1 : 2 } },
    { ...s, dungeon: { ...s.dungeon!, activeBossThreatScriptId: undefined } },
  ] as GameState[]) {
    const r = applyCommand(bad, { type: "finishDungeonBattle" });
    expect(r.state).toBe(bad);
    expect(r.events.some((e) => e.type === "commandRefused")).toBe(true);
  }
});
