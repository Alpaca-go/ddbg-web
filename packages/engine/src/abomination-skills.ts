import { ABOMINATION_PROJECTIONS } from "../../data/src/normalize/hero-annotations/abomination-projection-data";
import type { HeroSkillCardView, SkillSegment } from "./hero-skill";

const signatures: Record<number, string[]> = {
  211: ["{target_effects} {stun} 1t"],
  212: ["{target_effects} {stun} 1t"],
  213: ["{target_effects} {stun} 1t"],
  214: ["{target_effects} 2 {blight} 2t"],
  215: ["{target_effects} 2 {blight} 3t"],
  216: ["{target_effects} 3 {blight} 3t"],
  217: ["{self_effects} Self {stress} -1"],
  218: ["{self_effects} Self {stress} -1"],
  219: ["{self_effects} Self {stress} -1"],
  223: ["{self_effects} Self {buff} 2t, {stress} +1"],
  224: ["{self_effects} Self {buff} 2t, {stress} +1"],
  225: ["{self_effects} Self {buff} 2t, {stress} +1"],
  226: ["{self_effects} Self {stress} +1"],
  227: ["{self_effects} Self {stress} +1"],
  228: ["{self_effects} Self {stress} +1"],
  229: [
    "{self_effects} Self {shuffle} Pull 1, {stress} +1",
    "{target_effects} {shuffle} Push 2, {debuff} 1t",
  ],
  230: [
    "{self_effects} Self {shuffle} Pull 1, {stress} +1 {target_effects} {shuffle} Push 2, {debuff} 2t",
  ],
  231: [
    "{self_effects} Self {shuffle} Pull 1, {stress} +1 {target_effects} {shuffle} Push 2, {debuff} 2t",
  ],
  220: [
    "{range} All Allies",
    "{self_effects} Self Change: Beast",
    "{target_effects} {stress} +2",
    "{buff}",
    "2t, {heal} 4 , {stress} +2",
  ],
  221: [
    "{range} All Allies",
    "{self_effects} Self Change: Beast",
    "{target_effects} {stress} +2",
    "{buff} 3t, {heal} 6",
  ],
  222: [
    "{range} All Allies",
    "{self_effects} Self Change: Beast",
    "{target_effects} {stress} +2",
    "{buff} 3t, {heal} 8",
  ],
};
const names: Record<number, string> = {
  211: "Manacles",
  212: "Manacles",
  213: "Manacles",
  214: "Beast’s Bile",
  215: "Beast’s Bile",
  216: "Beast’s Bile",
  217: "Absolution",
  218: "Absolution",
  219: "Absolution",
  220: "Transform to Beast",
  221: "Transform to Beast",
  222: "Transform to Beast",
  223: "Rake",
  224: "Rake",
  225: "Rake",
  226: "Rage",
  227: "Rage",
  228: "Rage",
  229: "Slam",
  230: "Slam",
  231: "Slam",
};
const signature = (line: readonly SkillSegment[]) =>
  line
    .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
    .join("")
    .replace(/\s+/g, " ")
    .trim();

/**
 * R-212，印刷正反面 p211–231。规则表在 hero-annotations 的
 * `abomination-projection-data.ts`；这里只做身份 / 签名断言和行、图标的解析。
 */
