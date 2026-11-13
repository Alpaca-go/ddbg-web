import { afterEach, expect, it } from "vitest";
import medium from "../../data/normalized/extension/weald/monster_medium.json";
import large from "../../data/normalized/extension/weald/monster_large.json";
import curios from "../../data/normalized/extension/weald/curio.json";
import { wealdCurioFileSchema } from "../../data/src/curio";
import { basicQuests, asQuestMapPairingQuest } from "../../data/src/basic-quests";
import { pickEmbarkQuestMapLayout } from "../../data/src/quest-map-pairing";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { initialQuestDrawModes, drawInitialQuestOffers } from "./initial-quest-draw";
import { createCampaignQuest } from "./campaign-entry";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { applyCommand } from "./command";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { setCampaignQuestPoolTestFilter } from "./campaign-quest-pool";

const sources = {
  ...coreQuestSources,
  weald: { medium, large, curios: wealdCurioFileSchema.parse(curios).cards },
};
const packs = ["core", "weald"] as const;
afterEach(() => setCampaignQuestPoolTestFilter(null));

it("未选 Weald 不启用新抽法，历史显式任务入口保持原状态", () => {
  expect(initialQuestDrawModes(["core"])).toEqual([]);
  expect(() => drawInitialQuestOffers(2, ["core"], "hamlet-quest-draw:weald-two")).toThrow();
  expect(createCampaignQuest(2, "quest:p001", "radiant", coreParty, sources, packs)).toEqual(
    createCoreDungeonQuest(2, "quest:p001", "radiant", coreParty, sources, true, "full", packs),
  );
});

it.each([
  "hamlet-quest-draw:ruins-two",
  "hamlet-quest-draw:weald-two",
  "hamlet-quest-draw:split-one-each",
] as const)("%s：分地点抽两张，先消费抽牌 RNG 再布图，未选卡永久弃置", (mode) => {
  const draw = drawInitialQuestOffers(2, packs, mode);
  expect(drawInitialQuestOffers(2, packs, mode)).toEqual(draw);
  expect(new Set(draw.offers).size).toBe(2);
  const wealdCount = draw.offers.filter((id) => id.includes(":weald:")).length;
  expect(wealdCount).toBe(mode.endsWith("weald-two") ? 2 : mode.endsWith("ruins-two") ? 0 : 1);
  const selected = draw.offers[0]!;
  const game = createCampaignQuest(2, selected, "radiant", coreParty, sources, packs, mode);
  expect(game.dungeon!.discardedQuests).toEqual([draw.offers[1]]);
  expect(game.dungeon!.initialQuestDrawMode).toBe(mode);
  expect(game.dungeon!.cursor).toBeGreaterThanOrEqual(draw.cursor + 7);
  expect(game.dungeon!.layout.id).toBe(
    pickEmbarkQuestMapLayout(
      asQuestMapPairingQuest(basicQuests.find((q) => q.id === selected)!),
      2,
      draw.cursor,
    ).id,
  );
  const outside = basicQuests.find((q) => q.level === 1 && !draw.offers.includes(q.id))!;
  expect(() =>
    createCampaignQuest(2, outside.id, "radiant", coreParty, sources, packs, mode),
  ).toThrow(/候选/);
  const start = {
    seed: 2,
    questId: selected,
    mode: "radiant" as const,
    contentPacks: [...packs],
    bossEdgeRooms: true,
    stygianRoomRules: "full" as const,
    party: coreParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
  };
  const save = createQuestSave(start, [], game, sources);
  expect(save.start.initialQuestDrawMode).toBe(mode);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(game);
  const forged = JSON.parse(JSON.stringify(save));
  delete forged.start.initialQuestDrawMode;
  expect(() => loadQuestSave(forged, sources)).toThrow();
});

it("开局补给命令可继续回放；抽法、弃置和包选择篡改均拒绝", () => {
  const mode = "hamlet-quest-draw:weald-two";
  const selected = drawInitialQuestOffers(2, packs, mode).offers[0]!;
  const initial = createCampaignQuest(2, selected, "radiant", coreParty, sources, packs, mode);
  const command = { type: "rollDungeonProvisions" } as const;
  const result = applyCommand(initial, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  const start = {
    seed: 2,
    questId: selected,
    mode: "radiant" as const,
    contentPacks: [...packs],
    bossEdgeRooms: true,
    stygianRoomRules: "full" as const,
    party: coreParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
  };
  const saved = createQuestSave(start, [command], result.state, sources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(saved)), sources).game).toEqual(result.state);
  for (const change of [
    (s: typeof saved) => {
      s.start.initialQuestDrawMode = "hamlet-quest-draw:ruins-two";
    },
    (s: typeof saved) => {
      s.start.contentPacks = ["core"];
    },
  ]) {
    const forged = JSON.parse(JSON.stringify(saved));
    change(forged);
    expect(() => loadQuestSave(forged, sources)).toThrow();
  }
  const forgedDiscard = JSON.parse(JSON.stringify(saved));
  forgedDiscard.snapshot.dungeon.discardedQuests = [];
  expect(() => loadQuestSave(forgedDiscard, sources)).toThrow();
});

it("遗迹首趟抽选尊重 campaign-quest-pool 的黄金池过滤器", () => {
  setCampaignQuestPoolTestFilter((_level, quests) => quests.slice(0, 2));
  expect(drawInitialQuestOffers(2, packs, "hamlet-quest-draw:ruins-two").cursor).toBe(1);
});
