import { describe, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";
import { basicQuests, asQuestMapPairingQuest } from "../../data/src/basic-quests";
import { pickEmbarkQuestMapLayout } from "../../data/src/quest-map-pairing";

const heroes = (["aggressive", "defensive", "ranged", "support"] as const).map((stance, i) => ({
  id: `h${i}`,
  stance,
  stress: 0,
}));

function warmUpSandbox(seed = 11) {
  const definition = basicQuests.find((q) => q.id === "quest:p011")!;
  return createDungeonSandbox(
    seed,
    pickEmbarkQuestMapLayout(asQuestMapPairingQuest(definition), seed, 0),
    definition.distribution,
    "standard",
    "S",
    heroes,
    [],
    { dungeonLevel: 3, light: 5, provisions: [] },
    undefined,
    undefined,
    undefined,
    undefined,
    true,
  );
}

function choose(state: GameState, optionId: string) {
  return applyCommand(state, {
    type: "resolveChoice",
    choiceId: state.dungeon!.pending!.id,
    optionId,
  });
}

function finishStartingProvisions(initial: GameState) {
  const log: Command[] = [{ type: "rollDungeonProvisions" }];
  let game = applyCommand(initial, log[0]!).state;
  while (game.dungeon!.pending?.id.startsWith("dungeon-starting-provisions:")) {
    log.push({
      type: "resolveChoice",
      choiceId: game.dungeon!.pending!.id,
      optionId: "food",
    });
    game = applyCommand(game, log.at(-1)!).state;
  }
  return { game, log };
}

describe("Warm Up the Halls 开局改 Torch（QUEST p11）", () => {
  it("补给掷完与Wild选面后逐英雄改Torch或跳过，再进入探索", () => {
    const base = warmUpSandbox();
    const initial: GameState = {
      ...base,
      dungeon: {
        ...base.dungeon!,
        warmUpStartingProvisionTorchChoice: true,
      },
    };
    const { game: started, log } = finishStartingProvisions(initial);
    let game = started;
    expect(game.dungeon!.pending!.id.startsWith("dungeon-warm-up-provision-torch:")).toBe(true);
    expect(game.dungeon!.warmUpProvisionTorchRemaining).toEqual(["h0", "h1", "h2", "h3"]);
    let converted = false;
    while (game.dungeon!.pending?.id.startsWith("dungeon-warm-up-provision-torch:")) {
      const pending = game.dungeon!.pending!;
      const torchOpt = pending.options.find((o) => o.id.startsWith("torch:"));
      const optionId = !converted && torchOpt ? torchOpt.id : "skip";
      if (optionId !== "skip") {
        converted = true;
        expect(
          game.dungeon!.explorationSetup!.provisions.find((p) => p.id === optionId.slice(6))!.face,
        ).not.toBe("torch");
      }
      log.push({ type: "resolveChoice", choiceId: pending.id, optionId });
      game = choose(game, optionId).state;
    }
    expect(converted).toBe(true);
    expect(game.dungeon!.explorationSetup!.provisions.some((p) => p.face === "torch")).toBe(true);
    expect(game.dungeon!.phase).toBe("ready");
    expect(game.dungeon!.warmUpStartingProvisionTorchChoice).toBeUndefined();
    expect(game.dungeon!.warmUpProvisionTorchRemaining).toBeUndefined();
    expect(log.reduce((s, c) => applyCommand(s, c).state, initial)).toEqual(game);
  });

  it("无 Warm Up 标记时不插入改Torch停点", () => {
    const { game } = finishStartingProvisions(warmUpSandbox());
    expect(game.dungeon!.phase).toBe("ready");
    expect(game.dungeon!.pending).toBeNull();
  });

  it("Traveling Merchants 先于 Warm Up；两者均完成后清除标记", () => {
    const base = warmUpSandbox(17);
    const initial: GameState = {
      ...base,
      dungeon: {
        ...base.dungeon!,
        warmUpStartingProvisionTorchChoice: true,
        nextQuestProvisionFaceChoice: true,
      },
    };
    let { game } = finishStartingProvisions(initial);
    expect(game.dungeon!.pending!.id.startsWith("dungeon-traveling-merchants:")).toBe(true);
    while (game.dungeon!.pending?.id.startsWith("dungeon-traveling-merchants:"))
      game = choose(game, "skip").state;
    expect(game.dungeon!.nextQuestProvisionFaceChoice).toBeUndefined();
    expect(game.dungeon!.pending!.id.startsWith("dungeon-warm-up-provision-torch:")).toBe(true);
    while (game.dungeon!.pending?.id.startsWith("dungeon-warm-up-provision-torch:"))
      game = choose(game, "skip").state;
    expect(game.dungeon!.phase).toBe("ready");
    expect(game.dungeon!.warmUpStartingProvisionTorchChoice).toBeUndefined();
  });
});
