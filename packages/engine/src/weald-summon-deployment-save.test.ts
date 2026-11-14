import { expect, it } from "vitest";
import type { Command, GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { naturalParty, naturalQuest } from "./test-helpers/natural-quest";
import { disinfectionSources as sources } from "./test-helpers/disinfection-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { selectWealdRoomTile } from "./expansions/weald/room-tile-selection";
import type { QuestStart } from "../../data/src/quest-save";

it("R-230/R-237/R-238：自然召唤使用核准房间部署，召唤前后日志严格回放", () => {
  const start: QuestStart = {
    seed: 1,
    questId: "quest:weald:p001" as const,
    mode: "radiant" as const,
    party: naturalParty,
    contentPacks: ["core", "weald"],
    bossEdgeRooms: true,
    stygianRoomRules: "full" as const,
  };
  const initial = createCoreDungeonQuest(
    start.seed,
    start.questId,
    start.mode,
    start.party,
    sources,
    true,
    "full",
    start.contentPacks,
  );
  let previous = initial;
  const commands: Command[] = [];
  const points: { game: GameState; commands: Command[] }[] = [];
  const run = naturalQuest(1, start.questId, true, sources, 2, {
    continueFrom: initial,
    exitAfterBattles: 1,
    survival: true,
    fungalResearch: "retain-one",
    observe: (game, command) => {
      const summoned =
        game.battle?.entities.filter(
          (entity) =>
            entity.id.startsWith("weald-summon:") &&
            !previous.battle?.entities.some((before) => before.id === entity.id),
        ) ?? [];
      if (summoned.length) points.push({ game: previous, commands: [...commands] });
      commands.push(command);
      if (command.type === "startDungeonBattle") {
        const d = game.dungeon!;
        const card = d.roomCards!.cards.find((c) => c.id === d.roomCards!.active!.cardId);
        const selected = selectWealdRoomTile(card, d.roomCards!.active!.tileId);
        expect(selected.status).toBe("matched");
        if (selected.status === "matched")
          expect(game.battle!.monsterStanceAreas).toEqual(selected.deployment.monsters);
      }
      for (const entity of summoned)
        expect(entity.areaId).toBe(game.battle!.monsterStanceAreas![entity.stance!]);
      if (summoned.length) points.push({ game, commands: [...commands] });
      previous = game;
    },
  });
  expect(run.stopReason).toBeNull();
  expect(points.length).toBeGreaterThanOrEqual(2);
  for (const point of points) {
    const save = createQuestSave(start, point.commands, point.game, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(point.game);
  }
}, 120000);
