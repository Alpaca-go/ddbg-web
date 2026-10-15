import { readMonsterAttackView } from "./monster-skill";
import type { MonsterCardView } from "./monster-skill";
import { readVerifiedStatusEffects } from "./skill-status";
import type { StatusEffect } from "./status";

/** R19–20/R24：无Acc纯自身正面状态不掷攻击骰，不虚构英雄目标或射程。 */
export function readMonsterSelfStatuses(
  card: MonsterCardView,
  slot: number,
):
  | { status: "notSelf" }
  | { status: "refused"; reason: string }
  | { status: "ready"; effects: readonly StatusEffect[] } {
  const matches = card.skills.filter((s) => s.slot === slot);
  const skill = matches[0];
  const refuse = (reason: string) => ({ status: "refused" as const, reason });
  if (matches.length !== 1 || !skill) return refuse("怪物技能编号不唯一");
  if (skill.target !== "Self") return { status: "notSelf" };
  if (
    card.verification.unverified ||
    !Number.isSafeInteger(card.life) ||
    card.life < 1 ||
    !skill.name ||
    skill.printed_labels.length ||
    skill.unlabeled_numbers.length ||
    !skill.verified_monster_effects?.effects.length ||
    skill.verified_monster_effects.effects.some(
      (e) =>
        e.type !== "status" || e.scope !== "self" || !["buff", "guard", "riposte"].includes(e.kind),
    )
  )
    return refuse("纯自身技能需要已核实的无Acc正面状态完整效果（R-048）");
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
  if (
    !effects.self.length ||
    effects.lineCount !== compiled.view.effect_lines.length ||
    effects.target.length
  )
    return refuse("纯自身技能效果未全部消费（R-048）");
  return { status: "ready", effects: effects.self };
}
