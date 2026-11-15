import printed from "../../../../../data/normalized/extension/weald/pounder_i.json";
import { wealdPounderContentSchema } from "../../../../../data/src/weald-pounder";
import { monsterPoolCatalogSchema } from "../../../../../data/src/monster-pool";
import { wealdRoomTileBattleAreas } from "../weald-mechanics";

/** 独立核准目录；不导入 Boss 注册器，不改普通池或存档入口。 */
export const WEALD_POUNDER_I_CONTENT = wealdPounderContentSchema.parse(printed);

export function pounderIApprovedBattleAreas() {
  return wealdRoomTileBattleAreas(WEALD_POUNDER_I_CONTENT.tile, { wealdMechanics: true });
}

/** 仅验证完整核心来源与 I 级实体资格；不抽牌、洗牌或创建召唤物。 */
export function pounderIFusilierSource(cards: unknown) {
  const source = monsterPoolCatalogSchema
    .parse(cards)
    .find(
      (card) =>
        card.combatCardId === WEALD_POUNDER_I_CONTENT.abilities.reinforcements.fusilierCardId,
    );
  if (!source || source.location !== "common" || source.level !== 1 || source.pages.length < 2)
    throw new Error("Pounder I 需要完整核心同级 Brigand Fusilier 来源");
  return source;
}
