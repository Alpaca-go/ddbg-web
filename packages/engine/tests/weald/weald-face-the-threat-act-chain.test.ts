import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../../src/command";
import { readRuinsActTransitionReadiness } from "../../src/act-transition-readiness";
import {
  legalHamletQuestDrawModes,
  questIdsForLocationDeck,
} from "../../src/hamlet-location-quest-draw";
import { createCoreDungeonQuest } from "../../src/dungeon-quest-entry";
import { drawInitialQuestOffers } from "../../src/initial-quest-draw";
import { coreParty, coreQuestSources } from "../../src/test-helpers/core-quest";
import { wealdActReadyFixture } from "../../src/test-helpers/weald-act";
import {
  wealdChainHamletPreparationReady,
  wealdChainOfferNextQuest,
} from "../../src/test-helpers/weald-face-the-threat-chain";

const packs = ["core", "weald"] as const;
const drawMode = "hamlet-quest-draw:ruins-two" as const;

function ok(game: GameState, command: Parameters<typeof applyCommand>[1]) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result.state;
}

it.each([
  ["standard", undefined],
  ["radiant", undefined],
  ["stygian", "full"],
] as const)(
  "Weald 升幕生产路径 %s：advanceRuinsAct→drawHamlet→tasks-v1 抽 II 普通（actReady 边界重放，夹具≠自然日志）",
  (mode, stygianRoomRules) => {
    const base = wealdActReadyFixture(1, "hag");
    const ready: GameState = {
      ...base,
      dungeon: {
        ...base.dungeon!,
        mode,
        ...(stygianRoomRules ? { stygianRoomRules } : {}),
      },
    };
    expect(readRuinsActTransitionReadiness(ready).kind).toBe("ready");
    let game = ok(ready, { type: "advanceRuinsAct" });
    expect(game.dungeon!.wealdHigherQuestOffers).toBe("tasks-v1");
    expect(game.dungeon!.campaignLevel).toBe(2);
    game = ok(game, { type: "drawHamletEvent" });
    game = wealdChainHamletPreparationReady(game);
    const wealdIi = questIdsForLocationDeck("weald", 2, packs, "tasks-v1");
    const modes = legalHamletQuestDrawModes(
      2,
      packs,
      "quest:p019",
      game.dungeon!.discardedQuests ?? [],
      "tasks-v1",
    );
    expect(modes.some((m) => m.optionId.includes("weald"))).toBe(true);
    const offered = wealdChainOfferNextQuest(game);
    game = ok(offered.state, {
      type: "resolveChoice",
      choiceId: offered.state.dungeon!.pending!.id,
      optionId: offered.drawOptionId,
    });
    expect(
      game.dungeon!.nextQuestOffers?.every((id) => (wealdIi as readonly string[]).includes(id)),
    ).toBe(true);
  },
);

it("Stygian 下缺 pounderBossBattles 时单独 pounderDungeonThreats 仍拒门", () => {
  const seed = 6;
  const firstQuest = drawInitialQuestOffers(seed, packs, drawMode).offers[0]!;
  const hamlet = createCoreDungeonQuest(
    seed,
    firstQuest,
    "stygian",
    coreParty,
    coreQuestSources,
    true,
    "full",
    packs,
    drawMode,
  );
  const result = applyCommand(hamlet, {
    type: "establishImminentThreat",
    pounderDungeonThreats: true,
    locationBosses: true,
    locationSources: true,
  });
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
});
