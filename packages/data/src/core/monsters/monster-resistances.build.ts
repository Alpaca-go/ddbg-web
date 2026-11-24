import { statusKindSchema } from "../../shared/schema";
import type {
  NormalizedMonsterLargeCard,
  NormalizedMonsterMediumCard,
  StatusKindValue,
} from "../../shared/schema";

const KINDS = statusKindSchema.options;
const NAMED = new Set(["confirmed", "confirmed_rulebook"]);

/** 一张怪物卡的抗性 / 免疫结构化结果；`null` 表示图标还不能结构化。 */
export type MonsterDefence = {
  readonly resistances: readonly StatusKindValue[];
  readonly immunities: readonly StatusKindValue[];
  readonly shuffleResist: boolean;
  readonly shuffleImmune: boolean;
};

export type MonsterResistanceEntry = MonsterDefence & { readonly id: string };

type DefenceIcon = { readonly key: string | null; readonly naming: string };

type MonsterCardWithDefence =
  | Extract<NormalizedMonsterMediumCard, { resistances: readonly unknown[] }>
  | NormalizedMonsterLargeCard;

function readIcons(icons: readonly DefenceIcon[]): {
  readonly kinds: readonly StatusKindValue[];
  readonly shuffle: boolean;
} | null {
  const kinds: StatusKindValue[] = [];
  let shuffle = false;
  for (const icon of icons) {
    if (!NAMED.has(icon.naming)) return null;
    if (icon.key === "shuffle_resist") {
      shuffle = true;
      continue;
    }
    const kind = KINDS.find((entry) => icon.key === entry || icon.key === `${entry}_resist`);
    if (!kind) return null;
    kinds.push(kind);
  }
  return { kinds, shuffle };
}

/**
 * 把已确认的抗性 / 免疫图标读成结构化结果。
 * 任一图标未确认或无法归入状态种类时返回 null；调用方保留 icon fallback，不猜（R-048）。
 */
export function expectedMonsterDefence(card: MonsterCardWithDefence): MonsterDefence | null {
  const resistances = readIcons(card.resistances ?? []);
  const immunities = readIcons(card.immunities ?? []);
  if (!resistances || !immunities) return null;
  return {
    resistances: resistances.kinds,
    immunities: immunities.kinds,
    shuffleResist: resistances.shuffle,
    shuffleImmune: immunities.shuffle,
  };
}

/**
 * 抗性 / 免疫 applier：
 * 把已确认图标冻结成 `rules.resistances` / `rules.immunities` / `rules.shuffleResist` /
 * `rules.shuffleImmune`，并在构建时和 current 图标对表；图标漂移会构建失败。
 */
export function applyMonsterResistances<
  T extends NormalizedMonsterMediumCard | NormalizedMonsterLargeCard,
>(cards: readonly T[], entries: readonly MonsterResistanceEntry[]): T[] {
  const byId = new Map<string, MonsterResistanceEntry>();
  for (const entry of entries) byId.set(entry.id, entry);
  return cards.map((card) => {
    if (!("resistances" in card)) return card;
    const entry = byId.get(card.id);
    if (!entry) return card;
    const expected = expectedMonsterDefence(card as MonsterCardWithDefence);
    if (!expected) throw new Error(`${card.id} 抗性 / 免疫不能结构化（R-048）`);
    if (
      JSON.stringify(entry.resistances) !== JSON.stringify(expected.resistances) ||
      JSON.stringify(entry.immunities) !== JSON.stringify(expected.immunities) ||
      entry.shuffleResist !== expected.shuffleResist ||
      entry.shuffleImmune !== expected.shuffleImmune
    )
      throw new Error(`${card.id} 抗性 / 免疫与已确认图标不符（R-048）`);
    return {
      ...card,
      rules: {
        ...(card.rules ?? {}),
        resistances: [...entry.resistances],
        immunities: [...entry.immunities],
        shuffleResist: entry.shuffleResist,
        shuffleImmune: entry.shuffleImmune,
      },
    };
  });
}
