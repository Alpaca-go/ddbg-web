import { readWealdCroneProfile } from "../../../../data/src/weald-crone";
import type { DungeonBattleCatalog } from "../../dungeon";
import type { MonsterSkillView } from "../../monster-skill";
import type { SkillSegment } from "../../hero-skill";
import type { MonsterEffectPlan } from "../../../../data/src/monster-effects";

export const CRONE_CARD_ID = "monster_medium:weald:p015";
const icon = (key: string): SkillSegment => ({ type: "icon", icon: { key, naming: "confirmed" } });
const text = (text: string): SkillSegment => ({ type: "text", text });

/** R-253：任务例外独立目录，不扩充随机怪物池。 */
export function buildWealdCroneCatalog(): DungeonBattleCatalog["monsters"][number] {
  const card = readWealdCroneProfile();
  const skill = (
    slot: number,
    name: string,
    target: string,
    range: number,
    targets: number,
    damage: readonly [number, number, number, number] | null,
    effect_lines: SkillSegment[][],
    effects: MonsterEffectPlan["effects"],
  ): MonsterSkillView => {
    const stats = [
      ...(damage ? [icon("damage")] : []),
      icon("range"),
      text(String(range)),
      ...Array.from({ length: targets }, () => icon("target_hero")),
    ];
    return {
      slot,
      name,
      target,
      printed_labels: damage
        ? [
            { label: "Crit", value: damage[0] },
            { label: "Acc", value: damage[2] },
          ]
        : [],
      unlabeled_numbers: [
        ...(damage
          ? [
              {
                text: String(damage[1]),
                numeric: damage[1],
                anchor: { type: "printed_label" as const, label: "Crit" },
              },
              {
                text: String(damage[3]),
                numeric: damage[3],
                anchor: { type: "printed_label" as const, label: "Acc" },
              },
            ]
          : []),
        {
          text: String(range),
          numeric: range,
          anchor: {
            type: "beside_icon",
            left_icon: { key: "range", naming: "confirmed" },
            inside_icon: null,
          },
        },
      ],
      lines: [stats, ...effect_lines],
      effect_lines,
      verified_monster_effects: {
        source: "print_front",
        signatures: effect_lines.map((line) =>
          line
            .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
            .join("")
            .replace(/\s+/g, ""),
        ),
        effects,
      },
    };
  };
  return {
    ...card,
    verification: { unverified: false },
    resistances: card.resistances.map((key) => ({ key: `${key}_resist`, naming: "confirmed" })),
    skills: [
      skill(
        1,
        "Curse of Vulnerability",
        "Crowded",
        2,
        2,
        [1, 4, 9, 2],
        [[icon("target_effects"), icon("mark"), text("2t,"), icon("debuff"), text("2t")]],
        [
          { type: "status", scope: "target", kind: "mark", duration: 2 },
          { type: "status", scope: "target", kind: "debuff", duration: 2 },
        ],
      ),
      skill(
        2,
        "Fetid Censer",
        "Closest",
        0,
        1,
        [1, 6, 9, 3],
        [
          [
            icon("target_effects"),
            text("3"),
            icon("blight"),
            text("2t,"),
            icon("stress"),
            text("+1,"),
            icon("disease"),
          ],
        ],
        [
          { type: "status", scope: "target", kind: "blight", amount: 3, duration: 2 },
          { type: "stress", scope: "target", amount: 1 },
          { type: "disease", scope: "target" },
        ],
      ),
      // R-253：全局光照以 self scope 每次技能执行一次；不伪造 Acc／伤害。
      skill(
        3,
        "Embrace the Dark",
        "Crowded",
        2,
        2,
        null,
        [
          [icon("target_effects"), icon("stress"), text("+1")],
          [icon("self_effects"), text("Self"), icon("light"), text("-1")],
        ],
        [
          { type: "stress", scope: "target", amount: 1 },
          { type: "light", scope: "self", amount: -1 },
        ],
      ),
    ],
  };
}
