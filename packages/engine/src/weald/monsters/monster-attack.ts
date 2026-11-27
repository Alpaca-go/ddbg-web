import {
  WEALD_MONSTER_ATTACK_RULES,
  wealdMonsterAttackSchema,
} from "../../../../data/src/weald/monsters/monster-rulings";
import type { MonsterEffectPlan } from "../../../../data/src/core/monsters/monster-effects";
import type { HeroSkillCardView, SkillSegment } from "../../core/heroes/hero-skill";
import type { MonsterCardView, MonsterSkillView } from "../../shared/core/monster-skill";
import { compileMonsterEffectPlan } from "../../shared/core/monster-effect-plan";

const icon = (key: string): SkillSegment => ({ type: "icon", icon: { key, naming: "confirmed" } });
const text = (text: string): SkillSegment => ({ type: "text", text });

function effectLines(effects: MonsterEffectPlan["effects"]): SkillSegment[][] | null {
  const lines: SkillSegment[][] = [];
  let lastScope = "";
  for (const effect of effects) {
    const scope = effect.type === "damageBonus" ? "target" : effect.scope;
    if (scope !== lastScope) {
      lines.push(
        scope === "self" ? [icon("self_effects"), text("Self")] : [icon("target_effects")],
      );
      lastScope = scope;
    } else lines[lines.length - 1]!.push(text(","));
    const line = lines[lines.length - 1]!;
    switch (effect.type) {
      case "status":
        if (effect.amount !== undefined) line.push(text(String(effect.amount)));
        line.push(icon(effect.kind), text(`${effect.duration}t`));
        break;
      case "stress":
        line.push(icon("stress"), text(`+${effect.amount}`));
        break;
      case "disease":
        line.push(icon("disease"));
        break;
      case "shuffle":
        line.push(
          icon("shuffle"),
          text(`${effect.direction === "push" ? "Push" : "Pull"}${effect.distance}`),
        );
        break;
      case "damageBonus":
        line.push(icon("damage"), text(`+${effect.amount}vs`), icon("mark"));
        break;
      default:
        return null;
    }
  }
  return lines;
}

export type WealdMonsterAttackReady = {
  readonly status: "ready";
  readonly view: HeroSkillCardView;
  readonly selfLight?: number;
  readonly targetLight?: number;
  readonly wealdSummon?: { readonly cardId: string; readonly count: 1 };
};

/** R-230：逐卡核准规则投影到通用结算器；整卡审阅门不变。 */
export function readWealdMonsterAttack(
  monster: MonsterCardView,
  skill: MonsterSkillView,
): WealdMonsterAttackReady | { readonly status: "refused"; readonly reason: string } {
  const refuse = (reason: string) => ({ status: "refused" as const, reason });
  const parsed = wealdMonsterAttackSchema.safeParse(skill.rules?.wealdAttack);
  if (!parsed.success) return refuse("Weald 技能核准记录与 R-230 不符");
  delete parsed.data.effectSignatures;
  const entry = WEALD_MONSTER_ATTACK_RULES.find(
    (entry) => entry.cardId === monster.id && entry.slot === skill.slot,
  );
  if (!entry || JSON.stringify(parsed.data) !== JSON.stringify(entry))
    return refuse("Weald 技能核准记录与 R-230 不符");
  if (skill.target !== entry.target) return refuse("Weald 技能目标与 R-230 不符");

  const rangeIcon = { key: "range", naming: "confirmed" };
  const view: HeroSkillCardView = {
    id: `${monster.id}:skill${skill.slot}`,
    hero: null,
    verification: monster.verification,
    printed_labels: [
      { label: "Crit", value: entry.crit },
      { label: "Acc", value: entry.acc },
    ],
    unlabeled_numbers: [
      {
        text: String(entry.criticalDamage),
        numeric: entry.criticalDamage,
        anchor: { type: "printed_label", label: "Crit" },
      },
      {
        text: String(entry.damage),
        numeric: entry.damage,
        anchor: { type: "printed_label", label: "Acc" },
      },
      {
        text: String(entry.range),
        numeric: entry.range,
        anchor: { type: "beside_icon", left_icon: rangeIcon, inside_icon: null },
      },
    ],
    stats_line: [
      icon("damage"),
      icon("range"),
      text(String(entry.range)),
      ...Array.from({ length: entry.targets }, () => icon("target_hero")),
    ],
    effect_lines: [],
  };

  const wealdSummon = entry.summon
    ? ({ cardId: entry.summon.cardId, count: 1 as const } as const)
    : undefined;

  if (!entry.effects) {
    return {
      status: "ready",
      view: { ...view, effect_lines: [] },
      ...(wealdSummon ? { wealdSummon } : {}),
    };
  }

  const lines = effectLines(entry.effects);
  if (!lines) return refuse("Weald 技能包含未接入的效果原语（R-230）");

  const lineSignatures = lines.map((line) =>
    line
      .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, ""),
  );
  const compiled = compileMonsterEffectPlan(
    { ...view, effect_lines: lines },
    {
      source: "print_front",
      effects: entry.effects,
      signatures: lineSignatures,
    },
  );
  if (compiled.status === "refused") return compiled;
  return {
    status: "ready",
    view: compiled.view,
    selfLight: compiled.selfLight,
    targetLight: compiled.targetLight,
    ...(wealdSummon ? { wealdSummon } : {}),
  };
}
