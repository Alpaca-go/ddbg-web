import { z } from "zod";
import type { RawFile } from "../extract/raw";
import { levelSchema } from "../extract/common";
import type { IconDictionary } from "../dictionary/schema";
import { createIconLookup, finishVerification, noteIcon, resolveLines } from "./icons";
import { normalizedIconSchema, verificationSchema } from "./schema";

const STAT_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/DD_EN_WEALD_CARDS_100x180_Hero_STAT_FRONT.pdf";
const STAT_BACK =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/DD_EN_WEALD_CARDS_100x180_Hero_STAT_BACK.pdf";

/** TDH 免疫栏标题装饰；不入词典，不参与 STAT 核实（R-048 / Q-106）。 */
const STAT_IMMUNITIES_HEADER_ICON = "55a3fded25";

const wealdAttributesSchema = z.strictObject({
  rawId: z.string().regex(/^hero_stat:weald:(houndmaster|shieldbreaker):p00[12]$/),
  face: z.enum(["front", "back"]),
  name: z.enum(["HOUNDMASTER", "SHIELDBREAKER"]),
  level: levelSchema,
  life: z.int().positive(),
  dodge: z.int().nonnegative(),
  speed: z.int().nonnegative(),
});

/** R-106：Weald 六面 STAT（Weald 包 p1–4；几何自 TDH p32–35，见 Q-106）。 */
export const approvedWealdHeroStats = [
  ["hero_stat:weald:houndmaster:p001", "front", "HOUNDMASTER", 1, 11, 1, 2],
  ["hero_stat:weald:houndmaster:p001", "back", "HOUNDMASTER", 2, 15, 2, 2],
  ["hero_stat:weald:houndmaster:p002", "front", "HOUNDMASTER", 3, 19, 3, 2],
  ["hero_stat:weald:shieldbreaker:p001", "front", "SHIELDBREAKER", 1, 11, 1, 2],
  ["hero_stat:weald:shieldbreaker:p001", "back", "SHIELDBREAKER", 2, 15, 2, 2],
  ["hero_stat:weald:shieldbreaker:p002", "front", "SHIELDBREAKER", 3, 19, 3, 3],
].map(([rawId, face, name, level, life, dodge, speed]) =>
  wealdAttributesSchema.parse({ rawId, face, name, level, life, dodge, speed }),
);

export const approvedWealdConditionDefences: Readonly<
  Record<string, { name: string; iconId: string; kind: "stun" | "bleed" | "blight" | "debuff" }>
> = {
  "hero_stat:weald:houndmaster:p001:front": {
    name: "HOUNDMASTER",
    iconId: "8db71542d2",
    kind: "stun",
  },
  "hero_stat:weald:shieldbreaker:p001:front": {
    name: "SHIELDBREAKER",
    iconId: "8db71542d2",
    kind: "stun",
  },
};

const wealdConditionDefenceSchema = z.strictObject({
  resistances: z.array(z.enum(["stun", "bleed", "blight", "debuff"])).length(1),
  immunities: z.array(z.never()).length(0),
  source: z.literal("print_front"),
  approval: z.literal("kyries_review_2026-10-24"),
});

export const wealdHeroStatCardSchema = wealdAttributesSchema
  .extend({
    id: z.string().regex(/^hero_stat:weald:(houndmaster|shieldbreaker):p00[12]:(front|back)$/),
    source: z.strictObject({
      file: z.enum([STAT_FRONT, STAT_BACK]),
      page: z.int().positive(),
    }),
    attributesVerified: z.literal(true),
    approval: z.literal("kyries_review_2026-10-24"),
    verified_condition_defence: wealdConditionDefenceSchema.optional(),
    lines: z.array(z.string()),
    icons: z.array(normalizedIconSchema),
    verification: verificationSchema,
  })
  .superRefine((card, ctx) => {
    const defence = approvedWealdConditionDefences[card.id];
    if (defence) {
      if (
        card.face !== "front" ||
        card.level !== 1 ||
        card.name !== defence.name ||
        !card.verified_condition_defence ||
        card.verified_condition_defence.resistances[0] !== defence.kind
      )
        ctx.addIssue({ code: "custom", message: "Weald I 级条件防御与 R-106 不一致" });
    }
  });

export type WealdHeroStatCard = z.infer<typeof wealdHeroStatCardSchema>;

