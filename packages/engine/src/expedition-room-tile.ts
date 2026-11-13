import type { DungeonState } from "./dungeon";
import { readExpeditionRoomRegion } from "./expedition-room-catalog";
import { readRoomTile } from "./room-tile-selection";
import {
  selectWealdRoomTile,
  wealdRoomCardFromUnknown,
} from "./expansions/weald/room-tile-selection";

/** 按出征地点选择房间板块校验（Weald 走 `selectWealdRoomTile`，遗迹走核心目录）。 */
export function readExpeditionRoomTile(
  card: unknown,
  d: Pick<DungeonState, "questDistribution" | "contentPacks" | "monsterPool" | "roomCards">,
  expectedTileId?: string,
) {
  if (readExpeditionRoomRegion(d as DungeonState) === "weald") {
    const wealdCard = wealdRoomCardFromUnknown(card);
    if (!wealdCard) return { status: "refused" as const, reason: "Weald 房间身份无效（R-048）" };
    return selectWealdRoomTile(wealdCard, expectedTileId);
  }
  return readRoomTile(card, expectedTileId);
}
