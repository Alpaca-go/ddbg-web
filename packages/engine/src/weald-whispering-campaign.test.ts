import { expect, it } from "vitest";
import { wealdHigherHamletFixture } from "./test-helpers/weald-higher-hamlet";
import { applyCommand, type GameState } from "./command";
import {
  remainingQuestIdsForLocationDeck,
  legalHamletQuestDrawModes,
  executeHamletQuestDrawMode,
  HAMLET_QUEST_DRAW_OPTION as modes,
} from "./hamlet-location-quest-draw";
import { nextExpeditionLocationDecks } from "./hamlet-location-embark";
import { createCampaignQuest } from "./campaign-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";

const packs = ["core", "weald"] as const;
it("新战役起点保存抽选版本，旧起点RNG与目录不变，去版本快照拒绝", () => {
  const old = createCampaignQuest(0, "quest:p001", "radiant", coreParty, coreQuestSources, packs);
  const game = createCampaignQuest(
    0,
    "quest:p001",
    "radiant",
    coreParty,
    coreQuestSources,
    packs,
    undefined,
    true,
  );
  const { wealdHigherQuestOffers: _version, ...rest } = game.dungeon!;
  void _version;
  expect({ ...game, dungeon: rest }).toEqual(old);
  const start = {
    seed: 0,
    questId: "quest:p001" as const,
    mode: "radiant" as const,
    party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
    contentPacks: [...packs],
    bossEdgeRooms: true,
    stygianRoomRules: "full" as const,
    wealdHigherQuestOffers: true as const,
  };
  const save = createQuestSave(start, [], game, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(game);
  delete save.start.wealdHigherQuestOffers;
  expect(() => loadQuestSave(save, coreQuestSources)).toThrow();
});
it("III 级仅显式版本加入p015，两地各1可选但当地不足2不能抽2；弃牌／当前排除", () => {
  expect(remainingQuestIdsForLocationDeck("weald", 3, packs, "", [])).toEqual([]);
  expect(remainingQuestIdsForLocationDeck("weald", 3, packs, "", [], true)).toEqual([
    "quest:weald:p015",
  ]);
  expect(
    remainingQuestIdsForLocationDeck("weald", 3, packs, "", ["quest:weald:p015"], true),
  ).toEqual([]);
  expect(remainingQuestIdsForLocationDeck("weald", 3, packs, "quest:weald:p015", [], true)).toEqual(
    [],
  );
  expect(legalHamletQuestDrawModes(3, packs, "", [], true).map((m) => m.optionId)).toContain(
    modes.splitOneEach,
  );
  expect(legalHamletQuestDrawModes(3, packs, "", [], true).map((m) => m.optionId)).not.toContain(
    modes.wealdTwo,
  );
  const drawn = executeHamletQuestDrawMode(modes.splitOneEach, 0, 10, 3, packs, "", [], true);
  expect(drawn).toEqual(
    executeHamletQuestDrawMode(modes.splitOneEach, 0, 10, 3, packs, "", [], true),
  );
  expect("offers" in drawn && drawn.offers[1]).toBe("quest:weald:p015");
});

it("受控村庄公开抽选与出征保留资源、版本及来源；检查点恢复逐命令一致", () => {
  let state = wealdHigherHamletFixture();
  const checkpoint = JSON.parse(JSON.stringify(state)) as GameState;
  const commands: Parameters<typeof applyCommand>[1][] = [];
  const step = (command: Parameters<typeof applyCommand>[1]) => {
    const result = applyCommand(state, command);
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    commands.push(command);
    state = result.state;
  };
  step({ type: "offerNextQuest" });
  const draw = state.dungeon!.pending!;
  step({ type: "resolveChoice", choiceId: draw.id, optionId: modes.splitOneEach });
  expect(state.dungeon!.nextQuestOffers).toContain("quest:weald:p015");
  const heroes = structuredClone(state.dungeon!.heroes),
    gold = state.dungeon!.gold;
  step({
    type: "resolveChoice",
    choiceId: state.dungeon!.pending!.id,
    optionId: "quest:weald:p015",
  });
  expect(state.dungeon).toMatchObject({
    phase: "awaitingProvisions",
    whisperingWoodsQuest: true,
    wealdHigherQuestOffers: true,
    campaignLevel: 3,
    gold,
  });
  expect(state.dungeon!.heroes).toEqual(heroes);
  expect(state.dungeon!.monsterPool).toMatchObject({
    location: "weald",
    wealdMonsterLevel: 3,
    wealdSourceVersion: "higher-v1",
  });
  const restored = commands.reduce((s, c) => applyCommand(s, c).state, checkpoint);
  expect(restored).toEqual(state);
  const back = nextExpeditionLocationDecks(state.dungeon!, "quest:p013")!;
  expect(back.monsterPool).not.toHaveProperty("wealdSourceVersion");
}, 30000);
