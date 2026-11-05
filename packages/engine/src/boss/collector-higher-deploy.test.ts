import { expect, it } from "vitest";
import { savedCommandSchema } from "../../../data/src/quest-save";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "./face-the-threat-embark-runtime";
import { RUINS_COMBAT_LEVELS } from "./ruins-combat-levels";

function atObjective(level: 2 | 3): GameState {
  const row = RUINS_COMBAT_LEVELS.collector[level - 1]!;
  const s = createCoreDungeonQuest(17, "quest:p019", "standard", coreParty, coreQuestSources, true);
  const d = s.dungeon!;
  const context = {
    campaignLevel: level,
    activeBossThreatScriptId: row.script,
    imminentThreatDescriptionCardId: row.description,
  };
  const entered: GameState = {
    ...s,
    dungeon: {
      ...d,
      ...context,
      phase: "awaitingRoom",
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      explorationSetup: { ...d.explorationSetup!, dungeonLevel: level },
      rooms: d.rooms.map((r) => (r.kind === "objective" ? { ...r, revealed: true } : r)),
      faceTheThreatEmbarkPlan: {
        ...requireFaceTheThreatEmbarkPlanForSandbox(context),
        roomPlacement: "edgeRoomsR30",
      },
    },
  };
  return ok(entered, { type: "prepareDungeonBattle" }).state;
}
function ok(state: GameState, command: Command) {
  const r = applyCommand(state, command);
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return r;
}
const command = (level: 2 | 3) =>
  ({ type: level === 2 ? "deployCollectorII" : "deployCollectorIII" }) as const;

it.each([2, 3] as const)(
  "Collector %i 真实部署：Boss 进攻 C、四英雄按 R-168、部署不掷骰/洗先攻",
  (level) => {
    expect(savedCommandSchema.safeParse(command(level)).success).toBe(true);
    const s = atObjective(level),
      before = structuredClone(s),
      d = s.dungeon!;
    const r = ok(s, command(level)),
      b = r.state.battle!;
    const row = RUINS_COMBAT_LEVELS.collector[level - 1]!;
    expect(b.areas).toHaveLength(8);
    expect(b.entities.filter((e) => e.side === "hero")).toHaveLength(4);
    expect(b.entities.filter((e) => e.side === "monster")).toMatchObject([
      {
        id: `boss:collector:${level}`,
        monsterCardId: row.card,
        areaId: "C",
        stance: "aggressive",
        stanceSlots: 1,
        life: level === 2 ? 88 : 111,
      },
    ]);
    expect(b.entities).toHaveLength(5);
    expect(b.encounter).toBeUndefined();
    expect(r.state.dungeon!.roomCards!.active!.tileId).toBe("room_tile:p007:back");
    expect(r.state.dungeon!.activeBossThreatScriptId).toBe(row.script);
    expect(r).toEqual(applyCommand(JSON.parse(JSON.stringify(s)), command(level)));
    expect(s).toEqual(before);
    expect(d.heroes).toEqual(r.state.dungeon!.heroes);
  },
);

it.each([2, 3] as const)("Collector %i startBattle 写入威胁交接并洗先攻", (level) => {
  const started = ok(ok(atObjective(level), command(level)).state, { type: "startBattle" }).state;
  expect(started.battle!.encounter).toMatchObject({ round: 1 });
  expect(started.dungeon!.bossCombatThreatCeased).toBe(
    RUINS_COMBAT_LEVELS.collector[level - 1]!.script,
  );
});

it.each([2, 3] as const)("Collector %i 拒绝错等级/错威胁/篡改出征战斗卡", (level) => {
  const s = atObjective(level),
    d = s.dungeon!,
    other = RUINS_COMBAT_LEVELS.collector[level === 2 ? 2 : 1]!;
  const refusals: GameState[] = [
    { ...s, dungeon: { ...d, campaignLevel: level === 2 ? 3 : 2 } },
    { ...s, dungeon: { ...d, activeBossThreatScriptId: other.script } },
    { ...s, dungeon: { ...d, imminentThreatDescriptionCardId: other.description } },
    {
      ...s,
      dungeon: {
        ...d,
        faceTheThreatEmbarkPlan: {
          ...d.faceTheThreatEmbarkPlan!,
          combatEntry: {
            ...d.faceTheThreatEmbarkPlan!.combatEntry,
            combatMonsterCardId: other.card,
          },
        },
      },
    },
  ];
  for (const bad of refusals) {
    const r = applyCommand(bad, command(level));
    expect(r.state).toBe(bad);
    expect(r.events.some((e) => e.type === "commandRefused")).toBe(true);
  }
});
