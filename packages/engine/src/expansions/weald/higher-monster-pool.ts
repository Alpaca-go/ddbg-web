import { normalizeContentPacks, type ContentPackId } from "../../../../data/src/content-packs";
import {
  monsterPoolCatalogSchema,
  ruinsMonsterPool,
  type MonsterPoolCard,
} from "../../../../data/src/monster-pool";
import { buildWealdHigherMonsterCatalog } from "./higher-monster-catalog";

/** W3／R-263：同等级当地＋通用的独立组池；正式任务／存档入口随后接入。 */
export function buildWealdHigherMonsterPool(input: {
  contentPacks: readonly ContentPackId[];
  core: readonly MonsterPoolCard[];
  level: 2 | 3;
}) {
  if (!normalizeContentPacks(input.contentPacks).includes("weald"))
    throw new Error("Weald 内容包未启用");
  const combat = buildWealdHigherMonsterCatalog(input.level);
  const core = monsterPoolCatalogSchema.parse(input.core);
  const commonIds = new Set(
    core
      .filter((card) => card.location === "common" && card.level === input.level)
      .map((card) => card.combatCardId),
  );
  const common = ruinsMonsterPool(core, input.level).filter((card) => commonIds.has(card.cardId));
  const entities =
    input.level === 2
      ? [
          { page: 15, id: "monster_medium:weald:p015" },
          { page: 16, id: "monster_medium:weald:p015" },
          { page: 17, id: "monster_large:weald:p003" },
        ]
      : [
          { page: 18, id: "monster_medium:weald:p018" },
          { page: 19, id: "monster_medium:weald:p018" },
        ];
  const local = entities.map(({ page, id }) => {
    const card = combat.find((card) => card.id === id);
    if (!card) throw new Error("高等级 Weald 实体缺少战斗卡");
    return {
      instanceId: `monster-deck:weald:p${String(page).padStart(3, "0")}`,
      cardId: id,
      edge: id === "monster_large:weald:p003" ? ("front" as const) : ("back" as const),
      stanceSlots: id === "monster_large:weald:p003" ? (2 as const) : (1 as const),
      verified: true as const,
    };
  });
  return [...common, ...local];
}
