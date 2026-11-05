import { expect, it } from "vitest";
import { savedCommandSchema } from "../../../data/src/quest-save";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "./face-the-threat-embark-runtime";
import {
  NECROMANCER_II_DESCRIPTION_ABILITY_CARD_ID,
  NECROMANCER_II_SCRIPT_ID,
} from "./necromancer-ii";

/** 显式 II 级目标房入口夹具；不代表自然 I→II 战役已验收。 */
function atObjective(): GameState {
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
const command = { type: "deployNecromancerII" } as const;

it("R-166 几何 / R-172 模式：Necromancer II 进攻 A、四英雄 G，部署不掷骰/洗先攻/发奖励", () => {
  expect(savedCommandSchema.safeParse(command).success).toBe(true);
  const s = atObjective(),
    before = structuredClone(s),
    d = s.dungeon!;
  const r = ok(s, command),
    b = r.state.battle!;
  expect(b.areas).toHaveLength(8);
  expect(b.areas.find((a) => a.id === "A")).toMatchObject({
    capacity: 3,
    elevation: "high",
    adjacent: ["C"],
  });
  expect(b.entities.filter((e) => e.side === "hero").map((e) => e.areaId)).toEqual([
    "G",
    "G",
    "G",
    "G",
  ]);
  expect(b.entities.filter((e) => e.side === "monster")).toMatchObject([
    {
      id: "boss:necromancer:2",
      monsterCardId: "monster_medium:p090",
      areaId: "A",
      stance: "aggressive",
      stanceSlots: 1,
      life: 103,
    },
  ]);
  expect(b.entities).toHaveLength(5);
  expect(b.encounter).toBeUndefined();
  expect(b.rngCursor).toBe(d.cursor);
  expect(b.choiceCursor).toBe(d.decision);
  expect(r.state.dungeon!.heroes).toEqual(d.heroes);
  expect(r.state.dungeon!.gold).toBe(d.gold);
  expect(r.state.dungeon!.roomCards!.active!.tileId).toBe("room_tile:p006:back");
  expect(r.state.dungeon!.activeBossThreatScriptId).toBe(NECROMANCER_II_SCRIPT_ID);
  expect(r).toEqual(applyCommand(JSON.parse(JSON.stringify(s)), command));
  expect(s).toEqual(before);
});

it("startBattle 保留 II 级威胁交接并洗入先攻；不误套 I 级脚本", () => {
  const s = atObjective();
  const started = ok(ok(s, command).state, { type: "startBattle" }).state;
  expect(started.battle!.encounter).toMatchObject({ round: 1 });
  expect(started.dungeon!.bossCombatThreatCeased).toBe(NECROMANCER_II_SCRIPT_ID);
  expect(
    started.battle!.entities.filter((e) => e.side === "monster").map((e) => e.monsterCardId),
  ).toEqual(["monster_medium:p090"]);
});

it("拒绝 I 级战役、错威胁/错描述卡、错房与篡改出征战斗卡", () => {
  const s = atObjective(),
    d = s.dungeon!;
  const refusals: GameState[] = [
    { ...s, dungeon: { ...d, campaignLevel: 1 } },
    { ...s, dungeon: { ...d, activeBossThreatScriptId: "boss:ruins:necromancer:1" } },
    { ...s, dungeon: { ...d, imminentThreatDescriptionCardId: "boss_ability:p001" } },
    {
      ...s,
      dungeon: {
        ...d,
        faceTheThreatEmbarkPlan: {
          ...d.faceTheThreatEmbarkPlan!,
          combatEntry: {
            ...d.faceTheThreatEmbarkPlan!.combatEntry,
            combatMonsterCardId: "monster_medium:p089",
          },
        },
      },
    },
  ];
  for (const bad of refusals) {
    const r = applyCommand(bad, command);
    expect(r.state).toBe(bad);
    expect(r.events.some((e) => e.type === "commandRefused")).toBe(true);
  }
});
