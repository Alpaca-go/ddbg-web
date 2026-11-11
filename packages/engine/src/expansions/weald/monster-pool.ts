import { normalizeContentPacks, type ContentPackId } from "../../../../data/src/content-packs";
import {
  monsterPoolCatalogSchema,
  ruinsMonsterPool,
  type MonsterPoolCard,
} from "../../../../data/src/monster-pool";
import { normalizedMonsterMediumFileSchema } from "../../../../data/src/normalize/schema";
import { buildWealdMonsterCatalog } from "./monster-catalog";

/** R9–R10、W3、R-230/R-232：仅构造 I 级目录，不开放地点出征或绕过召唤停点。 */
export function buildWealdLevelOneMonsterPool(input: {
  contentPacks: readonly ContentPackId[];
  core: readonly MonsterPoolCard[];
  medium: unknown;
  large: unknown;
}) {
  if (!normalizeContentPacks(input.contentPacks).includes("weald"))
    throw new Error("Weald 内容包未启用");
  const core = monsterPoolCatalogSchema.parse(input.core);
  const commonIds = new Set(
    core.filter((card) => card.location === "common").map((card) => card.combatCardId),
  );
  const common = ruinsMonsterPool(core, 1).filter((card) => commonIds.has(card.cardId));
  const combat = buildWealdMonsterCatalog(input.medium, input.large);
  const medium = normalizedMonsterMediumFileSchema.parse(input.medium);
  const local = medium.cards.flatMap((card) => {
    const large =
      card.id === "monster_medium:weald:p004" || card.id === "monster_medium:weald:p005";
    const combatId = large ? "monster_large:weald:p001" : card.id;
    const battle = combat.find((entry) => entry.id === combatId);
    const edge = card.id === "monster_medium:weald:p012" ? ("back" as const) : ("front" as const);
    const edges = card.type_position_tags.filter((tag) => tag === "Front" || tag === "Back");
    if (
      !battle ||
      card.copies !== card.pages.length ||
      edges.length !== 1 ||
      edges[0] !== (edge === "front" ? "Front" : "Back") ||
      card.type_position_tags.includes("Large") !== large
    )
      throw new Error(`Weald 抽牌卡部署身份不符：${card.id}`);
    return card.pages.map((page) => ({
      instanceId: `monster-deck:weald:p${String(page).padStart(3, "0")}`,
      cardId: combatId,
      edge,
      stanceSlots: battle.stanceSlots,
      verified: true as const,
    }));
  });
  if (local.length !== 14 || new Set(local.map((card) => card.instanceId)).size !== 14)
    throw new Error("Weald I 级必须保留 14 张实体卡");
  return [...common, ...local];
}
