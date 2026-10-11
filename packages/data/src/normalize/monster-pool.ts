import type { RawFile } from "../extract/raw";
import {
  MONSTER_POOL_BACK,
  MONSTER_POOL_FRONT,
  monsterPoolFileSchema,
  monsterPoolIdentity,
} from "../monster-pool";
import type { NormalizedMonsterMediumFile, NormalizedMonsterLargeFile } from "./schema";

/** 按已核对印刷页分地点 / 等级，不从战斗可用性筛掉牌。 */
export function buildMonsterPool(
  raw: RawFile,
  medium: NormalizedMonsterMediumFile,
  large: NormalizedMonsterLargeFile,
) {
  return monsterPoolFileSchema.parse({
    schema: "ddbg-monster-pool-v1",
    source: { front: MONSTER_POOL_FRONT, back: MONSTER_POOL_BACK },
    cards: raw.cards
      .filter((c) => c.source_set === "base" && c.faces.front.page <= 62)
      .map((card) => {
        const front = card.faces.front;
        if (
          front.file !== MONSTER_POOL_FRONT ||
          card.faces.back?.file !== MONSTER_POOL_BACK ||
          card.faces.back.page !== front.page ||
          card.copies !== card.pages.length
        )
          throw new Error("怪物牌池来源 / 页码 / 份数不一致");
        const view = medium.cards.find((c) => c.id === card.id);
        if (
          !view ||
          JSON.stringify(view.pages) !== JSON.stringify(card.pages) ||
          view.copies !== card.copies
        )
          throw new Error("怪物牌池缺少一致的规范化卡");
        const identity = monsterPoolIdentity(front.page);
        const locationIcon = view.front_icons.filter((icon) => icon.key === "location");
        if (
          view.level !== identity.level ||
          locationIcon.length !== 1 ||
          locationIcon[0]!.iconId !== (identity.location === "ruins" ? "2e22db7a98" : "4843c9b620")
        )
          throw new Error("怪物牌池等级 / 地点与核对卡面不符");
        const edge = view.type_position_tags.filter((t) => t === "Front" || t === "Back");
        if (edge.length !== 1) throw new Error("怪物牌池需要唯一 Front / Back");
        const isLarge = view.type_position_tags.includes("Large");
        const combat = isLarge
          ? large.cards.find((c) => c.name === view.name && c.level === view.level)
          : view;
        if (!combat || !("skills" in combat)) throw new Error("大型抽牌卡缺少对应战斗卡");
        return {
          id: view.id,
          combatCardId: combat.id,
          name: view.name,
          ...identity,
          pages: card.pages,
          edge: edge[0] === "Front" ? "front" : "back",
          stanceSlots: isLarge ? 2 : 1,
          missingBattleFields: [
            ...(combat.speed === undefined ? ["speed"] : []),
            ...(combat.stanceGroups === undefined ? ["stanceGroups"] : []),
            ...(combat.verification.unverified ? ["unverifiedIcons"] : []),
          ],
        };
      }),
  });
}
