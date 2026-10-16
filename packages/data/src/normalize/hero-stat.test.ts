import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { iconDictionarySchema } from "../dictionary/schema";
import { rawFileSchema } from "../extract/raw";
import { createIconLookup } from "./icons";
import {
  approvedHeroStats,
  buildHeroStats,
  normalizedHeroStatCardSchema,
  normalizedHeroStatFileSchema,
} from "./hero-stat";
import { loadNormalizedCorebox } from "./write";

const json = (file: string) =>
  JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"));
const raw = rawFileSchema.parse(json("extract/corebox/raw/hero_stat.json"));
const dictionary = iconDictionarySchema.parse(json("dictionary/icon-dictionary-v1.8.json"));
const built = buildHeroStats(raw, dictionary);
const first = approvedHeroStats[0]!;

describe("五名英雄15面获批属性（R10/19/29；R-006/007/048/088）", () => {
  it("限定五个 I 级 id 的完整防御及各自批准日期，红滴读 Bleed，不修改原图标或词典", () => {
    expect(
      built.cards
        .filter((c) => c.verified_condition_defence)
        .map((c) => [c.id, c.verified_condition_defence]),
    ).toEqual([
      [
        "hero_stat:p001:front",
        {
          resistances: ["stun"],
          immunities: [],
          source: "print_front",
          approval: "kyries_review_2026-10-12",
        },
      ],
      [
        "hero_stat:p003:front",
        {
          resistances: ["bleed"],
          immunities: [],
          source: "print_front",
          approval: "kyries_review_2026-10-12",
        },
      ],
      [
        "hero_stat:p007:front",
        {
          resistances: ["stun"],
          immunities: [],
          source: "print_front",
          approval: "kyries_review_2026-10-12",
        },
      ],
      [
        "hero_stat:p009:front",
        {
          resistances: ["bleed"],
          immunities: [],
          source: "print_front",
          approval: "kyries_review_2026-10-12",
        },
      ],
      [
        "hero_stat:p005:front",
        {
          resistances: ["stun"],
          immunities: [],
          source: "print_front",
          approval: "kyries_review_2026-10-16",
        },
      ],
    ]);
    const hellion = built.cards.find((c) => c.id === "hero_stat:p003:front")!;
    const annotation = hellion.verified_condition_defence!;
    for (const card of [
      { ...hellion, verified_condition_defence: { ...annotation, resistances: ["stun"] } },
      { ...hellion, verified_condition_defence: { ...annotation, immunities: ["bleed"] } },
      { ...built.cards[1], verified_condition_defence: annotation },
    ])
      expect(normalizedHeroStatCardSchema.safeParse(card).success).toBe(false);
    const originalIcon = createIconLookup(dictionary).resolve("d29a868ed8");
    expect(hellion.icons.find((i) => i.iconId === "d29a868ed8")).toEqual(originalIcon);
    expect(originalIcon.naming).toBe("unverified");
  });
  it("免疫栏增加图标或抗性图标移到右栏时拒绝，不能只靠文字行通过", () => {
    for (const mutate of [
      (face: (typeof raw.cards)[number]["faces"]["front"]) =>
        face.icons.push({ iconId: "8db71542d2", bbox: [46, 135, 55, 145] }),
      (face: (typeof raw.cards)[number]["faces"]["front"]) => {
        face.icons.find((i) => i.iconId === "8db71542d2")!.bbox = [46, 135, 55, 145];
      },
    ]) {
      const changed = structuredClone(raw);
      mutate(changed.cards[0]!.faces.front);
      expect(() => buildHeroStats(changed, dictionary)).toThrow("完整框漂移");
    }
  });
  it("只核获批 I 级 Buff 抗性栏；栏位漂移拒绝，其他图标仍保留未验证", () => {
    expect(built.cards.filter((c) => c.verified_buff_defence).map((c) => c.id)).toEqual([
      "hero_stat:p001:front",
      "hero_stat:p003:front",
      "hero_stat:p007:front",
      "hero_stat:p009:front",
      "hero_stat:p005:front",
    ]);
    expect(built.cards.find((c) => c.id === "hero_stat:p003:front")).toMatchObject({
      verified_buff_defence: { resistant: false, immune: false, source: "print_front" },
      verification: { unverified: true, reasons: expect.arrayContaining(["icon:d29a868ed8"]) },
    });
    const changed = structuredClone(raw);
    const face = changed.cards.find((c) => c.id === "hero_stat:p001")!.faces.front!;
    face.lines.find((l) => l.text === "{icon:8db71542d2}")!.text += " {icon:ef29ccfbe0}";
    expect(() => buildHeroStats(changed, dictionary)).toThrow(/Buff.*漂移/);
  });
  it("独立预期锁定 raw id + face、英雄、等级及 36 个获批值", () => {
    // 直接来自获批核对表 §3，不从实现映射反推；III 级不能继承 I/II Speed。
    expect(
      built.cards
        .filter((c) => c.name !== "BOUNTY HUNTER")
        .map((card) => [card.id, card.name, card.level, card.life, card.dodge, card.speed]),
    ).toEqual([
      ["hero_stat:p001:front", "CRUSADER", 1, 17, 0, 1],
      ["hero_stat:p001:back", "CRUSADER", 2, 24, 1, 1],
      ["hero_stat:p002:front", "CRUSADER", 3, 32, 2, 1],
      ["hero_stat:p003:front", "HELLION", 1, 14, 1, 2],
      ["hero_stat:p003:back", "HELLION", 2, 18, 2, 2],
      ["hero_stat:p004:front", "HELLION", 3, 24, 3, 2],
      ["hero_stat:p007:front", "HIGHWAYMAN", 1, 12, 1, 2],
      ["hero_stat:p007:back", "HIGHWAYMAN", 2, 17, 2, 2],
      ["hero_stat:p008:front", "HIGHWAYMAN", 3, 22, 3, 3],
      ["hero_stat:p009:front", "VESTAL", 1, 12, 0, 1],
      ["hero_stat:p009:back", "VESTAL", 2, 17, 1, 1],
      ["hero_stat:p010:front", "VESTAL", 3, 22, 2, 2],
    ]);
    expect(built.cards.every((card) => card.attributesVerified)).toBe(true);
    expect(built.cards.filter((card) => card.verification.unverified)).toHaveLength(10);
  });

  it("只输出获批面，无映射不输出，不把 III 级背面或其他英雄补成默认数值", () => {
    expect(buildHeroStats(raw, dictionary, []).cards).toEqual([]);
    expect(buildHeroStats(raw, dictionary, [first]).cards).toEqual([built.cards[0]]);
    expect(built.cards.some((card) => card.rawId === "hero_stat:p011")).toBe(false);
    expect(
      built.cards.some((card) => card.rawId === "hero_stat:p002" && card.face === "back"),
    ).toBe(false);
    expect(() =>
      buildHeroStats(raw, dictionary, [{ ...first, rawId: "hero_stat:p002", face: "back" }]),
    ).toThrow("卡背");
  });

  it("保留全部非装饰 placement 的图标及原始文字，不因属性获批清除未验证", () => {
    const lookup = createIconLookup(dictionary);
    for (const card of built.cards) {
      const face = raw.cards.find((entry) => entry.id === card.rawId)!.faces[card.face]!;
      expect(card.lines).toEqual(face.lines.map((line) => line.text));
      expect(card.icons).toEqual(
        face.icons.filter((icon) => !icon.decor).map((icon) => lookup.resolve(icon.iconId)),
      );
      for (const icon of card.icons.filter((icon) => icon.naming === "unverified")) {
        expect(card.verification.reasons).toContain(`icon:${icon.iconId}`);
        expect(card.verification.unverified).toBe(true);
      }
    }
    const unverified = built.cards[1]!;
    expect(unverified.verification.reasons).toEqual(["icon:7034784ee1", "icon:b284fea953"]);
    expect(
      normalizedHeroStatCardSchema.safeParse({
        ...unverified,
        verification: { unverified: false, reasons: [] },
      }).success,
    ).toBe(false);
  });

  it("词典未收的新增图标原样保留 ID / null，不给它命名", () => {
    const changed = structuredClone(raw);
    changed.cards[0]!.faces.front.icons.push({ iconId: "0000000000", bbox: [1, 1, 2, 2] });
    const card = buildHeroStats(changed, dictionary, [first]).cards[0]!;
    expect(card.icons.at(-1)).toMatchObject({
      iconId: "0000000000",
      in_dictionary: false,
      key: null,
      value: null,
      naming: "unverified",
    });
    expect(card.verification).toEqual({ unverified: true, reasons: ["icon:0000000000"] });
  });

  it("拒绝缺失 / 重复 raw、重复面、身份 / 文件 / 页码漂移与面交换", () => {
    const missing = { ...raw, cards: raw.cards.slice(1) };
    expect(() => buildHeroStats(missing, dictionary)).toThrow("唯一存在");
    expect(() =>
      buildHeroStats({ ...raw, cards: [...raw.cards, raw.cards[0]!] }, dictionary),
    ).toThrow("唯一存在");
    expect(() => buildHeroStats(raw, dictionary, [first, first])).toThrow("重复");
    for (const patch of [
      { name: "Wrong" },
      { level: 2 },
      { face: "back" as const },
      { rawId: "hero_stat:p099" },
    ])
      expect(() => buildHeroStats(raw, dictionary, [{ ...first, ...patch }])).toThrow();
    for (const patch of [{ file: "wrong.pdf" }, { page: 2 }]) {
      const changed = structuredClone(raw);
      Object.assign(changed.cards[0]!.faces.front, patch);
      expect(() => buildHeroStats(changed, dictionary)).toThrow("身份漂移");
    }
    const card = built.cards[0]!;
    expect(normalizedHeroStatCardSchema.safeParse({ ...card, id: card.rawId }).success).toBe(false);
    expect(normalizedHeroStatFileSchema.safeParse({ ...built, cards: [card, card] }).success).toBe(
      false,
    );
  });

  it("拒绝脏值、数字 / Speed 冲突及已确认属性图标退回未确认", () => {
    for (const field of ["life", "dodge", "speed"] as const) {
      for (const value of [null, undefined, -1, 1.5, "1", NaN])
        expect(() =>
          buildHeroStats(raw, dictionary, [{ ...first, [field]: value } as typeof first]),
        ).toThrow();
      expect(() => buildHeroStats(raw, dictionary, [{ ...first, [field]: 99 }])).toThrow("冲突");
    }
    expect(() => buildHeroStats(raw, dictionary, [{ ...first, life: 0 }])).toThrow();
    const changed = structuredClone(raw);
    changed.cards[0]!.faces.front.spans.find((span) => span.t === "17")!.t = "18";
    expect(() => buildHeroStats(changed, dictionary)).toThrow("冲突");
    const withdrawn = structuredClone(dictionary);
    withdrawn.icons.find((icon) => icon.iconId === "9534ad5184")!.status = "needs_review";
    expect(() => buildHeroStats(raw, withdrawn)).toThrow("已确认图标");
  });

  it("生成结果与提交 JSON 一致、可重复，raw 与词典保持不变", () => {
    const rawBefore = structuredClone(raw);
    const dictionaryBefore = structuredClone(dictionary);
    expect(loadNormalizedCorebox().hero_stat).toEqual(built);
    expect(buildHeroStats(raw, dictionary)).toEqual(json("normalized/corebox/hero_stat.json"));
    expect(raw).toEqual(rawBefore);
    expect(dictionary).toEqual(dictionaryBefore);
  });
});
