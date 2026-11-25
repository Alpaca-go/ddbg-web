import type { WealdPounderContent } from "../../../../data/src/weald/bosses/pounder/weald-pounder";
import type { BattleEntity } from "../../shared/battle/battle";
import type { MonsterCardView, MonsterSkillView } from "../../shared/core/monster-skill";
import type { SkillSegment, SkillStance } from "../../core/heroes/hero-skill";
import {
  WEALD_POUNDER_I_CONTENT as content,
  pounderIApprovedBattleAreas,
} from "./pounder-i-content";

const icon = (key: string): SkillSegment => ({ type: "icon", icon: { key, naming: "confirmed" } });
const text = (value: string): SkillSegment => ({ type: "text", text: value });
const stances = ["aggressive", "defensive", "ranged", "support"] as const;

/** R-258：只投影核准两面；Pounder 不自动选招，Matchman 的触发技能不伪造命中数字。 */
export function buildPounderICombatCatalog(): MonsterCardView[] {
  return projectPounderCombatFaces(content.faces);
}

type WidenNumbers<T> = { [K in keyof T]: T[K] extends number ? number : T[K] };
export type PounderPrintedFace = Omit<
  WealdPounderContent["faces"][number],
  "level" | "rawId" | "skill"
> & { rawId: string; skill: WidenNumbers<WealdPounderContent["faces"][number]["skill"]> };

export function projectPounderCombatFaces(faces: readonly PounderPrintedFace[]): MonsterCardView[] {
  const cannonFace = faces.find((face) => face.role === "pounder");
  if (!cannonFace || cannonFace.role !== "pounder") throw new Error("缺少 Pounder I 核准炮击卡");
  const cannon = cannonFace.skill;
  if (!("maxTargets" in cannon)) throw new Error("Pounder I 炮击字段不完整");
  return faces.map((face): MonsterCardView => {
    const skill = face.skill;
    const pounder = face.role === "pounder";
    const effects: SkillSegment[][] = pounder
      ? [[icon("target_effects"), icon("stress"), text(`+${cannon.onHitStress}`)]]
      : [];
    const range = pounder
      ? { min: cannon.minRange, max: cannon.range, source: "print_front" as const }
      : undefined;
    const plan = pounder
      ? {
          source: "print_front" as const,
          effects: [
            {
              type: "stress" as const,
              scope: "target" as const,
              amount: cannon.onHitStress,
            },
          ],
          signatures: effects.map((line) =>
            line.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`)).join(""),
          ),
        }
      : undefined;
    const projected: MonsterSkillView = {
      slot: skill.slot,
      name: skill.name,
      target: pounder ? "Crowded" : "Pounder",
      ...(pounder && range && plan ? { rules: { range, effects: plan } } : {}),
      printed_labels: pounder
        ? [
            { label: "Crit", value: cannon.crit },
            { label: "Acc", value: cannon.accuracy },
          ]
        : [],
      unlabeled_numbers: [
        ...(pounder
          ? [
              {
                numeric: cannon.critDamage,
                anchor: { type: "printed_label" as const, label: "Crit" },
              },
              {
                numeric: cannon.damage,
                anchor: { type: "printed_label" as const, label: "Acc" },
              },
            ]
          : []),
        {
          numeric: pounder ? null : skill.range,
          ...(pounder ? { text: `${cannon.minRange}-${cannon.range}` } : {}),
          anchor: {
            type: "beside_icon",
            left_icon: { key: "range", naming: "confirmed" },
            inside_icon: null,
          },
        },
      ],
      lines: [
        [
          ...(pounder ? [icon("damage")] : []),
          icon("range"),
          text(pounder ? `${cannon.minRange}-${cannon.range}` : String(skill.range)),
          ...(pounder ? Array.from({ length: cannon.maxTargets }, () => icon("target_hero")) : []),
        ],
        ...effects,
      ],
      effect_lines: effects,
    };
    return {
      id: face.rawId,
      life: face.life,
      speed: face.speed,
      dodge: face.dodge,
      innateProtection: face.innateProtection,
      type_position_tags: face.types.map(() => "Human"),
      verification: { unverified: false },
      resistances: face.resistances.map((key) => ({ key: `${key}_resist`, naming: "confirmed" })),
      immunities: face.immunities.map((key) => ({ key: `${key}_resist`, naming: "confirmed" })),
      stanceGroups: pounder ? [] : [{ stances: [...stances], skill: skill.slot }],
      skills: [projected],
    };
  });
}

/** 供初始部署／后续增援创建专属实体；调用方仍负责空姿态、容量、ID 与牌池守恒。 */
export function createPounderIEntity(
  role: "pounder" | "matchman",
  id: string,
  stance: SkillStance,
): BattleEntity {
  const face = content.faces.find((f) => f.role === role);
  if (!face || !id || !stances.includes(stance))
    throw new Error("Pounder I 实体需要核准角色、ID 和姿态");
  return {
    id,
    side: "monster",
    hero: null,
    monsterCardId: face.rawId,
    life: face.life,
    dodge: face.dodge,
    wounds: 0,
    areaId: content.tile.deployment.monsters[stance],
    stance,
    stanceSlots: 1,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    shuffleResist: face.immunities.some((key) => key === "shuffle"),
    innateProtection: face.innateProtection,
    protection: face.innateProtection,
  };
}

/** W4／R-258：只放 Pounder；不从增援组成预放 Matchman 或 Fusiliers。 */
export function pounderIInitialDeployment() {
  return {
    areas: pounderIApprovedBattleAreas(),
    monsterStanceAreas: { ...content.tile.deployment.monsters },
    monsters: buildPounderICombatCatalog(),
    entities: [createPounderIEntity("pounder", "boss:pounder", content.setup.pounderStance)],
  };
}
