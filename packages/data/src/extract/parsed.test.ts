import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { HeroSkillCard, MonsterMediumCard } from "./parsed";
import {
  heroSkillFileSchema,
  monsterLargeFileSchema,
  monsterMediumFileSchema,
  trinketFileSchema,
} from "./parsed";
import type { RawFile } from "./raw";
import { rawFileSchema } from "./raw";

const COREBOX_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../extract/corebox",
);

/** 背面印英雄名、各 21 张的 10 名英雄。Abomination 另计。说明书 §1.2。 */
const HEROES_WITH_FULL_SKILL_DECK = [
  "CRUSADER",
  "HIGHWAYMAN",
  "GRAVE ROBBER",
  "HELLION",
  "VESTAL",
  "OCCULTIST",
  "BOUNTY HUNTER",
  "JESTER",
  "PLAGUE DOCTOR",
  "ARBALEST",
] as const;

const iconToken = /\{icon:[0-9a-f]{10}\}/g;

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(path.join(COREBOX_ROOT, relativePath), "utf8")) as unknown;
}

function parseSchema<T>(
  schema: {
    safeParse: (
      data: unknown,
    ) =>
      | { success: true; data: T }
      | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
  },
  data: unknown,
  label: string,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const preview = result.error.issues
      .slice(0, 12)
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`${label}\n${preview}`);
  }
  return result.data;
}

function isDoubleFaced(
  card: HeroSkillCard,
): card is Extract<HeroSkillCard, { card_kind: "double_faced_skill" }> {
  return "card_kind" in card;
}

function isLargeReference(
  card: MonsterMediumCard,
): card is Extract<MonsterMediumCard, { card_kind: "large_monster_reference" }> {
  return "card_kind" in card;
}

function walkStrings(value: unknown, visit: (text: string) => void): void {
  if (typeof value === "string") {
    visit(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkStrings(item, visit);
    return;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) walkStrings(nested, visit);
  }
}

