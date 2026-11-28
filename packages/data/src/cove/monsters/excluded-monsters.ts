/** 未纳入 I 级普通可审目录的 Cove 怪物；仅登记身份与排除依据，不授予牌堆或战斗运行时。 */
export const COVE_MONSTER_CATALOG_EXCLUSIONS = [
  {
    id: "monster_medium:cove:p018",
    name: "Uca Major",
    category: "monster_medium",
    reason: "印刷等级 II 的大型怪物参考卡（card_kind=large_monster_reference），非 I 级普通",
  },
  {
    id: "monster_medium:cove:p020",
    name: "Squiffy Ghast",
    category: "monster_medium",
    reason: "印刷等级 III，高等级普通怪；本刀不推算 II/III 牌堆",
  },
  {
    id: "monster_medium:cove:p023",
    name: "Shambler Tentacle",
    category: "monster_medium",
    reason: "Shambler Boss 专属召唤物（Eldritch - Small），非随机遭遇 I 级普通",
  },
  {
    id: "monster_medium:cove:p025",
    name: "Shambler Tentacle",
    category: "monster_medium",
    reason: "Shambler 召唤物 II 级；Boss 专属，非 I 级普通池",
  },
  {
    id: "monster_medium:cove:p027",
    name: "Shambler Tentacle",
    category: "monster_medium",
    reason: "Shambler 召唤物 III 级；Boss 专属，非 I 级普通池",
  },
  {
    id: "monster_medium:cove:p029",
    name: "Drowned Anchorman",
    category: "monster_medium",
    reason: "Drowned Crew Boss 专属召唤物（Unholy - Small），非 I 级普通",
  },
  {
    id: "monster_medium:cove:p030",
    name: "Drowned Anchorman",
    category: "monster_medium",
    reason: "Drowned Crew 召唤物 II 级；Boss 专属",
  },
  {
    id: "monster_medium:cove:p031",
    name: "Drowned Anchorman",
    category: "monster_medium",
    reason: "Drowned Crew 召唤物 III 级；Boss 专属",
  },
  {
    id: "monster_large:cove:p001",
    name: "Uca Major",
    category: "monster_large",
    reason: "印刷等级 II 大型战斗卡；非 I 级普通",
  },
  {
    id: "monster_large:cove:p002",
    name: "Uca Major",
    category: "monster_large",
    reason: "印刷等级 II 大型战斗卡副本；非 I 级普通",
  },
  {
    id: "monster_large:cove:p003",
    name: "Shambler",
    category: "monster_large",
    reason: "Shambler Boss I；Boss 专属刀，不进 I 级普通目录",
  },
  {
    id: "monster_large:cove:p004",
    name: "Shambler",
    category: "monster_large",
    reason: "Shambler Boss II",
  },
  {
    id: "monster_large:cove:p005",
    name: "Shambler",
    category: "monster_large",
    reason: "Shambler Boss III",
  },
  {
    id: "monster_large:cove:p006",
    name: "Siren",
    category: "monster_large",
    reason: "Siren Boss I；Boss 专属刀，不进 I 级普通目录",
  },
  {
    id: "monster_large:cove:p007",
    name: "Siren",
    category: "monster_large",
    reason: "Siren Boss II",
  },
  {
    id: "monster_large:cove:p008",
    name: "Siren",
    category: "monster_large",
    reason: "Siren Boss III",
  },
  {
    id: "monster_large:cove:p009",
    name: "Drowned Crew",
    category: "monster_large",
    reason: "Drowned Crew Boss I",
  },
  {
    id: "monster_large:cove:p010",
    name: "Drowned Crew",
    category: "monster_large",
    reason: "Drowned Crew Boss II",
  },
  {
    id: "monster_large:cove:p011",
    name: "Drowned Crew",
    category: "monster_large",
    reason: "Drowned Crew Boss III",
  },
] as const;

export type CoveMonsterCatalogExclusion = (typeof COVE_MONSTER_CATALOG_EXCLUSIONS)[number];
