/** 静态原型用 mock 数据，不接引擎。 */

export type TabletopHeroMock = {
  readonly id: string;
  readonly name: string;
  readonly wounds: number;
  readonly life: number;
  readonly stress: number;
  readonly stance: "进攻" | "防御" | "远程" | "支援";
  readonly area: string;
  readonly skillIds: readonly string[];
  readonly statusTokens: readonly { readonly label: string; readonly turns?: number }[];
  readonly trinketSlots: number;
};

export type TabletopLogLine = {
  readonly id: string;
  readonly text: string;
};

export const TABLETOP_MOCK = {
  questCardId: "quest:p001",
  questLabel: "Scout Ahead I · 遗迹",
  dungeonLayoutId: "quest_map:p001",
  currentRoomCardId: "room:p006",
  currentRoomLabel: "Empty · 区域 C",
  light: 4,
  round: 2,
  turnLabel: "HELLION · 剩余 1 行动",
  hamletHint: "村庄（收合）",
  deckStacks: {
    room: { label: "房间牌堆", count: 12, topRoomCardId: "room:p012" },
    corridor: { label: "走廊牌堆", count: 8 },
    monster: { label: "怪物牌堆", count: 14, topMonsterCardId: "monster_medium:p001" },
    loot: { label: "战利品可用堆", count: 7 },
  },
  heroes: [
    {
      id: "hero-0",
      name: "CRUSADER",
      wounds: 2,
      life: 17,
      stress: 4,
      stance: "防御",
      area: "B",
      skillIds: ["hero_skill:p010", "hero_skill:p011", "hero_skill:p012", "hero_skill:p013"],
      statusTokens: [{ label: "防护", turns: 2 }],
      trinketSlots: 1,
    },
    {
      id: "hero-1",
      name: "HELLION",
      wounds: 5,
      life: 14,
      stress: 6,
      stance: "进攻",
      area: "C",
      skillIds: ["hero_skill:p034", "hero_skill:p035", "hero_skill:p036", "hero_skill:p037"],
      statusTokens: [{ label: "增益", turns: 1 }],
      trinketSlots: 1,
    },
    {
      id: "hero-2",
      name: "HIGHWAYMAN",
      wounds: 0,
      life: 12,
      stress: 2,
      stance: "远程",
      area: "H",
      skillIds: ["hero_skill:p070", "hero_skill:p071", "hero_skill:p076"],
      statusTokens: [],
      trinketSlots: 1,
    },
    {
      id: "hero-3",
      name: "VESTAL",
      wounds: 3,
      life: 12,
      stress: 1,
      stance: "支援",
      area: "C",
      skillIds: ["hero_skill:p088", "hero_skill:p097", "hero_skill:p098"],
      statusTokens: [{ label: "标记", turns: 2 }],
      trinketSlots: 1,
    },
  ] as const satisfies readonly TabletopHeroMock[],
  stageMonsters: [
    { id: "m0", cardId: "monster_medium:p001", name: "Bone Soldier", area: "D" },
    { id: "m1", cardId: "monster_medium:p004", name: "Bone Courtier", area: "F" },
  ],
  logLines: [
    { id: "l1", text: "第 2 轮 · 先攻：英雄 · 回合：HELLION" },
    { id: "l2", text: "HELLION · 区域路径：H → C" },
    { id: "l3", text: "Bone Soldier · 技能 1：Graveyard Slash · 未命中" },
    { id: "l4", text: "（原型）日志仅为示意，不接战斗引擎。" },
  ] as const satisfies readonly TabletopLogLine[],
};

export const TABLETOP_ACTIVE_HERO_DEFAULT = 1;
