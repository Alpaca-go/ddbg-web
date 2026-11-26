import { WEALD_SHRIEKER_I_CONTENT } from "./shrieker-i-content";
import { wealdRoomTileBattleAreas } from "../../mechanics";
export function shriekerIApprovedBattleAreas() {
  return wealdRoomTileBattleAreas(WEALD_SHRIEKER_I_CONTENT.tile, { wealdMechanics: true });
}
