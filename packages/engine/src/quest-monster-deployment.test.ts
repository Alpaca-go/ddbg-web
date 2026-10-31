import { expect, it } from "vitest";
import { asQuestMapPairingQuest, basicQuests } from "../../data/src/basic-quests";
import { pickEmbarkQuestMapLayout } from "../../data/src/quest-map-pairing";
import { applyCommand, type GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";
import { readRoomTile } from "./room-tile-selection";
import { questMonsterDeploymentHold } from "./quest-monster-deployment";
import { coreQuestSources as sources } from "./test-helpers/core-quest";

/** 已选获批房间的机制夹具；不声称自然抽到房间或完成跨幕。 */
function fixture(questId: string, kind: "objective" | "empty" = "objective"): GameState {
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
  const position = d.rooms.find((r) => r.kind === kind)!.id;
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
  ["quest:p009", "Bone Bearer", "III级"],
  ["quest:p013", "Bone Captain", "生命+20、闪避+2"],
])("%s 指定生成未接线时原子拒绝普通抽牌，重复及JSON往返不消耗RNG", (id, name, detail) => {
  const state = fixture(id),
    before = structuredClone(state);
  const command = { type: "prepareDungeonMonsters" } as const;
  const result = applyCommand(state, command);
  expect(result.state).toBe(state);
  expect(result.events).toEqual([
    { type: "commandRefused", message: expect.stringContaining(name) },
  ]);
  expect(result.events[0]!.message).toContain(detail);
  expect(result.events[0]!.message).toContain("不能用普通随机遭遇替代");
  expect(state).toEqual(before);
  expect(state.dungeon!.monsterPool!.active).toBeNull();
  expect(applyCommand(state, command)).toEqual(result);
  expect(applyCommand(JSON.parse(JSON.stringify(state)), command)).toEqual(result);
});

it.each(["quest:p009", "quest:p013"])("%s 已存在普通部署也不能绕过入场检查", (id) => {
  const base = fixture(id);
  // 模拟旧快照在目标房存有普通部署：入场必须在装备/奖励结算之前拒绝。
  const state = {
    ...base,
    dungeon: {
      ...base.dungeon!,
      monsterPool: {
        ...base.dungeon!.monsterPool!,
        active: { roomId: base.dungeon!.position, monsters: [], blockedReason: "旧普通部署" },
      },
    },
  };
  const result = applyCommand(state, { type: "startDungeonBattle" });
  expect(result.state).toBe(state);
  expect(result.events).toEqual([
    { type: "commandRefused", message: expect.stringContaining("任务指定生成尚未接线") },
  ]);
  expect(result.state.battle).toBeUndefined();
});

it("同任务非目标房和已接通的Disruption目标房继续使用既有部署", () => {
  for (const state of [
    fixture("quest:p009", "empty"),
    fixture("quest:p013", "empty"),
    fixture("quest:p006"),
  ]) {
    expect(questMonsterDeploymentHold(state.dungeon!)).toBeUndefined();
    if (state.dungeon!.rooms.find((r) => r.id === state.dungeon!.position)!.kind === "empty")
      continue;
    const result = applyCommand(state, { type: "prepareDungeonMonsters" });
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(result.state.dungeon!.monsterPool!.active?.monsters.length).toBeGreaterThan(0);
  }
});
