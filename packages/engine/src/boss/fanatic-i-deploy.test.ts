import { expect, it } from "vitest";
import { savedCommandSchema } from "../../../data/src/quest-save";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "./face-the-threat-embark-runtime";
import {
  FANATIC_I_SCRIPT_ID,
  FANATIC_I_DESCRIPTION_ABILITY_CARD_ID,
  FANATIC_I_COMBAT_MONSTER_CARD_ID,
  FANATIC_I_PYRE_MONSTER_CARD_ID,
} from "./fanatic-i";

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
    activeBossThreatScriptId: FANATIC_I_SCRIPT_ID,
    imminentThreatDescriptionCardId: FANATIC_I_DESCRIPTION_ABILITY_CARD_ID,
  };
  return apply(
    {
      ...state,
      dungeon: {
        ...d,
        ...threat,
        phase: "awaitingRoom",
        rooms: d.rooms.map((room) =>
          room.kind === "objective" ? { ...room, revealed: true } : room,
        ),
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

const deploy = { type: "deployFanaticI" } as const;
const start = { type: "startBattle" } as const;

it("R-169 / 拟 R-178：真实九区部署、Fanatic 进攻 B、无额外 RNG、显式 startBattle 写入 Pyre/E", () => {
  const source = atObjective();
  const deployed = apply(source, deploy);
  const b = deployed.battle!;
  expect(b.areas).toHaveLength(9);
  expect(b.areas.find((a) => a.id === "B")!.elevation).toBe("high");
  expect(b.entities.slice(0, 4).map(({ areaId }) => areaId)).toEqual(["H", "A", "H", "C"]);
  expect(b.entities[0]).toMatchObject({ wounds: 2, stress: 1 });
  expect(b.entities[4]).toMatchObject({
    id: "boss:fanatic:1",
    monsterCardId: FANATIC_I_COMBAT_MONSTER_CARD_ID,
    stance: "aggressive",
    areaId: "B",
  });
  expect(b.monsterStanceAreas).toEqual({
    aggressive: "B",
    defensive: "B",
    ranged: "E",
    support: "E",
  });
  expect(b.rngCursor).toBe(source.dungeon!.cursor);
  expect(b.choiceCursor).toBe(source.dungeon!.decision);
  expect(b.encounter).toBeUndefined();
  expect(b.entities.filter((e) => e.monsterCardId === FANATIC_I_PYRE_MONSTER_CARD_ID)).toHaveLength(
    0,
  );
  expect(applyCommand(deployed, deploy).state).toBe(deployed);
  expect(deployed.dungeon!.roomCards!.active!.tileId).toBe("room_tile:p007:front");

  const started = apply(deployed, start);
  const pyre = started.battle!.entities.find((e) => e.id === "boss:fanatic:pyre")!;
  expect(pyre).toMatchObject({
    monsterCardId: FANATIC_I_PYRE_MONSTER_CARD_ID,
    stance: "ranged",
    areaId: "E",
  });
  const deck = started.battle!.encounter!.deck;
  expect(deck.filter((side) => side === "monster")).toHaveLength(4);
  expect([deploy, start].reduce(apply, JSON.parse(JSON.stringify(source)) as GameState)).toEqual(
    started,
  );
  expect(savedCommandSchema.parse(JSON.parse(JSON.stringify(deploy)))).toEqual(deploy);
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
      roomCards: { ...d.roomCards!, active: { ...d.roomCards!.active!, cardId: "room:p012" } },
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
