import type { GameState } from "@ddbg/engine";
import { basicQuests } from "../../../../../packages/data/src/basic-quests";
import { questXpProgressShort } from "../../dungeon-sandbox/formal/quest-objective-line";
import type { TabletopQuestMeta } from "../tabletop-types";

/** 从引擎地牢状态投影顶栏/详情用任务元数据（缺字段用「—」，不编造数值）。 */
export function adaptQuestMetaFromGame(game: GameState): Partial<TabletopQuestMeta> | null {
  const d = game.dungeon;
  const questId = d?.questDistribution?.questId ?? d?.rest?.questId;
  if (!questId) return null;
  const quest = basicQuests.find((entry) => entry.id === questId);
  if (!quest) return null;

  const cleared = d?.rooms?.filter((room) => room.cleared).length ?? 0;
  const roomTotal = d?.rooms?.length ?? 0;
  return {
    questCardId: quest.id,
    questLabel: quest.name,
    locationLabel: "—",
    dungeonLevel: quest.level ? `DL ${quest.level === 1 ? "I" : quest.level}` : "—",
    actLabel: d?.campaignLevel ? `第 ${d.campaignLevel} 幕` : "—",
    xpProgress: questXpProgressShort(game),
    roomsCleared: cleared,
    roomTotal: roomTotal > 0 ? roomTotal : 0,
    layoutId: d?.layout?.id ?? "—",
    currentRoomCardId: d?.roomCards?.active?.cardId ?? "—",
  };
}
