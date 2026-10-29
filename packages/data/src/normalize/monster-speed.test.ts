import { describe, expect, it } from "vitest";
import { normalizedMonsterMediumCardSchema } from "./schema";
import { attachVerifiedMonsterSpeeds, verifiedMonsterSpeeds } from "./verified-monster-speeds";
import { loadNormalizedCorebox } from "./write";

const built = loadNormalizedCorebox();
// 独立预期：首批六条 2026-10-10，新四张普通卡 2026-10-12 部分批准，不从映射反推。
const expected = [
  ["monster_medium:p001", 1],
  ["monster_medium:p004", 3],
  ["monster_medium:p007", 2],
  ["monster_medium:p010", 1],
  ["monster_medium:p040", 1],
  ["monster_medium:p021", 3],
  ["monster_medium:p027", 2],
  ["monster_medium:p031", 1],
  ["monster_medium:p043", 3],
  ["monster_medium:p046", 2],
  ["monster_medium:p018", 2],
  ["monster_medium:p024", 1],
  ["monster_medium:p034", 2],
  ["monster_medium:p037", 1],
  ["monster_medium:p013", 2],
  ["monster_medium:p050", 3],
  ["monster_medium:p053", 3],
  ["monster_medium:p089", 3],
  ["monster_medium:p090", 3],
] as const;
const originals = built.monster_medium.cards.map((card) => {
  const copy = structuredClone(card);
  if ("skills" in copy) delete copy.speed;
  return copy;
});
const soldier = originals.find((card) => card.id === "monster_medium:p001")!;

describe("获批中型怪物 Speed 入库（R24、R-001、R-048）", () => {
  it("十四个I级与三张II级获批普通卡带正确数值，大型L1–3已获批", () => {
    expect(verifiedMonsterSpeeds.map((entry) => [entry.id, entry.speed])).toEqual(expected);
    expect(
      built.monster_medium.cards
        .filter((card) => "speed" in card)
        .map((card) => card.id)
        .sort(),
    ).toEqual(expected.map(([id]) => id).sort());
    for (const [id, speed] of expected) {
      const card = built.monster_medium.cards.find((entry) => entry.id === id)!;
      expect(card, id).toBeDefined();
      if (!("skills" in card)) throw new Error(`${id} 不是技能怪物卡`);
      expect(card.speed, id).toBe(speed);
      expect(card.stanceGroups, id).toBeDefined();
      expect(card.verification.unverified, id).toBe(false);
    }
    for (const card of built.monster_large.cards)
      expect(card.speed, card.id).toBe(
        ["monster_large:p001", "monster_large:p002"].includes(card.id)
          ? 1
          : ["monster_large:p003", "monster_large:p008"].includes(card.id)
            ? 2
            : undefined,
      );
    expect(loadNormalizedCorebox()).toEqual(built);
  });

  it("无获批映射时即使有姿态分组与已命名图标也不补 Speed", () => {
    const result = attachVerifiedMonsterSpeeds(originals, []);
    expect(result).toEqual(originals);
    for (const [id] of expected) {
      const card = result.find((entry) => entry.id === id)!;
      expect(
        card.front_icons.some((icon) => icon.key === "speed"),
        id,
      ).toBe(true);
      expect("speed" in normalizedMonsterMediumCardSchema.parse(card), id).toBe(false);
    }
  });

  it("只增加 speed，保留其他字段与验证状态，不修改输入，重复附加一致", () => {
    const before = structuredClone(originals);
    const result = attachVerifiedMonsterSpeeds(originals);
    expect(result).toEqual(built.monster_medium.cards);
    expect(
      result.map((card) => {
        const copy = structuredClone(card);
        if ("skills" in copy) delete copy.speed;
        return copy;
      }),
    ).toEqual(before);
    expect(originals).toEqual(before);
    expect(attachVerifiedMonsterSpeeds(result)).toEqual(result);
    const unverified = originals.map((card) =>
      card.id === soldier.id
        ? { ...card, verification: { unverified: true, reasons: ["icon:pending"] } }
        : card,
    );
    expect(attachVerifiedMonsterSpeeds(unverified)[0]!.verification).toEqual({
      unverified: true,
      reasons: ["icon:pending"],
    });
  });

  it("拒绝未知 / 重复 id、参考卡与卡名 / 等级 / 页码漂移", () => {
    const first = verifiedMonsterSpeeds[0]!;
    expect(() => attachVerifiedMonsterSpeeds(originals, [first, first])).toThrow("重复");
    expect(() => attachVerifiedMonsterSpeeds(originals, [{ ...first, id: "missing" }])).toThrow(
      "唯一存在",
    );
    expect(() => attachVerifiedMonsterSpeeds([...originals, soldier])).toThrow("唯一存在");
    const reference = originals.find((card) => !("skills" in card) && card.level === 1)!;
    expect(() =>
      attachVerifiedMonsterSpeeds(originals, [
        { ...first, id: reference.id, name: reference.name, pages: reference.pages },
      ]),
    ).toThrow("大型参考卡");
    for (const patch of [{ name: "Wrong Card" }, { level: 2 }, { pages: [2, 3] }])
      expect(() => attachVerifiedMonsterSpeeds(originals, [{ ...first, ...patch }])).toThrow();
  });

  it("既有 Speed 冲突拒绝，保持入参不变", () => {
    const conflicting = originals.map((card) =>
      card.id === soldier.id ? { ...card, speed: 9 } : card,
    );
    const before = structuredClone(conflicting);
    expect(() => attachVerifiedMonsterSpeeds(conflicting)).toThrow("冲突");
    expect(conflicting).toEqual(before);
  });

  it("显式非负整数可表达，结构校验不代表批准，不把缺字段当零", () => {
    for (const speed of [0, 1, 2, 3])
      expect(normalizedMonsterMediumCardSchema.parse({ ...soldier, speed })).toEqual({
        ...soldier,
        speed,
      });
    expect("speed" in normalizedMonsterMediumCardSchema.parse(soldier)).toBe(false);
  });

  it("schema 与映射均拒绝 null、负数、小数、字符串等脏值，不转换或回退", () => {
    for (const speed of [null, -1, 1.5, "1", NaN, Infinity]) {
      expect(normalizedMonsterMediumCardSchema.safeParse({ ...soldier, speed }).success).toBe(
        false,
      );
      expect(() =>
        attachVerifiedMonsterSpeeds(originals, [{ ...verifiedMonsterSpeeds[0], speed }]),
      ).toThrow();
    }
  });
});
