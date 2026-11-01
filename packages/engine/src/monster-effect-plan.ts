import { monsterEffectPlanSchema } from "../../data/src/monster-effects";
import type { MonsterEffectPlan } from "../../data/src/monster-effects";
import type { HeroSkillCardView, SkillSegment } from "./hero-skill";

/** 原始整行签名守门，再把复合行拆成既有结算器支持的原语；不修改卡面数据。 */
export function compileMonsterEffectPlan(
  view: HeroSkillCardView,
  input: MonsterEffectPlan,
):
  | { status: "refused"; reason: string }
  | { status: "ready"; view: HeroSkillCardView; selfLight: number; targetLight: number } {
  const refuse = (reason: string) => ({ status: "refused" as const, reason });
  const parsed = monsterEffectPlanSchema.safeParse(input);
  if (!parsed.success) return refuse("怪物效果计划缺值或不合法（R-048）");
  const plan = parsed.data;
  const signatures = view.effect_lines.map((line) =>
    line
      .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, ""),
  );
  if (JSON.stringify(signatures) !== JSON.stringify(plan.signatures))
    return refuse("怪物效果计划与卡面整行不符（R-048）");
  let previousScope = "";
  const plannedSignature = plan.effects
    .map((effect) => {
      const scope = effect.type === "damageBonus" ? "target" : effect.scope;
      const prefix =
        scope === previousScope ? "" : scope === "self" ? "{self_effects}Self" : "{target_effects}";
      previousScope = scope;
      let token: string;
      switch (effect.type) {
        case "status":
          token = `${effect.amount ?? ""}{${effect.kind}}${effect.duration}t`;
          break;
        case "heal":
          token = `{heal}${effect.amount}`;
          break;
        case "stress":
          token = `{stress}+${effect.amount}`;
          break;
        case "light":
          token = `{light}${effect.amount > 0 ? "+" : ""}${effect.amount}`;
          break;
        case "damageBonus":
          token = `{damage}+${effect.amount}vs{mark}`;
          break;
        case "shuffle":
          token = `{shuffle}${effect.direction === "push" ? "Push" : "Pull"}${effect.distance}`;
          break;
        case "disease":
          token = "{disease}";
          break;
      }
      return prefix + token;
    })
    .join("");
  if (
    signatures.length === 0 ||
    signatures
      .join("")
      .replace(/,/g, "")
      .replace(/PitToss/g, "") // Templar Body Slam · boss_ability:p028 几何 B hold，印刷文字仅签名守门
      .replace(/\{summon\}/g, "") // Echoing Disassembly / Necromancer 等 · summon 几何 hold，图标仅签名守门
      .replace(/\{damage_or_heal_combined_marker\}(\d+)\{heal\}/g, "{heal}$1")
      .replace(/\{heal\}(?:\{heal\})?(\d+)(?:\{heal\})?/g, "{heal}$1") !== plannedSignature
  )
    return refuse("怪物原语内容或作用范围与整行卡面不符（R-048）");
  const icons = new Map<string, Extract<SkillSegment, { type: "icon" }>>();
  for (const segment of view.effect_lines.flat()) {
    if (segment.type !== "icon") continue;
    if (!segment.icon.key || !["confirmed", "confirmed_rulebook"].includes(segment.icon.naming))
      return refuse("怪物效果包含未确认图标（R-048）");
    icons.set(segment.icon.key, segment);
  }
  const lines: SkillSegment[][] = [];
  const statuses: NonNullable<HeroSkillCardView["verified_status_effects"]>[number][] = [];
  let stress: HeroSkillCardView["verified_target_stress"];
  let selfHeal: HeroSkillCardView["verified_self_heal"];
  let bonus: HeroSkillCardView["verified_damage_bonus"];
  let selfLight = 0,
    targetLight = 0;
  let disease = false;
  const icon = (key: string): SkillSegment => {
    const found = icons.get(key);
    if (!found) throw new Error(`怪物效果缺少原始已确认图标 ${key}`);
    return found;
  };
  const text = (text: string): SkillSegment => ({ type: "text", text });
  try {
    for (const effect of plan.effects) {
      if (effect.type === "disease") {
        icon("disease");
        disease = true;
        continue;
      }
      if (effect.type === "light") {
        icon("light");
        if (effect.scope === "self") selfLight += effect.amount;
        else targetLight += effect.amount;
        continue;
      }
      const scope = effect.type === "damageBonus" ? "target" : effect.scope;
      const line: SkillSegment[] = [icon(scope === "self" ? "self_effects" : "target_effects")];
      if (scope === "self") line.push(text("Self"));
      const lineIndex = lines.length;
      switch (effect.type) {
        case "heal":
          if (effect.scope === "self") {
            if (selfHeal) return refuse("怪物效果计划重复自身治疗原语");
            selfHeal = { lineIndex, amount: effect.amount, source: "print_front" };
          }
          line.push(icon("heal"), text(String(effect.amount)));
          break;
        case "status": {
          if (effect.amount !== undefined) line.push(text(String(effect.amount)));
          const segmentIndex = line.length;
          line.push(icon(effect.kind), text(`${effect.duration}t`));
          statuses.push({
            kind: effect.kind,
            scope,
            duration: effect.duration,
            lineIndex,
            segmentIndex,
            ...(effect.amount === undefined ? {} : { amount: effect.amount }),
          });
          break;
        }
        case "stress":
          if (stress) return refuse("怪物效果计划重复压力原语");
          line.push(icon("stress"), text(`+${effect.amount}`));
          stress = { lineIndex, amount: effect.amount, source: "print_front" };
          break;
        case "damageBonus":
          if (bonus) return refuse("怪物效果计划重复条件伤害原语");
          line.push(icon("damage"), text(`+${effect.amount} vs `), icon("mark"));
          bonus = { lineIndex, amount: effect.amount, condition: "marked", source: "print_front" };
          break;
        case "shuffle":
          line.push(
            icon("shuffle"),
            text(`${effect.direction === "push" ? "Push" : "Pull"} ${effect.distance}`),
          );
          break;
      }
      lines.push(line);
    }
  } catch (error) {
    return refuse(error instanceof Error ? error.message : String(error));
  }
  const {
    verified_target_stress: _stress,
    verified_damage_bonus: _bonus,
    verified_status_effects: _statuses,
    ...base
  } = view;
  void _stress;
  void _bonus;
  void _statuses;
  return {
    status: "ready",
    selfLight,
    targetLight,
    view: {
      ...base,
      effect_lines: lines,
      verified_status_effects: statuses,
      ...(selfHeal ? { verified_self_heal: selfHeal } : {}),
      ...(disease ? { verified_target_disease: true as const } : {}),
      ...(stress ? { verified_target_stress: stress } : {}),
      ...(bonus ? { verified_damage_bonus: bonus } : {}),
    },
  };
}
