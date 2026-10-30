/** 当前版独立卡面引用；不按名称或等级回退到其它卡。 */
export const RUINS_COMBAT_LEVELS = {
  necromancer: [
    {
      script: "boss:ruins:necromancer:1",
      card: "monster_medium:p089",
      ability: "boss_ability:p004",
      description: "boss_ability:p001",
      summon: "monster_medium:p040",
    },
    {
      script: "boss:ruins:necromancer:2",
      card: "monster_medium:p090",
      ability: "boss_ability:p005",
      description: "boss_ability:p002",
      summon: "monster_medium:p001",
    },
    {
      script: "boss:ruins:necromancer:3",
      card: "monster_medium:p091",
      ability: "boss_ability:p006",
      description: "boss_ability:p003",
      summon: "monster_medium:p013",
    },
  ],
  prophet: [
    {
      script: "boss:ruins:prophet:1",
      card: "monster_large:p005",
      ability: "boss_ability:p010",
      description: "boss_ability:p007",
    },
    {
      script: "boss:ruins:prophet:2",
      card: "monster_large:p006",
      ability: "boss_ability:p011",
      description: "boss_ability:p008",
    },
    {
      script: "boss:ruins:prophet:3",
      card: "monster_large:p007",
      ability: "boss_ability:p012",
      description: "boss_ability:p009",
    },
  ],
  collector: [
    {
      script: "boss:ruins:collector:1",
      card: "monster_medium:p092",
      ability: "boss_ability:p016",
      description: "boss_ability:p013",
      collected: {
        manAtArms: "monster_medium:p098",
        highwayman: "monster_medium:p095",
        vestal: "monster_medium:p101",
      },
    },
    {
      script: "boss:ruins:collector:2",
      card: "monster_medium:p093",
      ability: "boss_ability:p017",
      description: "boss_ability:p014",
      collected: {
        manAtArms: "monster_medium:p099",
        highwayman: "monster_medium:p096",
        vestal: "monster_medium:p102",
      },
    },
    {
      script: "boss:ruins:collector:3",
      card: "monster_medium:p094",
      ability: "boss_ability:p018",
      description: "boss_ability:p015",
      collected: {
        manAtArms: "monster_medium:p100",
        highwayman: "monster_medium:p097",
        vestal: "monster_medium:p103",
      },
    },
  ],
  fanatic: [
    {
      script: "boss:ruins:fanatic:1",
      card: "monster_large:p008",
      ability: "boss_ability:p022",
      description: "boss_ability:p019",
      pyre: "monster_large:p011",
    },
    {
      script: "boss:ruins:fanatic:2",
      card: "monster_large:p009",
      ability: "boss_ability:p023",
      description: "boss_ability:p020",
      pyre: "monster_large:p012",
    },
    {
      script: "boss:ruins:fanatic:3",
      card: "monster_large:p010",
      ability: "boss_ability:p024",
      description: "boss_ability:p021",
      pyre: "monster_large:p013",
    },
  ],
} as const;
export type RuinsCombatIdentity = keyof typeof RUINS_COMBAT_LEVELS;
export function ruinsCombatForScript<I extends RuinsCombatIdentity>(
  identity: I,
  id: string | undefined,
) {
  return RUINS_COMBAT_LEVELS[identity].find((entry) => entry.script === id) as
    (typeof RUINS_COMBAT_LEVELS)[I][number] | undefined;
}
export function isRuinsCombatCard(identity: RuinsCombatIdentity, id: string | undefined): boolean {
  return RUINS_COMBAT_LEVELS[identity].some((entry) => entry.card === id);
}

export const RUINS_BOSS_CATALOG_CARD_IDS = new Set<string>([
  ...Object.values(RUINS_COMBAT_LEVELS)
    .flat()
    .filter((r) => !r.script.endsWith(":1"))
    .map((r) => r.card),
  ...RUINS_COMBAT_LEVELS.collector.flatMap((r) => Object.values(r.collected)),
  ...RUINS_COMBAT_LEVELS.fanatic.map((r) => r.pyre),
]);
