import { resolveExcavation } from "./darkest-excavation";
import { prepareFinalBattleForms, finishFinalBattleForm } from "./boss/final-form-sequence";
import { beginFinalPreparation, beginFinalBattleProvisions } from "./final-preparation";
import { applyHigherRuinsHamlet, chooseHigherRuinsTheft } from "./boss/higher-ruins-hamlet";
import { applyHigherRuinsBattleSpawn } from "./boss/higher-ruins-threat";
import { useCoreTrinket } from "./core-trinket-free";
import type { UseCoreTrinketCommand } from "./core-trinket-free";
import { runTrinketCommand } from "./trinket-reactions";
import { chooseDamageStone } from "./battle-damage-stone";
import { playHeroSkill, rejectBattleCommand } from "./battle";
import { drawHamletEvent, rollHamletCaretaker, chooseMedicalBreakthrough } from "./hamlet-event";
import { chooseCaregiversConvention } from "./hamlet-caregivers";
import { chooseFeast } from "./hamlet-feast";
import { chooseLaborForce } from "./hamlet-labor-force";
import { chooseGuildTraining, chooseMilitiaTraining } from "./hamlet-guild-training";
import { chooseTravelingMerchants } from "./hamlet-traveling-merchants";
import { chooseWarmUpProvisionTorch } from "./warm-up-starting-provisions";
import { chooseScoutAheadReveal } from "./hamlet-scout-ahead";
import { resolveDungeonPressure } from "./dungeon-pressure";
import { continueDeathEstates, chooseDeathTrinket } from "./hero-death-estate";
import { joinPreparedReplacements } from "./replacement-join";
import { setDungeonStances } from "./dungeon-stances";
import type { SetDungeonStancesCommand } from "./dungeon-stances";
import { setHamletStances, chooseHamletStances } from "./hamlet-stances";
import type { SetHamletStancesCommand } from "./hamlet-stances";
import {
  beginReplacementPreparation,
  chooseReplacementPreparation,
} from "./replacement-preparation";
import { applyHamletAction, chooseAbbeyQuirk } from "./hamlet-actions";
import { visitNomadWagon, chooseNomadWagon } from "./hamlet-nomad";
import { visitBlacksmith } from "./hamlet-blacksmith";
import { visitGuild, chooseGuild } from "./hamlet-guild";
import { offerNextQuest, chooseNextQuest } from "./hamlet-embark";
import { advanceCampaignLevel } from "./hamlet-campaign";
import { advanceRuinsAct } from "./advance-ruins-act";
import { setActiveBossThreat } from "./boss/set-active-boss-threat";
import {
  chooseHauntedGraveyard,
  hauntedHamletCommandProblem,
} from "./boss/necromancer-ii-graveyard";
import type { SetActiveBossThreatCommand } from "./boss/set-active-boss-threat";
import {
  drawImminentThreatAfterActAdvance,
  establishImminentThreat,
} from "./boss/establish-imminent-threat";
import type {
  DrawImminentThreatAfterActAdvanceCommand,
  EstablishImminentThreatCommand,
} from "./boss/establish-imminent-threat";
import type { BlacksmithCommand } from "./hamlet-blacksmith";
import type { HamletActionCommand } from "./hamlet-actions";
import { upgradeHamletBuilding } from "./hamlet-buildings";
import type { UpgradeHamletBuildingCommand } from "./hamlet-buildings";
import { setEquippedSkills } from "./hero-loadout";
import type { SetEquippedSkillsCommand } from "./hero-loadout";
import { applyDungeonCommand } from "./dungeon";
import { summarizeDungeonQuest, resolveFundraiserGold } from "./dungeon-quest";
import { restDungeon } from "./dungeon-rest";
import { setupDungeonProvisions } from "./dungeon-starting-provisions";
import { useDungeonProvision } from "./dungeon-provision-use";
import { setupForwardCamp } from "./dungeon-forward-camp";
import {
  beginReturnToHamlet,
  chooseHamletQuirk,
  finishReturnToHamlet,
  useHamletProvision,
} from "./hamlet-return";
import { startDungeonBattle, finishDungeonBattle } from "./dungeon-battle";
import { conditionPoolProblem, replaceConditionQuirk } from "./conditions";
import { recordMonsterSkill } from "./encounter";
import { chooseNecromancerISummon } from "./boss/necromancer-i-combat-runtime";
import { chooseCollectorISummon } from "./boss/collector-i-combat-runtime";
import {
  resolveDungeonConditionChoice,
  resolveDungeonCurioProvisionChoice,
  resolveDungeonTrinketChoice,
} from "./dungeon-curio";
import { displaceSmallForHero } from "./battle-small";
import { finishTurn } from "./encounter";
import type { DungeonCommand, DungeonState } from "./dungeon";
import type { BattleState, PlayHeroSkillCommand } from "./battle";
import type { HeroSkillResolution } from "./hero-skill";
import { playHeroSkillTargets } from "./battle-hero-targets";
import { playHeroSkillEmptyArea } from "./battle-empty-area";
import type { PlayHeroSkillEmptyAreaCommand } from "./battle-empty-area";
import type { PlayHeroSkillTargetsCommand } from "./battle-hero-targets";
import type { HeroHealthEffect, HeroHealthResolution } from "./hero-health";
import { applyEncounterCommand } from "./encounter";
import type { EncounterCommand, EncounterEvent } from "./encounter";
import { applyBattleShuffles, chooseBalancedShuffle } from "./battle-shuffle";
import { playMonsterSkill } from "./battle-monster";
import type { PlayMonsterSkillCommand } from "./battle-monster";
import { prepareMonsterAction } from "./battle-monster-action";
import { moveInvokingMonster } from "./battle-invocation";
import { moveMonsterToRange } from "./battle-monster-movement";
import type { MoveMonsterToRangeCommand, MonsterPositionedEvent } from "./battle-monster-movement";
import { moveHero } from "./battle-hero-movement";
import { consumeResolveProvision } from "./resolve-trigger";
import { lootTreasureChest, resolveBattleTrinketChoice } from "./battle-trinket";
import { chooseHeroTrinket } from "./battle-trinket-ability";
import { chooseAttackTrinkets } from "./battle-attack-trinkets";
import { useTrinket } from "./battle-fortunate-armlet";
import type { UseTrinketCommand } from "./battle-fortunate-armlet";
import { hideAndHeal } from "./battle-hide-and-heal";
import { interactLoot, resolveLootChoice } from "./loot";
import { chooseStartingProvision, startWithProvisions } from "./starting-provisions";
import { useProvision } from "./provision-use";
import type { UseProvisionCommand } from "./provision-use";
import { beginResolveTurn } from "./resolve-trigger";
import type { MoveHeroCommand, HeroMovedEvent } from "./battle-hero-movement";
import type {
  MonsterActionPreparedEvent,
  PrepareMonsterActionCommand,
} from "./battle-monster-action";

