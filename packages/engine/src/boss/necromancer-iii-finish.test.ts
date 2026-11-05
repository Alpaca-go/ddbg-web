import { expect, it } from "vitest";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "./face-the-threat-embark-runtime";
import {
  NECROMANCER_III_DESCRIPTION_ABILITY_CARD_ID,
  NECROMANCER_III_SCRIPT_ID,
} from "./necromancer-iii";

function ok(state: GameState, command: Command) {
  const r = applyCommand(state, command);
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return r.state;
}

/** 显式 III 级目标房夹具；不代表自然 II→III 战役或严格存档已验收。 */
function deployed(): GameState {
  const s = createCoreDungeonQuest(17, "quest:p019", "standard", coreParty, coreQuestSources, true);
  const d = s.dungeon!;
  const context = {
    campaignLevel: 3 as const,
    activeBossThreatScriptId: NECROMANCER_III_SCRIPT_ID,
    imminentThreatDescriptionCardId: NECROMANCER_III_DESCRIPTION_ABILITY_CARD_ID,
  };
  const entered: GameState = {
    ...s,
    dungeon: {
      ...d,
      ...context,
      phase: "awaitingRoom",
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      explorationSetup: { ...d.explorationSetup!, dungeonLevel: 3 },
      rooms: d.rooms.map((r) => (r.kind === "objective" ? { ...r, revealed: true } : r)),
      defeatedRuinsBossIdentities: ["prophet", "collector"],
      faceTheThreatEmbarkPlan: {
        ...requireFaceTheThreatEmbarkPlanForSandbox(context),
        roomPlacement: "edgeRoomsR30",
      },
    },
  };
  const bound = ok(entered, { type: "prepareDungeonBattle" });
  return ok(ok(bound, { type: "deployNecromancerIII" }), { type: "startBattle" });
}

function victory(): GameState {
  const s = deployed(),
    b = s.battle!,
    boss = b.entities.find((e) => e.id === "boss:necromancer:3")!;
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

it("Necromancer III 胜利：清目标房、清威胁、追加击败身份并恢复到 ready", () => {
  const r = applyCommand(victory(), { type: "finishDungeonBattle" });
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  const d = r.state.dungeon!;
  expect(d.bossQuestVictory).toBe(true);
  expect(d.defeatedRuinsBossIdentities).toEqual(["prophet", "collector", "necromancer"]);
  expect(d.activeBossThreatScriptId).toBeUndefined();
  expect(d.roomCards!.active).toBeNull();
  expect(d.rooms.find((room) => room.id === d.position)!.cleared).toBe(true);
  expect(d.phase).toBe("ready");
  expect(r.state.battle).toBeUndefined();
  expect(
    r.events.some((e) => e.type === "dungeonUpdated" && e.message.includes("Necromancer III")),
  ).toBe(true);
});

it("未真实胜利、错等级或缺 III 级威胁时拒绝交接", () => {
  const s = deployed();
  const notVictory = { ...s, battle: { ...s.battle!, encounter: undefined } };
  for (const bad of [
    notVictory,
    { ...s, dungeon: { ...s.dungeon!, campaignLevel: 2 } },
    { ...s, dungeon: { ...s.dungeon!, activeBossThreatScriptId: undefined } },
  ] as GameState[]) {
    const r = applyCommand(bad, { type: "finishDungeonBattle" });
    expect(r.state).toBe(bad);
    expect(r.events.some((e) => e.type === "commandRefused")).toBe(true);
  }
});
