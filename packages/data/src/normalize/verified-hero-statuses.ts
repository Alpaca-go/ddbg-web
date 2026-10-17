import { normalizedHeroSkillCardSchema } from "./schema";
import type { NormalizedHeroSkillCard, Segment } from "./schema";

type Entry = {
  id: string;
  hero?: string;
  name: string;
  level: number;
  lineIndex: number;
  scope: "self" | "target";
  signature: string;
  effects: {
    kind: "bleed" | "blight" | "stun" | "buff" | "mark" | "riposte" | "protection" | "debuff";
    duration: number;
    amount?: number;
  }[];
};

// 完整印刷逐页核对：docs/phase2-four-core-skills-2026-10-11.md。
const entries: readonly Entry[] = [
  // 完整FRONT p127/p136，R19–21；仅I级，不从未命名numeric推断时长。
  {
    id: "hero_skill:p127",
    hero: "PLAGUE DOCTOR",
    name: "Noxious Blast",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 4 {blight} 2t, {debuff} 1t",
    effects: [
      { kind: "blight", amount: 4, duration: 2 },
      { kind: "debuff", duration: 1 },
    ],
  },
  {
    id: "hero_skill:p136",
    hero: "PLAGUE DOCTOR",
    name: "Incision",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 2 {bleed} 2t",
    effects: [{ kind: "bleed", amount: 2, duration: 2 }],
  },
  {
    id: "hero_skill:p055",
    hero: "BOUNTY HUNTER",
    name: "Flashbang",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t, {shuffle} Push 1 or {shuffle} Pull 1",
    effects: [{ kind: "stun", duration: 1 }],
  },
  // 当前版 FRONT p49/p52，完整卡面及 R20–21：状态与同行位移一并消费。
  {
    id: "hero_skill:p049",
    hero: "BOUNTY HUNTER",
    name: "Come Hither",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {mark} 2t, {shuffle} Pull 2",
    effects: [{ kind: "mark", duration: 2 }],
  },
  {
    id: "hero_skill:p052",
    hero: "BOUNTY HUNTER",
    name: "Uppercut",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t, {shuffle} Push 2",
    effects: [{ kind: "stun", duration: 1 }],
  },
  {
    id: "hero_skill:p007",
    name: "Stunning Blow",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p008",
    name: "Stunning Blow",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p009",
    name: "Stunning Blow",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p010",
    name: "Bulwark of Faith",
    level: 1,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {protection} 2t, {mark} 3t, {light} +2",
    effects: [
      {
        kind: "protection",
        duration: 2,
      },
      {
        kind: "mark",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:p011",
    name: "Bulwark of Faith",
    level: 2,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {protection} 3t, {mark} 3t, {light} +2",
    effects: [
      {
        kind: "protection",
        duration: 3,
      },
      {
        kind: "mark",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:p012",
    name: "Bulwark of Faith",
    level: 3,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {protection} 3t, {mark} 2t, {light} +2",
    effects: [
      {
        kind: "protection",
        duration: 3,
      },
      {
        kind: "mark",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:p028",
    name: "Barbaric YAWP!",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p029",
    name: "Barbaric YAWP!",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p030",
    name: "Barbaric YAWP!",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p031",
    name: "If It Bleeds",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 2 {bleed} 2t",
    effects: [
      {
        kind: "bleed",
        duration: 2,
        amount: 2,
      },
    ],
  },
  {
    id: "hero_skill:p032",
    name: "If It Bleeds",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 3 {bleed} 3t",
    effects: [
      {
        kind: "bleed",
        duration: 3,
        amount: 3,
      },
    ],
  },
  {
    id: "hero_skill:p033",
    name: "If It Bleeds",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 4 {bleed} 3t",
    effects: [
      {
        kind: "bleed",
        duration: 3,
        amount: 4,
      },
    ],
  },
  {
    id: "hero_skill:p037",
    name: "Adrenaline Rush",
    level: 1,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self Remove {bleed} {blight} , {buff} 3t",
    effects: [
      {
        kind: "buff",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:p038",
    name: "Adrenaline Rush",
    level: 2,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self Remove {bleed} {blight}, {buff} 2t",
    effects: [
      {
        kind: "buff",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:p038",
    name: "Adrenaline Rush",
    level: 2,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} Remove {bleed} {blight}, {buff} 2t",
    effects: [
      {
        kind: "buff",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:p039",
    name: "Adrenaline Rush",
    level: 3,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self Remove {bleed} {blight}, {buff} 2t",
    effects: [
      {
        kind: "buff",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:p039",
    name: "Adrenaline Rush",
    level: 3,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} Remove {bleed} {blight}, {buff} 2t",
    effects: [
      {
        kind: "buff",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:p040",
    name: "Bleed Out",
    level: 1,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 3 {bleed} 2t",
    effects: [
      {
        kind: "bleed",
        duration: 2,
        amount: 3,
      },
    ],
  },
  {
    id: "hero_skill:p041",
    name: "Bleed Out",
    level: 2,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 3 {bleed} 3t",
    effects: [
      {
        kind: "bleed",
        duration: 3,
        amount: 3,
      },
    ],
  },
  {
    id: "hero_skill:p042",
    name: "Bleed Out",
    level: 3,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 4 {bleed} 3t",
    effects: [
      {
        kind: "bleed",
        duration: 3,
        amount: 4,
      },
    ],
  },
  {
    id: "hero_skill:p073",
    name: "Grapeshot Blast",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 1t",
    effects: [
      {
        kind: "debuff",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p074",
    name: "Grapeshot Blast",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 2t",
    effects: [
      {
        kind: "debuff",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:p075",
    name: "Grapeshot Blast",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 3t",
    effects: [
      {
        kind: "debuff",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:p076",
    name: "Tracking Shot",
    level: 1,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 3t",
    effects: [
      {
        kind: "buff",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:p077",
    name: "Tracking Shot",
    level: 2,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 4t",
    effects: [
      {
        kind: "buff",
        duration: 4,
      },
    ],
  },
  {
    id: "hero_skill:p078",
    name: "Tracking Shot",
    level: 3,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 4t",
    effects: [
      {
        kind: "buff",
        duration: 4,
      },
    ],
  },
  {
    id: "hero_skill:p079",
    name: "Duelist’s Advance",
    level: 1,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {riposte} 2t, {shuffle} Pull 1",
    effects: [
      {
        kind: "riposte",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:p080",
    name: "Duelist’s Advance",
    level: 2,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {riposte} 3t, {shuffle} Pull 1",
    effects: [
      {
        kind: "riposte",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:p081",
    name: "Duelist’s Advance",
    level: 3,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {riposte} 3t, {shuffle} Pull 1",
    effects: [
      {
        kind: "riposte",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:p082",
    name: "Open Vein",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 2 {bleed} 2t",
    effects: [
      {
        kind: "bleed",
        duration: 2,
        amount: 2,
      },
    ],
  },
  {
    id: "hero_skill:p083",
    name: "Open Vein",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 2 {bleed} 3t",
    effects: [
      {
        kind: "bleed",
        duration: 3,
        amount: 2,
      },
    ],
  },
  {
    id: "hero_skill:p084",
    name: "Open Vein",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 3 {bleed} 3t",
    effects: [
      {
        kind: "bleed",
        duration: 3,
        amount: 3,
      },
    ],
  },
  {
    id: "hero_skill:p091",
    name: "Dazzling Light",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t, {light} +1",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p092",
    name: "Dazzling Light",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t, {light} +1",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p093",
    name: "Dazzling Light",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t, {light} +1",
    effects: [
      {
        kind: "stun",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p100",
    name: "Illumination",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 1t, {light} +1",
    effects: [
      {
        kind: "debuff",
        duration: 1,
      },
    ],
  },
  {
    id: "hero_skill:p101",
    name: "Illumination",
    level: 2,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 2t, {light} +1",
    effects: [
      {
        kind: "debuff",
        duration: 2,
      },
    ],
  },
  {
    id: "hero_skill:p102",
    name: "Illumination",
    level: 3,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 3t, {light} +1",
    effects: [
      {
        kind: "debuff",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:p103",
    name: "Hand of Light",
    level: 1,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 3t",
    effects: [
      {
        kind: "buff",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:p104",
    name: "Hand of Light",
    level: 2,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 3t",
    effects: [
      {
        kind: "buff",
        duration: 3,
      },
    ],
  },
  {
    id: "hero_skill:p105",
    name: "Hand of Light",
    level: 3,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {buff} 3t",
    effects: [
      {
        kind: "buff",
        duration: 3,
      },
    ],
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
      (entry.hero !== undefined &&
        (card.hero !== entry.hero ||
          card.back_name !== entry.name ||
          card.back_level !== entry.level ||
          card.copies !== 1 ||
          card.effect_lines.length !== 1)) ||
      card.level !== entry.level ||
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
    const previous = annotations.get(entry.id) ?? [];
    if (previous.some((e) => e.lineIndex === entry.lineIndex))
      throw new Error(`状态映射行重复：${entry.id}`);
    annotations.set(entry.id, [...previous, ...effects]);
  }
  return cards.map((card) => {
    const effects = annotations.get(card.id);
    return effects
      ? normalizedHeroSkillCardSchema.parse({ ...card, verified_status_effects: effects })
      : card;
  });
}