export type GameState = {
  readonly trinketChoice?: import("./trinket-reactions").TrinketContinuation;
  readonly seed: number;
  readonly notes: readonly string[];
  readonly battle?: BattleState;
  readonly dungeon?: DungeonState;
};

/** 玩家决策未完成时，UI 只呈现这些选项。 */
export type PendingChoice = {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly { readonly id: string; readonly label: string }[];
  /** hot-seat 中负责本次选择的英雄。 */
  readonly actorId?: string;
};

export type HeroSkillResolvedEvent = {
  readonly phase?: "ownPending" | "afterOwn";
  readonly type: "heroSkillResolved";
  readonly message: string;
  readonly actorId: string;
  readonly roll: number | null;
  readonly resolution: HeroSkillResolution;
};

export type HeroSkillTargetsResolvedEvent = {
  readonly phase?: "ownPending" | "afterOwn";
  readonly type: "heroSkillTargetsResolved";
  readonly message: string;
  readonly actorId: string;
  readonly roll: number | null;
  readonly resolutions: readonly HeroSkillResolution[];
};

export type MonsterSkillResolvedEvent = {
  /** 已核实召唤原语的目标区域；穿过自身位移续接后，只在回合收尾消费一次。 */
  readonly summonTargetAreaId?: string;
  readonly phase?: "ownPending" | "afterOwn";
  readonly type: "monsterSkillResolved";
  readonly message: string;
  readonly actorId: string;
  readonly skillSlot: number;
  readonly roll: number;
  readonly actorDead: boolean;
  readonly resolution: HeroSkillResolution;
};

export type MonsterSkillTargetsResolvedEvent = Omit<
  MonsterSkillResolvedEvent,
  "type" | "resolution"
> & {
  readonly type: "monsterSkillTargetsResolved";
  readonly resolutions: readonly HeroSkillResolution[];
};

export type HeroSkillEmptyAreaResolvedEvent = {
  readonly type: "heroSkillEmptyAreaResolved";
  readonly message: string;
  readonly actorId: string;
  readonly skillId: string;
  readonly areaId: string;
  readonly roll: number | null;
};

