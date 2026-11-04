import { expect, it } from "vitest";
import { savedCommandSchema } from "../../../data/src/quest-save";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "./face-the-threat-embark-runtime";
import { COLLECTOR_I_SCRIPT_ID, COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID } from "./collector-i";

function apply(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(result.events.filter((event) => event.type === "commandRefused")).toEqual([]);
  return result.state;
}

function atObjective() {
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
    activeBossThreatScriptId: COLLECTOR_I_SCRIPT_ID,
    imminentThreatDescriptionCardId: COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID,
  };
  return apply(
    {
      ...state,
      dungeon: {
        ...d,
        ...threat,
        phase: "awaitingRoom",
        position: d.rooms.find((room) => room.kind === "objective")!.id,
        heroes: d.heroes.map((hero, i) => (i === 0 ? { ...hero, wounds: 2, stress: 1 } : hero)),
        faceTheThreatEmbarkPlan: {
          ...requireFaceTheThreatEmbarkPlanForSandbox(threat),
          roomPlacement: "edgeRoomsR30",
        },
      },
    },
    { type: "prepareDungeonBattle" },
  );
}

const deploy = { type: "deployCollectorI" } as const;

it("R-175真实部署、三个F区宝箱及JSON命令续接", () => {
  const source = atObjective();
  const deployed = apply(source, deploy);
  const b = deployed.battle!;
  expect(b.areas.map(({ capacity }) => capacity)).toEqual([2, 3, 3, 2, 2, 2, 2, 3]);
  expect(b.areas.find(({ id }) => id === "C")!.adjacent).toEqual(["A", "D", "E", "G"]);
  expect(b.entities.slice(0, 4).map(({ areaId }) => areaId)).toEqual(["H", "B", "B", "H"]);
  expect(b.entities[0]).toMatchObject({ wounds: 2, stress: 1 });
  expect(b.entities[4]).toMatchObject({
    id: "boss:collector:1",
    stance: "aggressive",
    areaId: "C",
    life: 66,
  });
  expect(b.rngCursor).toBe(source.dungeon!.cursor);
  expect(b.choiceCursor).toBe(source.dungeon!.decision);
  expect(b.loot).toBeUndefined();
  expect(b.encounter).toBeUndefined();
  expect(applyCommand(deployed, deploy).state).toBe(deployed);

  const start = { type: "startBattle" } as const;
  const started = apply(deployed, start);
  const loot = started.battle!.loot!;
  expect(loot.placed.map(({ areaId }) => areaId)).toEqual(["F", "F", "F"]);
  expect(new Set(loot.placed.map(({ id }) => id)).size).toBe(3);
  expect(loot.gold).toBe(source.dungeon!.gold);
  expect(started.battle!.encounter!.deck.filter((side) => side === "monster")).toHaveLength(1);
  expect([deploy, start].reduce(apply, JSON.parse(JSON.stringify(source)) as GameState)).toEqual(
    started,
  );
  expect(savedCommandSchema.parse(JSON.parse(JSON.stringify(deploy)))).toEqual(deploy);

  const actor = b.entities[0]!;
  const atLoot: GameState = {
    ...started,
    battle: {
      ...started.battle!,
      entities: started.battle!.entities.map((entity) =>
        entity.id === actor.id ? { ...entity, areaId: "F" } : entity,
      ),
      encounter: {
        ...started.battle!.encounter!,
        turn: { type: "hero", actorId: actor.id, actions: 2, usedSkillIds: [] },
      },
    },
  };
  expect(applyCommand(atLoot, { type: "interactLoot", actorId: actor.id }).state).toBe(atLoot);
});

it("首轮Collect All使用真实房间召唤区并洗入三张先攻", () => {
  const started = apply(apply(atObjective(), deploy), { type: "startBattle" });
  const actorId = "boss:collector:1";
  // 固定当前行动者，房间、牌池与RNG均来自真实开战。
  const turn: GameState = {
    ...started,
    battle: {
      ...started.battle!,
      encounter: {
        ...started.battle!.encounter!,
        deck: started.battle!.encounter!.deck.filter((side) => side !== "monster"),
        turn: { type: "monster", actorId },
      },
    },
  };
  const b = apply(turn, { type: "prepareMonsterAction", actorId }).battle!;
  expect(b.entities.slice(5).map(({ monsterCardId, areaId }) => [monsterCardId, areaId])).toEqual([
    ["monster_medium:p098", "G"],
    ["monster_medium:p095", "E"],
    ["monster_medium:p101", "A"],
  ]);
  expect(b.encounter!.deck.filter((side) => side === "monster")).toHaveLength(3);
});

it("拒绝等级、威胁、目标房和出征战斗卡错配", () => {
  const state = atObjective();
  const d = state.dungeon!;
  const plan = d.faceTheThreatEmbarkPlan!;
  for (const dungeon of [
    { ...d, campaignLevel: 2 as const },
    { ...d, imminentThreatDescriptionCardId: "boss_ability:p007" },
    {
      ...d,
      roomCards: { ...d.roomCards!, active: { ...d.roomCards!.active!, cardId: "room:p011" } },
    },
    {
      ...d,
      faceTheThreatEmbarkPlan: {
        ...plan,
        combatEntry: { ...plan.combatEntry, combatMonsterCardId: "monster_large:p005" },
      },
    },
  ]) {
    const invalid = { ...state, dungeon };
    expect(applyCommand(invalid, deploy).state).toBe(invalid);
  }
});
