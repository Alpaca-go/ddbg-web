import type { HeroSkillCardView } from "../hero-skill";
import { NECROMANCER_I_COMBAT_MONSTER_CARD_ID } from "./necromancer-i";

/** C-011/012：精确匹配 p089 整行，拆出既有 Self Push / 目标压力原语，召唤由收尾钩子执行。 */
export function readNecromancerISkillEffects(view: HeroSkillCardView): HeroSkillCardView | null {
  const pressureOnly = view.id === `${NECROMANCER_I_COMBAT_MONSTER_CARD_ID}:skill3`;
  if (![1, 2, 3].some((slot) => view.id === `${NECROMANCER_I_COMBAT_MONSTER_CARD_ID}:skill${slot}`))
    return null;
  if (view.verification.unverified || view.effect_lines.length !== (pressureOnly ? 2 : 1))
    return null;
  const line = view.effect_lines[0]!;
  const signature = line
    .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
    .join("")
    .replace(/\s/g, "");
  if (
    signature !== "{self_effects}Self{shuffle}Push1{target_effects}{summon}BoneRabble" ||
    view.effect_lines
      .flat()
      .some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      )
  )
    return null;
  const target = line.findIndex((s) => s.type === "icon" && s.icon.key === "target_effects");
  if (pressureOnly) {
    const stress = view.effect_lines[1]!;
    if (
      stress
        .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
        .join("")
        .replace(/\s/g, "") !== "{stress}+2"
    )
      return null;
    // 无 Crit / 无伤害；保留 Acc，目标压力复用既有注解，不创建虚拟伤害图标。
    if (
      view.printed_labels.length !== 1 ||
      view.printed_labels[0]?.label !== "Acc" ||
      view.printed_labels[0].value !== 10
    )
      return null;
    return {
      ...view,
      effect_lines: [line.slice(0, target), [line[target]!, ...stress]],
      verified_target_stress: { lineIndex: 1, amount: 2, source: "print_front" },
    };
  }
  return { ...view, effect_lines: [line.slice(0, target)] };
}
