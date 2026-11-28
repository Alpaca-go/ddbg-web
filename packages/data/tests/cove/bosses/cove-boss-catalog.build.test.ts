import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cardContentPack } from "../../../src/shared/content-packs";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import { coveBossAbilityManifest } from "../../../src/cove/bosses/cove-boss-abilities";
import { coveBossCombatCardManifest } from "../../../src/cove/bosses/cove-boss-combat-cards";
import {
  loadNormalizedCoveBossAbilities,
  loadNormalizedCoveBossCombatCards,
  writeNormalizedCoveBossCatalog,
} from "../../../src/cove/write";

const root = new URL("../../../extract/extension/cove/raw/", import.meta.url);
const read = (file: string) => JSON.parse(readFileSync(new URL(file, root), "utf8")) as unknown;

if (process.env.WRITE_NORMALIZED === "1") writeNormalizedCoveBossCatalog();

describe("Cove Boss 印刷目录", () => {
  it("能力卡 18 张：描述／能力拆分、不入普通牌堆", () => {
    const built = loadNormalizedCoveBossAbilities();
    expect(built.cards).toHaveLength(18);
    for (const card of built.cards) {
      expect(card.boss).toBe(true);
      expect(card.poolEligible).toBe(false);
      expect(card.combatReady).toBe(false);
      expect(cardContentPack({ id: card.id })).toBe("cove");
    }
    const descriptions = built.cards.filter((c) => c.cardRole === "description");
    const combat = built.cards.filter((c) => c.cardRole === "combat");
    expect(descriptions).toHaveLength(9);
    expect(combat).toHaveLength(9);
    expect(new Set(descriptions.map((c) => c.bossId))).toEqual(
      new Set(["shambler", "siren", "drowned_crew"]),
    );
    expect(coveBossAbilityManifest.length).toBe(18);
  });

  it("战斗卡 9 大型 + 6 召唤：boss 标记与页码", () => {
    const built = loadNormalizedCoveBossCombatCards();
    expect(built.cards).toHaveLength(coveBossCombatCardManifest.length);
    const large = built.cards.filter((c) => c.size === "large");
    const summons = built.cards.filter((c) => c.role === "summon");
    expect(large).toHaveLength(9);
    expect(summons).toHaveLength(6);
    for (const card of built.cards) {
      expect(card.boss).toBe(true);
      expect(card.poolEligible).toBe(false);
      expect(card.combatReady).toBe(false);
      expect(cardContentPack({ id: card.id })).toBe("cove");
      expect(card.pendingReview.length).toBeGreaterThan(0);
    }
    expect(coveBossCombatCardManifest.map((c) => c.id)).toEqual(built.cards.map((c) => c.id));
  });

  it("与落盘 JSON 一致", () => {
    const abilities = loadNormalizedCoveBossAbilities();
    const combat = loadNormalizedCoveBossCombatCards();
    const abilitiesPath = new URL(
      "../../../normalized/extension/cove/boss_abilities.json",
      import.meta.url,
    );
    const combatPath = new URL(
      "../../../normalized/extension/cove/boss_combat_cards.json",
      import.meta.url,
    );
    expect(JSON.parse(readFileSync(abilitiesPath, "utf8"))).toEqual(abilities);
    expect(JSON.parse(readFileSync(combatPath, "utf8"))).toEqual(combat);
  });

  it.each([
    ["boss_ability", 18, 18],
    ["monster_large", 11, 11],
    ["monster_medium", 31, 14],
  ] as const)("%s raw cove 命名空间", (category, nPages, nUnique) => {
    const file = rawFileSchema.parse(read(`${category}.json`));
    expect(file.n_pages).toBe(nPages);
    expect(file.n_unique).toBe(nUnique);
    for (const card of file.cards) {
      expect(card.id.includes(":cove:")).toBe(true);
      expect(cardContentPack(card)).toBe("cove");
    }
  });
});