describe("ddbg-parsed-v0", () => {
  const heroSkills = parseSchema(
    heroSkillFileSchema,
    readJson("parsed/hero_skill.json"),
    "hero_skill",
  );
  const medium = parseSchema(
    monsterMediumFileSchema,
    readJson("parsed/monster_medium.json"),
    "monster_medium",
  );
  const large = parseSchema(
    monsterLargeFileSchema,
    readJson("parsed/monster_large.json"),
    "monster_large",
  );
  const trinkets = parseSchema(trinketFileSchema, readJson("parsed/trinket.json"), "trinket");

  it("四个 parsed 文件的统计与失败列表一致", () => {
    for (const file of [heroSkills, medium, large, trinkets]) {
      const failed = file.cards.filter((card) => card.issues.length > 0);
      expect(file.stats.cards).toBe(file.cards.length);
      expect(file.stats.failed).toBe(failed.length);
      expect(file.stats.ok).toBe(file.stats.cards - file.stats.failed);
      expect(file.stats.success_rate).toBe(
        Math.round((file.stats.ok / file.stats.cards) * 10000) / 10000,
      );
      expect(file.failures.map((failure) => failure.id)).toEqual(failed.map((card) => card.id));
    }
  });

  it("卡面字符串里的图标仍是 {icon:<id>} 占位", () => {
    for (const file of [heroSkills, medium, large, trinkets]) {
      for (const card of file.cards) {
        walkStrings(card, (text) => {
          const stripped = text.replace(iconToken, "");
          expect(stripped.includes("{icon:")).toBe(false);
        });
      }
    }
  });

  it("每个技能名正好有 I/II/III，正反面等级一致", () => {
    const levelsByName = new Map<string, number[]>();
    let doubleFaced = 0;
    for (const card of heroSkills.cards) {
      const levels = levelsByName.get(card.name) ?? [];
      levels.push(card.level);
      levelsByName.set(card.name, levels);
      if (isDoubleFaced(card)) {
        doubleFaced += 1;
        expect(card.hero).toBeNull();
        expect(card.back_face_skill.level).toBe(card.level);
      } else {
        expect(card.back_name).toBe(card.name);
        expect(card.back_level).toBe(card.level);
      }
    }
    expect(doubleFaced).toBe(3);
    expect(levelsByName.size).toBe(77);
    for (const [name, levels] of levelsByName) {
      expect(
        levels.sort((a, b) => a - b),
        name,
      ).toEqual([1, 2, 3]);
    }
  });

  it("10 名英雄各 21 张，Abomination 18 张加 3 张变身卡", () => {
    for (const hero of HEROES_WITH_FULL_SKILL_DECK) {
      expect(heroSkills.cards.filter((card) => card.hero === hero)).toHaveLength(21);
    }
    expect(heroSkills.cards.filter((card) => card.hero === "ABOMINATION")).toHaveLength(18);
    expect(heroSkills.cards.filter((card) => card.hero === null)).toHaveLength(3);
    const names = new Set(heroSkills.cards.map((card) => card.hero));
    expect(names).toEqual(new Set([...HEROES_WITH_FULL_SKILL_DECK, "ABOMINATION", null]));
  });

  it("第 44 页 Collect Bounty II 保留印刷 Acc 1O，且不补 acc", () => {
    const card = heroSkills.cards.find((entry) => entry.id === "hero_skill:p044");
    expect(card).toMatchObject({
      name: "Collect Bounty",
      level: 2,
      hero: "BOUNTY HUNTER",
      acc_raw: "Acc 1O",
      issues: ["Acc label with non-numeric value 'Acc 1O' (kept raw, not corrected)"],
    });
    expect(card && "acc" in card).toBe(false);
    expect(
      heroSkills.cards.filter((entry) => entry.issues.length > 0).map((entry) => entry.id),
    ).toEqual(["hero_skill:p044"]);
  });

  it("没有印 Crit 的技能不补 crit 字段", () => {
    const heroMissing = heroSkills.cards.filter((card) => !("crit" in card)).length;
    expect(heroMissing).toBe(48);
    let monsterMissing = 0;
    for (const card of [...medium.cards, ...large.cards]) {
      if (!("skills" in card)) continue;
      monsterMissing += card.skills.filter((skill) => !("crit" in skill)).length;
    }
    expect(monsterMissing).toBe(23);
  });

  it("饰品正反面等级一致，上下半区同名", () => {
    const counts = { 1: 0, 2: 0, 3: 0 };
    for (const card of trinkets.cards) {
      expect(card.issues).toEqual([]);
      expect(card.upright_half.name).toBe(card.name);
      expect(card.inverted_half.name).toBe(card.name);
      expect(card.upright_half.level).toBe(card.level);
      expect(card.inverted_half.level).toBe(card.level);
      expect(card.back_level).toBe(card.level);
      expect(card.upright_half.printed_rotation).toBe(0);
      expect(card.inverted_half.printed_rotation).toBe(180);
      if (card.level === 1) counts[1] += 1;
      else if (card.level === 2) counts[2] += 1;
      else counts[3] += 1;
    }
    expect(counts).toEqual({ 1: 14, 2: 12, 3: 12 });
    expect(trinkets.cards).toHaveLength(38);
  });

  it("非参考怪物都有 hp，参考卡指向大型怪物", () => {
    const references = medium.cards.filter(isLargeReference);
    expect(references).toHaveLength(4);
    expect(medium.cards.filter((card) => !isLargeReference(card))).toHaveLength(50);
    for (const card of medium.cards) {
      if (isLargeReference(card)) {
        expect("hp" in card).toBe(false);
      } else {
        expect(card.hp).toBeGreaterThan(0);
      }
    }
    for (const card of large.cards) {
      expect(card.hp).toBeGreaterThan(0);
      expect(card.issues).toEqual([]);
    }
    const largeKeys = new Set(large.cards.map((card) => `${card.name}\0${card.level}`));
    for (const card of references) {
      expect(largeKeys.has(`${card.name}\0${card.level}`)).toBe(true);
    }
  });
});

describe("parsed 与 raw 的已知印刷问题", () => {
  it("Acc 1O 同时出现在 raw span 和 parsed acc_raw", () => {
    const raw = parseSchema<RawFile>(
      rawFileSchema,
      readJson("raw/hero_skill.json"),
      "raw hero_skill",
    );
    const face = raw.cards.find((card) => card.id === "hero_skill:p044")?.faces.front;
    expect(face?.spans.some((span) => span.t === "Acc 1O")).toBe(true);
  });
});
