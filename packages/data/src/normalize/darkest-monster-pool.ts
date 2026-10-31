import type { RawFile } from "../extract/raw";
import { MONSTER_POOL_FRONT, MONSTER_POOL_BACK } from "../monster-pool";
import { DARKEST_MONSTER_IDENTITIES, darkestMonsterPoolFileSchema } from "../darkest-monster-pool";
import type { NormalizedMonsterMediumFile } from "./schema";

/** R35–36：最暗怪物独立牌组；不把 Ruins/Common、Boss 和召唤物混入。 */
export function buildDarkestMonsterPool(raw: RawFile, medium: NormalizedMonsterMediumFile) {
  return darkestMonsterPoolFileSchema.parse({
    schema: "ddbg-darkest-monster-pool-v1",
    source: { front: MONSTER_POOL_FRONT, back: MONSTER_POOL_BACK },
    cards: raw.cards
      .filter(
        (c) => c.source_set === "base" && c.faces.front.page >= 63 && c.faces.front.page <= 88,
      )
      .map((card) => {
        const front = card.faces.front;
        const view = medium.cards.find((c) => c.id === card.id);
        const identity = DARKEST_MONSTER_IDENTITIES.find((c) => c.first === front.page);
        if (
          !view ||
          !("skills" in view) ||
          !identity ||
          front.file !== MONSTER_POOL_FRONT ||
          card.faces.back?.file !== MONSTER_POOL_BACK ||
          card.faces.back.page !== front.page ||
          card.copies !== card.pages.length ||
          JSON.stringify(view.pages) !== JSON.stringify(card.pages) ||
          view.copies !== card.copies ||
          view.level !== 3 ||
          view.name !== identity.name ||
          !view.type_position_tags.includes(identity.edge === "front" ? "Front" : "Back") ||
          view.type_position_tags.filter((tag) => tag === "Front" || tag === "Back").length !== 1 ||
          view.type_position_tags.includes("Large") ||
          !view.front_icons.some(
            (icon) =>
              icon.key === "location" &&
              icon.iconId === "9197a15623" &&
              ["confirmed", "confirmed_rulebook"].includes(icon.naming),
          )
        )
          throw new Error("最暗怪物牌池来源、身份、地点或份数与核对卡面不一致");
        return {
          id: view.id,
          combatCardId: view.id,
          name: view.name,
          location: "darkestDungeon",
          level: 3,
          pages: card.pages,
          edge: identity.edge,
          stanceSlots: 1,
          battleReady: false,
          missingBattleFields: [
            ...(view.speed === undefined ? ["speed"] : []),
            ...(view.stanceGroups === undefined ? ["stanceGroups"] : []),
            ...(view.verification.unverified ? ["unverifiedIcons"] : []),
          ],
        };
      }),
  });
}
