/** 跨卡复用的印刷来源。词典序号仅区分同名的印刷变体。 */
export const HERO_PRINT_SOURCES = {
  bleed: {
    sourceCardId: "hero_skill:core:h02:p031",
    line: 0,
    segment: 2,
    variantRank: 106,
  },
  blight: {
    sourceCardId: "hero_skill:core:h02:p037",
    line: 1,
    segment: 4,
    variantRank: 162,
  },
  buff: {
    sourceCardId: "hero_skill:core:h02:p037",
    line: 1,
    segment: 6,
    variantRank: 86,
  },
  damage: {
    sourceCardId: "hero_skill:core:h01:p001",
    line: "stats",
    segment: 4,
    variantRank: 1,
  },
  damage_or_heal_combined_marker: {
    sourceCardId: "hero_skill:core:h01:p013",
    line: "stats",
    segment: 4,
  },
  debuff: {
    sourceCardId: "hero_skill:core:h03:p047",
    line: 0,
    segment: 4,
    variantRank: 276,
  },
  heal: {
    sourceCardId: "hero_skill:core:h01:p013",
    line: "stats",
    segment: 6,
    variantRank: 25,
  },
  mark: {
    sourceCardId: "hero_skill:core:h01:p010",
    line: 1,
    segment: 4,
    variantRank: 451,
  },
  protection: {
    sourceCardId: "hero_skill:core:h01:p010",
    line: 1,
    segment: 2,
    variantRank: 181,
  },
  range: {
    sourceCardId: "hero_skill:core:h01:p001",
    line: "stats",
    segment: 0,
  },
  shuffle: {
    sourceCardId: "hero_skill:core:h01:p016",
    line: 0,
    segment: 2,
    variantRank: 55,
  },
  stress: {
    sourceCardId: "hero_skill:core:h01:p019",
    line: 1,
    segment: 6,
    variantRank: 101,
  },
  stun: {
    sourceCardId: "hero_skill:core:h01:p007",
    line: 0,
    segment: 2,
    variantRank: 15,
  },
  target_effects: {
    sourceCardId: "hero_skill:core:h01:p001",
    line: 0,
    segment: 0,
    variantRank: 7,
  },
  target_hero: {
    sourceCardId: "hero_skill:core:h01:p013",
    line: "stats",
    segment: 2,
    variantRank: 3,
  },
  target_monster: {
    sourceCardId: "hero_skill:core:h01:p001",
    line: "stats",
    segment: 2,
    variantRank: 5,
  },
} as const;