export type Command = BaseCommand & { readonly allTrinkets?: true | undefined };
type BaseCommand =
  | UseCoreTrinketCommand
  | UseTrinketCommand
  | SetDungeonStancesCommand
  | SetHamletStancesCommand
  | { readonly type: "prepareReplacementHero" }
  | { readonly type: "joinPreparedReplacements" }
  | BlacksmithCommand
  | { readonly type: "visitGuild"; readonly actorId: string }
  | SetEquippedSkillsCommand
  | UpgradeHamletBuildingCommand
  | HamletActionCommand
  | { readonly type: "visitNomadWagon"; readonly actorId: string }
  | { readonly type: "rollDungeonProvisions" }
  | { readonly type: "restDungeon" }
  | { readonly type: "setupForwardCamp"; readonly provisionId: string }
  | { readonly type: "summarizeDungeonQuest" }
  | { readonly type: "startDungeonBattle" }
  | { readonly type: "finishDungeonBattle" }
  | { readonly type: "beginReturnToHamlet" }
  | { readonly type: "finishReturnToHamlet" }
  | { readonly type: "drawHamletEvent" }
  | { readonly type: "beginFinalPreparation" }
  | { readonly type: "beginFinalBattleProvisions" }
  | { readonly type: "prepareFinalBattleForms" }
  | { readonly type: "offerNextQuest" }
  | { readonly type: "advanceCampaignLevel" }
  | { readonly type: "advanceRuinsAct" }
  | SetActiveBossThreatCommand
  | EstablishImminentThreatCommand
  | DrawImminentThreatAfterActAdvanceCommand
  | { readonly type: "rollHamletCaretaker" }
  | DungeonCommand
  | PlayHeroSkillEmptyAreaCommand
  | UseProvisionCommand
  | { readonly type: "lootTreasureChest"; readonly actorId: string }
  | { readonly type: "hideAndHeal"; readonly actorId: string }
  | { readonly type: "interactLoot"; readonly actorId: string }
  | EncounterCommand
  | PlayHeroSkillCommand
  | PlayHeroSkillTargetsCommand
  | PlayMonsterSkillCommand
  | PrepareMonsterActionCommand
  | MoveMonsterToRangeCommand
  | MoveHeroCommand
  | { readonly type: "resolveShuffles" }
  | {
      readonly type: "resolveChoice";
      readonly choiceId: string;
      readonly optionId: string;
      /** 缺标记为旧日志洗牌；网页新命令显式 true。 */
      readonly bossEdgeRooms?: boolean | undefined;
    }
  | {
      readonly type: "ping";
      readonly message: string;
    };

