import { clearBossScriptsForTest } from "../../../../src/core/bosses/registry";
import { expect, it } from "vitest";
import { savedCommandSchema } from "../../../../../data/src/shared/quest-save";
import { applyCommand, type GameState, type Command } from "../../../../src/shared/core/command";
import { createCoreDungeonQuest } from "../../../../src/shared/dungeon/dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "../../../../src/core/bosses/face-the-threat-embark-runtime";
import {
  ensureHagIBossScriptRegistered,
  HAG_I_SCRIPT_ID,
  HAG_I_DESCRIPTION_ABILITY_CARD_ID,
} from "../../../../src/weald/bosses/hag/hag-i";

function run(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result.state;
}
// 受控抵达目标房，不代表自然探索或正式战役日志验收。
function atObjective(): GameState {
  ensureHagIBossScriptRegistered();
  const state = createCoreDungeonQuest(
    17,
    "quest:p019",
    "standard",
    coreParty,
    coreQuestSources,
    true,
  );
  const d = state.dungeon!;
  const threat = {
    campaignLevel: 1 as const,
    activeBossThreatScriptId: HAG_I_SCRIPT_ID,
    imminentThreatDescriptionCardId: HAG_I_DESCRIPTION_ABILITY_CARD_ID,
  };
  return {
    ...state,
    dungeon: {
      ...d,
      ...threat,
      contentPacks: ["core", "weald"],
      phase: "awaitingRoom",
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      rooms: d.rooms.map((r) => (r.kind === "objective" ? { ...r, revealed: true } : r)),
      faceTheThreatEmbarkPlan: {
        ...requireFaceTheThreatEmbarkPlanForSandbox(threat),
        roomPlacement: "edgeRoomsR30",
      },
    },
  };
}

it("W4／R-254：目标房绑定、11 区部署、显式 startBattle 三张怪物先攻；可序列化重放", () => {
  const source = atObjective();
  clearBossScriptsForTest();
  const prepared = run(source, { type: "prepareDungeonBattle" });
  expect(prepared.dungeon!.roomCards!.active!.cardId).toBe("room:weald:10");
  expect(prepared.dungeon!.cursor).toBe(source.dungeon!.cursor);
  const command = { type: "deployHagI" } as const;
  expect(savedCommandSchema.parse(command)).toEqual(command);
  const deployed = run(prepared, command);
  expect(run(JSON.parse(JSON.stringify(prepared)) as GameState, command)).toEqual(deployed);
  expect(deployed.battle!.areas).toHaveLength(11);
  expect(deployed.battle!.entities.slice(0, 4).map((e) => e.areaId)).toEqual(["A", "I", "J", "J"]);
  expect(deployed.battle!.entities.slice(4).map((e) => [e.id, e.areaId])).toEqual([
    ["boss:hag", "B"],
    ["boss:hag:cauldron-empty", "F"],
  ]);
  expect(deployed.battle!.rngCursor).toBe(source.dungeon!.cursor);
  expect(deployed.battle!.encounter).toBeUndefined();
  expect(deployed.dungeon!.monsterPool).toEqual(source.dungeon!.monsterPool);
  expect(deployed.dungeon!.roomCards!.deck).toEqual(source.dungeon!.roomCards!.deck);
  const started = run(deployed, { type: "startBattle" });
  expect(started.battle!.encounter!.deck.filter((s) => s === "monster")).toHaveLength(3);
  expect(started.dungeon!.bossCombatThreatCeased).toBe(HAG_I_SCRIPT_ID);
  expect(applyCommand(deployed, command).state).toBe(deployed);
});

it("R-036：Stygian 仍绑定标准 Hag 房 p010，可部署开战", () => {
  const source = atObjective();
  const stygian: GameState = {
    ...source,
    dungeon: { ...source.dungeon!, mode: "stygian", stygianRoomRules: "full" },
  };
  const prepared = run(stygian, { type: "prepareDungeonBattle" });
  expect(prepared.dungeon!.roomCards!.active!.cardId).toBe("room:weald:10");
  run(prepared, { type: "deployHagI" });
});

it.each(["pack", "threat", "plan", "level", "skills"])(
  "拒绝非法 Hag 部署且不消费 RNG：%s",
  (kind) => {
    const bound = run(atObjective(), { type: "prepareDungeonBattle" });
    const d = bound.dungeon!;
    const input: GameState = {
      ...bound,
      dungeon: {
        ...d,
        ...(kind === "pack" ? { contentPacks: ["core"] } : {}),
        ...(kind === "threat" ? { imminentThreatDescriptionCardId: "wrong" } : {}),
        ...(kind === "plan"
          ? {
              faceTheThreatEmbarkPlan: {
                ...d.faceTheThreatEmbarkPlan!,
                resolvedScriptId: "boss:ruins:necromancer:1",
              },
            }
          : {}),
        ...(kind === "level" ? { campaignLevel: 2 } : {}),
        ...(kind === "skills"
          ? { heroes: d.heroes.map((h, i) => (i === 0 ? { ...h, skillIds: [] } : h)) }
          : {}),
      },
    };
    const result = applyCommand(input, { type: "deployHagI" });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(result.state).toBe(input);
  },
);
