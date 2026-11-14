import printed from "../../../../../data/normalized/extension/weald/hag_i.json";
import { wealdHagContentSchema } from "../../../../../data/src/weald-hag";
import { wealdRoomTileBattleAreas } from "../weald-mechanics";

/** R-254 专用目录；不注册普通怪物池，也不替换旧存档中的 Boss 身份。 */
export const WEALD_HAG_I_CONTENT = wealdHagContentSchema.parse(printed);

export function hagIApprovedBattleAreas() {
  return wealdRoomTileBattleAreas(WEALD_HAG_I_CONTENT.tile, { wealdMechanics: true });
}