export type GameEvent =
  | {
      readonly type: "trinketUsed";
      readonly actorId: string;
      readonly cardId: string;
      readonly face: "upright" | "inverted";
      readonly message: string;
    }
  | { readonly type: "roomInteractionResolved"; readonly actorId: string; readonly message: string }
  | { readonly type: "healingPrevented"; readonly entityId: string; readonly message: string }
  | {
      readonly type: "passiveTriggered";
      readonly entityId: string;
      readonly trigger: string;
      readonly message: string;
    }
  | {
      readonly type: "diseaseAcquired";
      readonly entityId: string;
      readonly diseaseId: string;
      readonly quirkId?: string;
      readonly message: string;
    }
  | {
      readonly type: "smallMonsterDisplaced";
      readonly actorId: string;
      readonly entityId: string;
      readonly from: string;
      readonly to: string;
      readonly message: string;
    }
  | { readonly type: "dungeonUpdated"; readonly message: string }
  | HeroSkillEmptyAreaResolvedEvent
  | {
      readonly type: "lootRevealed";
      readonly actorId: string;
      readonly tokenId: string;
      readonly kind: import("./loot").LootKind;
      readonly message: string;
    }
  | {
      readonly type: "lootResolved";
      readonly actorId: string;
      readonly tokenId: string;
      readonly kind: import("./loot").LootKind;
      readonly reward:
        { readonly gold: number } | { readonly face: import("./loot").ProvisionFace };
      readonly message: string;
    }
  | {
      readonly type: "provisionSelected";
      readonly actorId: string;
      readonly face: import("./loot").ProvisionFace;
      readonly message: string;
    }
  | {
      readonly type: "provisionRolled";
      readonly actorId: string;
      readonly face: import("./loot").ProvisionFace | "wild";
      readonly message: string;
    }
  | { readonly type: "areaStressResolved"; readonly actorId: string; readonly message: string }
  | {
      readonly type: "resolveTriggered";
      readonly entityId: string;
      readonly cardId: string;
      readonly roll: number;
      readonly triggered: boolean;
      readonly message: string;
    }
  | {
      readonly type: "provisionConsumed";
      readonly entityId: string;
      readonly provisionId: string;
      readonly face: import("./loot").ProvisionFace;
      readonly effect: import("./provision-use").ProvisionEffect | "discard";
      readonly message: string;
    }
  | { readonly type: "heartAttack"; readonly entityId: string; readonly message: string }
  | {
      readonly type: "monsterTargetEffectsResolved";
      readonly entityId: string;
      readonly light: number;
      readonly stress: number;
      readonly message: string;
    }
  | {
      readonly type: "resolveTested";
      readonly entityId: string;
      readonly roll: number;
      readonly cardId: string;
      readonly message: string;
    }
  | {
      readonly type: "statusTurnStarted";
      readonly message: string;
      readonly entityId: string;
      readonly woundAmounts: readonly number[];
      readonly stunned: boolean;
    }
  | {
      readonly type: "heroHealthResolved";
      readonly message: string;
      readonly entityId: string;
      readonly effect: HeroHealthEffect;
      readonly resolution: Extract<HeroHealthResolution, { status: "resolved" }>;
    }
  | EncounterEvent
  | HeroSkillResolvedEvent
  | HeroSkillTargetsResolvedEvent
  | MonsterSkillResolvedEvent
  | MonsterSkillTargetsResolvedEvent
  | MonsterActionPreparedEvent
  | {
      readonly type: "monsterSelfSkillResolved";
      readonly actorId: string;
      readonly skillSlot: number;
      readonly skillId: string;
      readonly selectionRoll: number | null;
      readonly effects: readonly import("./status").StatusEffect[];
      readonly message: string;
    }
  | MonsterPositionedEvent
  | HeroMovedEvent
  | {
      readonly type: "monsterActionSkipped";
      readonly actorId: string;
      readonly skillSlot: number;
      readonly selectionRoll: number | null;
      readonly skillId: string;
      readonly targetPriority: string;
      readonly message: string;
    }
  | {
      readonly type: "heroCritAreaResolved" | "monsterCritAreaResolved";
      readonly message: string;
      readonly actorId: string;
    }
  | {
      readonly type: "shuffleResolved";
      readonly message: string;
      readonly entityId: string;
      readonly path: readonly string[];
      readonly stanceSteps: number;
    }
  | {
      readonly type: "commandRefused";
      readonly message: string;
    }
  | {
      readonly type: "pong";
      readonly message: string;
    };

export type ApplyResult = {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
  readonly pendingChoice?: PendingChoice;
};

export function createInitialState(seed: number): GameState {
  return { seed, notes: [] };
}

/**
 * Phase 2 单目标战斗沙盒；规则书第 19–21 页、R-024、R-031、R-048。
 * 等待位移方向 / 区域选择时冻结其他命令；区域选择不重掷骰子。
 */
