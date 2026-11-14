import type { QuestStart } from "../../../data/src/quest-save";
import { createCoreDungeonQuest, type CoreQuestSources } from "../dungeon-quest-entry";
import type { Command, GameState } from "../command";
import { naturalParty, naturalQuest } from "./natural-quest";
import { disinfectionSources } from "./disinfection-quest";

/** R-246：固定 seed 7，以两种具名玩家偏好对照目标与带回计数；不注入运行状态。 */
export function fungalResearchJourney(
  strategy: "retain-one" | "destroy-all",
  sources: CoreQuestSources = disinfectionSources,
) {
  const start: QuestStart = {
    seed: 7,
    questId: "quest:weald:p001",
    mode: "radiant",
    contentPacks: ["core", "weald"],
    bossEdgeRooms: true,
    stygianRoomRules: "full",
    party: naturalParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
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
  const run = naturalQuest(start.seed, start.questId, true, sources, 2, {
    continueFrom: initial,
    exitAfterBattles: 1,
    survival: true,
    fungalResearch: strategy,
    observe: (game, command) => {
      // 保留真实战斗创建、摧毁与战斗交接停点，供严格日志回放。
      const destroyed = previous.battle?.entities.some(
        (before) =>
          before.necroticFungus &&
          !before.dead &&
          game.battle?.entities.find((after) => after.id === before.id)?.dead,
      );
      if (destroyed || command.type === "finishDungeonBattle")
        points.push({ game: previous, commands: [...commands] });
      commands.push(command);
      if (
        destroyed ||
        command.type === "startDungeonBattle" ||
        command.type === "finishDungeonBattle"
      )
        points.push({ game, commands: [...commands] });
      previous = game;
    },
  });
  if (run.stopReason) throw new Error(`固定 Fungal Research 场景中断：${run.stopReason}`);
  return { start, points, run };
}
