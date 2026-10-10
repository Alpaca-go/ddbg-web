import type { HeroSkillCardView } from "./hero-skill";
import { statusStackProblem } from "./status";
import type { StatusEffect } from "./status";

/** 只消费完整、单一的已核实状态行；混合行保留未支持，不能拆开执行。 */
export function readVerifiedStatusEffects(skill: HeroSkillCardView):
  | { readonly status: "refused"; readonly reason: string }
  | {
      readonly status: "resolved";
      readonly self: readonly StatusEffect[];
      readonly target: readonly StatusEffect[];
      readonly lineCount: number;
    } {
  const self: StatusEffect[] = [];
  const target: StatusEffect[] = [];
  const seen = new Set<number>();
  for (const annotation of skill.verified_status_effects ?? []) {
    const line = skill.effect_lines[annotation.lineIndex];
    const segment = line?.[annotation.segmentIndex];
    const problem = statusStackProblem([
      {
        kind: annotation.kind,
        remaining: annotation.duration,
        ...(annotation.amount === undefined ? {} : { amount: annotation.amount }),
      },
    ]);
    if (
      problem ||
      !line ||
      !Number.isSafeInteger(annotation.lineIndex) ||
      !Number.isSafeInteger(annotation.segmentIndex) ||
      segment?.type !== "icon" ||
      segment.icon.key !== annotation.kind ||
      !["confirmed", "confirmed_rulebook"].includes(segment.icon.naming) ||
      !["self", "target"].includes(annotation.scope)
    )
      return {
        status: "refused",
        reason: problem ?? "状态注解缺值或与已确认图标位置不符（R-048）",
      };
    const following = line[annotation.segmentIndex + 1];
    if (
      following?.type !== "text" ||
      !following.text.trimStart().startsWith(`${annotation.duration}t`) ||
      /^\d/.test(following.text.trimStart().slice(String(annotation.duration).length + 1))
    )
      return { status: "refused", reason: "状态注解持续时间与卡面文字不符" };
    const token = line
      .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, "");
    const prefix = annotation.scope === "self" ? "{self_effects}Self" : "{target_effects}";
    const expected = `${prefix}${annotation.amount ?? ""}{${annotation.kind}}${annotation.duration}t`;
    if (token !== expected) continue;
    if (
      line.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      ) ||
      seen.has(annotation.lineIndex)
    )
      return { status: "refused", reason: "状态行图标未确认或注解重复" };
    seen.add(annotation.lineIndex);
    const effect = {
      kind: annotation.kind,
      duration: annotation.duration,
      ...(annotation.amount === undefined ? {} : { amount: annotation.amount }),
    };
    (annotation.scope === "self" ? self : target).push(effect);
  }
  return { status: "resolved", self, target, lineCount: seen.size };
}
