import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { RUINS_COMBAT_LEVELS } from "./ruins-combat-levels";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "./face-the-threat-embark-runtime";

const initial = createCoreDungeonQuest(17, "quest:p019", "standard", coreParty, coreQuestSources);

/** 显式目标房机制夹具：不声称已走完走廊或自然高等级战役。 */
function atObjective(
  family: keyof typeof RUINS_COMBAT_LEVELS = "necromancer",
  level = 1,
): GameState {
  const entry = RUINS_COMBAT_LEVELS[family][level - 1]!;
  const d = initial.dungeon!;
  const context = {
    campaignLevel: level as 1 | 2 | 3,
    activeBossThreatScriptId: entry.script,
    imminentThreatDescriptionCardId: entry.description,
  };
  return {
    ...initial,
    dungeon: {
      ...d,
      ...context,
      phase: "awaitingRoom",
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      faceTheThreatEmbarkPlan: {
        ...requireFaceTheThreatEmbarkPlanForSandbox(context),
        roomPlacement: "edgeRoomsR30",
      },
    },
  };
}
const command = { type: "prepareDungeonBattle" } as const;

it("四 Boss I–III 按实际威胁绑定专属房间；不抽普通牌、不消费 RNG、不生成怪物或奖励", () => {
  const ids = {
    necromancer: "room:p010",
    prophet: "room:p011",
    collector: "room:p012",
    fanatic: "room:p013",
  };
  for (const family of Object.keys(ids) as (keyof typeof ids)[]) {
    for (const level of [1, 2, 3]) {
      const state = atObjective(family, level);
      const before = state.dungeon!;
      const result = applyCommand(state, command);
      expect(result.events[0]?.type).toBe("dungeonUpdated");
      const after = result.state.dungeon!;
      expect(after.roomCards!.active).toMatchObject({
        roomId: before.position,
        cardId: ids[family],
      });
      expect(after.roomCards!.active!.tileId).toBeUndefined();
      expect(after.roomCards!.active!.blockedReason).toContain(
        RUINS_COMBAT_LEVELS[family][level - 1]!.card,
      );
      expect(after).toEqual({
        ...before,
        roomCards: { ...before.roomCards!, active: after.roomCards!.active },
      });
      expect(before.roomCards!.active).toBeNull();
      expect(result).toEqual(applyCommand(JSON.parse(JSON.stringify(state)), command));
      for (const type of [
        "prepareDungeonBattle",
        "prepareDungeonMonsters",
        "startDungeonBattle",
      ] as const) {
        const repeated = applyCommand(result.state, { type });
        expect(repeated.events[0]?.type).toBe("commandRefused");
        expect(repeated.state).toBe(result.state);
      }
    }
  }
});

it("错级威胁、篡改计划/房间身份与缺目录均原子拒绝", () => {
  const state = atObjective("collector", 2);
  const d = state.dungeon!;
  const plan = d.faceTheThreatEmbarkPlan!;
  const bad: GameState[] = [
    { ...state, dungeon: { ...d, campaignLevel: 3 } },
    { ...state, dungeon: { ...d, imminentThreatDescriptionCardId: "boss_ability:p002" } },
    {
      ...state,
      dungeon: {
        ...d,
        faceTheThreatEmbarkPlan: {
          ...plan,
          combatEntry: { ...plan.combatEntry, combatMonsterCardId: "monster_medium:p089" },
        },
      },
    },
    { ...state, dungeon: { ...d, roomCards: { ...d.roomCards!, cards: [] } } },
    {
      ...state,
      dungeon: {
        ...d,
        roomCards: {
          ...d.roomCards!,
          cards: d.roomCards!.cards.map((c) =>
            c.id === "room:p012" ? { ...c, name: "Necromancer Room" } : c,
          ),
        },
      },
    },
  ];
  for (const input of bad) {
    const result = applyCommand(input, command);
    expect(result.events[0]?.type).toBe("commandRefused");
    expect(result.state).toBe(input);
  }
});