function dispatchCommand(state: GameState, command: Command): ApplyResult {
  if (state.dungeon?.darkest?.excavation?.stage === "provisions")
    return command.type === "resolveChoice"
      ? resolveExcavation(state, command)
      : rejectBattleCommand(state, "请先完成挖掘点补给选择（R36）");
  if (state.dungeon?.higherThreatTheft) return chooseHigherRuinsTheft(state, command);
  if (command.type === "useCoreTrinket") return useCoreTrinket(state, command);
  if (state.dungeon?.pending?.id.startsWith("hamlet-haunted:"))
    return command.type === "resolveChoice"
      ? chooseHauntedGraveyard(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先选择并列最低者中的墓地守卫");
  const hauntedProblem = hauntedHamletCommandProblem(state, command);
  if (hauntedProblem) return rejectBattleCommand(state, hauntedProblem);
  if (state.dungeon?.pending?.id.startsWith("hamlet-stances:"))
    return command.type === "resolveChoice"
      ? chooseHamletStances(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先协商本次村庄换位");
  if (command.type === "setHamletStances") return setHamletStances(state, command);
  if (command.type === "setDungeonStances") return setDungeonStances(state, command);
  if (command.type === "joinPreparedReplacements") return joinPreparedReplacements(state);
  if (command.type === "prepareReplacementHero") return beginReplacementPreparation(state);
  if (state.dungeon?.pending?.id.startsWith("hamlet-next-quest:"))
    return command.type === "resolveChoice"
      ? chooseNextQuest(state, command.choiceId, command.optionId, command.bossEdgeRooms ?? false)
      : rejectBattleCommand(state, "请先选择下一任务");
  if (command.type === "offerNextQuest") return offerNextQuest(state);
  if (command.type === "advanceCampaignLevel") return advanceCampaignLevel(state);
  if (command.type === "advanceRuinsAct") return advanceRuinsAct(state);
  if (command.type === "establishImminentThreat") return establishImminentThreat(state, command);
  if (command.type === "drawImminentThreatAfterActAdvance")
    return drawImminentThreatAfterActAdvance(state, command);
  if (command.type === "setActiveBossThreat") return setActiveBossThreat(state, command);
  if (state.dungeon?.pending?.id.startsWith("hamlet-guild:"))
    return command.type === "resolveChoice"
      ? chooseGuild(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先完成当前公会访问");
  if (command.type === "visitGuild") return visitGuild(state, command.actorId);
  if (command.type === "setEquippedSkills") return setEquippedSkills(state, command);
  if (state.dungeon?.pending?.id.startsWith("hamlet-nomad:"))
    return command.type === "resolveChoice"
      ? chooseNomadWagon(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先完成游商马车购买或装备选择");
  if (command.type === "visitNomadWagon") return visitNomadWagon(state, command.actorId);
  if (command.type === "visitBlacksmith") return visitBlacksmith(state, command);
  if (state.dungeon?.pending?.id.startsWith("hamlet-labor-force:"))
    return command.type === "resolveChoice"
      ? chooseLaborForce(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先完成Labor Force免费升级选择");
  if (state.dungeon?.pending?.id.startsWith("hamlet-militia:"))
    return command.type === "resolveChoice"
      ? chooseMilitiaTraining(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先完成Militia Training全员升级选择");
  if (state.dungeon?.pending?.id.startsWith("hamlet-guild-training:"))
    return command.type === "resolveChoice"
      ? chooseGuildTraining(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先完成Guild Training技能升级选择");
  if (state.dungeon?.pending?.id.startsWith("hamlet-caregivers:"))
    return command.type === "resolveChoice"
      ? chooseCaregiversConvention(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先完成Caregivers Convention怪癖选择");
  if (state.dungeon?.pending?.id.startsWith("hamlet-feast:"))
    return command.type === "resolveChoice"
      ? chooseFeast(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先完成The Feast恢复选择");
  if (state.dungeon?.pending?.id.startsWith("hamlet-medical:"))
    return command.type === "resolveChoice"
      ? chooseMedicalBreakthrough(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先完成Medical Breakthrough疾病选择");
  if (state.dungeon?.pending?.id.startsWith("hamlet-abbey-quirk:"))
    return command.type === "resolveChoice"
      ? chooseAbbeyQuirk(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先完成修道院正面怪癖选择");
  if (
    state.dungeon?.phase === "blockedPressure" &&
    ["hamletScout", "hamletVapours"].includes(state.dungeon.pressureSource ?? "")
  )
    return command.type === "resolveDungeonPressure"
      ? resolveDungeonPressure(state)
      : rejectBattleCommand(state, "请先完成村庄意志检定，勿重复支付压力");
  if (command.type === "upgradeHamletBuilding") return upgradeHamletBuilding(state, command);
  if (command.type === "visitHamletBuilding" || command.type === "useHamletSkill")
    return applyHamletAction(state, command);
  if (command.type === "drawHamletEvent") return drawHamletEvent(state);
  if (command.type === "beginFinalPreparation") return beginFinalPreparation(state);
  if (command.type === "prepareFinalBattleForms") return prepareFinalBattleForms(state);
  if (command.type === "beginFinalBattleProvisions") return beginFinalBattleProvisions(state);
  if (command.type === "rollHamletCaretaker") return rollHamletCaretaker(state);
  if (command.type === "beginReturnToHamlet") return beginReturnToHamlet(state);
  if (command.type === "finishReturnToHamlet") return finishReturnToHamlet(state);
  if (state.dungeon?.hamletReturn) {
    if (command.type === "resolveChoice")
      return chooseHamletQuirk(state, command.choiceId, command.optionId);
    if (command.type === "useProvision" && state.dungeon.hamletReturn.phase === "provisions")
      return useHamletProvision(state, command);
    return rejectBattleCommand(state, "正在回村或已进入村庄，请完成当前回村步骤");
  }
  if (state.dungeon?.phase === "awaitingScoutAhead")
    return command.type === "resolveChoice"
      ? chooseScoutAheadReveal(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先完成Scout Ahead房间揭示");
  if (state.dungeon?.pending?.id.startsWith("dungeon-traveling-merchants:"))
    return command.type === "resolveChoice"
      ? chooseTravelingMerchants(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先完成Traveling Merchants改骰选择");
  if (state.dungeon?.pending?.id.startsWith("dungeon-warm-up-provision-torch:"))
    return command.type === "resolveChoice"
      ? chooseWarmUpProvisionTorch(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先完成Warm Up the Halls开局改Torch（QUEST p11）");
  if (command.type === "rollDungeonProvisions" || state.dungeon?.phase === "awaitingProvisions")
    return command.type === "rollDungeonProvisions" || command.type === "resolveChoice"
      ? setupDungeonProvisions(state, command)
      : rejectBattleCommand(state, "请先完成地牢开局补给（R12）");
  if (state.dungeon?.pending?.id.startsWith("dungeon-fundraiser:"))
    return command.type === "resolveChoice"
      ? resolveFundraiserGold(state, command)
      : rejectBattleCommand(state, "请先完成捐献选择");
  if (command.type === "restDungeon") return restDungeon(state, command);
  if (command.type === "setupForwardCamp") return setupForwardCamp(state, command);
  if (state.dungeon?.pending?.id.startsWith("dungeon-rest:"))
    return command.type === "resolveChoice"
      ? restDungeon(state, command)
      : rejectBattleCommand(state, "请先完成休息分配");
  if (command.type === "summarizeDungeonQuest") return summarizeDungeonQuest(state);
  if (state.dungeon?.phase === "exited")
    return rejectBattleCommand(state, "已离开地牢，等待任务结算 / 回村接口");
  if (state.dungeon?.pending?.id.startsWith("dungeon-exit:"))
    return command.type === "resolveChoice"
      ? applyDungeonCommand(state, command)
      : rejectBattleCommand(state, "请先完成全员离开决定");
  if (state.dungeon?.pending?.id.startsWith("dungeon-trinket:")) {
    const pending = state.dungeon.pending;
    return command.type === "resolveChoice" &&
      command.choiceId === pending.id &&
      pending.options.some((o) => o.id === command.optionId)
      ? resolveDungeonTrinketChoice(state, command.optionId)
      : rejectBattleCommand(state, "请先完成 Curio 饰品获得选择");
  }
  if (state.dungeon?.pending?.id.startsWith("dungeon-curio-provision:")) {
    const pending = state.dungeon.pending;
    return command.type === "resolveChoice" &&
      command.choiceId === pending.id &&
      pending.options.some((o) => o.id === command.optionId)
      ? resolveDungeonCurioProvisionChoice(
          state,
          command.optionId as import("./loot").ProvisionFace,
        )
      : rejectBattleCommand(state, "请先完成 Curio Wild 补给选择");
  }
  if (state.dungeon?.pending?.id.startsWith("dungeon-condition:")) {
    const pending = state.dungeon.pending;
    return command.type === "resolveChoice" &&
      command.choiceId === pending.id &&
      pending.options.some((o) => o.id === command.optionId)
      ? resolveDungeonConditionChoice(state, command.optionId)
      : rejectBattleCommand(state, "请先完成地牢疾病 / 怪癖替换选择");
  }
  if (command.type === "startDungeonBattle") return startDungeonBattle(state);
  if (command.type === "finishDungeonBattle") return finishDungeonBattle(state);
  if (command.type === "useProvision" && state.dungeon && !state.battle)
    return useDungeonProvision(state, command);
  if (state.dungeon?.phase === "inBattle" && command.type === "finishMonsterTurn")
    return rejectBattleCommand(state, "真实地牢战斗须完成怪物选招 / 定位 / 结算，不能手动跳过回合");
  if (
    command.type === "scoutDungeon" ||
    command.type === "leaveDungeon" ||
    command.type === "resolveDungeonPressure" ||
    command.type === "beginDungeonExploration" ||
    command.type === "beginDungeonBacktrack" ||
    command.type === "rollDungeonExploration" ||
    command.type === "resolveDungeonCurio" ||
    command.type === "prepareDungeonBattle" ||
    command.type === "prepareDungeonMonsters" ||
    command.type === "resolveDungeonRoom" ||
    (command.type === "resolveChoice" && state.dungeon && !state.battle)
  )
    return applyDungeonCommand(state, command);
  if (
    state.dungeon &&
    command.type !== "ping" &&
    (!state.battle || state.dungeon.phase !== "inBattle")
  )
    return rejectBattleCommand(state, "请先完成地牢沙盒流程");
  if (command.type === "resolveChoice") {
    const pending = state.battle?.pending;
    if (
      !pending ||
      pending.choice.id !== command.choiceId ||
      !pending.choice.options.some((option) => option.id === command.optionId)
    ) {
      return rejectBattleCommand(state, "选择不存在、已过期或选项无效");
    }
    if (pending.type === "necromancerSummon")
      return chooseNecromancerISummon(state, command.optionId);
    if (pending.type === "allTrinkets") return rejectBattleCommand(state, "饰品续接上下文缺失");
    if (pending.type === "damageStone") return chooseDamageStone(state, command.optionId);
    if (pending.type === "heroTrinket") return chooseHeroTrinket(state, command.optionId);
    if (pending.type === "heroAttackTrinkets") return chooseAttackTrinkets(state, command.optionId);
    if (pending.type === "collectorSummon") return chooseCollectorISummon(state, command.optionId);
    if (pending.type === "shuffleReduction") return chooseBalancedShuffle(state, command.optionId);
    if (pending.type === "shuffleArea")
      return applyBattleShuffles(state, [...pending.path, command.optionId]);
    if (pending.type === "smallDisplace") {
      const result = displaceSmallForHero(state, pending.actorId, pending.events, command.optionId);
      return !result || result.events.some((e) => e.type === "commandRefused")
        ? (result ?? rejectBattleCommand(state, "Small 选择已过期"))
        : finishTurn(result.state, pending.actorId, result.events);
    }
    if (pending.type === "conditionReplace") {
      const b = state.battle!;
      if (!b.conditions) return rejectBattleCommand(state, "缺少疾病 / 怪癖池");
      const applied = replaceConditionQuirk(
        b.conditions,
        b.entities.filter((e) => e.side === "hero"),
        command.optionId,
      );
      if (applied.status === "refused") return rejectBattleCommand(state, applied.reason);
      return recordMonsterSkill(
        {
          state: {
            ...state,
            battle: {
              ...b,
              pending: null,
              conditions: applied.pool,
              entities: b.entities.map((e) => applied.heroes.find((h) => h.id === e.id) ?? e),
            },
          },
          events: [],
        },
        pending.resolved,
        pending.casualtyIds,
        false,
        pending.remainingInfections,
      );
    }
    if (pending.type === "resolveProvision")
      return consumeResolveProvision(state, command.optionId);
    if (pending.type === "trinketReward")
      return resolveBattleTrinketChoice(state, command.optionId);
    if (pending.type === "lootReward") return resolveLootChoice(state, command.optionId);
    if (pending.type === "startingProvision")
      return chooseStartingProvision(state, command.optionId);
    if (pending.type === "turnStartProvision")
      return beginResolveTurn(
        { state: { ...state, battle: { ...state.battle!, pending: null } }, events: [] },
        pending.actorId,
      );
    if (pending.type === "invokerMove" || pending.type === "invokerDisplace")
      return moveInvokingMonster(
        state,
        pending.actorId,
        pending.type === "invokerMove" ? command.optionId : pending.to,
        pending.type === "invokerDisplace" ? command.optionId : undefined,
      );
    if (pending.type === "monsterMove" || pending.type === "monsterDisplace")
      return moveMonsterToRange(
        state,
        {
          type: "moveMonsterToRange",
          actorId: state.battle!.monsterAction!.actorId,
        },
        pending.type === "monsterMove" ? command.optionId : pending.to,
        pending.type === "monsterDisplace" ? command.optionId : undefined,
      );
    if (command.optionId !== "push" && command.optionId !== "pull")
      return rejectBattleCommand(state, "位移方向无效");
    if (pending.command.type === "playHeroSkillTargets")
      return playHeroSkillTargets(state, { ...pending.command, shuffleChoice: command.optionId });
    if (pending.command.type === "playMonsterSkill" && pending.shuffleTargetId)
      return playMonsterSkill(state, {
        ...pending.command,
        shuffleChoices: {
          ...pending.command.shuffleChoices,
          [pending.shuffleTargetId]: command.optionId,
        },
      });
    return pending.command.type === "playHeroSkill"
      ? playHeroSkill(state, { ...pending.command, shuffleChoice: command.optionId })
      : playMonsterSkill(state, { ...pending.command, shuffleChoice: command.optionId });
  }
  if (command.type === "useProvision") return useProvision(state, command);
  if (state.battle?.pending) return rejectBattleCommand(state, "请先完成待选决定");
  if (
    command.type === "startBattle" &&
    state.battle?.startingProvisions &&
    !state.battle.startingProvisionsReady
  )
    return startWithProvisions(state);
  if (command.type === "resolveShuffles") return applyBattleShuffles(state);
  if (state.battle?.shuffleIntents.length) return rejectBattleCommand(state, "请先结算位移意图");
  if (command.type === "useTrinket") return useTrinket(state, command);
  if (command.type === "lootTreasureChest") return lootTreasureChest(state, command.actorId);
  if (command.type === "hideAndHeal") return hideAndHeal(state, command.actorId);
  if (command.type === "interactLoot") return interactLoot(state, command.actorId);
  if (command.type === "prepareMonsterAction") return prepareMonsterAction(state, command);
  if (command.type === "moveMonsterToRange") return moveMonsterToRange(state, command);
  if (command.type === "moveHero") return moveHero(state, command);
  if (command.type === "playHeroSkill") return playHeroSkill(state, command);
  if (command.type === "playHeroSkillTargets") return playHeroSkillTargets(state, command);
  if (command.type === "playHeroSkillEmptyArea") return playHeroSkillEmptyArea(state, command);
  if (command.type === "playMonsterSkill") return playMonsterSkill(state, command);
  if (command.type !== "ping") return applyEncounterCommand(state, command);
  return {
    state: { ...state, notes: [...state.notes, command.message] },
    events: [{ type: "pong", message: command.message }],
  };
}

/** 任一后续规则拒绝时，整次命令回滚骰子、行动和事件。 */
export function applyCommand(state: GameState, command: Command): ApplyResult {
  if (command.type === "prepareFinalBattleForms") return prepareFinalBattleForms(state);
  if (state.dungeon?.finalFormSequence && command.type === "finishDungeonBattle")
    return finishFinalBattleForm(state);
  if (state.dungeon?.finalBattleProvisions) {
    if (
      state.dungeon.finalBattleProvisions === "awaiting" &&
      (command.type === "rollDungeonProvisions" || command.type === "resolveChoice")
    )
      return setupDungeonProvisions(state, command);
    return rejectBattleCommand(state, "最终战补给准备中或已完成；最终战部署尚未接通（R36）");
  }
  if (command.type === "beginFinalBattleProvisions") return beginFinalBattleProvisions(state);
  return runTrinketCommand(state, command, applyCommandCore);
}
function applyCommandCore(state: GameState, command: Command): ApplyResult {
  const heroes = state.battle
    ? state.battle.entities.filter((e) => e.side === "hero")
    : (state.dungeon?.heroes ?? []);
  const pool = state.battle?.conditions ?? state.dungeon?.conditions;
  if (pool) {
    const problem = conditionPoolProblem(pool, heroes);
    if (problem) return rejectBattleCommand(state, problem);
  } else if (heroes.some((h) => h.diseaseId || h.quirkIds?.length))
    return rejectBattleCommand(state, "已持疾病 / 怪癖却缺少完整实体牌池（R-048）");
  if (
    heroes.some(
      (h) =>
        (h.diseaseId || h.quirkIds?.length) &&
        (!Number.isInteger(h.heroLevel ?? h.level) ||
          (h.heroLevel ?? h.level)! < 1 ||
          (h.heroLevel ?? h.level)! > 3),
    )
  )
    return rejectBattleCommand(state, "被动效果需要已核实英雄等级（R-048）");
  if (state.dungeon?.deathTrinketChoice) {
    const result =
      command.type === "resolveChoice"
        ? chooseDeathTrinket(state, command.choiceId, command.optionId)
        : rejectBattleCommand(state, "请先处置死者饰品（R31）");
    const refused = result.events.find((event) => event.type === "commandRefused");
    return refused ? rejectBattleCommand(state, refused.message) : result;
  }
  if (state.dungeon?.campaignFailure)
    return rejectBattleCommand(state, "驿站等待英雄不足，战役已失败（R9/R25/R33）");
  if (state.dungeon?.replacementPreparation)
    return command.type === "resolveChoice"
      ? chooseReplacementPreparation(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先完成替补英雄准备（R31）");
  const dispatched = applyHigherRuinsBattleSpawn(
    state,
    applyHigherRuinsHamlet(state, command, dispatchCommand(state, command)),
  );
  const result = dispatched.events.some((e) => e.type === "commandRefused")
    ? dispatched
    : continueDeathEstates(dispatched);
  const refused = result.events.find((event) => event.type === "commandRefused");
  return refused ? rejectBattleCommand(state, refused.message) : result;
}
