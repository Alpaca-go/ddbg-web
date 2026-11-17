import rawWealdStygianRooms from "../../data/normalized/extension/weald/stygian_rooms.json";
import {
  readWealdStygianRoomReplacement,
  wealdStygianRoomsSchema,
  type WealdStygianReviewedEffect,
} from "../../data/src/weald-stygian-rooms";
import type { GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { wealdPackSelected } from "./expansions/weald/weald-mechanics";

const wealdStygianRooms = wealdStygianRoomsSchema.parse(rawWealdStygianRooms);

export type ActiveWealdStygianRoom = (typeof wealdStygianRooms.cards)[number];

/** Stygian + Weald 包 + full 规则：按被替换的普通房 id 返回印刷 Stygian 卡（保留牌池身份）。 */
export function readActiveWealdStygianRoom(d: DungeonState): ActiveWealdStygianRoom | undefined {
  if (d.mode !== "stygian" || d.stygianRoomRules !== "full" || !wealdPackSelected(d.contentPacks))
    return undefined;
  const cardId = d.roomCards?.active?.cardId;
  if (!cardId?.startsWith("room:weald:p")) return undefined;
  return readWealdStygianRoomReplacement(wealdStygianRooms, cardId);
}

export function wealdStygianEffect<K extends WealdStygianReviewedEffect["kind"]>(
  d: DungeonState | undefined,
  kind: K,
): WealdStygianReviewedEffect | undefined {
  const effect = d ? readActiveWealdStygianRoom(d)?.reviewedEffect : undefined;
  if (!effect || effect.kind !== kind) return undefined;
  return effect;
}

/** 普通 Weald 房效果：标准模式或 Stygian 且目录替换已启用。 */
export function wealdOrdinaryRoomEffectActive(
  state: GameState,
  roomCardId: string,
  effectKind: WealdStygianReviewedEffect["kind"],
): boolean {
  const d = state.dungeon;
  if (!d || d.roomCards?.active?.cardId !== roomCardId) return false;
  if (d.mode === "stygian") return wealdStygianEffect(d, effectKind) !== undefined;
  return true;
}
