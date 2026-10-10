import { normalizedHeroSkillCardSchema } from "./schema";
import type { NormalizedHeroSkillCard, Segment } from "./schema";

type Entry = {
  id: string;
  name: string;
  lineIndex: number;
  scope: "self" | "target";
  signature: string;
  effects: {
    kind: "bleed" | "stun" | "buff" | "mark" | "riposte" | "protection";
    duration: number;
    amount?: number;
  }[];
};

// 完整卡面逐页核对；docs/phase2-status-deployment-review-2026-10-10.md。
// 已确认图标的明确 Nt，不从 null 补默认值、不跨等级推断。
const entries: readonly Entry[] = [
  {
    id: "hero_skill:p007",
    name: "Stunning Blow",
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [{ kind: "stun", duration: 1 }],
  },
  {
    id: "hero_skill:p010",
    name: "Bulwark of Faith",
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {protection} 2t, {mark} 3t, {light} +2",
    effects: [
      { kind: "protection", duration: 2 },
      { kind: "mark", duration: 3 },
    ],
  },
  {
    id: "hero_skill:p031",
    name: "If It Bleeds",
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 2 {bleed} 2t",
    effects: [{ kind: "bleed", duration: 2, amount: 2 }],
  },
  {
    id: "hero_skill:p037",
    name: "Adrenaline Rush",
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self Remove {bleed} {blight} , {buff} 3t",
    effects: [{ kind: "buff", duration: 3 }],
  },
  {
    id: "hero_skill:p076",
    name: "Tracking Shot",
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 3t",
    effects: [{ kind: "buff", duration: 3 }],
  },
  {
    id: "hero_skill:p079",
    name: "Duelist’s Advance",
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {riposte} 2t, {shuffle} Pull 1",
    effects: [{ kind: "riposte", duration: 2 }],
  },
  {
    id: "hero_skill:p082",
    name: "Open Vein",
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 2 {bleed} 2t",
    effects: [{ kind: "bleed", duration: 2, amount: 2 }],
  },
  {
    id: "hero_skill:p091",
    name: "Dazzling Light",
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t, {light} +1",
    effects: [{ kind: "stun", duration: 1 }],
  },
];

function signature(line: readonly Segment[]): string {
  return line
    .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
    .join("")
    .split(String.fromCharCode(7))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function attachVerifiedHeroStatuses(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  const annotations = new Map<
    string,
    NonNullable<NormalizedHeroSkillCard["verified_status_effects"]>
  >();
  for (const entry of entries) {
    const matches = cards.filter((card) => card.id === entry.id);
    if (matches.length !== 1) throw new Error(`状态映射 id 必须唯一存在：${entry.id}`);
    const card = matches[0]!;
    const page = Number(entry.id.slice(-3));
    if (
      card.name !== entry.name ||
      card.level !== 1 ||
      card.pages.length !== 1 ||
      card.pages[0] !== page ||
      card.verification.unverified
    )
      throw new Error(`状态映射的卡名 / 等级 / 页码 / 验证状态不符：${entry.id}`);
    const line = card.effect_lines[entry.lineIndex];
    if (!line || signature(line) !== entry.signature)
      throw new Error(`状态映射效果行漂移：${entry.id}`);
    for (const segment of line) {
      if (
        segment.type === "icon" &&
        segment.icon.naming !== "confirmed" &&
        segment.icon.naming !== "confirmed_rulebook"
      )
        throw new Error(`状态映射含未确认图标：${entry.id}`);
    }
    const effects = entry.effects.map((effect) => {
      const indexes = line.flatMap((segment, index) =>
        segment.type === "icon" && segment.icon.key === effect.kind ? [index] : [],
      );
      if (indexes.length !== 1) throw new Error(`状态图标必须唯一存在：${entry.id}/${effect.kind}`);
      return {
        ...effect,
        scope: entry.scope,
        lineIndex: entry.lineIndex,
        segmentIndex: indexes[0]!,
      };
    });
    if (annotations.has(entry.id)) throw new Error(`状态映射 id 重复：${entry.id}`);
    annotations.set(entry.id, effects);
  }
  return cards.map((card) => {
    const effects = annotations.get(card.id);
    return effects
      ? normalizedHeroSkillCardSchema.parse({ ...card, verified_status_effects: effects })
      : card;
  });
}
