/**
 * R-036 / R37：Stygian 下「所有 Boss 的技能 +1 Crit」。
 * Boss = 有自己 Boss Abilities 卡的角色；不含 Reflections、Pyre、Collected、召唤物等。
 * 这里直接写已核实的正式卡 id，避免 import 运行时模块造成循环依赖。
 */
export const STYGIAN_BOSS_CARD_IDS: ReadonlySet<string> = new Set<string>([
  // Ruins 四 Boss I–III：Necromancer / Prophet / Collector / Fanatic
  "monster_medium:p089",
  "monster_medium:p090",
  "monster_medium:p091",
  "monster_large:p005",
  "monster_large:p006",
  "monster_large:p007",
  "monster_medium:p092",
  "monster_medium:p093",
  "monster_medium:p094",
  "monster_large:p008",
  "monster_large:p009",
  "monster_large:p010",
  // 最暗中途 Boss 与最终战形态（不含 Reflections / Pyre / Collected / 召唤物）
  "monster_large:p014",
  "monster_large:p015",
  "monster_large:p016",
  "monster_large:p017",
  "monster_medium:p104",
  "monster_medium:p105",
  "monster_large:p018",
  "monster_large:p019",
  "monster_large:p020",
]);

export function stygianBossCritApplies(
  mode: string | undefined,
  cardId: string | undefined,
): boolean {
  return mode === "stygian" && cardId !== undefined && STYGIAN_BOSS_CARD_IDS.has(cardId);
}
