import type { BasicQuestId, CampaignLevel } from "../../../data/src/basic-quests";

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
      readonly effect: "markOnBattleStartLowestD10";
      /** 开战全体英雄掷 d10，最低者（含并列）承受的 Mark 回合数（Marked for Death I 为 2t）。 */
      readonly markTurns: number;
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
    }
  | {
      readonly status: "ok";
      readonly effect: "blackSheepBeforeHamletEvent";
      /** 揭示村庄事件前 d10 最低者承受的压力（The Black Sheep I 为 +4）。 */
      readonly stressDelta: number;
      readonly sourceAbilityCardId: string;
      readonly rulesRef: readonly string[];
    }
  | {
      readonly status: "ok";
      readonly effect: "creepingSicknessBuildingWounds";
      /** 每日末未访问建筑累积的伤口代币数（Creeping Sickness I 为 1）。 */
      readonly woundsPerUnvisitedBuilding: number;
      readonly sourceAbilityCardId: string;
      readonly rulesRef: readonly string[];
    };

export type BossThreatPassiveDungeonResult = BossThreatPassiveDungeonOk | BossHookStubResult;
export type BossThreatPassiveHamletResult = BossThreatPassiveHamletOk | BossHookStubResult;

export type BossSummonPlacement = "targetArea" | "stanceArea" | "areaD10Marker";

/** `battleStartPyre`：Fanatic 战开局 Pyre；`battleStartWilbur`：Swine Prince 战开局 Wilbur；`battleStartCauldron`：Hag 战开局 Empty Cauldron；`battleStartOneBodyPart`：Flesh 四部位之一；`collectAllPart`：Collector Collect All 单卡；`calamitousWoodenPew`：Prophet 木长椅；`highTidePelagic`：Siren High Tide 召唤 Pelagic；`skill`：技能召唤（默认）。 */
export type BossSummonPurpose =
  | "skill"
  | "battleStartPyre"
  | "battleStartWilbur"
  | "battleStartCauldron"
  | "battleStartOneBodyPart"
  | "collectAllPart"
  | "calamitousWoodenPew"
  | "highTidePelagic"
  | "cauldronFullMorph";

export type ProphetWoodenPewIndex = 0 | 1 | 2 | 3;

export type FleshOneBodyPart = "head" | "bone" | "heart" | "butt";

export type CollectorCollectedPart = "manAtArms" | "highwayman" | "vestal";

export type BossSummonOk = BossHookOk<{
  readonly summonMonsterCardId: string;
  readonly miniaturePlacement: BossSummonPlacement;
  /** R39 / R-034：Collector 等写明姿态时指定（Fanatic Pyre → ranged）。 */
  readonly fixedStance?: "aggressive" | "defensive" | "ranged" | "support";
  readonly oneBodyPart?: FleshOneBodyPart;
  readonly collectedPart?: CollectorCollectedPart;
  /** Prophet · Wooden Pew（room 代币，非 normalized 怪物卡）。 */
  readonly woodenPewIndex?: ProphetWoodenPewIndex;
  readonly rulesRef: readonly string[];
}>;

export type BossSummonResult =
  | BossSummonOk
  | BossHookStubResult
  | {
      readonly status: "notApplicable";
      readonly message: string;
      readonly rulesRef: readonly string[];
    };

export type BossSentenceRenderedOk = {
  readonly status: "ok";
  readonly effect: "moveTowardClosestHeroOrTossIntoPyreArea";
  readonly sourceAbilityCardId: string;
  readonly rulesRef: readonly string[];
};

export type BossSentenceRenderedResult = BossSentenceRenderedOk | BossHookStubResult;

/** Fanatic · Sentence Rendered 同区丢入 Pyre 区域（boss_ability 文案 toss；非 Templar d10 Pit Toss）。 */
export type BossPitTossOk = {
  readonly status: "ok";
  readonly effect: "tossReachHeroIntoPyreArea";
  readonly sourceAbilityCardId: string;
  readonly rulesRef: readonly string[];
};

export type BossPitTossResult = BossPitTossOk | BossHookStubResult;

export type BossOneBodyMorphOk = {
  readonly status: "ok";
  readonly effect: "randomPartCardPerStanceEachRoundStart";
  readonly sourceAbilityCardId: string;
  readonly rulesRef: readonly string[];
};

export type BossOneBodyMorphResult = BossOneBodyMorphOk | BossHookStubResult;

export type BossCollectAllOk = {
  readonly status: "ok";
  readonly effect: "summonThreeCollectedIfNoneInPlayAtTurnStart";
  readonly sourceAbilityCardId: string;
  readonly rulesRef: readonly string[];
};

