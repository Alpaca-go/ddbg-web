import { shriekerMechanismFixture } from "../../../../packages/engine/tests/helpers/shrieker-i";
import {
  createCoreDungeonQuest,
  type CoreQuestSources,
} from "../../../../packages/engine/src/shared/dungeon/dungeon-quest-entry";
import { coreParty } from "../../../../packages/engine/tests/helpers/core-quest";
import { drawInitialQuestOffers } from "../../../../packages/engine/src/shared/hamlet/initial-quest-draw";
import { applyCommand, type Command } from "../../../../packages/engine/src/shared/core/command";
import { createQuestSave } from "../../../../packages/engine/src/shared/quest/quest-save";

export function shriekerUiFixture(sources: CoreQuestSources) {
  const packs = ["core", "weald"] as const,
    draw = "hamlet-quest-draw:weald-two" as const;
  const questId = drawInitialQuestOffers(0, packs, draw).offers[0]!;
  let game = createCoreDungeonQuest(
    0,
    questId,
    "standard",
    coreParty,
    sources,
    true,
    null,
    packs,
    draw,
  );
  const commands: Command[] = [];
  const step = (command: Command) => {
    const result = applyCommand(game, command);
    const refused = result.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(refused.message);
    game = result.state;
    commands.push(command);
  };
  step({
    type: "establishImminentThreat",
    locationBosses: true,
    locationSources: true,
    pounderDungeonThreats: true,
    pounderHamletThreats: true,
    pounderBossBattles: true,
    shriekerBossBattles: true,
  });
  step({ type: "rollDungeonProvisions" });
  for (let i = 0; i < 20 && !game.dungeon!.shriekerTheft; i++) {
    const pending = game.dungeon!.pending!;
    step({ type: "resolveChoice", choiceId: pending.id, optionId: pending.options[0]!.id });
  }
  if (!game.dungeon!.shriekerTheft) throw new Error("缺少 Shrieker reserve 待选");
  return {
    ...shriekerMechanismFixture(),
    reserve: game,
    save: createQuestSave(
      {
        seed: 0,
        questId,
        mode: "standard",
        party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
        contentPacks: [...packs],
        initialQuestDrawMode: draw,
      },
      commands,
      game,
      sources,
    ),
  };
}
