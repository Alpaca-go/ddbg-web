import printed from "../../../../../data/normalized/extension/weald/hag_i.json";
import { wealdHagContentSchema } from "../../../../../data/src/weald-hag";
import { wealdRoomTileBattleAreas } from "../weald-mechanics";
import {
  HAG_I_COMBAT_MONSTER_CARD_ID,
  HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
  HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
} from "./hag-i";

/** R-254 专用目录；不注册普通怪物池，不静默改写旧占位存档。 */
export const WEALD_HAG_I_CONTENT = wealdHagContentSchema.parse(printed);

/** 背面运行 ID 只映射卡面；实体身份仍由 BattleEntity.id 保持。 */
export function hagIPrintedFaceForRuntimeId(id: string) {
  const role =
    id === HAG_I_COMBAT_MONSTER_CARD_ID
      ? "hag"
      : id === HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID
        ? "empty"
        : id === HAG_I_CAULDRON_FULL_MONSTER_CARD_ID
          ? "full"
          : undefined;
  return role === undefined
    ? undefined
    : WEALD_HAG_I_CONTENT.faces.find((face) => face.role === role);
}

export function hagIApprovedBattleAreas() {
  return wealdRoomTileBattleAreas(WEALD_HAG_I_CONTENT.tile, { wealdMechanics: true });
}
