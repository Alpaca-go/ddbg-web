import { z } from "zod";
import type { RawFile } from "../extract/raw";

const condition = z.enum(["stun", "bleed", "blight", "debuff", "shuffle", "disease"]);
export const higherHeroDefenceSchema = z.strictObject({
  resistances: z.array(condition).max(3),
  immunities: z.array(condition).max(2),
  source: z.enum(["print_front", "print_back"]),
  approval: z.enum([
    "kyries_review_2026-10-15",
    "kyries_review_2026-10-16",
    "kyries_review_2026-10-17",
    "kyries_review_2026-10-18",
    "kyries_review_2026-10-24",
  ]),
});
export type HigherHeroDefence = z.infer<typeof higherHeroDefenceSchema>;
/** R-081/R-088/R-094/R-095分批限定卡与左右栏；不改全局词典。 */
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
  {
    id: "hero_stat:p005:back",
    name: "BOUNTY HUNTER",
    level: 2,
    resistances: [
      ["8db71542d2", "stun"],
      ["de6f50b39b", "debuff"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p006:front",
    name: "BOUNTY HUNTER",
    level: 3,
    resistances: [
      ["8db71542d2", "stun"],
      ["c07ea0c507", "debuff"],
      ["64702f548e", "bleed"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p013:back",
    name: "PLAGUE DOCTOR",
    level: 2,
    resistances: [["40bb356305", "blight"]],
    immunities: [["28b10f3fb7", "disease"]],
  },
  {
    id: "hero_stat:p014:front",
    name: "PLAGUE DOCTOR",
    level: 3,
    resistances: [],
    immunities: [
      ["8510428636", "blight"],
      ["28b10f3fb7", "disease"],
    ],
  },
  {
    id: "hero_stat:p017:back",
    name: "GRAVE ROBBER",
    level: 2,
    resistances: [
      ["e61ed317de", "blight"],
      ["de6f50b39b", "debuff"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p018:front",
    name: "GRAVE ROBBER",
    level: 3,
    resistances: [
      ["b942cddccd", "bleed"],
      ["e61ed317de", "blight"],
      ["de6f50b39b", "debuff"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p019:back",
    name: "OCCULTIST",
    level: 2,
    resistances: [
      ["b942cddccd", "bleed"],
      ["a8c4b25b4e", "debuff"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p020:front",
    name: "OCCULTIST",
    level: 3,
    resistances: [
      ["b942cddccd", "bleed"],
      ["e61ed317de", "blight"],
      ["de6f50b39b", "debuff"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p015:back",
    name: "ARBALEST",
    level: 2,
    resistances: [
      ["8db71542d2", "stun"],
      ["df4eb1ac47", "shuffle"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p016:front",
    name: "ARBALEST",
    level: 3,
    resistances: [["8db71542d2", "stun"]],
    immunities: [["df4eb1ac47", "shuffle"]],
  },
  {
    id: "hero_stat:p022:front",
    name: "ABOMINATION",
    level: 2,
    resistances: [
      ["8db71542d2", "stun"],
      ["40bb356305", "blight"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p023:front",
    name: "ABOMINATION",
    level: 3,
    resistances: [["8db71542d2", "stun"]],
    immunities: [["40bb356305", "blight"]],
  },
] as const;
export function approvedHigherDefence(id: string): HigherHeroDefence | undefined {
  const row = higherHeroDefenceApprovals.find((r) => r.id === id);
  return row
    ? {
        resistances: row.resistances.map((r) => r[1]),
        immunities: row.immunities.map((r) => r[1]),
        source: id.endsWith(":back") ? "print_back" : "print_front",
        approval:
          row.name === "ARBALEST" || row.name === "ABOMINATION"
            ? "kyries_review_2026-10-24"
            : row.name === "GRAVE ROBBER" || row.name === "OCCULTIST"
              ? "kyries_review_2026-10-18"
              : row.name === "PLAGUE DOCTOR"
                ? "kyries_review_2026-10-17"
                : row.name === "BOUNTY HUNTER"
                  ? "kyries_review_2026-10-16"
                  : "kyries_review_2026-10-15",
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
