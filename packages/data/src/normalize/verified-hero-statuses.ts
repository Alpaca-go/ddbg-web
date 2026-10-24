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
  headerSignature?: string;
  scopeLine?: { index: number; signature: string };
  effects: {
    kind: "bleed" | "blight" | "stun" | "buff" | "mark" | "riposte" | "protection" | "debuff";
    duration: number;
    amount?: number;
  }[];
};

// 完整印刷逐页核对：docs/phase2-four-core-skills-2026-10-11.md。
const entries: readonly Entry[] = [
  // 完整FRONT p184：目标 Blight 2·3t；仅 I 级。
  {
    id: "hero_skill:p184",
    hero: "GRAVE ROBBER",
    name: "Poison Dart",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 2 {blight} 3t",
    effects: [{ kind: "blight", amount: 2, duration: 3 }],
  },
  // 完整FRONT p178：无 Acc；射程 Self 行由 selfHeaders 计入，Buff 2t 与 Push 2 同行。
  {
    id: "hero_skill:p178",
    hero: "GRAVE ROBBER",
    name: "Shadow Fade",
    level: 1,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {buff} 2t, {shuffle} Push 2",
    effects: [{ kind: "buff", duration: 2 }],
  },
  // 完整FRONT p187：无 Acc；Buff 与换行 Remove Bleed/Blight 分列，不套 hero 行数闸。
  {
    id: "hero_skill:p187",
    name: "Toxin Trickery",
    level: 1,
    lineIndex: 1,
    scope: "self",
    signature: "{self_effects} Self {buff} 2t,",
    effects: [{ kind: "buff", duration: 2 }],
  },
  // 完整FRONT p145：目标标记/可选位移在第一行，Stun续行不重复印目标标记。
  {
    id: "hero_skill:p145",
    hero: "PLAGUE DOCTOR",
    name: "Disorienting Blast",
    level: 1,
    lineIndex: 1,
    scope: "target",
    scopeLine: { index: 0, signature: "{target_effects} {shuffle} Push 2 or Pull 2" },
    signature: "{stun} 1t",
    effects: [{ kind: "stun", duration: 1 }],
  },
  // 完整FRONT p142：四姿态，无Acc；第一行为射程/目标，第二行为Buff。
  {
    id: "hero_skill:p142",
    hero: "PLAGUE DOCTOR",
    name: "Emboldening Vapours",
    level: 1,
    lineIndex: 1,
    scope: "target",
    headerSignature: "{range} 0 {target_hero}",
    signature: "{target_effects} {buff} 3t",
    effects: [{ kind: "buff", duration: 3 }],
  },
  // 完整FRONT p130/p133，R19–21；双目标共用骰、各自结算状态。
  {
    id: "hero_skill:p130",
    hero: "PLAGUE DOCTOR",
    name: "Plague Grenade",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 3 {blight} 2t",
    effects: [{ kind: "blight", amount: 3, duration: 2 }],
  },
  {
    id: "hero_skill:p133",
    hero: "PLAGUE DOCTOR",
    name: "Blinding Gas",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 1t",
    effects: [{ kind: "stun", duration: 1 }],
  },
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
  // 完整 FRONT p196/p199/p202/p205；仅 Occ I，不向 II/III 外推。
  {
    id: "hero_skill:p196",
    hero: "OCCULTIST",
    name: "Weakening Curse",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {debuff} 2t",
    effects: [{ kind: "debuff", duration: 2 }],
  },
  {
    id: "hero_skill:p199",
    hero: "OCCULTIST",
    name: "Wyrd Reconstruction",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} 1 {bleed} 2t",
    effects: [{ kind: "bleed", amount: 1, duration: 2 }],
  },
  {
    id: "hero_skill:p202",
    hero: "OCCULTIST",
    name: "Vulnerability Hex",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {mark} 2t",
    effects: [{ kind: "mark", duration: 2 }],
  },
  {
    id: "hero_skill:p205",
    hero: "OCCULTIST",
    name: "Hands from the Abyss",
    level: 1,
    lineIndex: 0,
    scope: "target",
    signature: "{target_effects} {stun} 2t, {light} -1",
    effects: [{ kind: "stun", duration: 2 }],
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
  {
    id: "hero_skill:p166",
    name: "Rallying Flare",
    level: 1,
    lineIndex: 1,
    scope: "target",
    signature: "{target_monster} : {debuff} 2t",
    effects: [{ kind: "debuff", duration: 2 }],
  },
  {
    id: "hero_skill:p167",
    name: "Rallying Flare",
    level: 2,
    lineIndex: 1,
    scope: "target",
    signature: "{target_monster} : {debuff} 2t",
    effects: [{ kind: "debuff", duration: 2 }],
  },
  {
    id: "hero_skill:p168",
    name: "Rallying Flare",
    level: 3,
    lineIndex: 1,
    scope: "target",
    signature: "{target_monster} : {debuff} 2t",
    effects: [{ kind: "debuff", duration: 2 }],
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
          card.effect_lines.length !== entry.lineIndex + 1)) ||
      card.level !== entry.level ||
      card.pages.length !== 1 ||
      card.pages[0] !== page ||
      card.verification.unverified
    )
      throw new Error(`状态映射的卡名 / 等级 / 页码 / 验证状态不符：${entry.id}`);
    const line = card.effect_lines[entry.lineIndex];
    if (entry.scopeLine !== undefined) {
      const scopeLine = card.effect_lines[entry.scopeLine.index];
      if (
        !scopeLine ||
        signature(scopeLine) !== entry.scopeLine.signature ||
        scopeLine.some(
          (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
        )
      )
        throw new Error(`状态映射作用域行漂移：${entry.id}`);
    }
    if (entry.headerSignature !== undefined) {
      const header = card.effect_lines[0];
      if (
        !header ||
        signature(header) !== entry.headerSignature ||
        card.stats_line !== null ||
        card.printed_labels.length !== 0 ||
        header.some(
          (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
        )
      )
        throw new Error(`状态映射射程/目标行漂移：${entry.id}`);
    }
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
        ...(entry.scopeLine ? { scopeLineIndex: entry.scopeLine.index } : {}),
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
      ? normalizedHeroSkillCardSchema.parse({
          ...card,
          verified_status_effects: effects,
          ...(entries.some((e) => e.id === card.id && e.headerSignature !== undefined)
            ? { verified_target_header: { lineIndex: 0, source: "print_front" } }
            : {}),
        })
      : card;
  });
}
