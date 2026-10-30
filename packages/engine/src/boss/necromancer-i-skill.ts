import type { HeroSkillCardView } from "../hero-skill";
import { NECROMANCER_I_COMBAT_MONSTER_CARD_ID } from "./necromancer-i";
import { NECROMANCER_II_COMBAT_MONSTER_CARD_ID } from "./necromancer-ii";
import { NECROMANCER_III_COMBAT_MONSTER_CARD_ID } from "./necromancer-iii";

/** 逐卡匹配独立核实的 p089 / p090 / p091 整行，召唤由收尾钩子执行。 */
export function readNecromancerISkillEffects(view: HeroSkillCardView): HeroSkillCardView | null {
  const cardId = [
    NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
    NECROMANCER_II_COMBAT_MONSTER_CARD_ID,
    NECROMANCER_III_COMBAT_MONSTER_CARD_ID,
  ].find((id) => [1, 2, 3].some((slot) => view.id === `${id}:skill${slot}`));
  if (!cardId) return null;
  const isII = cardId === NECROMANCER_II_COMBAT_MONSTER_CARD_ID;
  const isIII = cardId === NECROMANCER_III_COMBAT_MONSTER_CARD_ID;
  const pressureOnly = view.id === `${cardId}:skill3`;
  if (view.verification.unverified || view.effect_lines.length !== (pressureOnly ? 2 : 1))
    return null;
  const line = view.effect_lines[0]!;
  const signature = line
    .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
    .join("")
    .replace(/\s/g, "");
  if (
    signature !==
      `{self_effects}${(isII || isIII) && view.id.endsWith(":skill2") ? "{self_plate}" : ""}Self{shuffle}Push1{target_effects}{summon}Bone${isIII ? "Spearman" : isII ? "Soldier" : "Rabble"}` ||
    view.effect_lines
      .flat()
      .some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      )
  )
    return null;
  const target = line.findIndex((s) => s.type === "icon" && s.icon.key === "target_effects");
  const self = line
    .slice(0, target)
    .filter((s) => s.type !== "icon" || s.icon.key !== "self_plate");
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
      view.printed_labels[0].value !== (isIII ? 12 : isII ? 11 : 10)
    )
      return null;
    return {
      ...view,
      effect_lines: [self, [line[target]!, ...stress]],
      verified_target_stress: { lineIndex: 1, amount: 2, source: "print_front" },
    };
  }
  return { ...view, effect_lines: [self] };
}
