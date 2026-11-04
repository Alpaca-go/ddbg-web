import { expect, it } from "vitest";
import { savedCommandSchema } from "../../../data/src/quest-save";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import {
  DARKEST_SHUFFLING_HORROR_SCRIPT_ID,
  ensureDarkestMidBossScriptsRegistered,
} from "./darkest-mid-boss-scripts";
import { SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID } from "./darkest-shuffling-horror-combat-runtime";
import { readDarkestBossEncounter } from "./darkest-content";

function apply(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(result.events.filter((event) => event.type === "commandRefused")).toEqual([]);
  return result.state;
}

function atObjective() {
  ensureDarkestMidBossScriptsRegistered();
  const game = createCoreDungeonQuest(7, "quest:p016", "radiant", coreParty, coreQuestSources);
  const d = game.dungeon!;
  const room = d.rooms.find((r) => r.kind === "objective")!;
  return apply(
    { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
    { type: "prepareDungeonBattle" },
  );
}

const deploy = { type: "deployShufflingHorrorI" } as const;
const start = { type: "startBattle" } as const;

it("R-182：九区部署、Boss 进攻/H、四英雄 R-163 区、JSON 续接", () => {
  const source = atObjective();
  expect(readDarkestBossEncounter("quest:p016")!.combatReady).toBe(false);
  expect(
    applyCommand(source, { type: "prepareDungeonMonsters" }).events.some(
      (e) => e.type === "commandRefused",
    ),
  ).toBe(true);
  const deployed = apply(source, deploy);
  const b = deployed.battle!;
  expect(b.areas).toHaveLength(9);
  expect(b.entities.slice(0, 4).map(({ stance, areaId }) => ({ stance, areaId }))).toEqual([
    { stance: "aggressive", areaId: "G" },
    { stance: "defensive", areaId: "I" },
    { stance: "ranged", areaId: "I" },
    { stance: "support", areaId: "B" },
  ]);
  const boss = b.entities.find((e) => e.monsterCardId === SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID)!;
  expect(boss).toMatchObject({ stance: "aggressive", areaId: "H", stanceSlots: 2 });
  expect(b.monsterStanceAreas).toEqual({
    aggressive: "H",
    defensive: "H",
    ranged: "D",
    support: "C",
  });
  expect(b.rngCursor).toBe(source.dungeon!.cursor);
  expect(b.encounter).toBeUndefined();
  expect(deployed.dungeon!.darkest!.bossDeployment).toBeUndefined();
  expect(deployed.dungeon!.roomCards!.active!.tileId).toBe("room_tile:p013:back");
  expect(deployed.dungeon!.darkest!.bossEncounterPlan!.resolvedScriptId).toBe(
    DARKEST_SHUFFLING_HORROR_SCRIPT_ID,
  );
  expect(applyCommand(deployed, deploy).state).toBe(deployed);
  const started = apply(deployed, start);
  expect(started.battle!.encounter!.deck).toHaveLength(6);
  expect([deploy, start].reduce(apply, JSON.parse(JSON.stringify(source)) as GameState)).toEqual(
    started,
  );
  expect(savedCommandSchema.parse(JSON.parse(JSON.stringify(deploy)))).toEqual(deploy);
});

it("拒绝错任务、未绑房、占位 bossDeployment 与 deployDarkestMidBoss", () => {
  const state = atObjective();
  const d = state.dungeon!;
  for (const dungeon of [
    { ...d, questDistribution: { ...d.questDistribution!, questId: "quest:p017" as const } },
    {
      ...d,
      roomCards: { ...d.roomCards!, active: { ...d.roomCards!.active!, cardId: "room:p022" } },
    },
    {
      ...d,
      darkest: {
        ...d.darkest!,
        bossDeployment: {
          roomId: d.position,
          resolvedScriptId: DARKEST_SHUFFLING_HORROR_SCRIPT_ID,
          monsters: [],
          supportMonsters: [],
          supportCardIds: [],
          blockedReason: "fixture",
        },
      },
    },
  ]) {
    expect(
      applyCommand({ ...state, dungeon }, deploy).events.some((e) => e.type === "commandRefused"),
    ).toBe(true);
  }
  expect(
    applyCommand(state, { type: "deployDarkestMidBoss" }).events.some(
      (e) => e.type === "commandRefused",
    ),
  ).toBe(true);
});
