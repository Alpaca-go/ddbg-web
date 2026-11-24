import { describe, expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "../../../src/command";
import { createCoreDungeonQuest } from "../../../src/dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../src/test-helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "../../../src/boss/face-the-threat-embark-runtime";
import { nextExpeditionLocationDecks } from "../../../src/hamlet-location-embark";
import { resolveBossScriptIdForQuest } from "../../../src/boss/quest-bridge";
import { clearBossScriptsForTest } from "../../../src/boss/registry";
import { savedCommandSchema } from "../../../../data/src/quest-save";

const run = (state: GameState, command: Command) => {
  const result = applyCommand(state, command);
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return result.state;
};
function atObjective(level: 2 | 3): GameState {
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
    campaignLevel: level,
    wealdHigherBosses: true as const,
    contentPacks: ["core", "weald"] as const,
    activeBossThreatScriptId: `boss:weald:hag:${level}` as const,
    imminentThreatDescriptionCardId: `boss_ability:weald:p0${12 + level}`,
  };
  const planned = {
    ...d,
    ...threat,
    bossLocationSources: true as const,
    locationBossThreats: true as const,
    bossExpeditionRegion: "weald" as const,
    explorationSetup: { ...d.explorationSetup!, dungeonLevel: level },
    faceTheThreatEmbarkPlan: {
      ...requireFaceTheThreatEmbarkPlanForSandbox(threat),
      roomPlacement: "edgeRoomsR30" as const,
    },
  };
  return {
    ...state,
    dungeon: {
      ...planned,
      ...nextExpeditionLocationDecks(planned, "quest:p019"),
      phase: "awaitingRoom",
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      rooms: d.rooms.map((r) => (r.kind === "objective" ? { ...r, revealed: true } : r)),
    },
  };
}

describe.each([2, 3] as const)("R-267／R-268 Hag %i 正式命令接线", (level) => {
  it("同级来源、共用10号房、真实等级部署并开始Boss先攻；JSON检查点逐条恢复", () => {
    clearBossScriptsForTest();
    const initial = atObjective(level);
    let state = initial;
    let restored = JSON.parse(JSON.stringify(initial)) as GameState;
    for (const command of [
      { type: "prepareDungeonBattle" },
      { type: "deployHagHigher" },
      { type: "startBattle" },
    ] as const) {
      expect(savedCommandSchema.parse(command)).toEqual(command);
      state = run(state, command);
      restored = run(restored, command);
      expect(restored).toEqual(state);
    }
    expect(state.battle!.areas).toHaveLength(11);
    expect(state.battle!.entities.slice(4).map((e) => e.life)).toEqual(
      level === 2 ? [75, 100] : [95, 136],
    );
    expect(state.battle!.encounter!.deck.filter((s) => s === "monster")).toHaveLength(3);
    expect(state.dungeon!.bossCombatThreatCeased).toBe(`boss:weald:hag:${level}`);
    expect(state.dungeon!.monsterPool).toEqual(initial.dungeon!.monsterPool);
    expect(state.dungeon!.roomCards!.deck).toEqual(initial.dungeon!.roomCards!.deck);
  });

  it("受控终局只交接一次，回收Boss房但不动普通池或重复发奖励", () => {
    const initial = atObjective(level);
    const started = [
      { type: "prepareDungeonBattle" },
      { type: "deployHagHigher" },
      { type: "startBattle" },
    ].reduce((s, c) => run(s, c as Command), initial);
    const won: GameState = {
      ...started,
      battle: {
        ...started.battle!,
        entities: started.battle!.entities.map((e) =>
          e.side === "monster" ? { ...e, dead: true, wounds: e.life! } : e,
        ),
        encounter: {
          ...started.battle!.encounter!,
          turn: { type: "finished", outcome: "victory" },
        },
      },
    };
    const returned = run(won, { type: "finishDungeonBattle" });
    expect(returned.battle).toBeUndefined();
    expect(returned.dungeon!.bossQuestVictory).toBe(true);
    expect(returned.dungeon!.defeatedWealdBossIdentities).toEqual(["hag"]);
    expect(returned.dungeon!.monsterPool).toEqual(initial.dungeon!.monsterPool);
    expect(returned.dungeon!.activeBossThreatScriptId).toBeUndefined();
    expect(applyCommand(returned, { type: "finishDungeonBattle" }).state).toBe(returned);
  });

  it("没有版本、错级描述或未选包均拒绝，I级部署命令不能代用", () => {
    const state = atObjective(level);
    for (const patch of [
      { imminentThreatDescriptionCardId: "boss_ability:weald:p013" },
      { contentPacks: ["core"] as const },
    ]) {
      const d = { ...state.dungeon!, ...patch };
      expect(resolveBossScriptIdForQuest("quest:p019", d)).toBeUndefined();
    }
    const { wealdHigherBosses: _version, ...legacy } = state.dungeon!;
    void _version;
    expect(resolveBossScriptIdForQuest("quest:p019", legacy)).toBeUndefined();
    const prepared = run(state, { type: "prepareDungeonBattle" });
    expect(applyCommand(prepared, { type: "deployHagI" }).state).toBe(prepared);
  });
});
