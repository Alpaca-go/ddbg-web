import { expect, it } from "vitest";
import coveAbilities from "../../../../data/extract/extension/cove/raw/boss_ability.json";
import coveMedium from "../../../../data/extract/extension/cove/raw/monster_medium.json";
import coveLarge from "../../../../data/extract/extension/cove/raw/monster_large.json";
import warrensAbilities from "../../../../data/extract/extension/warrens/raw/boss_ability.json";
import warrensMedium from "../../../../data/extract/extension/warrens/raw/monster_medium.json";
import warrensLarge from "../../../../data/extract/extension/warrens/raw/monster_large.json";
import { rawFileSchema } from "../../../../data/src/shared/extract/raw";
import * as siren from "../../../src/cove/bosses/siren/siren-i";
import * as swine from "../../../src/warrens/bosses/swine-prince/swine-prince-i";
import * as flesh from "../../../src/warrens/bosses/flesh/flesh-i";

const decks = [
  [
    "cove",
    coveAbilities,
    [
      [siren.SIREN_I_DESCRIPTION_ABILITY_CARD_ID, "Siren", 7],
      [siren.SIREN_I_COMBAT_ABILITY_CARD_ID, "Siren", 10],
    ],
  ],
  ["cove", coveMedium, [[siren.SIREN_I_PELAGIC_MONSTER_CARD_ID, "Pelagic Grouper", 7]]],
  ["cove", coveLarge, [[siren.SIREN_I_COMBAT_MONSTER_CARD_ID, "Siren", 6]]],
  [
    "warrens",
    warrensAbilities,
    [
      [swine.SWINE_PRINCE_I_DESCRIPTION_ABILITY_CARD_ID, "Swine Prince", 7],
      [swine.SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID, "Swine Prince", 10],
      [flesh.FLESH_I_DESCRIPTION_ABILITY_CARD_ID, "The Flesh", 13],
      [flesh.FLESH_I_COMBAT_ABILITY_CARD_ID, "The Flesh", 16],
    ],
  ],
  [
    "warrens",
    warrensMedium,
    [
      [swine.SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID, "Wilbur", 20],
      [flesh.FLESH_I_HEAD_MONSTER_CARD_ID, "Flesh Head", 23],
      [flesh.FLESH_I_BONE_MONSTER_CARD_ID, "Flesh Bone", 26],
      [flesh.FLESH_I_HEART_MONSTER_CARD_ID, "Flesh Heart", 29],
      [flesh.FLESH_I_BUTT_MONSTER_CARD_ID, "Flesh Butt", 32],
    ],
  ],
  ["warrens", warrensLarge, [[swine.SWINE_PRINCE_I_COMBAT_MONSTER_CARD_ID, "Swine Prince", 5]]],
] as const;

it("Cove／Warrens Boss 引用唯一对应印刷目录的首印页、卡名与 I 级", () => {
  const ids = new Set<string>();
  for (const [pack, raw, references] of decks) {
    const deck = rawFileSchema.parse(raw);
    for (const card of deck.cards) {
      const page = card.faces.front.page;
      expect(card.id).toBe(`${deck.category}:${pack}:p${String(page).padStart(3, "0")}`);
      expect(Math.min(...card.pages)).toBe(page);
      expect(card.faces.back?.page).toBe(page);
      expect(ids.has(card.id), card.id).toBe(false);
      ids.add(card.id);
    }
    for (const [id, name, page] of references) {
      const card = deck.cards.find((entry) => entry.id === id);
      expect(card?.faces.front.page, id).toBe(page);
      const lines = card?.faces.front.lines.map((line) =>
        line.text.replace(/\{icon:[^}]+\}/g, "").trim(),
      );
      expect(lines?.includes(name), id).toBe(true);
      expect(
        lines?.some((line) => /^I(?: |$)/.test(line)),
        id,
      ).toBe(true);
    }
  }
  expect(flesh.FLESH_I_COMBAT_MONSTER_CARD_ID).toBe(flesh.FLESH_I_HEAD_MONSTER_CARD_ID);
});
