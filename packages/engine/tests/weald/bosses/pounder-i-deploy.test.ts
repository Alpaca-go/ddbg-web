import { clearBossScriptsForTest } from "../../../src/core/bosses/registry";
import { expect, it } from "vitest";
import { savedCommandSchema } from "../../../../data/src/quest-save";
import { applyCommand, type GameState, type Command } from "../../../src/command";
import { createCoreDungeonQuest } from "../../../src/dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../src/test-helpers/core-quest";
import { getBossScript } from "../../../src/core/bosses/registry";
import { nextExpeditionLocationDecks } from "../../../src/hamlet-location-embark";
import { removeCasualties } from "../../../src/encounter";
import {
  ensurePounderIBossScriptRegistered,
  POUNDER_I_SCRIPT_ID,
} from "../../../src/weald/bosses/pounder-i";

function run(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result.state;
}
// 受控抵达目标房，不代表自然探索或正式战役日志验收。
function atObjective(): GameState {
  ensurePounderIBossScriptRegistered();
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
    activeBossThreatScriptId: POUNDER_I_SCRIPT_ID,
    imminentThreatDescriptionCardId: "boss_ability:weald:p007",
    contentPacks: ["core", "weald"] as const,
    locationBossThreats: true as const,
    bossLocationSources: true as const,
    pounderDungeonThreats: true as const,
    pounderHamletThreats: true as const,
  };
  return {
    ...state,
    dungeon: {
      ...d,
      ...threat,
      ...nextExpeditionLocationDecks({ ...d, ...threat }, "quest:p019"),
      bossExpeditionRegion: "weald",
      contentPacks: ["core", "weald"],
      phase: "awaitingRoom",
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      rooms: d.rooms.map((r) => (r.kind === "objective" ? { ...r, revealed: true } : r)),
      faceTheThreatEmbarkPlan: {
        resolvedScriptId: POUNDER_I_SCRIPT_ID,
        questId: "quest:p019",
        combatEntry: getBossScript(POUNDER_I_SCRIPT_ID)!.combatEntry!,
        rulesRef: ["W4", "R-258"],
        layoutWiringHold: "受控部署夹具，未开放出征",
        roomPlacement: "edgeRoomsR30",
      },
    },
  };
}

it("W4／R-258：目标房绑定、12 区部署、显式 startBattle 一张怪物先攻；可序列化重放", () => {
  const source = atObjective();
  clearBossScriptsForTest();
  const prepared = run(source, { type: "prepareDungeonBattle" });
  expect(prepared.dungeon!.roomCards!.active!.cardId).toBe("room:weald:12");
  expect(prepared.dungeon!.cursor).toBe(source.dungeon!.cursor);
  const command = { type: "deployPounderI" } as const;
  expect(savedCommandSchema.parse(command)).toEqual(command);
  const deployed = run(prepared, command);
  expect(run(JSON.parse(JSON.stringify(prepared)) as GameState, command)).toEqual(deployed);
  expect(deployed.battle!.areas).toHaveLength(12);
  expect(deployed.battle!.entities.slice(0, 4).map((e) => e.areaId)).toEqual(["K", "J", "L", "J"]);
  expect(deployed.battle!.entities.slice(4).map((e) => [e.id, e.areaId])).toEqual([
    ["boss:pounder", "B"],
  ]);
  expect(deployed.battle!.rngCursor).toBe(source.dungeon!.cursor);
  expect(deployed.battle!.encounter).toBeUndefined();
  expect(deployed.dungeon!.monsterPool).toEqual(source.dungeon!.monsterPool);
  expect(deployed.dungeon!.roomCards!.deck).toEqual(source.dungeon!.roomCards!.deck);
  const started = run(deployed, { type: "startBattle" });
  expect(started.battle!.encounter!.deck.filter((s) => s === "monster")).toHaveLength(1);
  expect(started.dungeon!.bossCombatThreatCeased).toBe(POUNDER_I_SCRIPT_ID);
  expect(applyCommand(deployed, command).state).toBe(deployed);
});

it("W4：真实部署增援后本体死亡才清除 Brigands；重复清场不重复移出", () => {
  let state = run(run(atObjective(), { type: "prepareDungeonBattle" }), { type: "deployPounderI" });
  state = run(state, { type: "startBattle" });
  // 明确受控进入本体回合；不是自然先攻或战役路径。
  state = {
    ...state,
    battle: {
      ...state.battle!,
      encounter: {
        ...state.battle!.encounter!,
        turn: { type: "monster", actorId: "boss:pounder" },
      },
    },
  };
  state = run(state, { type: "applyPounderIReinforcements", actorId: "boss:pounder" });
  expect(state.battle!.entities.filter((e) => e.side === "monster")).toHaveLength(4);
  const untouched = removeCasualties({ state, events: [] }, []);
  expect(
    untouched.state.battle!.entities.filter((e) => e.side === "monster" && !e.dead),
  ).toHaveLength(4);
  const defeated = {
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((e) =>
        e.id === "boss:pounder" ? { ...e, dead: true, wounds: e.life! } : e,
      ),
    },
  };
  const cleared = removeCasualties({ state: defeated, events: [] }, ["boss:pounder"]);
  expect(
    cleared.state.battle!.entities.filter((e) => e.side === "monster" && !e.dead),
  ).toHaveLength(0);
  expect(cleared.state.battle!.entities.filter((e) => e.side === "hero")).toEqual(
    state.battle!.entities.filter((e) => e.side === "hero"),
  );
  expect(cleared.events.filter((e) => e.type === "casualtyRemoved")).toHaveLength(4);
  const repeated = removeCasualties({ state: cleared.state, events: [] }, []);
  expect(repeated.events).toEqual([]);
  expect(repeated.state).toEqual(cleared.state);
});

it("R-036：Stygian 仍绑定标准 Pounder 房 p012", () => {
  const bound = run(atObjective(), { type: "prepareDungeonBattle" });
  const stygian: GameState = {
    ...bound,
    dungeon: { ...bound.dungeon!, mode: "stygian", stygianRoomRules: "full" },
  };
  const deployed = run(stygian, { type: "deployPounderI" });
  expect(deployed.dungeon!.roomCards!.active!.cardId).toBe("room:weald:12");
});

it.each(["pack", "threat", "plan", "level", "skills", "version", "location"])(
  "拒绝非法 Pounder 部署且不消费 RNG：%s",
  (kind) => {
    const bound = run(atObjective(), { type: "prepareDungeonBattle" });
    const d = bound.dungeon!;
    let input: GameState = {
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
    if (kind === "version") {
      const { pounderHamletThreats: _version, ...dungeon } = input.dungeon!;
      void _version;
      input = { ...input, dungeon };
    }
    if (kind === "location") {
      const { bossExpeditionRegion: _region, ...dungeon } = input.dungeon!;
      void _region;
      input = { ...input, dungeon };
    }
    const result = applyCommand(input, { type: "deployPounderI" });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(result.state).toBe(input);
  },
);
