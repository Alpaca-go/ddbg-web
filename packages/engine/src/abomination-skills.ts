import type { HeroSkillCardView, SkillSegment } from "./hero-skill";

const signatures: Record<number, string[]> = {
  212: ["{target_effects} {stun} 1t"],
  213: ["{target_effects} {stun} 1t"],
  215: ["{target_effects} 2 {blight} 3t"],
  216: ["{target_effects} 3 {blight} 3t"],
  218: ["{self_effects} Self {stress} -1"],
  219: ["{self_effects} Self {stress} -1"],
  224: ["{self_effects} Self {buff} 2t, {stress} +1"],
  225: ["{self_effects} Self {buff} 2t, {stress} +1"],
  227: ["{self_effects} Self {stress} +1"],
  228: ["{self_effects} Self {stress} +1"],
  230: [
    "{self_effects} Self {shuffle} Pull 1, {stress} +1 {target_effects} {shuffle} Push 2, {debuff} 2t",
  ],
  231: [
    "{self_effects} Self {shuffle} Pull 1, {stress} +1 {target_effects} {shuffle} Push 2, {debuff} 2t",
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
  212: "Manacles",
  213: "Manacles",
  215: "Beast’s Bile",
  216: "Beast’s Bile",
  218: "Absolution",
  219: "Absolution",
  221: "Transform to Beast",
  222: "Transform to Beast",
  224: "Rake",
  225: "Rake",
  227: "Rage",
  228: "Rage",
  230: "Slam",
  231: "Slam",
};
const signature = (line: readonly SkillSegment[]) =>
  line
    .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
    .join("")
    .replace(/\s+/g, " ")
    .trim();

/** R19–21/R38, current printed FRONT/BACK p218–231. Projection preserves source transcription. */
export function projectAbominationSkill(
  skill: HeroSkillCardView,
  face: "front" | "back",
): HeroSkillCardView | null {
  const page = Number(skill.id.slice(-3));
  const expected = signatures[page];
  if (!expected || skill.id !== `hero_skill:p${page}`) return null;
  const transform = page === 221 || page === 222;
  const identity = skill as HeroSkillCardView & { name?: string; level?: number };
  if (
    identity.name !== names[page] ||
    identity.level !== (page % 3 === 0 ? 3 : 2) ||
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
    const duration = page === 221 ? 2 : 1;
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
  if (page === 218 || page === 219)
    return { ...skill, verified_self_range: true, verified_required_form: "human" };
  if (transform) {
    const human = face === "back";
    lines.push(
      line("{range} Self"),
      line(`{self_effects} Self Change: ${human ? "Human" : "Beast"}`),
    );
    status("self", human ? "debuff" : "buff", human ? (page === 221 ? 2 : 1) : 3);
    if (human) stress(-1);
    else lines.push(line(`{self_effects} Self {heal} ${page === 221 ? 6 : 8}`));
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
      ...(selfStress
        ? { verified_self_stress: selfStress }
        : {
            verified_self_heal: {
              lineIndex: 3,
              amount: page === 221 ? 6 : 8,
              source: "print_front" as const,
            },
          }),
    };
  }
  if (page === 224 || page === 225) status("self", "buff", 2);
  if (page === 230 || page === 231) lines.push(line("{self_effects} Self {shuffle} Pull 1"));
  stress(1);
  if (page === 230 || page === 231) status("target", "debuff", 2, ", {shuffle} Push 2");
  return {
    ...skill,
    effect_lines: lines,
    verified_required_form: "beast",
    verified_self_stress: selfStress!,
    ...(statuses.length ? { verified_status_effects: statuses } : {}),
  };
}