export type BossCollectAllResult = BossCollectAllOk | BossHookStubResult;

export type BossCalamitousPrognosticationOk = {
  readonly status: "ok";
  readonly effect: "rollFourD10PlaceWoodenPewsOnFirstActionEachRound";
  readonly pewCount: 4;
  readonly sourceAbilityCardId: string;
  readonly rulesRef: readonly string[];
};

export type BossCalamitousPrognosticationResult =
  BossCalamitousPrognosticationOk | BossHookStubResult;

export type BossRubbleOfRuinOk = {
  readonly status: "ok";
  readonly effect: "useRubbleSkillOnThirdActionEachRound";
  readonly skillSlot: 3;
  readonly sourceAbilityCardId: string;
  readonly rulesRef: readonly string[];
};

export type BossRubbleOfRuinResult = BossRubbleOfRuinOk | BossHookStubResult;

export type BossEnragedDestructionOk = {
  readonly status: "ok";
  readonly effect: "princeUsesSkillWhenWilburDamaged";
  /** Swine Prince 战斗卡 slot；Warrens extract 入库前由常量 + 测试夹具对齐。 */
  readonly skillSlot: number;
  readonly targetPolicy: "offendingHero";
  readonly sourceAbilityCardId: string;
  readonly rulesRef: readonly string[];
};

export type BossEnragedDestructionResult = BossEnragedDestructionOk | BossHookStubResult;

export type BossEnragedDestructionContext = {
  readonly scriptId: BossScriptId;
};

export type BossWilburMarkOk = {
  readonly status: "ok";
  /** Prince 存活时 Wilbur 回合强制 End This One（Mark）；Prince 倒下后走卡面选招（Squeal 等待确认）。 */
  readonly effect: "forceMarkSkillWhilePrinceAlive";
  /** Wilbur 战斗卡 slot；Warrens extract 入库前由常量 + 测试夹具对齐。 */
  readonly skillSlot: number;
  readonly sourceAbilityCardId: string;
  readonly rulesRef: readonly string[];
};

export type BossWilburMarkResult = BossWilburMarkOk | BossHookStubResult;

export type BossWilburMarkContext = {
  readonly scriptId: BossScriptId;
};

export type BossIntoThePotOk = {
  readonly status: "ok";
  /** 锅 Empty 时 Hag 每轮首次行动强制 Into the Pot!（42415 / spec §14.5 R39）。 */
  readonly effect: "forceIntoThePotWhileCauldronEmptyOnFirstActionEachRound";
  /** Hag 战斗卡 slot；Weald extract 入库前由常量 + 测试夹具对齐。 */
  readonly skillSlot: number;
  readonly sourceAbilityCardId: string;
  readonly rulesRef: readonly string[];
};

export type BossIntoThePotResult = BossIntoThePotOk | BossHookStubResult;

export type BossIntoThePotContext = {
  readonly scriptId: BossScriptId;
};

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
  readonly faceTheThreatEmbark?: BossHookHandler<
    BossFaceTheThreatContext,
    BossFaceTheThreatEmbarkResult
  >;
  /** R36 / R-121：目标 + 2 随机非目标入 Boss 三格；布置 hold。 */
  readonly bossSlotPlacement?: BossHookHandler<BossSlotPlacementContext, BossSlotPlacementResult>;
  /** 本怪物回合行动次数（G-05 多行动）；默认 1，完整 AI 未接。 */
  readonly monsterTurnActionCount?: BossHookHandler<
    BossMonsterTurnContext,
    BossHookOk<number> | BossHookStubResult
  >;
  /** R31 / R11 召唤；姿态轨、先攻等 hold。 */
  readonly summon?: BossHookHandler<BossSummonContext, BossSummonResult>;
  /** Fanatic · Sentence Rendered：回合开始替代选招（spec §14.5 R39）。 */
  readonly sentenceRendered?: BossHookHandler<
    BossSentenceRenderedContext,
    BossSentenceRenderedResult
  >;
  /** Fanatic · 同区将英雄丢入 Pyre 区域（Sentence Rendered 命中分支；spec §14.5 R39）。 */
  readonly pitToss?: BossHookHandler<BossSentenceRenderedContext, BossPitTossResult>;
  /** The Flesh · One Body：每轮开始部位 morph（随机表 hold 时运行时拒绝）。 */
  readonly oneBodyMorph?: BossHookHandler<BossOneBodyMorphContext, BossOneBodyMorphResult>;
  /** Collector · Collect All：回合开始无 Collected 时替代选招（spec §14.5 R39）。 */
  readonly collectAll?: BossHookHandler<BossCollectAllContext, BossCollectAllResult>;
  /** Prophet · Calamitous Prognostication：每轮首次行动掷 4d10 放木长椅（spec §14.5 R38–R39）。 */
  readonly calamitousPrognostication?: BossHookHandler<
    BossCalamitousPrognosticationContext,
    BossCalamitousPrognosticationResult
  >;
  /** Prophet · Rubble of Ruin：每轮第 3 次行动强制技能 3（spec §14.5 R38–R39）。 */
  readonly rubbleOfRuin?: BossHookHandler<
    BossCalamitousPrognosticationContext,
    BossRubbleOfRuinResult
  >;
  /** Swine Prince · Enraged Destruction：Wilbur 受伤时 Prince 立即反击（spec §14.5 / Boss Abilities p10）。 */
  readonly enragedDestruction?: BossHookHandler<
    BossEnragedDestructionContext,
    BossEnragedDestructionResult
  >;
  /** Swine Prince · Wilbur Mark：Prince 存活时 Wilbur 回合强制 Mark 技能（Boss Abilities p10 / medium p20）。 */
  readonly wilburMark?: BossHookHandler<BossWilburMarkContext, BossWilburMarkResult>;
  /** Hag · Into the Pot!：Cauldron Empty 时 Hag 每轮首次行动强制该技能（Boss Abilities 42415）。 */
  readonly intoThePot?: BossHookHandler<BossIntoThePotContext, BossIntoThePotResult>;
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

