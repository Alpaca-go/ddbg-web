import type { MonsterCardView, MonsterSkillView } from "../../../monster-skill";
import type { SkillSegment } from "../../../hero-skill";
import type { MonsterEffectPlan } from "../../../../../data/src/monster-effects";
import { WEALD_SHRIEKER_I_CONTENT as content } from "./shrieker-i-content";

const icon = (key: string): SkillSegment => ({ type: "icon", icon: { key, naming: "confirmed" } });
const text = (text: string): SkillSegment => ({ type: "text", text });

/** R-261：调用方必须明确 Nest 是否在场；不自行解释其替代飞行／治疗能力。 */
export function buildShriekerICombatCatalog(context: {
  readonly nestInPlay: boolean;
  readonly nestFlightApproved?: true;
}): MonsterCardView[] {
  return content.faces.map((face): MonsterCardView => ({
    id: face.rawId,
    life: face.life,
    speed: face.speed,
    dodge: face.dodge,
    type_position_tags: face.types.map(
      (t) => ({ eldritch: "Eldritch", beast: "Beast", large: "Large" })[t],
    ),
    verification: { unverified: false },
    resistances: face.resistances.map((key) => ({ key: `${key}_resist`, naming: "confirmed" })),
    immunities: face.immunities.map((key) => ({ key: `${key}_resist`, naming: "confirmed" })),
    stanceGroups: face.selection.length
      ? [
          {
            stances: ["aggressive", "defensive", "ranged", "support"],
            rollTable: face.selection.map(({ min, max, slot }) => ({ min, max, skill: slot })),
          },
        ]
      : [],
    skills: face.skills.map((skill): MonsterSkillView => {
      const effects: MonsterEffectPlan["effects"] = [];
      const lines: SkillSegment[][] = [];
      let previousScope = "";
      for (const effect of skill.effects) {
        const scope = effect.kind === "selfPull" || effect.kind === "selfPush" ? "self" : "target";
        let tokens: SkillSegment[];
        switch (effect.kind) {
          case "selfPull":
          case "selfPush": {
            if (effect.kind === "selfPush" && context.nestInPlay && context.nestFlightApproved) {
              effects.push({ type: "heal", scope: "self", amount: 2 });
              tokens = [icon("heal"), text("2")];
              break;
            }
            const direction = effect.kind === "selfPull" ? "pull" : "push";
            effects.push({ type: "shuffle", scope: "self", direction, distance: effect.distance });
            tokens = [
              icon("shuffle"),
              text(`${direction === "pull" ? "Pull" : "Push"}${effect.distance}`),
            ];
            break;
          }
          case "bleed":
            effects.push({
              type: "status",
              scope: "target",
              kind: "bleed",
              amount: effect.amount,
              duration: effect.duration,
            });
            tokens = [text(String(effect.amount)), icon("bleed"), text(`${effect.duration}t`)];
            break;
          case "stress":
            effects.push({ type: "stress", scope: "target", amount: effect.amount });
            tokens = [icon("stress"), text(`+${effect.amount}`)];
            break;
          case "debuff":
            effects.push({
              type: "status",
              scope: "target",
              kind: "debuff",
              duration: effect.duration,
            });
            tokens = [icon("debuff"), text(`${effect.duration}t`)];
            break;
          case "disease":
            effects.push({ type: "disease", scope: "target" });
            tokens = [icon("disease")];
            break;
        }
        if (scope === previousScope) lines.at(-1)!.push(text(","), ...tokens);
        else
          lines.push([
            icon(scope === "self" ? "self_effects" : "target_effects"),
            ...(scope === "self" ? [text("Self")] : []),
            ...tokens,
          ]);
        previousScope = scope;
      }
      return {
        ...(skill.slot === 2 && context.nestInPlay && context.nestFlightApproved
          ? { verified_shrieker_flight: true as const }
          : {}),
        slot: skill.slot,
        name: skill.name,
        target: skill.target === "closest" ? "Closest" : "Crowded",
        printed_labels: [
          { label: "Crit", value: skill.crit },
          { label: "Acc", value: skill.accuracy },
        ],
        unlabeled_numbers: [
          { numeric: skill.critDamage, anchor: { type: "printed_label", label: "Crit" } },
          { numeric: skill.damage, anchor: { type: "printed_label", label: "Acc" } },
          {
            numeric: skill.range,
            anchor: {
              type: "beside_icon",
              left_icon: { key: "range", naming: "confirmed" },
              inside_icon: null,
            },
          },
        ],
        lines: [
          [
            icon("damage"),
            icon("range"),
            text(String(skill.range)),
            ...Array.from({ length: skill.maxTargets }, () => icon("target_hero")),
          ],
          ...lines,
        ],
        effect_lines: lines,
        verified_monster_effects: {
          source: "print_front",
          effects,
          signatures: lines.map((line) =>
            line
              .map((segment) => (segment.type === "text" ? segment.text : `{${segment.icon.key}}`))
              .join(""),
          ),
        },
        ...(skill.slot === 2 && context.nestInPlay && !context.nestFlightApproved
          ? { verified_shrieker_nest_flight: true as const }
          : {}),
      };
    }),
  }));
}
