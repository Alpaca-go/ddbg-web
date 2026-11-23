import { STATUS_KINDS } from "./status";
import type { StatusKind } from "./status";

export type MonsterDefenceIcon = { readonly key: string | null; readonly naming: string };

export type MonsterDefenceCard = {
  readonly rules?:
    | {
        readonly resistances?: readonly string[];
        readonly immunities?: readonly string[];
        readonly shuffleResist?: boolean;
        readonly shuffleImmune?: boolean;
      }
    | undefined;
  readonly resistances?: readonly MonsterDefenceIcon[] | undefined;
  readonly immunities?: readonly MonsterDefenceIcon[] | undefined;
};

function isStatusKind(value: string): value is StatusKind {
  return (STATUS_KINDS as readonly string[]).includes(value);
}

/** 已确认抗性 / 免疫图标 → 状态种类。未确认或无法归类时返回 null，不猜（R-048）。 */
export function confirmedStatusKinds(
  icons: readonly MonsterDefenceIcon[] | undefined,
): readonly StatusKind[] | null {
  if (!icons) return null;
  const kinds: StatusKind[] = [];
  for (const icon of icons) {
    if (icon.key === "shuffle_resist") {
      if (icon.naming !== "confirmed" && icon.naming !== "confirmed_rulebook") return null;
      continue;
    }
    const kind = STATUS_KINDS.find((entry) => icon.key === entry || icon.key === `${entry}_resist`);
    if (!kind || (icon.naming !== "confirmed" && icon.naming !== "confirmed_rulebook")) return null;
    kinds.push(kind);
  }
  return kinds;
}

function annotatedKinds(values: readonly string[] | undefined): readonly StatusKind[] | null {
  if (values === undefined) return null;
  return values.every(isStatusKind) ? (values as readonly StatusKind[]) : null;
}

/** 优先读 `rules.resistances`；未注解的卡回退到已确认图标。 */
export function monsterStatusResistances(card: MonsterDefenceCard): readonly StatusKind[] | null {
  return annotatedKinds(card.rules?.resistances) ?? confirmedStatusKinds(card.resistances);
}

export function monsterStatusImmunities(card: MonsterDefenceCard): readonly StatusKind[] | null {
  return annotatedKinds(card.rules?.immunities) ?? confirmedStatusKinds(card.immunities);
}

/** 即时位移防御；与持久状态堆分开。 */
export function monsterShuffleResist(card: MonsterDefenceCard): boolean {
  return (
    card.rules?.shuffleResist ??
    Boolean(card.resistances?.some((icon) => icon.key === "shuffle_resist"))
  );
}

export function monsterShuffleImmune(card: MonsterDefenceCard): boolean {
  return (
    card.rules?.shuffleImmune ??
    Boolean(card.immunities?.some((icon) => icon.key === "shuffle_resist"))
  );
}
