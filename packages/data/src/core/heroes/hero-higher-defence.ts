import { printSourceIcon, printIcon } from "../../shared/print-icons";
import { z } from "zod";

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
    "kyries_review_2026-11-08",
    "kyries_review_2026-11-10",
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
      [printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p001:back:9"), "stun"],
      [printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p001:back:10"), "shuffle"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p002:front",
    name: "CRUSADER",
    level: 3,
    resistances: [
      [printIcon("stun", 114), "stun"],
      [printIcon("debuff", 344), "debuff"],
    ],
    immunities: [[printIcon("shuffle_resist", 417), "shuffle"]],
  },
  {
    id: "hero_stat:p003:back",
    name: "HELLION",
    level: 2,
    resistances: [
      [printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p003:back:10"), "bleed"],
      [printIcon("blight", 371), "blight"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p004:front",
    name: "HELLION",
    level: 3,
    resistances: [
      [printIcon("stun", 114), "stun"],
      [printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p004:front:11"), "bleed"],
      [printIcon("blight", 371), "blight"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p007:back",
    name: "HIGHWAYMAN",
    level: 2,
    resistances: [
      [printIcon("stun", 114), "stun"],
      [printIcon("bleed", 299), "bleed"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p008:front",
    name: "HIGHWAYMAN",
    level: 3,
    resistances: [
      [printIcon("stun", 114), "stun"],
      [printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p004:front:11"), "bleed"],
      [printIcon("blight", 371), "blight"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p009:back",
    name: "VESTAL",
    level: 2,
    resistances: [
      [printIcon("stun", 114), "stun"],
      [printIcon("bleed", 299), "bleed"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p010:front",
    name: "VESTAL",
    level: 3,
    resistances: [
      [printIcon("stun", 114), "stun"],
      [printIcon("bleed", 299), "bleed"],
    ],
    immunities: [[printIcon("disease", 466), "disease"]],
  },
  {
    id: "hero_stat:p005:back",
    name: "BOUNTY HUNTER",
    level: 2,
    resistances: [
      [printIcon("stun", 114), "stun"],
      [printIcon("debuff", 344), "debuff"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p006:front",
    name: "BOUNTY HUNTER",
    level: 3,
    resistances: [
      [printIcon("stun", 114), "stun"],
      [printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p006:front:11"), "debuff"],
      [printIcon("bleed", 516), "bleed"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p013:back",
    name: "PLAGUE DOCTOR",
    level: 2,
    resistances: [[printIcon("blight", 219), "blight"]],
    immunities: [[printIcon("disease", 466), "disease"]],
  },
  {
    id: "hero_stat:p014:front",
    name: "PLAGUE DOCTOR",
    level: 3,
    resistances: [],
    immunities: [
      [printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p014:front:12"), "blight"],
      [printIcon("disease", 466), "disease"],
    ],
  },
  {
    id: "hero_stat:p017:back",
    name: "GRAVE ROBBER",
    level: 2,
    resistances: [
      [printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p018:front:14"), "blight"],
      [printIcon("debuff", 344), "debuff"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p018:front",
    name: "GRAVE ROBBER",
    level: 3,
    resistances: [
      [printIcon("bleed", 299), "bleed"],
      [printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p018:front:14"), "blight"],
      [printIcon("debuff", 344), "debuff"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p019:back",
    name: "OCCULTIST",
    level: 2,
    resistances: [
      [printIcon("bleed", 299), "bleed"],
      [printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p019:back:10"), "debuff"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p020:front",
    name: "OCCULTIST",
    level: 3,
    resistances: [
      [printIcon("bleed", 299), "bleed"],
      [printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p018:front:14"), "blight"],
      [printIcon("debuff", 344), "debuff"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p015:back",
    name: "ARBALEST",
    level: 2,
    resistances: [
      [printIcon("stun", 114), "stun"],
      [printIcon("shuffle_resist", 417), "shuffle"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p016:front",
    name: "ARBALEST",
    level: 3,
    resistances: [[printIcon("stun", 114), "stun"]],
    immunities: [[printIcon("shuffle_resist", 417), "shuffle"]],
  },
  {
    id: "hero_stat:p022:front",
    name: "ABOMINATION",
    level: 2,
    resistances: [
      [printIcon("stun", 114), "stun"],
      [printIcon("blight", 219), "blight"],
    ],
    immunities: [],
  },
  {
    id: "hero_stat:p023:front",
    name: "ABOMINATION",
    level: 3,
    resistances: [[printIcon("stun", 114), "stun"]],
    immunities: [[printIcon("blight", 219), "blight"]],
  },
  {
    // Q-104（2026-11-08）：Antiquarian III 免疫 = 位移 + 疾病；左栏 Blight 抗性。
    id: "hero_stat:warrens:antiquarian:p002:front",
    name: "ANTIQUARIAN",
    level: 3,
    resistances: [[printIcon("blight", 219), "blight"]],
    immunities: [
      [printSourceIcon("corebox/raw/hero_stat.json:hero_stat:p014:front:12"), "shuffle"],
      [printIcon("disease", 466), "disease"],
    ],
  },
] as const;
// R-215：按核对稿的印刷正背面逐卡记录。部分旧提取的图标与当前印刷版不同。
const reviewedHeroDefenceRows: readonly (readonly [
  id: string,
  name: string,
  level: number,
  resistances: HigherHeroDefence["resistances"],
  immunities: HigherHeroDefence["immunities"],
])[] = [
  ["hero_stat:warrens:antiquarian:p001:front", "ANTIQUARIAN", 1, ["shuffle"], []],
  ["hero_stat:warrens:antiquarian:p001:back", "ANTIQUARIAN", 2, ["stun", "shuffle"], []],
  ["hero_stat:warrens:antiquarian:p002:front", "ANTIQUARIAN", 3, ["stun"], ["shuffle", "disease"]],
  ["hero_stat:p015:front", "ARBALEST", 1, ["shuffle"], []],
  ["hero_stat:cove:flagellant:p001:front", "FLAGELLANT", 1, ["bleed"], []],
  ["hero_stat:cove:flagellant:p001:back", "FLAGELLANT", 2, ["shuffle", "bleed"], []],
  ["hero_stat:cove:flagellant:p002:front", "FLAGELLANT", 3, ["stun", "shuffle", "bleed"], []],
  ["hero_stat:weald:houndmaster:p001:back", "HOUNDMASTER", 2, ["stun", "bleed"], []],
  ["hero_stat:weald:houndmaster:p002:front", "HOUNDMASTER", 3, ["stun", "bleed", "blight"], []],
  ["hero_stat:p011:back", "JESTER", 2, ["debuff", "bleed"], []],
  ["hero_stat:p012:front", "JESTER", 3, ["debuff", "bleed", "blight"], []],
  ["hero_stat:warrens:leper:p001:front", "LEPER", 1, ["debuff"], []],
  ["hero_stat:warrens:leper:p001:back", "LEPER", 2, ["shuffle", "debuff"], []],
  ["hero_stat:warrens:leper:p002:front", "LEPER", 3, ["stun", "shuffle", "debuff"], []],
  ["hero_stat:cove:man-at-arms:p001:front", "MAN-AT-ARMS", 1, ["shuffle"], []],
  ["hero_stat:cove:man-at-arms:p001:back", "MAN-AT-ARMS", 2, ["shuffle", "bleed"], []],
  ["hero_stat:cove:man-at-arms:p002:front", "MAN-AT-ARMS", 3, ["stun", "shuffle", "bleed"], []],
  ["hero_stat:musketeer:musketeer:p001:front", "MUSKETEER", 1, ["shuffle"], []],
  ["hero_stat:musketeer:musketeer:p001:back", "MUSKETEER", 2, ["stun", "shuffle"], []],
  ["hero_stat:musketeer:musketeer:p002:front", "MUSKETEER", 3, ["stun"], ["shuffle"]],
  ["hero_stat:weald:shieldbreaker:p001:back", "SHIELDBREAKER", 2, ["stun", "shuffle"], []],
  ["hero_stat:weald:shieldbreaker:p002:front", "SHIELDBREAKER", 3, ["stun"], ["shuffle"]],
];
const reviewedHeroDefences = new Map(
  reviewedHeroDefenceRows.map(([id, name, level, resistances, immunities]) => [
    id,
    { name, level, resistances, immunities },
  ]),
);

function originalHigherDefence(id: string): HigherHeroDefence | undefined {
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
                  : row.name === "ANTIQUARIAN"
                    ? "kyries_review_2026-11-08"
                    : "kyries_review_2026-10-15",
      }
    : undefined;
}
export function approvedHigherDefence(id: string): HigherHeroDefence | undefined {
  const row = reviewedHeroDefences.get(id);
  return row
    ? {
        resistances: [...row.resistances],
        immunities: [...row.immunities],
        source: id.endsWith(":back") ? "print_back" : "print_front",
        approval: "kyries_review_2026-11-10",
      }
    : originalHigherDefence(id);
}

export function readHigherHeroDefence(
  card:
    | {
        id: string;
        name: string;
        level?: number;
        attributesVerified: boolean;
        rules?: { higherConditionDefence?: HigherHeroDefence | undefined } | undefined;
        annotation_higher_condition_defence?: HigherHeroDefence | undefined;
      }
    | undefined,
) {
  const got = card?.rules?.higherConditionDefence ?? card?.annotation_higher_condition_defence;
  if (!card?.attributesVerified || !higherHeroDefenceSchema.safeParse(got).success)
    return undefined;
  const key =
    "rawId" in card && "face" in card ? `${String(card.rawId)}:${String(card.face)}` : card.id;
  const reviewed = got!.approval === "kyries_review_2026-11-10";
  const row = reviewed
    ? reviewedHeroDefences.get(key)
    : higherHeroDefenceApprovals.find((entry) => entry.id === key);
  if (!row || card.name !== row.name || card.level !== row.level) return undefined;
  const expected = (reviewed ? approvedHigherDefence(key) : originalHigherDefence(key))!;
  return got!.source === expected.source &&
    got!.approval === expected.approval &&
    JSON.stringify(got!.resistances) === JSON.stringify(expected.resistances) &&
    JSON.stringify(got!.immunities) === JSON.stringify(expected.immunities)
    ? got
    : undefined;
}