export function buildWealdHeroStats(
  raw: RawFile,
  dictionary: IconDictionary,
  approved = approvedWealdHeroStats,
): WealdHeroStatCard[] {
  if (raw.category !== "hero_stat") throw new Error("Weald 英雄属性来源类别错误");
  const lookup = createIconLookup(dictionary);
  return approved.map((entry) => {
    const attributes = wealdAttributesSchema.parse(entry);
    const sources = raw.cards.filter((card) => card.id === attributes.rawId);
    if (sources.length !== 1)
      throw new Error(`Weald 获批 raw id 必须唯一存在：${attributes.rawId}`);
    const source = sources[0]!;
    const face = source.faces[attributes.face];
    const expectedFile = attributes.face === "front" ? STAT_FRONT : STAT_BACK;
    if (
      !face ||
      face.file !== expectedFile ||
      source.pages.length !== 1 ||
      !face.spans.some((span) => span.t === attributes.name) ||
      !face.spans.some((span) => span.t === ["I", "II", "III"][attributes.level - 1])
    )
      throw new Error(`Weald 获批属性来源身份漂移：${attributes.rawId}:${attributes.face}`);
    const printedNumber = (iconId: string, expected: number) => {
      const placements = face.icons.filter((icon) => icon.iconId === iconId && !icon.decor);
      if (placements.length !== 1) throw new Error("Weald 属性数字定位不唯一");
      const [left, top, right, bottom] = placements[0]!.bbox;
      const numbers = face.spans.filter((span) => {
        const x = (span.bbox[0] + span.bbox[2]) / 2;
        const y = (span.bbox[1] + span.bbox[3]) / 2;
        return /^\d+$/.test(span.t) && x >= left && x <= right && y >= top && y <= bottom;
      });
      if (numbers.length !== 1 || numbers[0]!.t !== String(expected))
        throw new Error("Weald 获批属性与原始卡面数字冲突");
      return placements[0]!.bbox;
    };
    const lifeBox = printedNumber("9534ad5184", attributes.life);
    printedNumber("7a472f5d6f", attributes.dodge);
    const hamletLine = face.lines.findIndex((line) => line.text.startsWith("Hamlet Skill:"));
    const attributeLines = hamletLine < 0 ? face.lines : face.lines.slice(0, hamletLine);
    const reasons = new Set<string>();
    resolveLines(
      attributeLines
        .map((line) => line.text)
        .filter((line) => !line.includes("Resistances        Immunities")),
      lookup,
      reasons,
    );
    const icons = face.icons
      .filter((placement) => !placement.decor)
      .map((placement) => {
        const icon = lookup.resolve(placement.iconId);
        if (placement.iconId !== STAT_IMMUNITIES_HEADER_ICON) noteIcon(icon, reasons);
        return { ...icon, bbox: placement.bbox };
      });
    if (attributes.speed > 0) {
      const speedCount = face.icons.filter((placement) => {
        if (placement.decor || placement.iconId !== "4648c9e5ec") return false;
        const y = (placement.bbox[1] + placement.bbox[3]) / 2;
        return placement.bbox[0] >= lifeBox[2] && y >= lifeBox[1] && y <= lifeBox[3];
      }).length;
      if (speedCount !== attributes.speed) throw new Error("Weald Speed 与移动栏图标数量冲突");
    }
    for (const [iconId, key] of [
      ["9534ad5184", "life"],
      ["7a472f5d6f", "dodge"],
    ] as const) {
      const icon = icons.find((i) => i.iconId === iconId);
      if (!icon || icon.key !== key || !["confirmed", "confirmed_rulebook"].includes(icon.naming))
        throw new Error("Weald 获批属性缺少已确认图标（R-048）");
    }
    if (attributes.speed > 0) {
      const speedIcon = icons.find((i) => i.iconId === "4648c9e5ec");
      if (
        !speedIcon ||
        speedIcon.key !== "speed" ||
        !["confirmed", "confirmed_rulebook"].includes(speedIcon.naming)
      )
        throw new Error("Weald 获批 Speed 缺少已确认图标（R-048）");
    }
    const defence = approvedWealdConditionDefences[`${attributes.rawId}:${attributes.face}`];
    if (defence) {
      const joined = face.lines.map((line) => line.text).join("\n");
      if (!joined.includes(`{icon:${defence.iconId}}`))
        throw new Error("Weald 条件防御图标漂移（R-048）");
    }
    return wealdHeroStatCardSchema.parse({
      ...attributes,
      id: `${attributes.rawId}:${attributes.face}`,
      source: { file: face.file, page: face.page },
      attributesVerified: true,
      approval: "kyries_review_2026-10-24",
      ...(defence
        ? {
            verified_condition_defence: {
              resistances: [defence.kind],
              immunities: [],
              source: "print_front",
              approval: "kyries_review_2026-10-24",
            },
          }
        : {}),
      lines: face.lines.map((line) => line.text),
      icons: icons.map((entry) => {
        const { bbox, ...icon } = entry;
        void bbox;
        return icon;
      }),
      verification: finishVerification(reasons),
    });
  });
}
