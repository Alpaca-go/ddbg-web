import { expect, it } from "vitest";
import { savedCommandSchema } from "../../../data/src/quest-save";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "./face-the-threat-embark-runtime";
import {
  NECROMANCER_III_DESCRIPTION_ABILITY_CARD_ID,
  NECROMANCER_III_SCRIPT_ID,
} from "./necromancer-iii";

/** 显式 III 级目标房入口夹具；不代表自然 II→III 战役已验收。 */
function atObjective(): GameState {
  const s = createCoreDungeonQuest(17, "quest:p019", "standard", coreParty, coreQuestSources, true);
  const d = s.dungeon!;
  const context = {
    campaignLevel: 3 as const,
    activeBossThreatScriptId: NECROMANCER_III_SCRIPT_ID,
    imminentThreatDescriptionCardId: NECROMANCER_III_DESCRIPTION_ABILITY_CARD_ID,
  };
  const entered: GameState = {
    ...s,
    dungeon: {
      ...d,
      ...context,
      phase: "awaitingRoom",
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      explorationSetup: { ...d.explorationSetup!, dungeonLevel: 3 },
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
const command = { type: "deployNecromancerIII" } as const;

it("R-135/166/172：Necromancer III 进攻 A、四英雄 G，部署不掷骰/洗先攻/发奖励", () => {
  expect(savedCommandSchema.safeParse(command).success).toBe(true);
  const s = atObjective(),
    before = structuredClone(s),
    d = s.dungeon!;
  const r = ok(s, command),
    b = r.state.battle!;
  expect(b.areas).toHaveLength(8);
  expect(b.entities.filter((e) => e.side === "hero").map((e) => e.areaId)).toEqual([
    "G",
    "G",
    "G",
    "G",
  ]);
  expect(b.entities.filter((e) => e.side === "monster")).toMatchObject([
    {
      id: "boss:necromancer:3",
      monsterCardId: "monster_medium:p091",
      areaId: "A",
      stance: "aggressive",
      stanceSlots: 1,
      life: 144,
    },
  ]);
  expect(b.entities).toHaveLength(5);
  expect(b.encounter).toBeUndefined();
  expect(r.state.dungeon!.roomCards!.active!.tileId).toBe("room_tile:p006:back");
  expect(r.state.dungeon!.activeBossThreatScriptId).toBe(NECROMANCER_III_SCRIPT_ID);
  expect(r).toEqual(applyCommand(JSON.parse(JSON.stringify(s)), command));
  expect(s).toEqual(before);
  expect(d.heroes).toEqual(r.state.dungeon!.heroes);
});

it("startBattle 写入 III 级威胁交接并洗先攻", () => {
  const started = ok(ok(atObjective(), command).state, { type: "startBattle" }).state;
  expect(started.battle!.encounter).toMatchObject({ round: 1 });
  expect(started.dungeon!.bossCombatThreatCeased).toBe(NECROMANCER_III_SCRIPT_ID);
});

it("拒绝 II 级战役、错威胁/错描述卡与篡改出征战斗卡", () => {
  const s = atObjective(),
    d = s.dungeon!;
  const refusals: GameState[] = [
    { ...s, dungeon: { ...d, campaignLevel: 2 } },
    { ...s, dungeon: { ...d, activeBossThreatScriptId: "boss:ruins:necromancer:2" } },
    { ...s, dungeon: { ...d, imminentThreatDescriptionCardId: "boss_ability:p002" } },
    {
      ...s,
      dungeon: {
        ...d,
        faceTheThreatEmbarkPlan: {
          ...d.faceTheThreatEmbarkPlan!,
          combatEntry: {
            ...d.faceTheThreatEmbarkPlan!.combatEntry,
            combatMonsterCardId: "monster_medium:p090",
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
