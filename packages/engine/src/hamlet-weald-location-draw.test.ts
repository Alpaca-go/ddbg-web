import { expect, it } from "vitest";
import {
  SANDBOX_WEALD_EMBARK_QUEST_IDS,
  questsForCampaignLevel,
} from "../../data/src/basic-quests";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import {
  HAMLET_QUEST_DRAW_OPTION,
  hamletWealdLocationDrawEnabled,
  legalHamletQuestDrawModes,
  remainingQuestIdsForLocationDeck,
} from "./hamlet-location-quest-draw";
import { naturalHamletStart } from "./test-helpers/guild-quest";
import { coreQuestSources } from "./test-helpers/core-quest";
import { chooseNextQuest } from "./hamlet-embark";
import { advanceCampaignLevel } from "./hamlet-campaign";

function preparationReady(game: GameState): GameState {
  const d = game.dungeon!;
  return {
    ...game,
    dungeon: {
      ...d,
      pending: null,
      hamlet: {
        ...d.hamlet!,
        phase: "preparationComplete",
        remainingDays: 0,
        actedHeroes: [],
        visitedBuildings: [],
        heroOrder: [],
        caretaker: null,
        blockedBuildings: d.hamlet!.weekBlockedBuildings ?? [],
        active: null,
      },
    },
  };
}

function resolveUntilNextQuestOffer(game: GameState): GameState {
  let offered = applyCommand(game, { type: "offerNextQuest" });
  expect(offered.events.some((e) => e.type === "commandRefused")).toBe(false);
  while (offered.state.dungeon!.pending?.id.startsWith("hamlet-quest-draw:")) {
    const choice = offered.state.dungeon!.pending!;
    offered = applyCommand(offered.state, {
      type: "resolveChoice",
      choiceId: choice.id,
      optionId: choice.options[0]!.id,
    });
    expect(offered.events.some((e) => e.type === "commandRefused")).toBe(false);
  }
  return offered.state;
}

