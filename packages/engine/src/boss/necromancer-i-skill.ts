import type { HeroSkillCardView } from "../hero-skill";
import { NECROMANCER_I_COMBAT_MONSTER_CARD_ID } from "./necromancer-i";

/** C-011：只拆解 p089 前两招已核实的完整效果行；选招表与 Six Feet Under 留 C-012。 */
export function readNecromancerISkillEffects(view: HeroSkillCardView): HeroSkillCardView | null {
  if (![1, 2].some((slot) => view.id === `${NECROMANCER_I_COMBAT_MONSTER_CARD_ID}:skill${slot}`))
    return null;
  if (view.verification.unverified || view.effect_lines.length !== 1) return null;
  const line = view.effect_lines[0]!;
  const signature = line
    .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
    .join("")
    .replace(/\s/g, "");
  if (
    signature !== "{self_effects}Self{shuffle}Push1{target_effects}{summon}BoneRabble" ||
    line.some(
      (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
    )
  )
    return null;
  const target = line.findIndex((s) => s.type === "icon" && s.icon.key === "target_effects");
  return { ...view, effect_lines: [line.slice(0, target)] };
}
