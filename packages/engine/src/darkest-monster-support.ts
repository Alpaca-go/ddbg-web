import { readMonsterAttackView, type MonsterCardView } from "./monster-skill";
import { readPrintedRange } from "./hero-skill";
import type { StatusEffect } from "./status";

/** R20–24：手选友方目标的最小纯结算；不执行 AI、移动或回合推进，不消耗骰。 */
export function resolveDarkestMonsterSupport(
  card: MonsterCardView,
  slot: number,
  context: {
    readonly targetSide: "hero" | "monster";
    readonly targetWounds: number;
    readonly areaDistance: number;
    readonly targetAreaLower?: boolean;
    readonly actorShuffleResist?: boolean;
  },
):
  | { readonly status: "refused"; readonly reason: string }
  | {
      readonly status: "resolved";
      readonly targetWounds: number;
      readonly targetStatusEffects: readonly StatusEffect[];
      readonly actorShuffle: {
        readonly direction: "push" | "pull";
        readonly distance: number;
      } | null;
    } {
  const refuse = (reason: string) => ({ status: "refused" as const, reason });
  const skill = card.skills.find((s) => s.slot === slot);
  if (
    !skill ||
    card.verification.unverified ||
    context.targetSide !== "monster" ||
    !Number.isSafeInteger(context.targetWounds) ||
    context.targetWounds < 0 ||
    !Number.isSafeInteger(context.areaDistance) ||
    context.areaDistance < 0
  )
    return refuse("需要已验证的怪物友方技能、目标伤口与距离（R-048）");
  const attack = readMonsterAttackView(card, slot);
  if (attack.status === "refused") return attack;
  if (
    skill.printed_labels.length ||
    !attack.view.stats_line?.some(
      (s) => s.type === "icon" && s.icon.key === "target_monster" && s.icon.naming === "confirmed",
    )
  )
    return refuse("仅无 Acc 的已确认怪物友方技能（R-048）");
  const range = readPrintedRange(attack.view);
  if (
    range.kind !== "exact" ||
    context.areaDistance > range.distance + Number(context.targetAreaLower === true)
  )
    return refuse("友方目标不在印刷射程内（R24）");
  const plan = skill.verified_monster_effects;
  if (!plan) return refuse("缺少已核实的友方效果计划（R-048）");
  let wounds = context.targetWounds;
  const statuses: StatusEffect[] = [];
  let actorShuffle: { direction: "push" | "pull"; distance: number } | null = null;
  for (const effect of plan.effects) {
    if (effect.type === "heal" && effect.scope === "target")
      wounds = Math.max(0, wounds - effect.amount);
    else if (effect.type === "status" && effect.scope === "target" && effect.kind === "buff")
      statuses.push({ kind: "buff", duration: effect.duration });
    else if (effect.type === "shuffle" && effect.scope === "self" && !actorShuffle)
      actorShuffle = {
        direction: effect.direction,
        distance: Math.max(0, effect.distance - Number(context.actorShuffleResist === true)),
      };
    else return refuse("友方计划含未接原语，整次拒绝（R-048）");
  }
  return { status: "resolved", targetWounds: wounds, targetStatusEffects: statuses, actorShuffle };
}
