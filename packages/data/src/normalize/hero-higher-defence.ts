import { z } from "zod";
import type { RawFile } from "../extract/raw";

const condition = z.enum(["stun", "bleed", "blight", "debuff", "shuffle", "disease"]);
export const higherHeroDefenceSchema = z.strictObject({
  resistances: z.array(condition).max(3),
  immunities: z.array(condition).max(1),
  source: z.enum(["print_front", "print_back"]),
  approval: z.literal("kyries_review_2026-10-15"),
});
export type HigherHeroDefence = z.infer<typeof higherHeroDefenceSchema>;
/** R-081：限定八张卡及左右栏；不改全局词典。数组为[图标id,条件名]。 */
export const higherHeroDefenceApprovals = [
  {
    id: "hero_stat:p001:back",
    name: "CRUSADER",
    level: 2,
    resistances: [
      ["7034784ee1", "stun"],
      ["b284fea953", "shuffle"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p002:front",
    name: "CRUSADER",
    level: 3,
    resistances: [
      ["8db71542d2", "stun"],
      ["de6f50b39b", "debuff"],
    ],
    immunities: [["df4eb1ac47", "shuffle"]],
  },
  {
    id: "hero_stat:p003:back",
    name: "HELLION",
    level: 2,
    resistances: [
      ["c461b9cf7d", "bleed"],
      ["4afe5a1a69", "blight"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p004:front",
    name: "HELLION",
    level: 3,
    resistances: [
      ["8db71542d2", "stun"],
      ["92d117f31a", "bleed"],
      ["4afe5a1a69", "blight"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p007:back",
    name: "HIGHWAYMAN",
    level: 2,
    resistances: [
      ["8db71542d2", "stun"],
      ["b942cddccd", "bleed"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p008:front",
    name: "HIGHWAYMAN",
    level: 3,
    resistances: [
      ["8db71542d2", "stun"],
      ["92d117f31a", "bleed"],
      ["4afe5a1a69", "blight"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p009:back",
    name: "VESTAL",
    level: 2,
    resistances: [
      ["8db71542d2", "stun"],
      ["b942cddccd", "bleed"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p010:front",
    name: "VESTAL",
    level: 3,
    resistances: [
      ["8db71542d2", "stun"],
      ["b942cddccd", "bleed"],
    ],
    immunities: [["28b10f3fb7", "disease"]],
  },
] as const;
export function approvedHigherDefence(id: string): HigherHeroDefence | undefined {
  const row = higherHeroDefenceApprovals.find((r) => r.id === id);
  return row
    ? {
        resistances: row.resistances.map((r) => r[1]),
        immunities: row.immunities.map((r) => r[1]),
        source: id.endsWith(":back") ? "print_back" : "print_front",
        approval: "kyries_review_2026-10-15",
      }
    : undefined;
}
export function readHigherHeroDefence(
  card:
    | {
        id: string;
        name: string;
        level?: number;
        attributesVerified: boolean;
        verified_higher_condition_defence?: HigherHeroDefence | undefined;
      }
    | undefined,
) {
  const row = higherHeroDefenceApprovals.find((r) => r.id === card?.id);
  if (
    !card ||
    !row ||
    !card.attributesVerified ||
    card.name !== row.name ||
    card.level !== row.level ||
    !higherHeroDefenceSchema.safeParse(card.verified_higher_condition_defence).success
  )
    return undefined;
  const expected = approvedHigherDefence(card.id)!;
  const got = card.verified_higher_condition_defence!;
  return got.source === expected.source &&
    got.approval === expected.approval &&
    JSON.stringify(got.resistances) === JSON.stringify(expected.resistances) &&
    JSON.stringify(got.immunities) === JSON.stringify(expected.immunities)
    ? got
    : undefined;
}
export function buildHigherHeroDefence(
  id: string,
  face: NonNullable<RawFile["cards"][number]["faces"]["front"]>,
) {
  const row = higherHeroDefenceApprovals.find((r) => r.id === id);
  if (!row) return undefined;
  const labels = face.spans.filter((s) => s.t === "Resistances        Immunities"),
    hamlet = face.spans.filter((s) => s.t === "Hamlet Skill:");
  if (labels.length !== 1 || hamlet.length !== 1)
    throw new Error("高等级防御完整栏定位不唯一（R-081）");
  const [left, , right, bottom] = labels[0]!.bbox,
    split = (left + right) / 2;
  const icons = face.icons
    .filter(
      (i) =>
        !i.decor &&
        (i.bbox[0] + i.bbox[2]) / 2 >= left &&
        (i.bbox[0] + i.bbox[2]) / 2 <= right &&
        (i.bbox[1] + i.bbox[3]) / 2 > bottom &&
        (i.bbox[1] + i.bbox[3]) / 2 < hamlet[0]!.bbox[1],
    )
    .sort((a, b) => a.bbox[0] - b.bbox[0]);
  for (const side of ["resistances", "immunities"] as const) {
    const actual = icons
      .filter((i) => (i.bbox[0] + i.bbox[2]) / 2 < split === (side === "resistances"))
      .map((i) => i.iconId);
    if (JSON.stringify(actual) !== JSON.stringify(row[side].map((r) => r[0])))
      throw new Error("高等级防御图标/左右栏漂移（R-081）");
  }
  return approvedHigherDefence(id);
}
