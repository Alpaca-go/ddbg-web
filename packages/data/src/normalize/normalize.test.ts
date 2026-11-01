import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { virtueRole } from "./virtue-role";
import { loadNormalizedCorebox, writeNormalizedCorebox } from "./write";

if (process.env.WRITE_NORMALIZED === "1") {
  writeNormalizedCorebox();
}

const NORMALIZED_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../normalized/corebox",
);

const FILES = [
  "hero_skill",
  "monster_medium",
  "monster_large",
  "trinket",
  "quirk",
  "virtue_affliction",
] as const;

const FORBIDDEN_KEYS = new Set(["crit_value", "acc_value", "hp", "hp_icon"]);

function walk(value: unknown, visit: (key: string, node: unknown) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      visit(key, nested);
      walk(nested, visit);
    }
  }
}

function iconsNamed(
  value: unknown,
  matches: (icon: {
    iconId?: string;
    key?: string | null;
    naming?: string;
    meaning_en?: string | null;
  }) => boolean,
): {
  iconId?: string;
  key?: string | null;
  naming?: string;
  meaning_en?: string | null;
}[] {
  const found: {
    iconId?: string;
    key?: string | null;
    naming?: string;
    meaning_en?: string | null;
  }[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (!node || typeof node !== "object") return;
    if ("iconId" in node && "naming" in node) {
      const icon = node as {
        iconId?: string;
        key?: string | null;
        naming?: string;
        meaning_en?: string | null;
      };
      if (matches(icon)) found.push(icon);
    }
    for (const nested of Object.values(node)) visit(nested);
  };
  visit(value);
  return found;
}

const built = loadNormalizedCorebox();

