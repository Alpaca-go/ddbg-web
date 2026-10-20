import { resolveMonsterSkillId, resolveMonsterSkillName } from "./resolve-monster-skill-display";
import type { TabletopHeroState, TabletopState } from "./tabletop-types";

function mockHero(
  partial: Omit<
    TabletopHeroState,
    | "lifeKnown"
    | "stressFace"
    | "trinkets"
    | "isCurrentActor"
    | "dead"
    | "isEmpty"
    | "quirkCount"
    | "diseaseCount"
  > &
    Partial<TabletopHeroState>,
): TabletopHeroState {
  return {
    lifeKnown: true,
    stressFace: null,
    trinkets: [],
    isCurrentActor: false,
    dead: false,
    isEmpty: false,
    quirkCount: 0,
    diseaseCount: 0,
    ...partial,
  };
}

export function createTabletopInitialState(): TabletopState {
  return {
    quest: {
      questCardId: "quest:p001",
      locationLabel: "Ruins",
      questLabel: "Scout Ahead I",
      dungeonLevel: "DL I",
      actLabel: "第 2 幕",
      xpProgress: "1 / 2 XP",
      roomsCleared: 2,
      roomTotal: 8,
      layoutId: "quest_map:p001",
      currentRoomCardId: "room:p006",
    },
    battle: {
      light: 4,
      gold: 1240,
      round: 2,
      actionsRemaining: 1,
      turnActorId: "hero-1",
      initiativeDeckHero: 2,
      initiativeDeckMonster: 3,
      initiativeRevealed: ["monster", "hero"],
    },
    heroes: [
      mockHero({
        id: "hero-0",
        hero: "CRUSADER",
        wounds: 2,
        life: 17,
        stress: 4,
        stance: "defensive",
        areaId: "B",
        heroLevel: 1,
        skillIds: ["hero_skill:p010", "hero_skill:p011", "hero_skill:p012", "hero_skill:p013"],
        statusStacks: [{ kind: "protection", remaining: 2 }],
        trinketSlotCount: 1,
        seat: 1,
        actedThisRound: true,
      }),
      mockHero({
        id: "hero-1",
        hero: "HELLION",
        wounds: 5,
        life: 14,
        stress: 6,
        stance: "aggressive",
        areaId: "C",
        heroLevel: 1,
        skillIds: ["hero_skill:p034", "hero_skill:p035", "hero_skill:p036", "hero_skill:p037"],
        statusStacks: [{ kind: "buff", remaining: 1 }],
        trinketSlotCount: 1,
        seat: 2,
        actedThisRound: false,
        isCurrentActor: true,
      }),
      mockHero({
        id: "hero-2",
        hero: "HIGHWAYMAN",
        wounds: 0,
        life: 12,
        stress: 2,
        stance: "ranged",
        areaId: "H",
        heroLevel: 1,
        skillIds: ["hero_skill:p070", "hero_skill:p071", "hero_skill:p076"],
        statusStacks: [],
        trinketSlotCount: 1,
        seat: 3,
        actedThisRound: false,
      }),
      mockHero({
        id: "hero-3",
        hero: "VESTAL",
        wounds: 3,
        life: 12,
        stress: 1,
        stance: "support",
        areaId: "C",
        heroLevel: 1,
        skillIds: ["hero_skill:p088", "hero_skill:p097", "hero_skill:p098"],
        statusStacks: [{ kind: "mark", remaining: 2 }],
        trinketSlotCount: 1,
        seat: 4,
        actedThisRound: false,
      }),
    ],
    monsters: [
      {
        id: "m0",
        monsterCardId: "monster_medium:p001",
        name: "Bone Soldier",
        wounds: 3,
        life: 9,
        lifeKnown: true,
        areaId: "D",
        stance: "aggressive",
        statusStacks: [{ kind: "mark", remaining: 1 }],
        preparedSkill: {
          skillSlot: 1,
          skillId: resolveMonsterSkillId("monster_medium:p001", 1),
          skillName: resolveMonsterSkillName("monster_medium:p001", 1),
          selectionRoll: 4,
          targetPriority: null,
          targetId: "hero-1",
        },
      },
      {
        id: "m1",
        monsterCardId: "monster_medium:p004",
        name: "Bone Courtier",
        wounds: 0,
        life: 7,
        lifeKnown: true,
        areaId: "F",
        statusStacks: [],
        preparedSkill: null,
      },
    ],
    mapNodes: [
      { id: "n1", label: "入口", explored: true, isCurrent: false, x: 1, y: 3 },
      { id: "n2", label: "走廊", explored: true, isCurrent: false, x: 2, y: 3 },
      { id: "n3", label: "房间 C", explored: true, isCurrent: true, x: 3, y: 2 },
      { id: "n4", label: "?", explored: false, isCurrent: false, x: 4, y: 2 },
      { id: "n5", label: "?", explored: false, isCurrent: false, x: 3, y: 1 },
      { id: "n6", label: "?", explored: false, isCurrent: false, x: 4, y: 1 },
    ],
    logLines: [
      { id: "l1", text: "第 2 轮 · 先攻：英雄 · 回合：HELLION" },
      { id: "l2", text: "（mock）选技能 → 选目标 → 确认后仅展示写死 d10，不做规则结算" },
    ],
    ui: {
      phase: "battle",
      demoPhaseOverride: null,
      engineBridge: { game: null, questSetupActive: false },
      activeHeroId: "hero-1",
      detailTargetId: null,
      detailTargetKind: "hero",
      selectedSkillId: null,
      selectedTargetId: null,
      bottomTab: "skills",
      mockDice: null,
      logOpen: false,
      atmosphereEnabled: true,
      usedSkillIds: [],
    },
  };
}