it("未选 Weald 包：抽选与改前一致，候选不含 weald", () => {
  const base = preparationReady(naturalHamletStart(coreQuestSources, 6).game);
  const offered = applyCommand(base, { type: "offerNextQuest" });
  expect(offered.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(offered.state.dungeon!.pending!.id.startsWith("hamlet-next-quest:")).toBe(true);
  expect(offered.state.dungeon!.pending!.id.startsWith("hamlet-quest-draw:")).toBe(false);
  const offers = offered.state.dungeon!.nextQuestOffers ?? [];
  expect(offers.length).toBeGreaterThanOrEqual(1);
  expect(offers.every((id) => !id.startsWith("quest:weald:"))).toBe(true);
});

it("已选 Weald 包：合法抽法含遗迹抽 2、Weald 抽 2、各 1", () => {
  const base = preparationReady(naturalHamletStart(coreQuestSources, 6).game);
  const state = {
    ...base,
    dungeon: {
      ...base.dungeon!,
      contentPacks: ["core", "weald"] as const,
      discardedQuests: [],
    },
  };
  const modes = legalHamletQuestDrawModes(
    1,
    state.dungeon!.contentPacks,
    state.dungeon!.questSummary!.questId,
    [],
  );
  expect(modes.map((m) => m.optionId)).toEqual(
    expect.arrayContaining([
      HAMLET_QUEST_DRAW_OPTION.ruinsTwo,
      HAMLET_QUEST_DRAW_OPTION.wealdTwo,
      HAMLET_QUEST_DRAW_OPTION.splitOneEach,
    ]),
  );
});

it("已选 Weald 包：两地各 1 时一张遗迹、一张 p001–p005", () => {
  const base = preparationReady(naturalHamletStart(coreQuestSources, 42).game);
  const state = {
    ...base,
    dungeon: {
      ...base.dungeon!,
      contentPacks: ["core", "weald"] as const,
      seed: 42,
    },
  };
  let offered = applyCommand(state, { type: "offerNextQuest" });
  const drawPending = offered.state.dungeon!.pending!;
  expect(drawPending.id.startsWith("hamlet-quest-draw:")).toBe(true);
  const splitOption = drawPending.options.find(
    (o) => o.id === HAMLET_QUEST_DRAW_OPTION.splitOneEach,
  );
  expect(splitOption).toBeDefined();
  offered = applyCommand(offered.state, {
    type: "resolveChoice",
    choiceId: drawPending.id,
    optionId: splitOption!.id,
  });
  const offers = offered.state.dungeon!.nextQuestOffers ?? [];
  expect(offers).toHaveLength(2);
  const weald = offers.filter((id) =>
    (SANDBOX_WEALD_EMBARK_QUEST_IDS as readonly string[]).includes(id),
  );
  const ruins = offers.filter((id) => questsForCampaignLevel(1).some((q) => q.id === id));
  expect(weald).toHaveLength(1);
  expect(ruins).toHaveLength(1);
});

it("Hamlet 出征 p001 + weald 包放行", () => {
  const base = preparationReady(naturalHamletStart(coreQuestSources, 6).game);
  const d = base.dungeon!;
  const pending = {
    id: `hamlet-next-quest:${d.decision}`,
    actorId: "party",
    prompt: "test",
    options: [{ id: "quest:weald:p001", label: "Fungal Research" }],
  };
  const game: GameState = {
    ...base,
    dungeon: {
      ...d,
      contentPacks: ["core", "weald"],
      pending,
      nextQuestOffers: ["quest:weald:p001"],
    },
  };
  const embarked = chooseNextQuest(game, pending.id, "quest:weald:p001", true);
  expect(embarked.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(embarked.state.dungeon!.phase).toBe("awaitingProvisions");
  expect(embarked.state.dungeon!.rest!.questId).toBe("quest:weald:p001");
});

it("未选 Weald 包不可 Hamlet 出征 p001", () => {
  const base = preparationReady(naturalHamletStart(coreQuestSources, 6).game);
  const d = base.dungeon!;
  const pending = {
    id: `hamlet-next-quest:${d.decision}`,
    actorId: "party",
    prompt: "test",
    options: [{ id: "quest:weald:p001", label: "Fungal Research" }],
  };
  const game: GameState = {
    ...base,
    dungeon: {
      ...d,
      contentPacks: ["core"],
      pending,
      nextQuestOffers: ["quest:weald:p001"],
    },
  };
  const embarked = chooseNextQuest(game, pending.id, "quest:weald:p001", true);
  expect(embarked.events.some((e) => e.type === "commandRefused")).toBe(true);
});

it("Weald 堆耗尽后只走遗迹", () => {
  const base = preparationReady(naturalHamletStart(coreQuestSources, 6).game);
  const allWeald = [...SANDBOX_WEALD_EMBARK_QUEST_IDS];
  const game = resolveUntilNextQuestOffer({
    ...base,
    dungeon: {
      ...base.dungeon!,
      contentPacks: ["core", "weald"],
      discardedQuests: allWeald,
    },
  });
  const offers = game.dungeon!.nextQuestOffers ?? [];
  expect(offers.every((id) => !id.startsWith("quest:weald:"))).toBe(true);
  expect(offers.length).toBeGreaterThanOrEqual(1);
});

it("战役 II 级不出现 Weald 候选", () => {
  expect(hamletWealdLocationDrawEnabled(["core", "weald"])).toBe(true);
  const wealdRem = remainingQuestIdsForLocationDeck(
    "weald",
    2,
    ["core", "weald"],
    "quest:p006",
    [],
  );
  expect(wealdRem).toEqual([]);
  const base = preparationReady(naturalHamletStart(coreQuestSources, 6).game);
  const game = resolveUntilNextQuestOffer({
    ...base,
    dungeon: {
      ...base.dungeon!,
      contentPacks: ["core", "weald"],
      campaignLevel: 2,
    },
  });
  expect((game.dungeon!.nextQuestOffers ?? []).every((id) => !id.startsWith("quest:weald:"))).toBe(
    true,
  );
});

it("I→II 预览弃置剩余 Weald I 任务", () => {
  const base = preparationReady(naturalHamletStart(coreQuestSources, 6).game);
  const advanced = advanceCampaignLevel({
    ...base,
    dungeon: {
      ...base.dungeon!,
      contentPacks: ["core", "weald"],
      pending: null,
    },
  });
  expect(advanced.events.some((e) => e.type === "commandRefused")).toBe(false);
  const discarded = advanced.state.dungeon!.discardedQuests ?? [];
  for (const id of SANDBOX_WEALD_EMBARK_QUEST_IDS) {
    expect(discarded).toContain(id);
  }
});