describe("规范化核心盒", () => {
  it("与已提交的 JSON 一致，且不含 crit_value / acc_value / hp", () => {
    for (const name of FILES) {
      const file = built[name];
      const committed = JSON.parse(
        readFileSync(path.join(NORMALIZED_ROOT, `${name}.json`), "utf8"),
      ) as unknown;
      expect(committed).toEqual(file);
      const keys = new Set<string>();
      walk(file, (key) => keys.add(key));
      for (const forbidden of FORBIDDEN_KEYS) expect(keys.has(forbidden)).toBe(false);
    }
  });

  it("怪物用 life，大型参考卡没有 life", () => {
    for (const card of built.monster_large.cards) {
      expect(card.life).toBeGreaterThan(0);
      expect(card.life_icon.iconId).toMatch(/^[0-9a-f]{10}$/);
    }
    const references = built.monster_medium.cards.filter(
      (card) => "card_kind" in card && card.card_kind === "large_monster_reference",
    );
    expect(references).toHaveLength(4);
    for (const card of references) {
      expect("life" in card).toBe(false);
    }
    const fighters = built.monster_medium.cards.filter((card) => !("card_kind" in card));
    expect(fighters.length).toBeGreaterThan(0);
    for (const card of fighters) {
      if ("life" in card) expect(card.life).toBeGreaterThan(0);
    }
  });

  it("Abomination 变身卡的背面技能名可以和正面不同", () => {
    const transforms = built.hero_skill.cards.filter(
      (card) => "card_kind" in card && card.card_kind === "double_faced_skill",
    );
    expect(transforms).toHaveLength(3);
    for (const card of transforms) {
      if (!("back_face_skill" in card)) continue;
      expect(card.hero).toBeNull();
      expect(card.name).toBe("Transform to Beast");
      expect(card.back_face_skill.name).toBe("Transform to Human");
      expect(card.back_face_skill.name).not.toBe(card.name);
      expect(card.back_face_skill.level).toBe(card.level);
    }
  });

  it("Crit / Acc 旁边的数字用中性占位，不命名成伤害", () => {
    const smite = built.hero_skill.cards.find((card) => card.id === "hero_skill:p001");
    expect(smite?.printed_labels).toEqual([
      { label: "Crit", raw: "Crit 0", value: 0 },
      { label: "Acc", raw: "Acc 9", value: 9 },
    ]);
    const beside = smite?.unlabeled_numbers.filter((item) => item.anchor.type === "printed_label");
    expect(beside).toEqual([
      { text: "13", numeric: 13, anchor: { type: "printed_label", label: "Crit" } },
      { text: "7", numeric: 7, anchor: { type: "printed_label", label: "Acc" } },
    ]);

    const bounty = built.hero_skill.cards.find((card) => card.id === "hero_skill:p044");
    expect(bounty?.printed_labels).toContainEqual({ label: "Acc", raw: "Acc 1O", value: 10 });
    expect(
      bounty?.unlabeled_numbers.some(
        (item) => item.anchor.type === "printed_label" && item.anchor.label === "Acc",
      ),
    ).toBe(true);
  });

  it("pending_ 图标保持未验证，已合并图标用目标含义", () => {
    const pending = iconsNamed(
      built.hero_skill,
      (icon) => icon.key?.startsWith("pending_") === true,
    );
    for (const icon of pending) expect(icon.naming).toBe("unverified");
    const flare = built.hero_skill.cards.find((card) => card.id === "hero_skill:p166");
    expect(flare?.verification.unverified).toBe(false);
    expect(flare?.verified_rallying_flare?.source).toBe("print_front");
    const dirk = built.hero_skill.cards.find((card) => card.id === "hero_skill:p106");
    expect(dirk?.verification.unverified).toBe(false);

    const merged = iconsNamed(built.virtue_affliction, (icon) => icon.iconId === "5d95c49a05");
    expect(merged.length).toBeGreaterThan(0);
    for (const icon of merged) {
      expect(icon.naming).toBe("confirmed");
      expect(icon.key).toBe("target_hero");
      expect(icon.meaning_en).toBe("Target: Hero(es) (one icon per target)");
    }
  });

  it("怪癖正负来自规则书，美德和折磨按 R-053", () => {
    expect(built.quirk.cards).toHaveLength(35);
    expect(built.quirk.cards.filter((card) => card.polarity === "positive")).toHaveLength(17);
    expect(built.quirk.cards.filter((card) => card.polarity === "negative")).toHaveLength(18);
    for (const card of built.quirk.cards) {
      expect(card.source_front).toBe(
        "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_44x68_Quirks_FRONT.pdf",
      );
      expect(card.source_back.endsWith("Quirks_BACK.pdf")).toBe(true);
      expect(card.back_has_data).toBe(false);
      expect(card.polarity_source).toBe("rulebook_r26_r27");
    }
    expect(built.quirk.cards.find((card) => card.name === "Photo Mania")?.polarity).toBe(
      "positive",
    );

    const virtues = ["Stalwart", "Courageous", "Focused", "Powerful", "Vigorous"];
    const afflictions = ["Fearful", "Selfish", "Masochistic", "Hopeless", "Irrational"];
    expect(built.virtue_affliction.cards).toHaveLength(10);
    expect(virtueRole("Not A Card")).toBeNull();
    for (const card of built.virtue_affliction.cards) {
      const expected = virtues.includes(card.name)
        ? "virtue"
        : afflictions.includes(card.name)
          ? "affliction"
          : null;
      expect(expected).not.toBeNull();
      expect(card.role).toBe(expected);
      expect(card.role_source).toBe("ruling_r053");
      expect(card.source_front).toBe(
        "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_44x68_virtue_afflictions_FRONT.pdf",
      );
      expect(card.source_back.endsWith("virtue_afflictions_BACK.pdf")).toBe(true);
      expect(card.back_has_data).toBe(false);
      expect(card.verification.reasons).not.toContain("role_not_printed");
      expect(card.verification.unverified).toBe(card.verification.reasons.length > 0);
    }

    const masochistic = built.virtue_affliction.cards.find((card) => card.name === "Masochistic");
    expect(masochistic?.verification).toEqual({
      unverified: false,
      reasons: [],
    });
    const irrational = built.virtue_affliction.cards.find((card) => card.name === "Irrational");
    expect(irrational?.verification).toEqual({
      unverified: false,
      reasons: [],
    });
    for (const name of [
      "Stalwart",
      "Courageous",
      "Focused",
      "Powerful",
      "Vigorous",
      "Fearful",
      "Selfish",
      "Hopeless",
    ]) {
      const card = built.virtue_affliction.cards.find((item) => item.name === name);
      expect(card?.verification).toEqual({ unverified: false, reasons: [] });
    }
  });

  it("monster_large icon 8707d5d8cf 为 summon/confirmed，p017/p019 卡级 verified", () => {
    expect(built.monster_large.stats).toEqual({ cards: 20, verified: 20, unverified: 0 });
    for (const id of ["monster_large:p017", "monster_large:p019"] as const) {
      const card = built.monster_large.cards.find((entry) => entry.id === id);
      expect(card?.verification).toEqual({ unverified: false, reasons: [] });
    }
    const summonIcons = iconsNamed(built.monster_large, (icon) => icon.iconId === "8707d5d8cf");
    expect(summonIcons.length).toBeGreaterThan(0);
    for (const icon of summonIcons) {
      expect(icon.naming).toBe("confirmed");
      expect(icon.key).toBe("summon");
    }
  });

  it("核心盒 38 张饰品 verification 与词典 v1.8 Q-47 批一致", () => {
    expect(built.trinket.cards).toHaveLength(38);
    expect(built.trinket.stats.verified).toBe(38);
    expect(built.trinket.stats.unverified).toBe(0);
    for (const card of built.trinket.cards) {
      expect(card.verification).toEqual({ unverified: false, reasons: [] });
    }
    const byPage = new Map(built.trinket.cards.map((c) => [c.pages[0], c.id]));
    expect(byPage.get(9)).toBe("trinket:p009");
    expect(byPage.get(10)).toBe("trinket:p010");
    expect(byPage.get(12)).toBe("trinket:p012");
    expect(byPage.get(14)).toBe("trinket:p014");
  });
});
