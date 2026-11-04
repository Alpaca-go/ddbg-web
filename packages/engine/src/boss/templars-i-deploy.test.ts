import { expect, it } from "vitest";
import { savedCommandSchema } from "../../../data/src/quest-save";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import {
  DARKEST_TEMPLARS_SCRIPT_ID,
  ensureDarkestMidBossScriptsRegistered,
} from "./darkest-mid-boss-scripts";
import {
  TEMPLAR_IMPALER_MONSTER_CARD_ID,
  TEMPLAR_WARLORD_MONSTER_CARD_ID,
} from "./darkest-templars-skills-acc";
import { readDarkestBossEncounter } from "./darkest-content";

function apply(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(result.events.filter((event) => event.type === "commandRefused")).toEqual([]);
  return result.state;
}

function atObjective() {
  ensureDarkestMidBossScriptsRegistered();
  const game = createCoreDungeonQuest(7, "quest:p017", "radiant", coreParty, coreQuestSources);
  const d = game.dungeon!;
  const room = d.rooms.find((r) => r.kind === "objective")!;
  return apply(
    { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
    { type: "prepareDungeonBattle" },
  );
}

const deploy = { type: "deployTemplarsI" } as const;
const start = { type: "startBattle" } as const;

it("R-180：十四区部署、Impaler M / Warlord C、四英雄 R-162 区、JSON 续接", () => {
  const source = atObjective();
  expect(readDarkestBossEncounter("quest:p017")!.combatReady).toBe(true);
  expect(
    applyCommand(source, { type: "prepareDungeonMonsters" }).events.some(
      (e) => e.type === "commandRefused",
    ),
  ).toBe(true);
  const deployed = apply(source, deploy);
  const b = deployed.battle!;
  expect(b.areas).toHaveLength(14);
  expect(b.entities.slice(0, 4).map(({ stance, areaId }) => ({ stance, areaId }))).toEqual([
    { stance: "aggressive", areaId: "I" },
    { stance: "defensive", areaId: "F" },
    { stance: "ranged", areaId: "G" },
    { stance: "support", areaId: "F" },
  ]);
  const impaler = b.entities.find((e) => e.monsterCardId === TEMPLAR_IMPALER_MONSTER_CARD_ID)!;
  const warlord = b.entities.find((e) => e.monsterCardId === TEMPLAR_WARLORD_MONSTER_CARD_ID)!;
  expect(impaler).toMatchObject({ stance: "aggressive", areaId: "M", stanceSlots: 2 });
  expect(warlord).toMatchObject({ stance: "ranged", areaId: "C", stanceSlots: 2 });
  expect(b.monsterStanceAreas).toEqual({
    aggressive: "M",
    defensive: "M",
    ranged: "C",
    support: "C",
  });
  expect(b.rngCursor).toBe(source.dungeon!.cursor);
  expect(b.encounter).toBeUndefined();
  expect(deployed.dungeon!.darkest!.bossDeployment).toBeUndefined();
  expect(deployed.dungeon!.roomCards!.active!.tileId).toBe("room_tile:p013:front");
  expect(deployed.dungeon!.darkest!.bossEncounterPlan!.resolvedScriptId).toBe(
    DARKEST_TEMPLARS_SCRIPT_ID,
  );
  expect(applyCommand(deployed, deploy).state).toBe(deployed);
  const started = apply(deployed, start);
  expect(started.battle!.encounter!.deck).toHaveLength(8);
  expect([deploy, start].reduce(apply, JSON.parse(JSON.stringify(source)) as GameState)).toEqual(
    started,
  );
  expect(savedCommandSchema.parse(JSON.parse(JSON.stringify(deploy)))).toEqual(deploy);
});

it("拒绝错任务、未绑房、占位 bossDeployment 与 deployDarkestMidBoss", () => {
  const state = atObjective();
  const d = state.dungeon!;
  for (const dungeon of [
    { ...d, questDistribution: { ...d.questDistribution!, questId: "quest:p016" as const } },
    {
      ...d,
      roomCards: { ...d.roomCards!, active: { ...d.roomCards!.active!, cardId: "room:p023" } },
    },
    {
      ...d,
      darkest: {
        ...d.darkest!,
        bossDeployment: {
          roomId: d.position,
          resolvedScriptId: DARKEST_TEMPLARS_SCRIPT_ID,
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
