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
])("%s 任务指定生成后重复 prepare 与 JSON 往返不消耗 RNG", (id, name) => {
  const state = fixture(id);
  const deployed = applyCommand(state, { type: "prepareDungeonMonsters" });
  expect(deployed.state.dungeon!.monsterPool!.active?.monsters[0]?.cardId).toBeTruthy();
  expect(deployed.state.dungeon!.cursor).toBe(state.dungeon!.cursor);
  const repeat = applyCommand(deployed.state, { type: "prepareDungeonMonsters" });
  expect(repeat.events[0]).toMatchObject({ type: "commandRefused" });
  expect(
    applyCommand(JSON.parse(JSON.stringify(deployed.state)), { type: "prepareDungeonMonsters" }),
  ).toEqual(repeat);
  expect(deployed.state.dungeon!.monsterPool!.active!.blockedReason).toContain(name);
});

it.each(["quest:p009", "quest:p013"])("%s 已存在普通部署也不能绕过入场检查", (id) => {
  const base = fixture(id);
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
    { type: "commandRefused", message: expect.stringContaining("不能用普通随机遭遇替代") },
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
