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

export type BossThreatPassiveDungeonOk =
  | {
      readonly status: "ok";
      readonly effect: "afterBattleRemoveNonUnholyMonstersPermanently";
      readonly sourceAbilityCardId: string;
      readonly rulesRef: readonly string[];
    }
  | {
      readonly status: "ok";
      readonly effect: "stressOnDungeonEntryPerHero";
      readonly stressDelta: number;
      readonly sourceAbilityCardId: string;
      readonly rulesRef: readonly string[];
    }
  | {
      readonly status: "ok";
      readonly effect: "stressOnHeroProvisionUse";
      readonly stressDelta: number;
      readonly sourceAbilityCardId: string;
      readonly rulesRef: readonly string[];
    }
  | {
      readonly status: "ok";
      readonly effect: "beastMonsterDamageBonus";
      /** Beast 类型怪物造成的伤害修正（印刷卡常为 +2 / +4 / +6）。 */
      readonly damageDelta: number;
      readonly sourceAbilityCardId: string;
      readonly rulesRef: readonly string[];
    }
  | {
      readonly status: "ok";
      readonly effect: "eldritchMonsterDamageBonus";
      /** Eldritch 类型怪物造成的伤害修正（印刷卡常为 +2 / +4 / +6）。 */
      readonly damageDelta: number;
      readonly sourceAbilityCardId: string;
      readonly rulesRef: readonly string[];
    }
  | {
      readonly status: "ok";
      readonly effect: "guardOnLargeMonsterSpawn";
      /** 战斗中 Large 怪物被生成时给予的 Guard 回合数（The Flesh · Big Troubles I 等为 2t）。 */
      readonly guardTurns: number;
      readonly sourceAbilityCardId: string;
      readonly rulesRef: readonly string[];
    }
  | {
      readonly status: "ok";
      readonly effect: "skipCurioDrawInCurioRooms";
      readonly sourceAbilityCardId: string;
      readonly rulesRef: readonly string[];
    };

export type BossThreatPassiveHamletOk =
  | {
      readonly status: "ok";
      readonly effect: "graveyardBlocked";
      readonly blockedBuildings: readonly ["graveyard"];
      readonly sourceAbilityCardId: string;
      readonly rulesRef: readonly string[];
    }
  | {
      readonly status: "ok";
      readonly effect: "tavernStressRecoveryDelta";
      /** 酒馆减压服务有效恢复量的修正（印刷卡常为 −1）。 */
      readonly recoveryDelta: number;
      readonly sourceAbilityCardId: string;
      readonly rulesRef: readonly string[];
    }
  | {
      readonly status: "ok";
      readonly effect: "sanitariumHealLifeDelta";
      /** 疗养院单次治疗有效 Life 修正（印刷卡常为负数）。 */
      readonly healDelta: number;
      readonly sourceAbilityCardId: string;
      readonly rulesRef: readonly string[];
    }
  | {
      readonly status: "ok";
      readonly effect: "survivalistBlocked";
      readonly blockedBuildings: readonly ["survivalist"];
      readonly sourceAbilityCardId: string;
      readonly rulesRef: readonly string[];
    }
  | {
      readonly status: "ok";
      readonly effect: "abbeyBlocked";
      readonly blockedBuildings: readonly ["abbey"];
      readonly sourceAbilityCardId: string;
      readonly rulesRef: readonly string[];
    }
  | {
      readonly status: "ok";
      readonly effect: "nomadWagonBlocked";
      readonly blockedBuildings: readonly ["nomadWagon"];
      readonly sourceAbilityCardId: string;
      readonly rulesRef: readonly string[];
    };

export type BossThreatPassiveDungeonResult = BossThreatPassiveDungeonOk | BossHookStubResult;
export type BossThreatPassiveHamletResult = BossThreatPassiveHamletOk | BossHookStubResult;

export type BossSummonPlacement = "targetArea" | "stanceArea";

export type BossSummonOk = BossHookOk<{
  readonly summonMonsterCardId: string;
  readonly miniaturePlacement: BossSummonPlacement;
  readonly rulesRef: readonly string[];
}>;

export type BossSummonResult = BossSummonOk | BossHookStubResult;

export type BossCombatEntryRefs = {
  readonly descriptionAbilityCardId: string;
  readonly combatAbilityCardId: string;
  readonly combatMonsterCardId: string;
  readonly printedInitiativeCards: number;
  readonly printedActionsPerRound: number;
};

export type BossScriptHooks = {
  /** Boss Abilities 威胁面 · 地牢侧（R11、R35）。 */
  readonly threatPassiveDungeon?: BossHookHandler<
    BossThreatPassiveContext,
    BossThreatPassiveDungeonResult
  >;
  /** Boss Abilities 威胁面 · 村庄侧；升幕 / Imminent Threat hold。 */
  readonly threatPassiveHamlet?: BossHookHandler<
    BossThreatPassiveContext,
    BossThreatPassiveHamletResult
  >;
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
  readonly summon?: BossHookHandler<BossSummonContext, BossSummonResult>;
};

export type BossScriptDefinition = {
  readonly id: BossScriptId;
  readonly displayName: string;
  readonly rules: BossBattleRules;
  readonly hooks: BossScriptHooks;
  /** 战斗卡 / Boss Abilities 印刷 id；encounter 部署 hold。 */
  readonly combatEntry?: BossCombatEntryRefs;
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
