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

/** R-212，印刷正反面 p211–231。保留来源转录，按选用卡面投影。 */
export function projectAbominationSkill(
  skill: HeroSkillCardView,
  face: "front" | "back",
): HeroSkillCardView | null {
  const page = Number(skill.id.slice(-3));
  const expected = signatures[page];
  if (!expected || skill.id !== `hero_skill:p${page}`) return null;
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
  const lines: SkillSegment[][] = [];
  if (page <= 216) return { ...skill, verified_required_form: "human" };
  let selfStress: { lineIndex: number; amount: number; source: "print_front" } | undefined;
  const statuses: NonNullable<HeroSkillCardView["verified_status_effects"]>[number][] = [];
  const status = (
    scope: "self" | "target",
    kind: "buff" | "debuff",
    duration: number,
    suffix = "",
  ) => {
    const index = lines.length;
    const segments = line(
      `{${scope === "self" ? "self_effects" : "target_effects"}}${scope === "self" ? " Self" : ""} {${kind}} ${duration}t${suffix}`,
    );
    lines.push(segments);
    statuses.push({
      lineIndex: index,
      segmentIndex: segments.findIndex((s) => s.type === "icon" && s.icon.key === kind),
      scope,
      kind,
      duration,
    });
  };
  const stress = (amount: number) => {
    selfStress = { lineIndex: lines.length, amount, source: "print_front" };
    lines.push(line(`{self_effects} Self {stress} ${amount > 0 ? "+" : ""}${amount}`));
  };
  if (page >= 217 && page <= 219)
    return { ...skill, verified_self_range: true, verified_required_form: "human" };
  if (transform) {
    const human = face === "back";
    lines.push(
      line("{range} Self"),
      line(`{self_effects} Self Change: ${human ? "Human" : "Beast"}`),
    );
    const healAmount = 2 + level * 2;
    status("self", human ? "debuff" : "buff", human ? 4 - level : level === 1 ? 2 : 3);
    if (human) stress(-1);
    else {
      lines.push(line(`{self_effects} Self {heal} ${healAmount}`));
      if (level === 1) stress(2);
    }
    return {
      ...skill,
      stats_line: null,
      printed_labels: [],
      effect_lines: lines,
      top_row_icons: human
        ? source[0]!.flatMap((s) => (s.type === "icon" ? [s.icon] : []))
        : (skill.top_row_icons ?? []),
      verified_status_effects: statuses,
      verified_self_range: true,
      verified_required_form: human ? "beast" : "human",
      verified_allies_stress: human ? -1 : 2,
      ...(selfStress ? { verified_self_stress: selfStress } : {}),
      ...(!human
        ? {
            verified_self_heal: {
              lineIndex: 3,
              amount: healAmount,
              source: "print_front" as const,
            },
          }
        : {}),
    };
  }
  if (page >= 223 && page <= 225) status("self", "buff", 2);
  const slam = page >= 229;
  if (slam) lines.push(line("{self_effects} Self {shuffle} Pull 1"));
  stress(1);
  if (slam) status("target", "debuff", level === 1 ? 1 : 2, ", {shuffle} Push 2");
  return {
    ...skill,
    effect_lines: lines,
    verified_required_form: "beast",
    verified_self_stress: selfStress!,
    ...(statuses.length ? { verified_status_effects: statuses } : {}),
  };
}
