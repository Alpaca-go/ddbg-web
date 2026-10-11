import { z } from "zod";
import type { RawFile } from "../extract/raw";
import { levelSchema } from "../extract/common";
import { normalizedIconSchema, verificationSchema } from "./schema";
import { createIconLookup, finishVerification, noteIcon, resolveLines } from "./icons";
import type { IconDictionary } from "../dictionary/schema";

const FRONT = "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_100x180_Hero_STAT_FRONT.pdf";
const BACK = "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_100x180_Hero_STAT_BACK.pdf";
const attributesSchema = z.strictObject({
  rawId: z.string().regex(/^hero_stat:p\d{3}$/),
  face: z.enum(["front", "back"]),
  name: z.string().min(1),
  level: levelSchema,
  life: z.int().positive(),
  dodge: z.int().nonnegative(),
  speed: z.int().nonnegative(),
});

/** Kyries 2026-10-10 批准核对表 §3；身份为 raw id + face，不外推同名卡。 */
export const approvedHeroStats = [
  ["hero_stat:p001", "front", "CRUSADER", 1, 17, 0, 1],
  ["hero_stat:p001", "back", "CRUSADER", 2, 24, 1, 1],
  ["hero_stat:p002", "front", "CRUSADER", 3, 32, 2, 1],
  ["hero_stat:p003", "front", "HELLION", 1, 14, 1, 2],
  ["hero_stat:p003", "back", "HELLION", 2, 18, 2, 2],
  ["hero_stat:p004", "front", "HELLION", 3, 24, 3, 2],
  ["hero_stat:p007", "front", "HIGHWAYMAN", 1, 12, 1, 2],
  ["hero_stat:p007", "back", "HIGHWAYMAN", 2, 17, 2, 2],
  ["hero_stat:p008", "front", "HIGHWAYMAN", 3, 22, 3, 3],
  ["hero_stat:p009", "front", "VESTAL", 1, 12, 0, 1],
  ["hero_stat:p009", "back", "VESTAL", 2, 17, 1, 1],
  ["hero_stat:p010", "front", "VESTAL", 3, 22, 2, 2],
].map(([rawId, face, name, level, life, dodge, speed]) =>
  attributesSchema.parse({ rawId, face, name, level, life, dodge, speed }),
);

export const normalizedHeroStatCardSchema = attributesSchema
  .extend({
    id: z.string().min(1),
    source: z.strictObject({ file: z.enum([FRONT, BACK]), page: z.int().positive() }),
    attributesVerified: z.literal(true),
    approval: z.literal("kyries_review_2026-10-10"),
    /** 四张 I 级完整抗性 / 免疫框已核；只确认 Buff，其他未命名图标仍保持待定。 */
    verified_buff_defence: z
      .strictObject({
        resistant: z.boolean(),
        immune: z.boolean(),
        source: z.literal("print_front"),
      })
      .optional(),
    /** 其他卡面文字只保留，不解释村庄效果、抗性或免疫。 */
    lines: z.array(z.string()),
    icons: z.array(normalizedIconSchema),
    verification: verificationSchema,
  })
  .superRefine((card, ctx) => {
    if (
      card.id !== `${card.rawId}:${card.face}` ||
      card.source.file !== (card.face === "front" ? FRONT : BACK) ||
      card.source.page !== Number(card.rawId.slice(-3))
    )
      ctx.addIssue({ code: "custom", message: "英雄属性身份 / 文件 / 页码不一致" });
    if (
      card.verification.unverified !== card.verification.reasons.length > 0 ||
      card.icons.some(
        (icon) =>
          icon.naming === "unverified" &&
          !card.verification.reasons.includes(`icon:${icon.iconId}`),
      )
    )
      ctx.addIssue({ code: "custom", message: "未确认图标必须保留整卡未验证原因（R-048）" });
  });

export const normalizedHeroStatFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-normalized-v0"),
    dictionary_version: z.literal("1.8"),
    category: z.literal("hero_stat"),
    sources: z.strictObject({
      parsed: z.null(),
      raw: z.literal("extract/corebox/raw/hero_stat.json"),
      dictionary: z.literal("dictionary/icon-dictionary-v1.8.json"),
    }),
    cards: z.array(normalizedHeroStatCardSchema),
  })
  .superRefine((file, ctx) => {
    if (new Set(file.cards.map((card) => card.id)).size !== file.cards.length)
      ctx.addIssue({ code: "custom", message: "英雄属性 raw id + face 重复" });
  });

export type NormalizedHeroStatCard = z.infer<typeof normalizedHeroStatCardSchema>;
export type NormalizedHeroStatFile = z.infer<typeof normalizedHeroStatFileSchema>;

