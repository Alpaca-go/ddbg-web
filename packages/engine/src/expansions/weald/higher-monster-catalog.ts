import { readWealdHigherMonsters } from "../../../../data/src/weald-higher-monsters";
import type { DungeonBattleCatalog } from "../../dungeon";
import type { SkillSegment } from "../../hero-skill";
import type { MonsterSkillView } from "../../monster-skill";
import { readMonsterAttackView } from "../../monster-skill";
import { buildWealdCroneCatalog } from "./crone-catalog";

const icon = (key: string): SkillSegment => ({ type: "icon", icon: { key, naming: "confirmed" } });
const text = (value: string): SkillSegment => ({ type: "text", text: value });

/** R-263：只读取独立核准字段，不以原始聚类 ID 推定抗性或技能效果。 */
export function buildWealdHigherMonsterCatalog(level: 2 | 3): DungeonBattleCatalog["monsters"] {
  if (level !== 2 && level !== 3) throw new Error("高等级 Weald 目录只支持 II／III");
  const cards = readWealdHigherMonsters()
    .filter((card) => card.level === level)
    .map((card) => {
      const skills: MonsterSkillView[] = card.skills.map((skill) => {
        const effect_lines = skill.plan.signatures.map((signature) =>
          signature
            .split(/(\{[a-z_]+\})/)
            .filter(Boolean)
            .map((part) => (part.startsWith("{") ? icon(part.slice(1, -1)) : text(part))),
        );
        return {
          slot: skill.slot,
          name: skill.name,
          target: skill.target,
          printed_labels: [
            { label: "Crit", value: skill.damage[0] },
            { label: "Acc", value: skill.damage[2] },
          ],
          unlabeled_numbers: [
            { numeric: skill.damage[1], anchor: { type: "printed_label", label: "Crit" } },
            { numeric: skill.damage[3], anchor: { type: "printed_label", label: "Acc" } },
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
              ...Array.from({ length: skill.targets }, () => icon("target_hero")),
            ],
            ...effect_lines,
          ],
          effect_lines,
          verified_monster_effects: skill.plan,
          rules: { effects: skill.plan },
        };
      });
      const monster = {
        id: card.id,
        name: card.name,
        level: card.level,
        life: card.life,
        dodge: card.dodge,
        speed: card.speed,
        stanceSlots: card.stanceSlots,
        type_position_tags: card.type_position_tags,
        stanceGroups: card.stanceGroups,
        resistances: card.resistances.map((key) => ({ key: `${key}_resist`, naming: "confirmed" })),
        immunities: card.immunities.map((key) => ({ key: `${key}_resist`, naming: "confirmed" })),
        verification: { unverified: false },
        skills,
      };
      for (const skill of skills) {
        const attack = readMonsterAttackView(monster, skill.slot);
        if (attack.status === "refused") throw new Error(`R-263 技能投影失败：${attack.reason}`);
      }
      return monster;
    });
  return level === 2 ? [buildWealdCroneCatalog(), ...cards] : cards;
}
