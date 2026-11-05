import { expect, it } from "vitest";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { switchRuinsActPools } from "../act-transition-pools";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "./face-the-threat-embark-runtime";
import {
  NECROMANCER_II_DESCRIPTION_ABILITY_CARD_ID,
  NECROMANCER_II_SCRIPT_ID,
} from "./necromancer-ii";

function ok(state: GameState, command: Command) {
  const r = applyCommand(state, command);
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return r.state;
}

/** 显式 II 级目标房夹具；不代表自然 I→II 战役或严格存档已验收。 */
function deployed(): GameState {
  const s = createCoreDungeonQuest(17, "quest:p019", "standard", coreParty, coreQuestSources, true);
  const d = s.dungeon!;
  const context = {
    campaignLevel: 2 as const,
    activeBossThreatScriptId: NECROMANCER_II_SCRIPT_ID,
    imminentThreatDescriptionCardId: NECROMANCER_II_DESCRIPTION_ABILITY_CARD_ID,
  };
  const entered: GameState = {
    ...s,
    dungeon: {
      ...d,
      ...context,
      phase: "awaitingRoom",
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      explorationSetup: { ...d.explorationSetup!, dungeonLevel: 2 },
      rooms: d.rooms.map((r) => (r.kind === "objective" ? { ...r, revealed: true } : r)),
      defeatedRuinsBossIdentities: ["prophet"],
      faceTheThreatEmbarkPlan: {
        ...requireFaceTheThreatEmbarkPlanForSandbox(context),
        roomPlacement: "edgeRoomsR30",
      },
    },
  };
  const bound = ok(entered, { type: "prepareDungeonBattle" });
  return ok(ok(bound, { type: "deployNecromancerII" }), { type: "startBattle" });
}

function victory(): GameState {
  const s = deployed(),
    b = s.battle!,
    boss = b.entities.find((e) => e.id === "boss:necromancer:2")!;
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

it("Necromancer II 胜利：清目标房、清威胁、记录击败并恢复到 ready", () => {
  const s = victory();
  const r = applyCommand(s, { type: "finishDungeonBattle" });
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  const d = r.state.dungeon!;
  expect(d.bossQuestVictory).toBe(true);
  expect(d.defeatedRuinsBossIdentities).toEqual(["prophet", "necromancer"]);
  expect(d.activeBossThreatScriptId).toBeUndefined();
  expect(d.roomCards!.active).toBeNull();
  expect(d.rooms.find((room) => room.id === d.position)!.cleared).toBe(true);
  expect(d.phase).toBe("ready");
  expect(r.state.battle).toBeUndefined();
  expect(
    r.events.some((e) => e.type === "dungeonUpdated" && e.message.includes("Necromancer II")),
  ).toBe(true);
});

it("II 胜利后满足 II→III 升幕条件并可由公开命令推进", () => {
  const finished = applyCommand(victory(), { type: "finishDungeonBattle" }).state;
  const d = finished.dungeon!;
  const pools = switchRuinsActPools(1, d.monsterPool!, d.trinkets!, d.heroes);
  if (pools.kind !== "ready") throw new Error(pools.reason);
  const ready: GameState = {
    ...finished,
    dungeon: {
      ...d,
      phase: "inHamlet",
      monsterPool: pools.monsterPool,
      trinkets: pools.trinkets,
      questSummary: {
        questId: "quest:p019",
        name: "Face the Threat!",
        clearedRoomIds: [],
        xpPerHero: 3,
        stagecoachXp: 3,
        awarded: true,
      },
      hamletReturn: { phase: "complete", order: [], resolveRoles: {}, convertedHeroIds: [] },
      discardedQuests: ["quest:p006", "quest:p007", "quest:p008"],
    },
  };
  const r = applyCommand(ready, { type: "advanceRuinsAct" });
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(r.state.dungeon!.campaignLevel).toBe(3);
  expect(r.state.dungeon!.activeBossThreatScriptId).toBeTruthy();
  expect(r.state.dungeon!.explorationSetup!.dungeonLevel).toBe(3);
});

it("未真实胜利、错等级或缺 II 级威胁时拒绝交接", () => {
  const s = deployed();
  const notVictory = { ...s, battle: { ...s.battle!, encounter: undefined } };
  for (const bad of [
    notVictory,
    { ...s, dungeon: { ...s.dungeon!, campaignLevel: 1 } },
    { ...s, dungeon: { ...s.dungeon!, activeBossThreatScriptId: undefined } },
  ] as GameState[]) {
    const r = applyCommand(bad, { type: "finishDungeonBattle" });
    expect(r.state).toBe(bad);
    expect(r.events.some((e) => e.type === "commandRefused")).toBe(true);
  }
});
