import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createCoreDungeonQuest } from "@ddbg/engine";
import type { DungeonState } from "@ddbg/engine";
import {
  coreParty,
  coreQuestSources,
} from "../../../../../packages/engine/src/test-helpers/core-quest";
import { RuinsBossRoomActions, ruinsBossRoomEntryVisible } from "./ruins-boss-room-actions";
import { RUINS_COMBAT_LEVELS } from "../../../../../packages/engine/src/boss/ruins-combat-levels";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "../../../../../packages/engine/src/boss/face-the-threat-embark-runtime";

const base = createCoreDungeonQuest(
  1,
  "quest:p001",
  "stygian",
  coreParty,
  coreQuestSources,
).dungeon!;

// 机制夹具：直接构造抵达目标房的页面状态，不冒充自然战役验收。
function room(
  family: keyof typeof RUINS_COMBAT_LEVELS,
  cardId: string,
  level: 1 | 2 | 3,
): DungeonState {
  const entry = RUINS_COMBAT_LEVELS[family][level - 1]!;
  const script = entry.script;
  return {
    ...base,
    phase: "awaitingRoom",
    campaignLevel: level,
    questDistribution: { ...base.questDistribution!, questId: "quest:p019" },
    roomCards: {
      ...base.roomCards!,
      active: { cardId, roomId: "objective", blockedReason: "Boss 专用部署" },
    },
    activeBossThreatScriptId: script,
    faceTheThreatEmbarkPlan: requireFaceTheThreatEmbarkPlanForSandbox({
      campaignLevel: level,
      activeBossThreatScriptId: script,
      imminentThreatDescriptionCardId: entry.description,
    }),
  };
}

for (const [family, cardId, name] of [
  ["necromancer", "room:p010", "Necromancer"],
  ["prophet", "room:p011", "Prophet"],
  ["collector", "room:p012", "Collector"],
  ["fanatic", "room:p013", "Fanatic"],
] as const) {
  it.each([1, 2, 3] as const)(`Stygian ${name} %i 目标房显示部署入口`, (level) => {
    const dungeon = room(family, cardId, level);
    for (const mode of ["standard", "radiant", "stygian"] as const) {
      const state = { ...dungeon, mode };
      expect(ruinsBossRoomEntryVisible(state)).toBe(true);
      const html = renderToStaticMarkup(
        <RuinsBossRoomActions dungeon={state} dispatch={() => {}} />,
      );
      expect(html).toContain(`部署 ${name} ${["I", "II", "III"][level - 1]} 战斗`);
      expect(html).not.toContain("disabled");
    }
  });
}

it("Stygian 仍保留房间、等级、威胁与待选守卫", () => {
  const dungeon = room("necromancer", "room:p010", 1);
  const { faceTheThreatEmbarkPlan, ...withoutPlan } = dungeon;
  void faceTheThreatEmbarkPlan;
  const blocked: DungeonState[] = [
    { ...dungeon, phase: "ready" as const },
    { ...dungeon, campaignLevel: 2 as const },
    { ...dungeon, activeBossThreatScriptId: "boss:ruins:prophet:1" },
    withoutPlan,
    { ...dungeon, questDistribution: base.questDistribution! },
  ];
  for (const state of blocked) expect(ruinsBossRoomEntryVisible(state)).toBe(false);
  const html = renderToStaticMarkup(
    <RuinsBossRoomActions
      dungeon={{ ...dungeon, campaignFailure: "noWaitingHeroes" }}
      dispatch={() => {}}
    />,
  );
  expect(html).toContain('disabled=""');
});

it("Hag I 页面入口要求新地点来源、已选 Weald；Stygian 继续拒绝", () => {
  const d: DungeonState = {
    ...room("fanatic", "room:p013", 1),
    mode: "standard",
    contentPacks: ["core", "weald"],
    bossLocationSources: true,
    bossExpeditionRegion: "weald",
    activeBossThreatScriptId: "boss:weald:hag:1",
    roomCards: {
      ...base.roomCards!,
      active: { roomId: "objective", cardId: "room:weald:p010", blockedReason: "Hag" },
    },
    faceTheThreatEmbarkPlan: {
      ...requireFaceTheThreatEmbarkPlanForSandbox({ campaignLevel: 1 }),
      resolvedScriptId: "boss:weald:hag:1",
    },
  };
  expect(ruinsBossRoomEntryVisible(d)).toBe(true);
  expect(renderToStaticMarkup(<RuinsBossRoomActions dungeon={d} dispatch={() => {}} />)).toContain(
    "部署 Hag I 战斗",
  );
  expect(ruinsBossRoomEntryVisible({ ...d, mode: "stygian" })).toBe(false);
  expect(ruinsBossRoomEntryVisible({ ...d, contentPacks: ["core"] })).toBe(false);
});
