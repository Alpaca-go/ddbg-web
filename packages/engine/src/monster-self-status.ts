import { readMonsterAttackView } from "./monster-skill";
import type { MonsterCardView } from "./monster-skill";
import { readVerifiedStatusEffects } from "./skill-status";
import { readSelfHeal } from "./hero-skill";
import type { StatusEffect } from "./status";

/**
 * R19–20/R24：无 Acc 纯自身技能不掷攻击骰，不虚构英雄目标或射程。
 * Q-163：同一路径也承载自身治疗与「Remove Bleed、Blight」；移除按 R21 清空全部堆叠。
 */
export function readMonsterSelfStatuses(
  card: MonsterCardView,
  slot: number,
):
  | { status: "notSelf" }
  | { status: "refused"; reason: string }
  | {
      status: "ready";
      effects: readonly StatusEffect[];
      selfHeal?: number;
      cleanse?: true;
    } {
  const matches = card.skills.filter((s) => s.slot === slot);
  const skill = matches[0];
  const refuse = (reason: string) => ({ status: "refused" as const, reason });
  if (matches.length !== 1 || !skill) return refuse("怪物技能编号不唯一");
  if (skill.target !== "Self") return { status: "notSelf" };
  const plan = skill.verified_monster_effects;
  if (
    card.verification.unverified ||
    !Number.isSafeInteger(card.life) ||
    card.life < 1 ||
    !skill.name ||
    skill.printed_labels.length ||
    skill.unlabeled_numbers.length ||
    !plan?.effects.length ||
    plan.effects.some((effect) =>
      effect.type === "status"
        ? effect.scope !== "self" || !["buff", "guard", "riposte"].includes(effect.kind)
        : effect.type === "heal" || effect.type === "cleanse"
          ? effect.scope !== "self"
          : true,
    )
  )
    return refuse("纯自身技能需要已核实的无Acc自身状态 / 治疗 / Remove完整效果（R-048）");
  const compiled = readMonsterAttackView(card, slot);
  if (compiled.status === "refused") return compiled;
  const header = compiled.view.stats_line ?? [];
  if (
    header.filter((s) => s.type === "icon").length !== 1 ||
    header.some(
      (s) =>
        s.type === "icon" &&
        (s.icon.key !== "skill_number" ||
          !["confirmed", "confirmed_rulebook"].includes(s.icon.naming)),
    ) ||
    header
      .filter((s) => s.type === "text")
      .map((s) => s.text)
      .join("")
      .replace(/\s/g, "") !== `${slot}${skill.name}Self`.replace(/\s/g, "")
  )
    return refuse("纯自身技能头部包含未支持内容，拒绝猜测（R-048）");
  const effects = readVerifiedStatusEffects(compiled.view);
  if (effects.status === "refused") return effects;
  const selfHeal = readSelfHeal(compiled.view);
  if (!effects.self.length && selfHeal.lineCount === 0 && !effects.selfRemove)
    return refuse("纯自身技能没有已核实的自身效果（R-048）");
  // 自身位移 / 光照走攻击结算器，这条路径不接管，保持拒绝而不是静默丢弃。
  if (
    effects.target.length ||
    effects.targetRemove ||
    effects.selfShuffle ||
    effects.targetShuffle ||
    effects.selfLight !== 0 ||
    effects.targetLight !== 0 ||
    effects.lineCount + selfHeal.lineCount !== compiled.view.effect_lines.length
  )
    return refuse("纯自身技能效果未全部消费（R-048）");
  return {
    status: "ready",
    effects: effects.self,
    ...(selfHeal.amount > 0 ? { selfHeal: selfHeal.amount } : {}),
    ...(effects.selfRemove ? { cleanse: true as const } : {}),
  };
}
