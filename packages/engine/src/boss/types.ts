import type { BasicQuestId } from "../../../data/src/basic-quests";

/** 引擎内 Boss 脚本标识；与印刷 monster id 分离，避免未核实卡面硬编码。 */
export type BossScriptId = `boss:${string}`;

/** Boss 战与普通遭遇的差异（规则书 §14、R-044）。 */
export type BossBattleRules = {
  /** false = Boss 战不计轮数、不触发第 4 轮撤退。 */
  readonly countsRounds: boolean;
  /** false = Boss 任务战斗不可逃跑（待 encounter 接线）。 */
  readonly allowsRetreat: boolean;
  /** true = 英雄全灭可能触发战役失败（R-044）；运行时未接。 */
  readonly campaignFailOnPartyWipe: boolean;
};

export type BossScriptHooks = {
  /** Boss Abilities 威胁面 · 地牢侧（R11、R35）。 */
  readonly threatPassiveDungeon?: BossHookHandler<BossThreatPassiveContext, BossHookStubResult>;
  /** Boss Abilities 威胁面 · 村庄侧；升幕 / Imminent Threat hold。 */
  readonly threatPassiveHamlet?: BossHookHandler<BossThreatPassiveContext, BossHookStubResult>;
  /** Face the Threat / Boss 任务出征或进幕（p019 等）。 */
  readonly faceTheThreatEmbark?: BossHookHandler<BossFaceTheThreatContext, BossHookStubResult>;
  /** R36 / R-121：目标 + 2 随机非目标入 Boss 三格；布置 hold。 */
  readonly bossSlotPlacement?: BossHookHandler<BossSlotPlacementContext, BossHookStubResult>;
  /** 本怪物回合行动次数（G-05 多行动）；默认 1，完整 AI 未接。 */
  readonly monsterTurnActionCount?: BossHookHandler<
    BossMonsterTurnContext,
    BossHookOk<number> | BossHookStubResult
  >;
  /** R31 / R11 召唤；姿态轨、先攻等 hold。 */
  readonly summon?: BossHookHandler<BossSummonContext, BossHookStubResult>;
};

export type BossScriptDefinition = {
  readonly id: BossScriptId;
  readonly displayName: string;
  readonly rules: BossBattleRules;
  readonly hooks: BossScriptHooks;
  /** 可选：关联任务卡；完整映射待 Kyries 确认。 */
  readonly questIds?: readonly BasicQuestId[];
  readonly notes?: string;
};

export type BossHookHandler<C, R> = (context: C) => R;

export type BossHookStubResult = {
  readonly status: "stub";
  readonly message: string;
  /** 标明 hold 归属，例如「归任务卡」「R-121」。 */
  readonly hold?: string;
};

export type BossHookOk<T> = { readonly status: "ok"; readonly value: T };

export type BossThreatPassiveContext = {
  readonly scriptId: BossScriptId;
  readonly side: "dungeon" | "hamlet";
};

export type BossFaceTheThreatContext = {
  readonly scriptId: BossScriptId;
  readonly questId: BasicQuestId;
};

export type BossSlotPlacementContext = {
  readonly scriptId: BossScriptId;
  readonly layoutId: string;
  readonly bossSlotNodeIds: readonly string[];
};

export type BossMonsterTurnContext = {
  readonly scriptId: BossScriptId;
  readonly monsterEntityId: string;
  readonly round: number;
};

export type BossSummonContext = {
  readonly scriptId: BossScriptId;
  readonly skillSlot: number;
};

export type BossHookName = keyof BossScriptHooks;
