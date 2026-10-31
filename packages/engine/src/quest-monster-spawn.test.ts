import { expect, it } from "vitest";
import { asQuestMapPairingQuest, basicQuests } from "../../data/src/basic-quests";
import { pickEmbarkQuestMapLayout } from "../../data/src/quest-map-pairing";
import { applyCommand, type GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";
import { readRoomTile } from "./room-tile-selection";
import { questMonsterDeploymentHold } from "./quest-monster-deployment";
import {
  questMonsterOutsidePoolInstanceIds,
  readQuestMonsterPlanAtRoom,
} from "./quest-monster-spawn";
import { coreQuestSources as sources } from "./test-helpers/core-quest";

function fixture(questId: string): GameState {
  const quest = basicQuests.find((q) => q.id === questId)!;
  const game = createDungeonSandbox(
    17,
    pickEmbarkQuestMapLayout(asQuestMapPairingQuest(quest), 17, 0),
    quest.distribution,
    "standard",
    "S",
    undefined,
    sources.resolveCards,
    { dungeonLevel: quest.level, light: 5, provisions: [] },
    sources.curios,
    sources.rooms,
    sources.monsters,
    sources.catalog,
  );
  const d = game.dungeon!;
  const position = d.rooms.find((r) => r.kind === "objective")!.id;
  return {
    ...game,
    dungeon: {
      ...d,
      phase: "awaitingRoom",
      position,
      campaignLevel: quest.level,
      rooms: d.rooms.map((r) => (r.id === position ? { ...r, revealed: true } : r)),
      roomCards: {
        ...d.roomCards!,
        active: {
          roomId: position,
          cardId: "room:p001",
          tileId: (() => {
            const selected = readRoomTile(sources.rooms.find((r) => r.id === "room:p001"));
            if (selected.status !== "matched") throw new Error("fixture requires approved room");
            return selected.tile.id;
          })(),
          blockedReason: "机制夹具",
        },
      },
    },
  };
}

it.each([
  ["quest:p009", "Bone Bearer", "monster_medium:p016", "3 级", true],
  ["quest:p013", "Bone Captain", "monster_large:p001", "Life +20", false],
])(
  "%s 任务指定生成：不洗牌、单怪部署、RNG 不变、仍拒绝入场",
  (id, name, cardId, detail, outsidePool) => {
    const state = fixture(id),
      beforeCursor = state.dungeon!.cursor;
    const result = applyCommand(state, { type: "prepareDungeonMonsters" });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    const active = result.state.dungeon!.monsterPool!.active!;
    expect(active.monsters).toHaveLength(1);
    expect(active.monsters[0]).toMatchObject({ cardId, stanceSlots: name === "Bone Captain" ? 2 : 1 });
    expect(active.blockedReason).toContain("combatReady 仍为 false");
    expect(active.blockedReason).toContain(detail);
    expect(result.state.dungeon!.cursor).toBe(beforeCursor);
    expect(readQuestMonsterPlanAtRoom(result.state.dungeon!)!.printedMonsterLevel).toBe(
      id === "quest:p009" ? 3 : null,
    );
    if (outsidePool) {
      expect(questMonsterOutsidePoolInstanceIds(result.state.dungeon!)).toEqual([
        active.monsters[0]!.instanceId,
      ]);
    }
    const battle = applyCommand(result.state, { type: "startDungeonBattle" });
    expect(battle.state).toBe(result.state);
    expect(battle.events[0]).toMatchObject({
      type: "commandRefused",
      message: expect.stringContaining("combatReady: false"),
    });
    expect(questMonsterDeploymentHold(result.state.dungeon!)).toContain(name);
  },
);

it("未部署时 prepareDungeonMonsters 仍拒绝普通抽牌", () => {
  const state = fixture("quest:p009");
  const hold = questMonsterDeploymentHold(state.dungeon!);
  expect(hold).toContain("不能用普通随机遭遇替代");
  const random = applyCommand(
    {
      ...state,
      dungeon: {
        ...state.dungeon!,
        questDistribution: { ...state.dungeon!.questDistribution!, questId: "quest:p005" },
      },
    },
    { type: "prepareDungeonMonsters" },
  );
  expect(random.events.some((e) => e.type === "commandRefused")).toBe(false);
});
