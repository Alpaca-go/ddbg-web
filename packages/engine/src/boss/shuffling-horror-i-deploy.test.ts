import { expect, it } from "vitest";
import { savedCommandSchema } from "../../../data/src/quest-save";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { nextBattleRoll } from "../battle-roll";
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
  expect(readDarkestBossEncounter("quest:p016")!.combatReady).toBe(true);
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

function withMonsterTurn(state: GameState, actorId: string, rngCursor?: number): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      ...(rngCursor === undefined ? {} : { rngCursor }),
      encounter: {
        round: 1,
        deck: ["hero", "monster"],
        actedIds: [],
        turn: { type: "monster", actorId },
      },
    },
  };
}

it("生产几何：Undulations 按房间姿态区重排英雄，Echoing 召唤物落在 room tile 区域", () => {
  const started = apply(apply(atObjective(), deploy), start);
  const boss = started.battle!.entities.find(
    (entity) => entity.monsterCardId === SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID,
  )!;
  const heroAreas = new Map(
    started
      .battle!.entities.filter((entity) => entity.side === "hero")
      .map((entity) => [entity.id, entity.areaId]),
  );
  const cursor = Array.from({ length: 500 }, (_, index) => index).find((value) => {
    const roll = nextBattleRoll(started.seed, value);
    return roll >= 8 && roll <= 10;
  })!;
  const prepared = applyCommand(withMonsterTurn(started, boss.id, cursor), {
    type: "prepareMonsterAction",
    actorId: boss.id,
  });
  expect(prepared.events.filter((event) => event.type === "commandRefused")).toEqual([]);
  expect(prepared.events.some((event) => event.type === "dungeonUpdated")).toBe(true);
  for (const hero of prepared.state.battle!.entities.filter((entity) => entity.side === "hero")) {
    expect(hero.areaId).toBe(heroAreas.get(hero.id));
    expect(hero.areaId).not.toMatch(/^darkest-mid-boss-/);
  }

  const echoing = applyCommand(withMonsterTurn(started, boss.id), {
    type: "applyShufflingHorrorEchoingDisassembly",
    actorId: boss.id,
  });
  expect(echoing.events.filter((event) => event.type === "commandRefused")).toEqual([]);
  const summoned = echoing.state.battle!.entities.filter((entity) =>
    entity.id.startsWith("shuffling-echoing:"),
  );
  expect(summoned.length).toBeGreaterThan(0);
  for (const entity of summoned) {
    expect(entity.areaId).toBe(started.battle!.monsterStanceAreas![entity.stance!]);
    expect(entity.areaId).not.toMatch(/^darkest-mid-boss-/);
  }
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
