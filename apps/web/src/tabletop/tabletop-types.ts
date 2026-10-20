import type { SkillStance, StatusStack } from "@ddbg/engine";
import type { TabletopEngineBridge } from "./phase/engine-bridge";
import type { FlowPhaseId } from "./phase/flow-phase";
import type {
  TabletopDetailTargetKind,
  TabletopMonsterPreparedSkill,
} from "./tabletop-detail-types";

/** 与 `BattleEntity` / `SkillActorState` / dungeon hero 字段对齐的 mock 形状（V-14）。 */
export type TabletopHeroTrinketSlot = {
  readonly cardId: string;
  readonly face: "upright" | "inverted";
};

export type TabletopHeroState = {
  readonly id: string;
  /** 对应 `BattleEntity.hero` 职业名 */
  readonly hero: string;
  readonly heroStatId?: string;
  readonly wounds: number;
  readonly life: number;
  /** 引擎未提供 Life 时为 false，UI 显示占位 */
  readonly lifeKnown: boolean;
  /** 0–10，对应 `SkillActorState.stress` / dungeon hero */
  readonly stress: number;
  /** 压力指示物白/红面；引擎无字段时为 null（V-14） */
  readonly stressFace: "white" | "red" | null;
  readonly stance: SkillStance;
  readonly areaId: string;
  readonly heroLevel: number;
  /** 已装备技能 id，对应 `BattleEntity.skillIds` */
  readonly skillIds: readonly string[];
  readonly statusStacks: readonly StatusStack[];
  /** R26：槽数 = 英雄等级 */
  readonly trinketSlotCount: number;
  readonly trinkets: readonly TabletopHeroTrinketSlot[];
  readonly seat: number;
  readonly actedThisRound: boolean;
  readonly isCurrentActor: boolean;
  readonly dead: boolean;
  readonly isEmpty: boolean;
  readonly quirkCount: number;
  readonly diseaseCount: number;
};

export type TabletopMonsterState = {
  readonly id: string;
  readonly monsterCardId: string;
  readonly name: string;
  readonly wounds: number;
  readonly life: number;
  readonly lifeKnown: boolean;
  readonly areaId: string;
  readonly stance?: SkillStance;
  readonly statusStacks: readonly StatusStack[];
  /** 本回合引擎已保存的选招；无选招或未接引擎时为 null */
  readonly preparedSkill: TabletopMonsterPreparedSkill | null;
};

export type TabletopMapNode = {
  readonly id: string;
  readonly label: string;
  readonly explored: boolean;
  readonly isCurrent: boolean;
  /** 网格占位坐标（非引擎 layout 坐标，原型用） */
  readonly x: number;
  readonly y: number;
};

export type TabletopPhase = FlowPhaseId;

export type TabletopBottomTab = "skills" | "items" | "move";

export type TabletopMockDice = {
  readonly kind: "battle-skill-d10";
  readonly value: number;
  readonly label: string;
  readonly isMock: true;
};

export type TabletopUiState = {
  /** mock 默认阶段（无引擎时） */
  readonly phase: TabletopPhase;
  /** 调试抽屉：覆盖阶段以演示五区切换 */
  readonly demoPhaseOverride: TabletopPhase | null;
  readonly engineBridge: TabletopEngineBridge;
  readonly activeHeroId: string;
  readonly detailTargetId: string | null;
  readonly detailTargetKind: TabletopDetailTargetKind;
  readonly selectedSkillId: string | null;
  readonly selectedTargetId: string | null;
  readonly bottomTab: TabletopBottomTab;
  readonly mockDice: TabletopMockDice | null;
  readonly logOpen: boolean;
  readonly atmosphereEnabled: boolean;
  readonly usedSkillIds: readonly string[];
};

export type TabletopBattleMeta = {
  readonly light: number;
  readonly gold: number;
  readonly round: number;
  readonly actionsRemaining: number;
  readonly turnActorId: string;
  readonly initiativeDeckHero: number;
  readonly initiativeDeckMonster: number;
  readonly initiativeRevealed: readonly ("hero" | "monster")[];
};

export type TabletopQuestMeta = {
  readonly questCardId: string;
  readonly locationLabel: string;
  readonly questLabel: string;
  readonly dungeonLevel: string;
  readonly actLabel: string;
  readonly xpProgress: string;
  readonly roomsCleared: number;
  readonly roomTotal: number;
  readonly layoutId: string;
  readonly currentRoomCardId: string;
};

export type TabletopWorldState = {
  readonly quest: TabletopQuestMeta;
  readonly battle: TabletopBattleMeta;
  readonly heroes: readonly TabletopHeroState[];
  readonly monsters: readonly TabletopMonsterState[];
  readonly mapNodes: readonly TabletopMapNode[];
  readonly logLines: readonly { readonly id: string; readonly text: string }[];
};

export type TabletopState = TabletopWorldState & { readonly ui: TabletopUiState };