export type BossFaceTheThreatEmbarkPlan = {
  readonly resolvedScriptId: BossScriptId;
  readonly questId: BasicQuestId;
  readonly combatEntry: BossCombatEntryRefs;
  readonly rulesRef: readonly string[];
  /** 已解析脚本与 combatEntry；边缘房 / R-121 dungeon 写入仍 hold（出征 plan 见 faceTheThreatEmbarkPlan）。 */
  readonly wiringHold: string;
};

export type BossFaceTheThreatEmbarkResult =
  BossHookOk<BossFaceTheThreatEmbarkPlan> | BossHookStubResult;

export type BossSlotPlacementPlan = {
  readonly layoutId: string;
  readonly bossSlotNodeIds: readonly string[];
  /** R-121 / spec §5.1：目标房代币 + 2 张随机非目标洗入三格（算法语义；RNG 写入 hold）。 */
  readonly placementAlgorithm: "objectivePlusTwoRandomNonObjective";
  readonly rulesRef: readonly string[];
  /** 节点校验已通过；洗牌与 room token 写入 dungeon 仍 hold。 */
  readonly wiringHold: string;
};

export type BossSlotPlacementResult = BossHookOk<BossSlotPlacementPlan> | BossHookStubResult;

export type BossFaceTheThreatContext = {
  readonly scriptId: BossScriptId;
  readonly questId: BasicQuestId;
  readonly campaignLevel?: CampaignLevel;
  readonly activeBossThreatScriptId?: BossScriptId;
  readonly imminentThreatDescriptionCardId?: string;
};

export type BossSlotPlacementContext = {
  readonly scriptId: BossScriptId;
  readonly layoutId: string;
  readonly bossSlotNodeIds: readonly string[];
  readonly questId?: BasicQuestId;
};

/** 引擎层 Face the Threat 解析输入（不绑定单一脚本钩子）。 */
export type FaceTheThreatQuestContext = {
  readonly questId: BasicQuestId;
  readonly campaignLevel?: CampaignLevel;
  readonly activeBossThreatScriptId?: BossScriptId;
  readonly imminentThreatDescriptionCardId?: string;
};

export type BossMonsterTurnContext = {
  readonly scriptId: BossScriptId;
  readonly monsterEntityId: string;
  readonly round: number;
};

export type BossSummonContext = {
  readonly scriptId: BossScriptId;
  readonly skillSlot: number;
  readonly purpose?: BossSummonPurpose;
  readonly oneBodyPart?: FleshOneBodyPart;
  readonly collectedPart?: CollectorCollectedPart;
  readonly woodenPewIndex?: ProphetWoodenPewIndex;
};

export type BossCalamitousPrognosticationContext = {
  readonly scriptId: BossScriptId;
  readonly monsterEntityId: string;
  readonly round: number;
};

export type BossCollectAllContext = {
  readonly scriptId: BossScriptId;
  readonly monsterEntityId: string;
  readonly round: number;
};

export type BossOneBodyMorphContext = {
  readonly scriptId: BossScriptId;
  readonly round: number;
};

export type BossSentenceRenderedContext = {
  readonly scriptId: BossScriptId;
  readonly monsterEntityId: string;
  readonly round: number;
};

export type BossHookName = keyof BossScriptHooks;
