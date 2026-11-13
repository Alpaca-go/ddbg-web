import {
  wealdRoomCardSchema,
  type WealdRoomCard,
  type WealdRoomTile,
} from "../../../../data/src/weald-room";
import { WEALD_APPROVED_ROOM_TILES } from "./room-catalog";

/** R-048：Weald 板块参战校验；不要求 usable=true（出征入口仍关，步骤 5 前不放宽）。 */
export function selectWealdRoomTile(cardInput: unknown, expectedTileId?: string) {
  const card = wealdRoomCardSchema.safeParse(cardInput);
  const refused = (reason: string) => ({ status: "refused" as const, reason });
  if (!card.success) return refused("Weald 房间身份无效（R-048）");
  if (card.data.boss) return refused("Boss 房间留对应阶段，不开放普通战斗入口");
  const matches = WEALD_APPROVED_ROOM_TILES.filter(
    (tile) =>
      tile.roomId === card.data.id &&
      tile.location === card.data.location &&
      tile.number === card.data.number,
  );
  if (matches.length !== 1) return refused("对应 Weald 板块几何尚未获批（R-048）");
  const tile = matches[0]!;
  if (tile.name !== card.data.name || (expectedTileId !== undefined && tile.id !== expectedTileId))
    return refused("Weald 房间身份与已记录板块不一致（R-048）");
  if (!tile.geometryVerified || tile.deployment.printReview !== "verified") {
    return refused(`${tile.name} 几何或部署尚未获批，不可参战（R-048）`);
  }
  if (tile.unresolvedMarkers.length) return refused(`${tile.name} 仍有未解析部署标记（R-048）`);
  return {
    status: "matched" as const,
    tile,
    deployment: tile.deployment,
  };
}

export type WealdRoomTileSelection =
  ReturnType<typeof selectWealdRoomTile> | { readonly status: "refused"; readonly reason: string };

export function isMatchedWealdTile(selection: WealdRoomTileSelection): selection is {
  readonly status: "matched";
  readonly tile: WealdRoomTile;
  readonly deployment: WealdRoomTile["deployment"];
} {
  return selection.status === "matched";
}

export function wealdRoomCardFromUnknown(cardInput: unknown): WealdRoomCard | null {
  const parsed = wealdRoomCardSchema.safeParse(cardInput);
  return parsed.success ? parsed.data : null;
}
