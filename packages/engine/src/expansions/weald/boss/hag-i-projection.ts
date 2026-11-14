import type { BattleEntity } from "../../../battle";
import type { MonsterCardView, MonsterSkillView } from "../../../monster-skill";
import type { SkillSegment } from "../../../hero-skill";
import type { MonsterEffectPlan } from "../../../../../data/src/monster-effects";
import { WEALD_HAG_I_CONTENT, hagIApprovedBattleAreas } from "./hag-i-content";
import {
  HAG_I_COMBAT_MONSTER_CARD_ID,
  HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
  HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
} from "./hag-i";

const icon = (key: string): SkillSegment => ({ type: "icon", icon: { key, naming: "confirmed" } });
const text = (text: string): SkillSegment => ({ type: "text", text });
const ids = {
  hag: HAG_I_COMBAT_MONSTER_CARD_ID,
  empty: HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
  full: HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
};
const stances = ["aggressive", "defensive", "ranged", "support"] as const;

/** R-254 独立运行投影；不加入普通池，不授予正式出征资格。 */
export function buildHagICombatCatalog(): MonsterCardView[] {
  return WEALD_HAG_I_CONTENT.faces.map((face): MonsterCardView => ({
    id: ids[face.role],
    life: face.life,
    speed: face.speed,
    dodge: face.dodge,
    innateProtection: face.innateProtection,
    type_position_tags: face.types.map((t) => (t === "human" ? "Human" : "Large")),
    verification: { unverified: false },
    resistances: face.resistances.map((key) => ({ key: `${key}_resist`, naming: "confirmed" })),
    immunities: face.immunities.map((key) => ({ key: `${key}_resist`, naming: "confirmed" })),
    stanceGroups: face.allStancesSelection.length
      ? [
          {
            stances: [...stances],
            rollTable: face.allStancesSelection.map(({ min, max, slot }) => ({
              min,
              max,
              skill: slot,
            })),
          },
        ]
      : [],
    skills: face.skills.map((skill): MonsterSkillView => {
      const intoPot = skill.effects.some((e) => e.kind === "putInCauldron");
      const effects: MonsterEffectPlan["effects"] = [];
      const effectLines: SkillSegment[][] = [];
      for (const effect of skill.effects) {
        if (effect.kind === "debuff") {
          effects.push({
            type: "status",
            scope: "target",
            kind: "debuff",
            duration: effect.duration,
          });
          effectLines.push([icon("target_effects"), icon("debuff"), text(`${effect.duration}t`)]);
        } else if (effect.kind === "stress") {
          effects.push({ type: "stress", scope: "target", amount: effect.amount });
          const previous = effectLines.at(-1);
          if (previous?.[0]?.type === "icon" && previous[0].icon.key === "target_effects")
            previous.push(text(","), icon("stress"), text(`+${effect.amount}`));
          else
            effectLines.push([icon("target_effects"), icon("stress"), text(`+${effect.amount}`)]);
        } else if (effect.kind === "selfPull") {
          effectLines.push([
            icon("self_effects"),
            text("Self"),
            icon("shuffle"),
            text(`Pull${effect.distance}`),
          ]);
        } else {
          effectLines.push([icon("target_effects"), text("Put in Cauldron")]);
        }
      }
      const labels = [
        ...(skill.crit === null ? [] : [{ label: "Crit", value: skill.crit }]),
        { label: "Acc", value: skill.accuracy },
      ];
      const stats = [
        ...(skill.damage === null ? [] : [icon("damage")]),
        icon("range"),
        text(String(skill.range)),
        ...Array.from({ length: skill.maxTargets }, () => icon("target_hero")),
      ];
      return {
        slot: skill.slot,
        name: skill.name,
        target: { closest: "Closest", crowded: "Crowded", furthest: "Furthest" }[skill.target],
        printed_labels: labels,
        unlabeled_numbers: [
          ...(
            [
              ["Crit", skill.critDamage],
              ["Acc", skill.damage],
            ] as const
          )
            .filter(([, value]) => value !== null)
            .map(([label, value]) => ({
              numeric: value,
              anchor: { type: "printed_label" as const, label },
            })),
          {
            numeric: skill.range,
            anchor: {
              type: "beside_icon",
              left_icon: { key: "range", naming: "confirmed" },
              inside_icon: null,
            },
          },
        ],
        lines: [stats, ...effectLines],
        effect_lines: effectLines,
        ...(intoPot
          ? { verified_hag_into_pot: true }
          : effects.length
            ? {
                verified_monster_effects: {
                  source: "print_front",
                  effects,
                  signatures: effectLines.map((line) =>
                    line.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`)).join(""),
                  ),
                },
              }
            : {}),
      };
    }),
  }));
}

/** W4／R-254：10 号已核准部署数据。英雄交接与正式战役准入由后续入口校验。 */
export function hagIInitialDeployment() {
  const monsters = buildHagICombatCatalog();
  const { setup, tile } = WEALD_HAG_I_CONTENT;
  const entities = (
    [
      ["boss:hag", HAG_I_COMBAT_MONSTER_CARD_ID, setup.hagStance],
      ["boss:hag:cauldron-empty", HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID, setup.cauldronStance],
    ] as const
  ).map(([id, cardId, stance]): BattleEntity => {
    const card = monsters.find((c) => c.id === cardId)!;
    return {
      id,
      side: "monster",
      hero: null,
      monsterCardId: cardId,
      life: card.life,
      dodge: card.dodge!,
      wounds: 0,
      areaId: tile.deployment.monsters[stance],
      stance,
      stanceSlots: 2,
      skillIds: [],
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
      shuffleResist: card.immunities!.some((i) => i.key === "shuffle_resist"),
      innateProtection: card.innateProtection!,
      protection: card.innateProtection!,
    };
  });
  return {
    areas: hagIApprovedBattleAreas(),
    monsterStanceAreas: { ...tile.deployment.monsters },
    monsters,
    entities,
  };
}
