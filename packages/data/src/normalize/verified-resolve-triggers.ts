import { normalizedVirtueAfflictionCardSchema } from "./schema";
import type { NormalizedVirtueAfflictionCard } from "./schema";

type Trigger = NonNullable<NormalizedVirtueAfflictionCard["verified_turn_start"]>;
type Entry = {
  id: string;
  name: string;
  role: "virtue" | "affliction";
  rollMax: number;
  suffix: string;
  effect: Trigger["effect"];
  fullText?: string;
};
const heroes = "{target_hero}{target_hero}{target_hero}{target_hero}:";
// 完整页人工核对，docs/phase2-resolve-review-2026-10-10.md；仅已确认图标。
const entries: readonly Entry[] = [
  {
    id: "virtue_affliction:p001",
    name: "Stalwart",
    role: "virtue",
    rollMax: 3,
    suffix: "Self{stress}-2",
    effect: { type: "stress", scope: "self", amount: -2 },
  },
  {
    id: "virtue_affliction:p002",
    name: "Courageous",
    role: "virtue",
    rollMax: 3,
    suffix: `${heroes}{stress}-1`,
    effect: { type: "stress", scope: "heroes", amount: -1 },
  },
  {
    id: "virtue_affliction:p003",
    name: "Focused",
    role: "virtue",
    rollMax: 5,
    suffix: "Self{buff}2t",
    effect: { type: "buff", scope: "self", duration: 2 },
  },
  {
    id: "virtue_affliction:p004",
    name: "Powerful",
    role: "virtue",
    rollMax: 3,
    suffix: `${heroes}{buff}2t`,
    effect: { type: "buff", scope: "heroes", duration: 2 },
  },
  {
    id: "virtue_affliction:p005",
    name: "Vigorous",
    role: "virtue",
    rollMax: 3,
    suffix: "Self{heal}{heal}3/HeroLevel",
    effect: { type: "heal", scope: "self", amount: 3, perHeroLevel: true },
  },
  {
    id: "virtue_affliction:p006",
    name: "Fearful",
    role: "affliction",
    rollMax: 2,
    suffix: "Self{stress}+2",
    effect: { type: "stress", scope: "self", amount: 2 },
  },
  {
    id: "virtue_affliction:p007",
    name: "Selfish",
    role: "affliction",
    rollMax: 4,
    suffix: "ConsumeoneProvision.",
    effect: { type: "consumeProvision", amount: 1 },
  },
  {
    id: "virtue_affliction:p008",
    name: "Masochistic",
    role: "affliction",
    rollMax: 3,
    suffix: "Self{wound}{wound}/HeroLevel",
    effect: { type: "wounds", scope: "self", amount: 2, perHeroLevel: true },
  },
  {
    id: "virtue_affliction:p009",
    name: "Hopeless",
    role: "affliction",
    rollMax: 3,
    suffix: `${heroes}{stress}+1`,
    effect: { type: "stress", scope: "heroes", amount: 1 },
  },
  {
    id: "virtue_affliction:p010",
    name: "Irrational",
    role: "affliction",
    rollMax: 10,
    suffix: "",
    fullText:
      "IrrationalAtthestartofyourturn:Move1{d10}{d10}1-5{result_table_arrow}Stanceforward.Move1{d10}{d10}6-10{result_table_arrow}Stancebackward.",
    effect: { type: "stanceMove", forwardThrough: 5, distance: 1 },
  },
];

export function attachVerifiedResolveTriggers(
  cards: readonly NormalizedVirtueAfflictionCard[],
): NormalizedVirtueAfflictionCard[] {
  const byId = new Map<string, Trigger>();
  for (const entry of entries) {
    const matches = cards.filter((card) => card.id === entry.id);
    if (matches.length !== 1 || byId.has(entry.id))
      throw new Error(`意志卡映射 id 缺失或重复：${entry.id}`);
    const card = matches[0]!;
    if (
      card.name !== entry.name ||
      card.role !== entry.role ||
      card.role_source !== "ruling_r053" ||
      card.pages.length !== 1 ||
      card.pages[0] !== Number(entry.id.slice(-3)) ||
      card.verification.unverified
    )
      throw new Error(`意志卡名称 / 角色 / 页码 / 验证状态漂移：${entry.id}`);
    if (
      card.lines
        .flat()
        .some(
          (segment) =>
            segment.type === "icon" &&
            !["confirmed", "confirmed_rulebook"].includes(segment.icon.naming),
        )
    )
      throw new Error(`意志卡含未确认图标：${entry.id}`);
    const text = card.lines
      .flat()
      .map((segment) => (segment.type === "text" ? segment.text : `{${segment.icon.key}}`))
      .join("")
      .replace(/\s+/g, "");
    const arrow = entry.role === "virtue" ? "yellow" : "red";
    const expected =
      entry.fullText ??
      `${entry.name}Atthestartofyourturn:{d10}{d10}1-${entry.rollMax}{card_back_marker_${arrow}_down_arrow}${entry.suffix}`;
    if (text !== expected) throw new Error(`意志卡完整文本 / 图标漂移：${entry.id}`);
    byId.set(entry.id, { rollMin: 1, rollMax: entry.rollMax, effect: entry.effect });
  }
  return cards.map((card) => {
    const trigger = byId.get(card.id);
    return trigger
      ? normalizedVirtueAfflictionCardSchema.parse({ ...card, verified_turn_start: trigger })
      : card;
  });
}