export function projectAbominationSkill(
  skill: HeroSkillCardView,
  face: "front" | "back",
): HeroSkillCardView | null {
  const page = Number(skill.id.slice(-3));
  const expected = signatures[page];
  if (!expected || skill.id !== `hero_skill:core:h11:p${String(page).padStart(3, "0")}`)
    return null;
  const level = ((page - 211) % 3) + 1;
  const transform = page >= 220 && page <= 222;
  const identity = skill as HeroSkillCardView & { name?: string; level?: number };
  if (
    identity.name !== names[page] ||
    identity.level !== level ||
    skill.hero !== (transform ? null : "ABOMINATION") ||
    skill.verification.unverified ||
    JSON.stringify(skill.effect_lines.map(signature)) !== JSON.stringify(expected)
  )
    throw new Error("Abomination verified card identity/effects changed (R-048)");
  if (face === "back" && !transform) throw new Error("Only Transform has a playable back");
  const source = face === "back" ? skill.back_face_skill?.lines : skill.effect_lines;
  if (
    !source ||
    source
      .flat()
      .some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      )
  )
    throw new Error("Abomination effect icons require verification (R-048)");
  if (transform && face === "back") {
    if (
      skill.back_face_skill?.name !== "Transform to Human" ||
      skill.back_face_skill.level !== identity.level
    )
      throw new Error("Abomination reverse identity changed (R-048)");
    const duration = 4 - level;
    const tail = [
      "{range} All Allies",
      "{self_effects} Self Change: Human",
      "{target_effects} Allies: {stress} -1",
      `{debuff} ${duration}t, {stress} -1`,
    ];
    if (
      JSON.stringify(source.slice(-4).map(signature)) !== JSON.stringify(tail) ||
      !source.some((l) => signature(l) === "{text_plate} Beast Form Only")
    )
      throw new Error("Abomination reverse effects changed (R-048)");
  }
  const row = ABOMINATION_PROJECTIONS.find((entry) => entry.id === skill.id);
  if (!row || row.name !== identity.name || row.level !== level)
    throw new Error("Abomination projection data changed (R-048)");
  const faceRow = face === "front" ? row.front : row.back;
  if (!faceRow) throw new Error("Abomination projection face missing (R-048)");
  const pool = [...source.flat(), ...skill.effect_lines.flat(), ...(skill.stats_line ?? [])];
  const line = (text: string): SkillSegment[] =>
    text
      .split(/(\{[^}]+\})/)
      .filter(Boolean)
      .map((part) => {
        if (!part.startsWith("{")) return { type: "text", text: part };
        const key = part.slice(1, -1),
          found = pool.find((s) => s.type === "icon" && s.icon.key === key);
        if (!found) throw new Error(`Missing verified icon ${key}`);
        return found;
      });
  const self = {
    ...(faceRow.selfRange ? { range: true as const } : {}),
    ...(faceRow.selfStress
      ? { stress: { ...faceRow.selfStress, source: "print_front" as const } }
      : {}),
    ...(faceRow.selfHeal ? { heal: { ...faceRow.selfHeal, source: "print_front" as const } } : {}),
  };
  const rules = {
    ...(faceRow.statuses ? { statuses: faceRow.statuses } : {}),
    ...(Object.keys(self).length ? { self } : {}),
    ...(faceRow.alliesStress !== undefined ? { alliesStress: faceRow.alliesStress } : {}),
  };
  return {
    ...skill,
    rules,
    ...(faceRow.lines ? { effect_lines: faceRow.lines.map(line) } : {}),
    ...(faceRow.statsLine === null ? { stats_line: null } : {}),
    ...(faceRow.printedLabels ? { printed_labels: [] } : {}),
    ...(faceRow.topIcons
      ? {
          top_row_icons: faceRow.topIcons.map((key) => {
            const found = pool.find((s) => s.type === "icon" && s.icon.key === key);
            if (!found || found.type !== "icon") throw new Error(`Missing verified icon ${key}`);
            return found.icon;
          }),
        }
      : {}),
    ...(faceRow.statuses ? { verified_status_effects: faceRow.statuses } : {}),
    ...(faceRow.selfStress
      ? { verified_self_stress: { ...faceRow.selfStress, source: "print_front" as const } }
      : {}),
    ...(faceRow.selfHeal
      ? { verified_self_heal: { ...faceRow.selfHeal, source: "print_front" as const } }
      : {}),
    ...(faceRow.selfRange ? { verified_self_range: true as const } : {}),
    ...(faceRow.alliesStress !== undefined ? { verified_allies_stress: faceRow.alliesStress } : {}),
    ...(faceRow.requiredForm ? { requiredForm: faceRow.requiredForm } : {}),
  };
}
