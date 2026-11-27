import { printSourceIcon } from "../../shared/print-icons";
import type { WealdMonsterAttack } from "./monster-rulings";

const rangeIconId = printSourceIcon(
  "extension/weald/raw/monster_large.json:monster_large:weald:p001:front:12",
);

/** 原始图标 ID 与文本的签名，独立于词典更新，保留顺序和标点。 */
function wealdEffectSignatures(
  lines: readonly (readonly (
    | { readonly type: "text"; readonly text: string }
    | {
        readonly type: "icon";
        readonly icon: { readonly iconId?: string };
      }
  )[])[],
) {
  return lines.map((line) =>
    line
      .map((segment) =>
        segment.type === "text" ? segment.text : `{${segment.icon.iconId ?? "missing"}}`,
      )
      .join("")
      .replace(/\s+/g, ""),
  );
}

type PrintedIcon = { readonly iconId?: string };
type PrintedAttack = {
  readonly name?: string;
  readonly target?: string | null;
  readonly printed_labels: readonly { readonly label: string; readonly value: number | null }[];
  readonly unlabeled_numbers: readonly {
    readonly numeric: number | null;
    readonly anchor:
      | { readonly type: "printed_label"; readonly label: string }
      | {
          readonly type: "beside_icon";
          readonly left_icon: PrintedIcon | null;
          readonly inside_icon: PrintedIcon | null;
        };
  }[];
  readonly effect_lines: Parameters<typeof wealdEffectSignatures>[0];
};

/** R-230：对照已核准的印刷字段；构建和战斗准入共用。 */
export function matchesWealdAttackPrint(skill: PrintedAttack, entry: WealdMonsterAttack): boolean {
  const number = (label: string) =>
    skill.unlabeled_numbers.find(
      (item) => item.anchor.type === "printed_label" && item.anchor.label === label,
    )?.numeric;
  const ranges = skill.unlabeled_numbers.filter(
    (item) =>
      item.anchor.type === "beside_icon" &&
      item.anchor.left_icon?.iconId === rangeIconId &&
      item.anchor.inside_icon === null,
  );
  return (
    skill.name === entry.name &&
    skill.target?.replace(/\s+/g, "") === entry.target.replace(/\s+/g, "") &&
    skill.printed_labels.find((label) => label.label === "Crit")?.value === entry.crit &&
    skill.printed_labels.find((label) => label.label === "Acc")?.value === entry.acc &&
    number("Crit") === entry.criticalDamage &&
    number("Acc") === entry.damage &&
    ranges.length === 1 &&
    ranges[0]?.numeric === entry.range &&
    JSON.stringify(wealdEffectSignatures(skill.effect_lines)) ===
      JSON.stringify(entry.effectSignatures)
  );
}

export function matchesWealdDefencePrint(
  card: { readonly resistances: readonly PrintedIcon[]; readonly immunities: readonly unknown[] },
  profile: { readonly resistanceIcon: string },
): boolean {
  return (
    card.resistances.length === 1 &&
    card.resistances[0]?.iconId === profile.resistanceIcon &&
    card.immunities.length === 0
  );
}
