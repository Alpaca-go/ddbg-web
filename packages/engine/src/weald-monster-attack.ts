import {
  WEALD_MONSTER_ATTACKS,
  WEALD_RANGE_ICON_ID,
  wealdEffectSignatures,
  wealdMonsterAttackSchema,
} from "../../data/src/weald-monster-rulings";
import type { MonsterEffectPlan } from "../../data/src/monster-effects";
import type { HeroSkillCardView, SkillSegment } from "./hero-skill";
import type { MonsterCardView, MonsterSkillView } from "./monster-skill";
import { compileMonsterEffectPlan } from "./monster-effect-plan";

const icon = (key: string): SkillSegment => ({ type: "icon", icon: { key, naming: "confirmed" } });
const text = (text: string): SkillSegment => ({ type: "text", text });
export const WEALD_SUMMON_PENDING_REASON =
  "Weald 召唤部署尚未接入，整招停点，不省略召唤效果（R-230）";
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
        return null; // 不扩张 R-230 到未确认的其他原语。
    }
  }
  return lines;
}

/** R-230：卡面签名与逐卡裁定同时匹配才投影到通用结算器；整卡审阅门不变。 */
export function readWealdMonsterAttack(
  monster: MonsterCardView,
  skill: MonsterSkillView,
):
  | { status: "ready"; view: HeroSkillCardView; selfLight?: number; targetLight?: number }
  | { status: "refused"; reason: string } {
  const refuse = (reason: string) => ({ status: "refused" as const, reason });
  const parsed = wealdMonsterAttackSchema.safeParse(skill.verified_weald_attack);
  const entry = WEALD_MONSTER_ATTACKS.find(
    (entry) => entry.cardId === monster.id && entry.slot === skill.slot,
  );
  if (!parsed.success || !entry || JSON.stringify(parsed.data) !== JSON.stringify(entry))
    return refuse("Weald 技能核准记录与 R-230 不符");
  const number = (label: string) =>
    skill.unlabeled_numbers.find(
      (item) => item.anchor.type === "printed_label" && item.anchor.label === label,
    )?.numeric;
  const ranges = skill.unlabeled_numbers.filter(
    (item) =>
      item.anchor.type === "beside_icon" &&
      item.anchor.left_icon?.iconId === WEALD_RANGE_ICON_ID &&
      item.anchor.inside_icon === null,
  );
  if (
    skill.name !== entry.name ||
    skill.target !== entry.target ||
    skill.printed_labels.find((label) => label.label === "Crit")?.value !== entry.crit ||
    skill.printed_labels.find((label) => label.label === "Acc")?.value !== entry.acc ||
    number("Crit") !== entry.criticalDamage ||
    number("Acc") !== entry.damage ||
    ranges.length !== 1 ||
    ranges[0]?.numeric !== entry.range ||
    JSON.stringify(wealdEffectSignatures(skill.effect_lines)) !==
      JSON.stringify(entry.effectSignatures)
  )
    return refuse("Weald 技能原始卡面与 R-230 不符");
  if (entry.summon) return refuse(WEALD_SUMMON_PENDING_REASON);
  const lines = entry.effects ? effectLines(entry.effects) : [];
  if (!lines) return refuse("Weald 技能包含未接入的效果原语（R-230）");
  const rangeIcon = { key: "range", naming: "confirmed" };
  const view: HeroSkillCardView = {
    id: `${monster.id}:skill${skill.slot}`,
    hero: null,
    verification: monster.verification,
    printed_labels: skill.printed_labels,
    unlabeled_numbers: [
      ...skill.unlabeled_numbers.filter((item) => item.anchor.type === "printed_label"),
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
    effect_lines: lines,
  };
  if (!entry.effects) return { status: "ready", view };
  return compileMonsterEffectPlan(view, {
    source: "print_front",
    effects: entry.effects,
    signatures: lines.map((line) =>
      line
        .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
        .join("")
        .replace(/\s+/g, ""),
    ),
  });
}