/** 获批属性单独入库，其他图标仍由词典决定验证状态；纯函数，不修改 raw / 词典。 */
export function buildHeroStats(
  raw: RawFile,
  dictionary: IconDictionary,
  approved = approvedHeroStats,
): NormalizedHeroStatFile {
  if (raw.category !== "hero_stat" || raw.kind !== "card") throw new Error("英雄属性来源类别错误");
  const lookup = createIconLookup(dictionary);
  const cards = approved.map((entry) => {
    const attributes = attributesSchema.parse(entry);
    const sources = raw.cards.filter((card) => card.id === attributes.rawId);
    if (sources.length !== 1) throw new Error("获批英雄 raw id 必须唯一存在");
    const source = sources[0]!;
    const face = source.faces[attributes.face];
    const expectedFile = attributes.face === "front" ? FRONT : BACK;
    if (
      source.source_set !== "base" ||
      !face ||
      face.file !== expectedFile ||
      source.pages.length !== 1 ||
      face.page !== source.pages[0] ||
      face.page !== Number(attributes.rawId.slice(-3)) ||
      !face.spans.some((span) => span.t === attributes.name) ||
      !face.spans.some((span) => span.t === ["I", "II", "III"][attributes.level - 1])
    )
      throw new Error("获批英雄属性来源身份漂移 / 卡背不可入库");
    const printedNumber = (iconId: string, expected: number) => {
      const placements = face.icons.filter((icon) => icon.iconId === iconId && !icon.decor);
      if (placements.length !== 1) throw new Error("英雄属性数字定位不唯一");
      const [left, top, right, bottom] = placements[0]!.bbox;
      const numbers = face.spans.filter((span) => {
        const x = (span.bbox[0] + span.bbox[2]) / 2;
        const y = (span.bbox[1] + span.bbox[3]) / 2;
        return /^\d+$/.test(span.t) && x >= left && x <= right && y >= top && y <= bottom;
      });
      if (numbers.length !== 1 || numbers[0]!.t !== String(expected))
        throw new Error("获批英雄属性与原始卡面数字冲突");
      return placements[0]!.bbox;
    };
    const lifeBox = printedNumber("9534ad5184", attributes.life);
    printedNumber("7a472f5d6f", attributes.dodge);
    const speedCount = face.icons.filter((icon) => {
      const y = (icon.bbox[1] + icon.bbox[3]) / 2;
      return (
        icon.iconId === "4648c9e5ec" &&
        !icon.decor &&
        icon.bbox[0] >= lifeBox[2] &&
        y >= lifeBox[1] &&
        y <= lifeBox[3]
      );
    }).length;
    if (speedCount !== attributes.speed) throw new Error("获批 Speed 与移动栏图标数量冲突");
    const reasons = new Set<string>();
    resolveLines(
      face.lines.map((line) => line.text),
      lookup,
      reasons,
    );
    const icons = face.icons
      .filter((placement) => !placement.decor)
      .map((placement) => {
        const icon = lookup.resolve(placement.iconId);
        noteIcon(icon, reasons);
        return icon;
      });
    // 三个字段的语义仍必须由已确认的原图标支持，不能用审批绕过词典退回待定。
    for (const [iconId, key] of [
      ["9534ad5184", "life"],
      ["7a472f5d6f", "dodge"],
      ["4648c9e5ec", "speed"],
    ]) {
      const icon = icons.find((icon) => icon.iconId === iconId);
      if (!icon || icon.key !== key || !["confirmed", "confirmed_rulebook"].includes(icon.naming))
        throw new Error("获批属性缺少已确认图标（R-048）");
    }
    const reviewedBuffDefence: Record<string, string> = {
      "hero_stat:p001": "8db71542d2",
      "hero_stat:p003": "d29a868ed8",
      "hero_stat:p007": "8db71542d2",
      "hero_stat:p009": "d29a868ed8",
    };
    const buffReviewed =
      attributes.level === 1 &&
      attributes.face === "front" &&
      reviewedBuffDefence[attributes.rawId] !== undefined;
    if (buffReviewed) {
      const lines = face.lines.map((line) => line.text);
      const start = lines.indexOf("Resistances        Immunities");
      const end = lines.findIndex((line) => line.startsWith("Hamlet Skill:"));
      if (
        start < 0 ||
        end !== start + 2 ||
        lines[start + 1] !== `{icon:${reviewedBuffDefence[attributes.rawId]}}`
      )
        throw new Error("已复核 Buff 抗性 / 免疫框漂移（R-048）");
    }
    return normalizedHeroStatCardSchema.parse({
      ...attributes,
      id: `${attributes.rawId}:${attributes.face}`,
      source: { file: face.file, page: face.page },
      attributesVerified: true,
      approval: "kyries_review_2026-10-10",
      ...(buffReviewed
        ? { verified_buff_defence: { resistant: false, immune: false, source: "print_front" } }
        : {}),
      lines: face.lines.map((line) => line.text),
      icons,
      verification: finishVerification(reasons),
    });
  });
  return normalizedHeroStatFileSchema.parse({
    schema: "ddbg-normalized-v0",
    dictionary_version: "1.8",
    category: "hero_stat",
    sources: {
      parsed: null,
      raw: "extract/corebox/raw/hero_stat.json",
      dictionary: "dictionary/icon-dictionary-v1.8.json",
    },
    cards,
  });
}
