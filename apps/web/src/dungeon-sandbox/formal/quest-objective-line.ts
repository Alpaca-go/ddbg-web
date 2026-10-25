import type { GameState } from "@ddbg/engine";
import { readBasicQuest } from "../../../../../packages/data/src/basic-quests";

/** 任务目标进度文案（只读引擎与任务表，缺字段用「—」）。 */
export function questObjectiveProgressLine(game: GameState): string {
  const d = game.dungeon;
  if (!d) return "—";
  const quest = readBasicQuest(d.questDistribution);
  if (!quest) return "—";

  const clearedRooms = d.rooms.filter((r) => r.cleared);
  const clearedForXp =
    quest.xpKind === "all"
      ? clearedRooms.length
      : quest.xpKind === "gold"
        ? clearedRooms.length
        : clearedRooms.filter((r) => r.kind === quest.xpKind).length;

  const maxXp = quest.maxRooms / quest.roomsPerXp;
  const xpEarned = Math.min(maxXp, Math.floor(clearedForXp / quest.roomsPerXp));
  const unit =
    quest.xpKind === "lair"
      ? "巢穴"
      : quest.xpKind === "gold"
        ? "金币目标"
        : quest.xpKind === "curio"
          ? "Curio 房"
          : quest.xpKind === "dark"
            ? "暗房"
            : quest.xpKind === "objective"
              ? "目标房"
              : "房间";
  const progressDetail =
    quest.xpKind === "gold"
      ? `已清理 ${clearedRooms.length} 间`
      : `已计 ${clearedForXp}/${quest.maxRooms} ${unit}`;

  return `${quest.name} · 任务 XP ${xpEarned}/${maxXp} · ${progressDetail}`;
}

export function questXpProgressShort(game: GameState): string {
  const line = questObjectiveProgressLine(game);
  const xpPart = line.split(" · ").find((part) => part.startsWith("任务 XP"));
  return xpPart ?? "—";
}
