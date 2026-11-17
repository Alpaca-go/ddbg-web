import { expect, it } from "vitest";
import {
  formalWealdProductionEmbarkAllowed,
  sandboxExpeditionEmbarkBlockReason,
} from "../../data/src/quest-map-pairing";
import { createCampaignQuest } from "./campaign-entry";
import { drawInitialQuestOffers, initialQuestDrawModes } from "./initial-quest-draw";
import { readActiveWealdStygianRoom } from "./weald-stygian-room-effects";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import medium from "../../data/normalized/extension/weald/monster_medium.json";
import large from "../../data/normalized/extension/weald/monster_large.json";
import curios from "../../data/normalized/extension/weald/curio.json";
import { wealdCurioFileSchema } from "../../data/src/curio";
import { createQuestSave, loadQuestSave } from "./quest-save";

const packs = ["core", "weald"] as const;
const sources = {
  ...coreQuestSources,
  weald: { medium, large, curios: wealdCurioFileSchema.parse(curios).cards },
};

it("R-272：正式生产路径闸门与旧核心-only 行为", () => {
  expect(formalWealdProductionEmbarkAllowed("weald", "quest:weald:p001", [...packs])).toBe(true);
  expect(
    formalWealdProductionEmbarkAllowed("weald", "quest:weald:p006", [...packs], "tasks-v1"),
  ).toBe(true);
  expect(formalWealdProductionEmbarkAllowed("weald", "quest:weald:p006", [...packs])).toBe(false);
  expect(sandboxExpeditionEmbarkBlockReason("weald", "quest:weald:p099", [...packs])).toMatch(
    /R-272/,
  );
  expect(sandboxExpeditionEmbarkBlockReason("ruins", "quest:p001", ["core"])).toBeNull();
  expect(sandboxExpeditionEmbarkBlockReason("weald", "quest:weald:p001", ["core"])).toMatch(
    /R-272/,
  );
});

it("createCampaignQuest：核心+Weald Stygian 首趟抽选与 tasks-v1", () => {
  const modes = initialQuestDrawModes([...packs]);
  expect(modes.length).toBeGreaterThan(0);
  const draw = drawInitialQuestOffers(3, [...packs], "hamlet-quest-draw:weald-two");
  const wealdPick = draw.offers.find((id) => id.includes(":weald:")) ?? draw.offers[0]!;
  const game = createCampaignQuest(
    3,
    wealdPick,
    "stygian",
    coreParty,
    sources,
    [...packs],
    "hamlet-quest-draw:weald-two",
    "tasks-v1",
  );
  expect(game.dungeon).toMatchObject({
    mode: "stygian",
    stygianRoomRules: "full",
    wealdHigherQuestOffers: "tasks-v1",
    contentPacks: [...packs],
    gold: 0,
  });
  const withRoom = {
    ...game.dungeon!,
    roomCards: {
      ...game.dungeon!.roomCards!,
      active: { roomId: "r-test", cardId: "room:weald:p002", blockedReason: "" },
    },
  };
  expect(readActiveWealdStygianRoom(withRoom)?.id).toBe("stygian_room:weald:p002");
});

it("正式存档：Stygian+Weald 起点严格回放；核心-only 旧档不受影响", () => {
  const draw = drawInitialQuestOffers(5, [...packs], "hamlet-quest-draw:split-one-each");
  const selected = draw.offers[0]!;
  const game = createCampaignQuest(
    5,
    selected,
    "stygian",
    coreParty,
    sources,
    [...packs],
    "hamlet-quest-draw:split-one-each",
    "tasks-v1",
  );
  const start = {
    seed: 5,
    questId: selected,
    mode: "stygian" as const,
    contentPacks: [...packs],
    bossEdgeRooms: true,
    stygianRoomRules: "full" as const,
    wealdHigherQuestOffers: "tasks-v1" as const,
    initialQuestDrawMode: "hamlet-quest-draw:split-one-each" as const,
    party: coreParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
  };
  const save = createQuestSave(start, [], game, sources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game.dungeon).toMatchObject({
    mode: "stygian",
    stygianRoomRules: "full",
    wealdHigherQuestOffers: "tasks-v1",
  });
  const coreOnly = createCampaignQuest(1, "quest:p001", "stygian", coreParty, coreQuestSources, [
    "core",
  ]);
  expect(coreOnly.dungeon!.contentPacks).toEqual(["core"]);
  expect(coreOnly.dungeon!.wealdHigherQuestOffers).toBeUndefined();
});
