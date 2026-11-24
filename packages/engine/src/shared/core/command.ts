import {
  settleInventoryOverflow,
  chooseInventoryOverflow,
  withInventoryOverflow,
  finishInventoryOverflowTurn,
} from "./inventory-overflow";
import { igniteWealdOak, chooseWealdOakRefill } from "../../weald/burning-oak";
import {
  beginShriekerDungeonTheft,
  chooseShriekerTheft,
} from "../../weald/bosses/shrieker-i-provisions";
import { deployShriekerI, deployShriekerHigher } from "../../weald/bosses/shrieker-i-deploy";
import { withAbyssalPuff } from "../battle/battle-abyssal-puff";
import { applyWhisperingWoodsRoundStart } from "../../weald/whispering-woods";
import { applyFinalSwipeSpawn } from "../../weald/higher-task-effects";
import { deployPounderI, deployPounderHigher } from "../../weald/bosses/pounder-i-deploy";
import { deployHagI, deployHagHigher } from "../../weald/bosses/hag-i-deploy";
import { applyPounderIHamletThreat } from "../../weald/bosses/pounder-i-hamlet-threat";
import {
  applyPounderIRangedEntry,
  pounderDungeonThreatActive,
} from "../../weald/bosses/pounder-i-dungeon-threat";
import { bossEnabledForPacks } from "../../../../data/src/shared/content-packs";
import { chooseHagIRelease } from "../../weald/bosses/hag-i-release";
import type { MonsterSupportResolvedEvent } from "../battle/battle-monster-support";
import { stagecoachHoldingsProblem } from "../hamlet/stagecoach-holdings";
import { continuePoolRebirth, choosePoolRebirth } from "../hamlet/pool-rebirth-flow";
import { resolveExcavation } from "../../core/darkest/darkest-excavation";
import {
  prepareFinalBattleForms,
  finishFinalBattleForm,
  finalBattleCombatActive,
} from "../../core/bosses/final-form-sequence";
import { deployFinalBattleForm } from "../../core/bosses/final-battle-deploy";
import {
  deployCollectorI,
  deployCollectorII,
  deployCollectorIII,
  deployProphetI,
  deployProphetII,
  deployProphetIII,
} from "../../core/bosses/ruins-i-deploy";
import {
  deployFanaticI,
  deployFanaticII,
  deployFanaticIII,
} from "../../core/bosses/fanatic-i-deploy";
import { deployTemplarsI } from "../../core/bosses/templars-i-deploy";
import { deployShufflingHorrorI } from "../../core/bosses/shuffling-horror-i-deploy";
import { deployMammothCystI } from "../../core/bosses/mammoth-cyst-i-deploy";
import {
  deployNecromancerI,
  deployNecromancerII,
  deployNecromancerIII,
} from "../../core/bosses/necromancer-i-deploy";
import { deployDarkestMidBoss } from "../../core/bosses/darkest-mid-boss-deploy";
import { deployDarkestOrdinaryEncounter } from "../../core/darkest/darkest-ordinary-encounter-deploy";
import { beginFinalPreparation, beginFinalBattleProvisions } from "./final-preparation";
import {
  applyHigherRuinsHamlet,
  chooseHigherRuinsTheft,
} from "../../core/bosses/higher-ruins-hamlet";
import { applyHigherRuinsBattleSpawn } from "../../core/bosses/higher-ruins-threat";
import { applyCreepingDarknessUnholySpawnStress } from "./creeping-darkness-unholy-stress";
import { useCoreTrinket } from "../trinkets/core-trinket-free";
import type { UseCoreTrinketCommand } from "../trinkets/core-trinket-free";
import { runTrinketCommand } from "../trinkets/trinket-reactions";
import { chooseDamageStone } from "../battle/battle-damage-stone";
import { playHeroSkill, rejectBattleCommand } from "../battle/battle";
import {
  drawHamletEvent,
  rollHamletCaretaker,
  chooseMedicalBreakthrough,
} from "../hamlet/hamlet-event";
import { chooseCaregiversConvention } from "../hamlet/hamlet-caregivers";
import { chooseFeast } from "../hamlet/hamlet-feast";
import { chooseLaborForce } from "../hamlet/hamlet-labor-force";
import { chooseGuildTraining, chooseMilitiaTraining } from "../hamlet/hamlet-guild-training";
import { chooseTravelingMerchants } from "../hamlet/hamlet-traveling-merchants";
import { chooseWarmUpProvisionTorch } from "./warm-up-starting-provisions";
import { chooseScoutAheadReveal } from "../hamlet/hamlet-scout-ahead";
import { resolveDungeonPressure } from "../dungeon/dungeon-pressure";
import { continueDeathEstates, chooseDeathTrinket } from "../../core/heroes/hero-death-estate";
import { joinPreparedReplacements } from "../hamlet/replacement-join";
import { setDungeonStances } from "../dungeon/dungeon-stances";
import type { SetDungeonStancesCommand } from "../dungeon/dungeon-stances";
import { setHamletStances, chooseHamletStances } from "../hamlet/hamlet-stances";
import type { SetHamletStancesCommand } from "../hamlet/hamlet-stances";
import {
  beginReplacementPreparation,
  chooseReplacementPreparation,
} from "../hamlet/replacement-preparation";
import { applyHamletAction, chooseAbbeyQuirk } from "../hamlet/hamlet-actions";
import { visitNomadWagon, chooseNomadWagon } from "../hamlet/hamlet-nomad";
import { visitBlacksmith } from "../hamlet/hamlet-blacksmith";
import { visitGuild, chooseGuild } from "../hamlet/hamlet-guild";
import {
  offerNextQuest,
  chooseNextQuest,
  chooseHamletQuestDrawMode,
} from "../hamlet/hamlet-embark";
import { advanceCampaignLevel } from "../hamlet/hamlet-campaign";
import { advanceRuinsAct } from "./advance-ruins-act";
import { enterDarkestDungeon } from "../../core/darkest/darkest-entry";
import { setActiveBossThreat } from "../../core/bosses/set-active-boss-threat";
import {
  chooseHauntedGraveyard,
  hauntedHamletCommandProblem,
} from "../../core/bosses/necromancer-ii-graveyard";
import type { SetActiveBossThreatCommand } from "../../core/bosses/set-active-boss-threat";
import {
  drawImminentThreatAfterActAdvance,
  establishImminentThreat,
} from "../../core/bosses/establish-imminent-threat";
import type {
  DrawImminentThreatAfterActAdvanceCommand,
  EstablishImminentThreatCommand,
} from "../../core/bosses/establish-imminent-threat";
import type { BlacksmithCommand } from "../hamlet/hamlet-blacksmith";
import type { HamletActionCommand } from "../hamlet/hamlet-actions";
import { upgradeHamletBuilding } from "../hamlet/hamlet-buildings";
import type { UpgradeHamletBuildingCommand } from "../hamlet/hamlet-buildings";
import { setEquippedSkills } from "../../core/heroes/hero-loadout";
import type { SetEquippedSkillsCommand } from "../../core/heroes/hero-loadout";
import { applyDungeonCommand } from "../dungeon/dungeon";
import { summarizeDungeonQuest, resolveFundraiserGold } from "../dungeon/dungeon-quest";
import { restDungeon } from "../dungeon/dungeon-rest";
import {
  chooseProvisionDiscard,
  setupDungeonProvisions,
  finishQuestProvisionFlow,
} from "../dungeon/dungeon-starting-provisions";
import { useDungeonProvision } from "../dungeon/dungeon-provision-use";
import { setupForwardCamp } from "../dungeon/dungeon-forward-camp";
import {
  beginReturnToHamlet,
  chooseHamletQuirk,
  finishReturnToHamlet,
  useHamletProvision,
} from "../hamlet/hamlet-return";
import { startDungeonBattle, finishDungeonBattle } from "../dungeon/dungeon-battle";
import { conditionPoolProblem, replaceConditionQuirk } from "./conditions";
import { battleHeroCardHolders } from "../battle/battle-hero-card-holders";
import { recordMonsterSkill } from "../dungeon/encounter";
import { chooseNecromancerISummon } from "../../core/bosses/necromancer-i-combat-runtime";
import {
  applyPounderIReinforcements,
  choosePounderIReinforcements,
} from "../../weald/bosses/pounder-i-reinforcements";
import {
  applyPounderIFireInTheHole,
  settlePounderIFireContext,
} from "../../weald/bosses/pounder-i-fire";
import { chooseWealdMonsterSummon } from "../../weald/monster-summon";
import { chooseCollectorISummon } from "../../core/bosses/collector-i-combat-runtime";
import {
  applyShufflingHorrorEchoingDisassembly,
  applyShufflingHorrorUndulations,
} from "../../core/bosses/darkest-shuffling-horror-combat-runtime";
import { applyShufflingHorrorLacerate } from "../../core/bosses/darkest-shuffling-horror-skills-acc";
import { applyMammothCystSummonWhiteCell } from "../../core/bosses/darkest-mammoth-cyst-combat-runtime";
import { applyGestatingHeartSummon } from "../../core/bosses/gestating-heart-summon";
import { applyAncestor1TimeHealsAll } from "../../core/bosses/ancestor1-time-heals-all";
import { applyAncestor1PerfectReplication } from "../../core/bosses/ancestor1-perfect-replication";
import { applyAncestor1ImperfectReproduction } from "../../core/bosses/ancestor1-imperfect-reproduction";
import { applyHeartOfDarknessImpendingDoomRoll } from "../../core/bosses/heart-of-darkness-impending-doom";
import { applyAncestor2SwiftTeleportation } from "../../core/bosses/ancestor2-swift-teleportation";
import { applyAncestor2DeployAbsoluteNothingness } from "../../core/bosses/ancestor2-absolute-nothingness";
import {
  applyAncestor2EmbraceFutility,
  applyAncestor2RefashionThem,
  applyAncestor2UnmakeThemAll,
} from "../../core/bosses/ancestor2-skills-acc";
import {
  applyHeartOfDarknessDissolution,
  applyHeartOfDarknessImpendingDoomSkill,
  applyHeartOfDarknessKnowThis,
  applyHeartOfDarknessPuncture,
} from "../../core/bosses/heart-of-darkness-skills-acc";
import {
  applyTemplarImpalerBodySlam,
  applyTemplarImpalerRevelation,
  applyTemplarImpalerTorment,
  applyTemplarWarlordRevelation,
  applyTemplarWarlordStingerShot,
  applyTemplarWarlordTorment,
} from "../../core/bosses/darkest-templars-skills-acc";
import {
  applyMammothCystBulgingGaze,
  applyMammothCystDigestion,
  applyMammothCystRevivify,
} from "../../core/bosses/darkest-mammoth-cyst-skills-acc";
import {
  resolveDungeonConditionChoice,
  resolveDungeonCurioProvisionChoice,
  resolveDungeonTrinketChoice,
} from "../dungeon/dungeon-curio";
import { displaceSmallForHero } from "../battle/battle-small";
import { finishTurn } from "../dungeon/encounter";
import type { DungeonCommand, DungeonState } from "../dungeon/dungeon";
import type { BattleState, PlayHeroSkillCommand } from "../battle/battle";
import type { HeroSkillResolution } from "../../core/heroes/hero-skill";
import { playHeroSkillTargets } from "../battle/battle-hero-targets";
import { playHeroSkillEmptyArea } from "../battle/battle-empty-area";
import type { PlayHeroSkillEmptyAreaCommand } from "../battle/battle-empty-area";
import type { PlayHeroSkillTargetsCommand } from "../battle/battle-hero-targets";
import type { HeroHealthEffect, HeroHealthResolution } from "../../core/heroes/hero-health";
import { applyEncounterCommand } from "../dungeon/encounter";
import type { EncounterCommand, EncounterEvent } from "../dungeon/encounter";
import { applyBattleShuffles, chooseBalancedShuffle } from "../battle/battle-shuffle";
import { playMonsterSkill } from "../battle/battle-monster";
import type { PlayMonsterSkillCommand } from "../battle/battle-monster";
import { prepareMonsterAction } from "../battle/battle-monster-action";
import { autoMonsterTurn } from "../battle/battle-monster-auto";
import type { AutoMonsterTurnCommand } from "../battle/battle-monster-auto";
import { moveInvokingMonster } from "../battle/battle-invocation";
import { moveMonsterToRange } from "../battle/battle-monster-movement";
import type {
  MoveMonsterToRangeCommand,
  MonsterPositionedEvent,
} from "../battle/battle-monster-movement";
import { moveHero } from "../battle/battle-hero-movement";
import { consumeResolveProvision } from "./resolve-trigger";
import { lootTreasureChest, resolveBattleTrinketChoice } from "../battle/battle-trinket";
import { chooseHeroTrinket } from "../battle/battle-trinket-ability";
import { chooseAttackTrinkets } from "../battle/battle-attack-trinkets";
import { chooseMonsterRetargetAfterFreeTrinket } from "../battle/battle-monster-retarget";
import { useTrinket } from "../battle/battle-fortunate-armlet";
import type { UseTrinketCommand } from "../battle/battle-fortunate-armlet";
import { chooseEvilEyeQuirk, destroyEvilEye } from "../battle/battle-evil-eye";
import { disinfectInfectedOak } from "../battle/battle-infected-oak";
import { beginHallAscension, chooseHallAscension } from "../battle/battle-hall-ascension";
import { beginEldritchVault } from "../battle/battle-eldritch-vault";
import { hideAndHeal } from "../battle/battle-hide-and-heal";
import { interactLoot, resolveLootChoice } from "../trinkets/loot";
import { chooseStartingProvision, startWithProvisions } from "../hamlet/starting-provisions";
import { useProvision } from "./provision-use";
import type { UseProvisionCommand } from "./provision-use";
import { beginResolveTurn } from "./resolve-trigger";
import type { MoveHeroCommand, HeroMovedEvent } from "../battle/battle-hero-movement";
import type {
  MonsterActionPreparedEvent,
  PrepareMonsterActionCommand,
} from "../battle/battle-monster-action";

export type GameState = {
  readonly chainCrowding?: true;
  readonly inventoryOverflow?: true;
  readonly inventoryOverflowHold?: import("./inventory-overflow").InventoryOverflowHold;
  readonly inventoryOverflowDecision?: number;
  readonly inventoryOverflowTurn?: string;
  /** 固定战役的技能光照结算顺序，旧存档缺省沿用原顺序。 */
  readonly skillLightBeforeCrit?: true;
  readonly trinketChoice?: import("../trinkets/trinket-reactions").TrinketContinuation;
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
  /** R-230：Weald I 级技能召唤（姿态对应区域；与 necromancer 目标区路径独立）。 */
  readonly wealdSummon?: { readonly cardId: string; readonly count: 1 };
  readonly phase?: "ownPending" | "afterOwn";
  readonly type: "monsterSkillResolved";
  readonly message: string;
  readonly actorId: string;
  readonly skillSlot: number;
  readonly roll: number | null;
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

export type Command = BaseCommand & {
  readonly allTrinkets?: true | undefined;
  readonly chainCrowding?: true | undefined;
  readonly inventoryOverflow?: true | undefined;
  readonly shriekerProvisionSkipRolls?: true | undefined;
};
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
  | { readonly type: "deployFinalBattleForm"; readonly startBattle?: true | undefined }
  | { readonly type: "deployNecromancerI" }
  | { readonly type: "deployNecromancerII" }
  | { readonly type: "deployNecromancerIII" }
  | { readonly type: "deployCollectorI" }
  | { readonly type: "deployCollectorII" }
  | { readonly type: "deployCollectorIII" }
  | { readonly type: "deployProphetI" }
  | { readonly type: "deployProphetII" }
  | { readonly type: "deployProphetIII" }
  | { readonly type: "deployPounderI" }
  | { readonly type: "deployPounderHigher" }
  | { readonly type: "deployShriekerHigher" }
  | { readonly type: "deployShriekerI"; readonly shriekerSkills?: true | undefined }
  | { readonly type: "deployHagI" }
  | { readonly type: "deployHagHigher" }
  | { readonly type: "deployFanaticI" }
  | { readonly type: "deployFanaticII" }
  | { readonly type: "deployFanaticIII" }
  | { readonly type: "deployTemplarsI" }
  | { readonly type: "deployShufflingHorrorI" }
  | { readonly type: "deployMammothCystI" }
  | { readonly type: "deployDarkestMidBoss" }
  | { readonly type: "deployDarkestOrdinaryEncounter" }
  | { readonly type: "offerNextQuest" }
  | { readonly type: "advanceCampaignLevel" }
  | { readonly type: "advanceRuinsAct" }
  | { readonly type: "enterDarkestDungeon" }
  | SetActiveBossThreatCommand
  | EstablishImminentThreatCommand
  | DrawImminentThreatAfterActAdvanceCommand
  | { readonly type: "rollHamletCaretaker" }
  | DungeonCommand
  | PlayHeroSkillEmptyAreaCommand
  | UseProvisionCommand
  | { readonly type: "lootTreasureChest"; readonly actorId: string }
  | { readonly type: "destroyEvilEye"; readonly actorId: string }
  | { readonly type: "disinfectInfectedOak"; readonly actorId: string }
  | { readonly type: "igniteWealdOak"; readonly actorId: string }
  | { readonly type: "hallAscension"; readonly actorId: string }
  | { readonly type: "eldritchVault"; readonly actorId: string }
  | { readonly type: "hideAndHeal"; readonly actorId: string }
  | { readonly type: "interactLoot"; readonly actorId: string }
  | EncounterCommand
  | PlayHeroSkillCommand
  | PlayHeroSkillTargetsCommand
  | PlayMonsterSkillCommand
  | PrepareMonsterActionCommand
  | AutoMonsterTurnCommand
  | { readonly type: "applyShufflingHorrorUndulations"; readonly actorId: string }
  | { readonly type: "applyShufflingHorrorEchoingDisassembly"; readonly actorId: string }
  | { readonly type: "applyShufflingHorrorLacerate"; readonly actorId: string }
  | { readonly type: "applyMammothCystSummonWhiteCell"; readonly actorId: string }
  | { readonly type: "applyPounderIFireInTheHole"; readonly actorId: string }
  | { readonly type: "applyPounderIReinforcements"; readonly actorId: string }
  | { readonly type: "applyGestatingHeartSummon"; readonly actorId: string }
  | { readonly type: "applyAncestor1TimeHealsAll"; readonly actorId: string }
  | { readonly type: "applyAncestor1PerfectReplication"; readonly actorId: string }
  | { readonly type: "applyAncestor1ImperfectReproduction"; readonly actorId: string }
  | { readonly type: "applyHeartOfDarknessImpendingDoomRoll"; readonly actorId: string }
  | { readonly type: "applyHeartOfDarknessImpendingDoomSkill"; readonly actorId: string }
  | { readonly type: "applyAncestor2SwiftTeleportation"; readonly actorId: string }
  | { readonly type: "applyAncestor2DeployAbsoluteNothingness" }
  | { readonly type: "applyAncestor2RefashionThem"; readonly actorId: string }
  | { readonly type: "applyAncestor2UnmakeThemAll"; readonly actorId: string }
  | { readonly type: "applyAncestor2EmbraceFutility"; readonly actorId: string }
  | { readonly type: "applyHeartOfDarknessKnowThis"; readonly actorId: string }
  | { readonly type: "applyHeartOfDarknessPuncture"; readonly actorId: string }
  | { readonly type: "applyHeartOfDarknessDissolution"; readonly actorId: string }
  | { readonly type: "applyTemplarImpalerTorment"; readonly actorId: string }
  | { readonly type: "applyTemplarImpalerBodySlam"; readonly actorId: string }
  | { readonly type: "applyTemplarImpalerRevelation"; readonly actorId: string }
  | { readonly type: "applyTemplarWarlordTorment"; readonly actorId: string }
  | { readonly type: "applyTemplarWarlordStingerShot"; readonly actorId: string }
  | { readonly type: "applyTemplarWarlordRevelation"; readonly actorId: string }
  | { readonly type: "applyMammothCystBulgingGaze"; readonly actorId: string }
  | { readonly type: "applyMammothCystDigestion"; readonly actorId: string }
  | { readonly type: "applyMammothCystRevivify"; readonly actorId: string }
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
  | MonsterSupportResolvedEvent
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
      readonly kind: import("../trinkets/loot").LootKind;
      readonly message: string;
    }
  | {
      readonly type: "lootResolved";
      readonly actorId: string;
      readonly tokenId: string;
      readonly kind: import("../trinkets/loot").LootKind;
      readonly reward:
        | { readonly gold: number }
        | { readonly face: import("../trinkets/loot").ProvisionFace }
        | { readonly ignoredProvisions: number };
      readonly message: string;
    }
  | {
      readonly type: "provisionSelected";
      readonly actorId: string;
      readonly face: import("../trinkets/loot").ProvisionFace;
      readonly message: string;
    }
  | {
      readonly type: "provisionRolled";
      readonly actorId: string;
      readonly face: import("../trinkets/loot").ProvisionFace | "wild";
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
      readonly face: import("../trinkets/loot").ProvisionFace;
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
      /** Q-163：纯自身技能的治疗量与 Remove Bleed / Blight。 */
      readonly selfHeal?: number;
      readonly cleanse?: true;
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
function dispatchCommand(
  state: GameState,
  command: Command,
  legacyCardReview: boolean,
): ApplyResult {
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
  if (state.dungeon?.pending?.id.startsWith("hamlet-quest-draw:"))
    return command.type === "resolveChoice"
      ? chooseHamletQuestDrawMode(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先选择任务抽法");
  if (state.dungeon?.pending?.id.startsWith("hamlet-next-quest:"))
    return command.type === "resolveChoice"
      ? chooseNextQuest(state, command.choiceId, command.optionId, command.bossEdgeRooms ?? false)
      : rejectBattleCommand(state, "请先选择下一任务");
  if (command.type === "offerNextQuest") return offerNextQuest(state);
  if (command.type === "advanceCampaignLevel") return advanceCampaignLevel(state);
  if (command.type === "advanceRuinsAct") return advanceRuinsAct(state);
  if (command.type === "enterDarkestDungeon") return enterDarkestDungeon(state);
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
  if (command.type === "drawHamletEvent") return drawHamletEvent(state, legacyCardReview);
  if (command.type === "beginFinalPreparation") return beginFinalPreparation(state);
  if (command.type === "prepareFinalBattleForms") return prepareFinalBattleForms(state);
  if (command.type === "beginFinalBattleProvisions") return beginFinalBattleProvisions(state);
  if (command.type === "rollHamletCaretaker") return rollHamletCaretaker(state);
  if (command.type === "beginReturnToHamlet") return beginReturnToHamlet(state);
  if (command.type === "finishReturnToHamlet") return finishReturnToHamlet(state);
  if (state.dungeon?.hamletReturn && !finalBattleCombatActive(state)) {
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
  if (state.dungeon?.pending?.id.startsWith("dungeon-provision-discard:"))
    return command.type === "resolveChoice"
      ? chooseProvisionDiscard(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先选择要丢弃的既有补给（R-205）");
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
          command.optionId as import("../trinkets/loot").ProvisionFace,
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
  if (command.type === "deployCollectorI") return deployCollectorI(state);
  if (command.type === "deployCollectorII") return deployCollectorII(state);
  if (command.type === "deployCollectorIII") return deployCollectorIII(state);
  if (command.type === "deployProphetI") return deployProphetI(state);
  if (command.type === "deployProphetII") return deployProphetII(state);
  if (command.type === "deployProphetIII") return deployProphetIII(state);
  if (command.type === "deployShriekerHigher") return deployShriekerHigher(state);
  if (command.type === "deployShriekerI") return deployShriekerI(state, command);
  if (command.type === "deployPounderI") return deployPounderI(state);
  if (command.type === "deployPounderHigher") return deployPounderHigher(state);
  if (command.type === "deployHagI") return deployHagI(state);
  if (command.type === "deployHagHigher") return deployHagHigher(state);
  if (command.type === "deployFanaticI") return deployFanaticI(state);
  if (command.type === "deployFanaticII") return deployFanaticII(state);
  if (command.type === "deployFanaticIII") return deployFanaticIII(state);
  if (command.type === "deployNecromancerI") return deployNecromancerI(state);
  if (command.type === "deployNecromancerII") return deployNecromancerII(state);
  if (command.type === "deployNecromancerIII") return deployNecromancerIII(state);
  if (command.type === "deployTemplarsI") return deployTemplarsI(state);
  if (command.type === "deployShufflingHorrorI") return deployShufflingHorrorI(state);
  if (command.type === "deployMammothCystI") return deployMammothCystI(state);
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
    if (pending?.type === "shriekerTheft")
      return rejectBattleCommand(state, "缺少 Shrieker 公共补给上下文");
    if (
      !pending ||
      pending.choice.id !== command.choiceId ||
      !pending.choice.options.some((option) => option.id === command.optionId)
    ) {
      return rejectBattleCommand(state, "选择不存在、已过期或选项无效");
    }
    if (pending.type === "necromancerSummon")
      return chooseNecromancerISummon(state, command.optionId);
    if (pending.type === "pounderReinforcements")
      return choosePounderIReinforcements(state, command.optionId);
    if (pending.type === "inventoryOverflow")
      return rejectBattleCommand(state, "补给超额续接上下文缺失");
    if (pending.type === "wealdOakRefill") return chooseWealdOakRefill(state, command.optionId);
    if (pending.type === "wealdSummon") return chooseWealdMonsterSummon(state, command.optionId);
    if (pending.type === "hagRelease") return chooseHagIRelease(state, command.optionId);
    if (pending.type === "allTrinkets") return rejectBattleCommand(state, "饰品续接上下文缺失");
    if (pending.type === "monsterRetarget")
      return chooseMonsterRetargetAfterFreeTrinket(state, command.optionId);
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
        battleHeroCardHolders(b),
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
              entities: b.entities.map((e) => ({
                ...e,
                ...applied.heroes.find((h) => h.id === e.id),
              })),
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
    if (pending.type === "evilEyeQuirk") return chooseEvilEyeQuirk(state, command.optionId);
    if (pending.type === "hallAscension") return chooseHallAscension(state, command.optionId);
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
    if (pending.type === "shufflePushDistance") {
      const dist = Number(command.optionId);
      if (!Number.isInteger(dist) || dist < 1) return rejectBattleCommand(state, "Push 距离无效");
      return playHeroSkill(state, { ...pending.command, shufflePushDistance: dist });
    }
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
  if (command.type === "destroyEvilEye") return destroyEvilEye(state, command.actorId);
  if (command.type === "igniteWealdOak") return igniteWealdOak(state, command.actorId);
  if (command.type === "disinfectInfectedOak") return disinfectInfectedOak(state, command.actorId);
  if (command.type === "hallAscension") return beginHallAscension(state, command.actorId);
  if (command.type === "eldritchVault") return beginEldritchVault(state, command.actorId);
  if (command.type === "hideAndHeal") return hideAndHeal(state, command.actorId);
  if (command.type === "interactLoot") return interactLoot(state, command.actorId);
  if (command.type === "prepareMonsterAction") return prepareMonsterAction(state, command);
  if (command.type === "autoMonsterTurn") return autoMonsterTurn(state, command);
  if (command.type === "applyShufflingHorrorUndulations")
    return applyShufflingHorrorUndulations(state, command.actorId);
  if (command.type === "applyShufflingHorrorEchoingDisassembly")
    return applyShufflingHorrorEchoingDisassembly(state, command.actorId);
  if (command.type === "applyShufflingHorrorLacerate")
    return applyShufflingHorrorLacerate(state, command.actorId);
  if (command.type === "applyMammothCystSummonWhiteCell")
    return applyMammothCystSummonWhiteCell(state, command.actorId);
  if (command.type === "applyPounderIFireInTheHole")
    return applyPounderIFireInTheHole(state, command.actorId);
  if (command.type === "applyPounderIReinforcements")
    return applyPounderIReinforcements(state, command.actorId);
  if (command.type === "applyGestatingHeartSummon")
    return applyGestatingHeartSummon(state, command.actorId);
  if (command.type === "applyAncestor1TimeHealsAll")
    return applyAncestor1TimeHealsAll(state, command.actorId);
  if (command.type === "applyAncestor1PerfectReplication")
    return applyAncestor1PerfectReplication(state, command.actorId);
  if (command.type === "applyAncestor1ImperfectReproduction")
    return applyAncestor1ImperfectReproduction(state, command.actorId);
  if (command.type === "applyHeartOfDarknessImpendingDoomRoll")
    return applyHeartOfDarknessImpendingDoomRoll(state, command.actorId);
  if (command.type === "applyHeartOfDarknessImpendingDoomSkill")
    return applyHeartOfDarknessImpendingDoomSkill(state, command.actorId);
  if (command.type === "applyAncestor2SwiftTeleportation")
    return applyAncestor2SwiftTeleportation(state, command.actorId);
  if (command.type === "applyAncestor2DeployAbsoluteNothingness")
    return applyAncestor2DeployAbsoluteNothingness(state);
  if (command.type === "applyAncestor2RefashionThem")
    return applyAncestor2RefashionThem(state, command.actorId);
  if (command.type === "applyAncestor2UnmakeThemAll")
    return applyAncestor2UnmakeThemAll(state, command.actorId);
  if (command.type === "applyAncestor2EmbraceFutility")
    return applyAncestor2EmbraceFutility(state, command.actorId);
  if (command.type === "applyHeartOfDarknessKnowThis")
    return applyHeartOfDarknessKnowThis(state, command.actorId);
  if (command.type === "applyHeartOfDarknessPuncture")
    return applyHeartOfDarknessPuncture(state, command.actorId);
  if (command.type === "applyHeartOfDarknessDissolution")
    return applyHeartOfDarknessDissolution(state, command.actorId);
  if (command.type === "applyTemplarImpalerTorment")
    return applyTemplarImpalerTorment(state, command.actorId);
  if (command.type === "applyTemplarImpalerBodySlam")
    return applyTemplarImpalerBodySlam(state, command.actorId);
  if (command.type === "applyTemplarImpalerRevelation")
    return applyTemplarImpalerRevelation(state, command.actorId);
  if (command.type === "applyTemplarWarlordTorment")
    return applyTemplarWarlordTorment(state, command.actorId);
  if (command.type === "applyTemplarWarlordStingerShot")
    return applyTemplarWarlordStingerShot(state, command.actorId);
  if (command.type === "applyTemplarWarlordRevelation")
    return applyTemplarWarlordRevelation(state, command.actorId);
  if (command.type === "applyMammothCystBulgingGaze")
    return applyMammothCystBulgingGaze(state, command.actorId);
  if (command.type === "applyMammothCystDigestion")
    return applyMammothCystDigestion(state, command.actorId);
  if (command.type === "applyMammothCystRevivify")
    return applyMammothCystRevivify(state, command.actorId);
  if (command.type === "moveMonsterToRange") return moveMonsterToRange(state, command);
  if (command.type === "moveHero") return moveHero(state, command);
  if (command.type === "playHeroSkill") return playHeroSkill(state, command);
  if (command.type === "playHeroSkillTargets") return playHeroSkillTargets(state, command);
  if (command.type === "playHeroSkillEmptyArea") return playHeroSkillEmptyArea(state, command);
  if (command.type === "playMonsterSkill") return playMonsterSkill(state, command);
  if (command.type !== "ping") {
    if (command.type === "deployFinalBattleForm")
      return rejectBattleCommand(state, "部署命令须于村庄最终战停点执行（R36）");
    if (command.type === "deployDarkestMidBoss")
      return rejectBattleCommand(state, "deployDarkestMidBoss 须于最暗 Boss 目标房停点执行（R36）");
    if (command.type === "deployDarkestOrdinaryEncounter")
      return rejectBattleCommand(
        state,
        "deployDarkestOrdinaryEncounter 须于最暗普通房停点执行（R36）",
      );
    return applyEncounterCommand(state, command);
  }
  return {
    state: { ...state, notes: [...state.notes, command.message] },
    events: [{ type: "pong", message: command.message }],
  };
}

/** R-266：新命令显式启用；旧无标记命令严格保留历史容量行为。 */
export function applyCommand(state: GameState, command: Command, legacy = false): ApplyResult {
  if (command.chainCrowding && !state.chainCrowding) {
    if (
      state.battle?.pending ||
      state.dungeon?.pending ||
      state.trinketChoice ||
      state.inventoryOverflowHold
    )
      return rejectBattleCommand(state, "R-271：须先完成当前待选再切换挤占版本");
    const result = applyCommand({ ...state, chainCrowding: true }, command, legacy);
    return result.events.some((e) => e.type === "commandRefused") ? { ...result, state } : result;
  }
  if (command.shriekerProvisionSkipRolls && !state.dungeon?.shriekerProvisionSkipRolls) {
    const d = state.dungeon;
    if (
      !d ||
      !d.contentPacks?.includes("weald") ||
      !(
        d.wealdHigherBosses ||
        (command.type === "establishImminentThreat" && command.wealdHigherBosses)
      ) ||
      d.pending ||
      state.battle?.pending ||
      state.trinketChoice ||
      state.inventoryOverflowHold
    )
      return rejectBattleCommand(
        state,
        "R-270：跳过补给骰版本需要完整Weald高等级版本，且须先完成当前待选",
      );
    const result = applyCommand(
      { ...state, dungeon: { ...d, shriekerProvisionSkipRolls: true } },
      command,
      legacy,
    );
    return result.events.some((e) => e.type === "commandRefused") ? { ...result, state } : result;
  }
  if (state.inventoryOverflowHold) {
    const chosen = chooseInventoryOverflow(state, command);
    const refused = chosen.events.find((e) => e.type === "commandRefused");
    return refused ? rejectBattleCommand(state, refused.message) : chosen;
  }
  const enabled =
    state.inventoryOverflow === true ||
    command.inventoryOverflow === true ||
    state.dungeon?.wealdHigherBosses === true ||
    (command.type === "establishImminentThreat" && command.wealdHigherBosses === true);
  const input = enabled ? withInventoryOverflow(state) : state;
  const result = runCommand(input, command, legacy);
  if (result.events.some((e) => e.type === "commandRefused")) return { ...result, state };
  const settled = enabled
    ? settleInventoryOverflow({ ...result, state: withInventoryOverflow(result.state) })
    : result;
  const refused = settled.events.find((e) => e.type === "commandRefused");
  return refused ? rejectBattleCommand(state, refused.message) : settled;
}

/** 任一后续规则拒绝时，整次命令回滚骰子、行动和事件。 */
function runCommand(
  state: GameState,
  command: Command,
  replayLegacyCardReview = false,
): ApplyResult {
  if (state.inventoryOverflowTurn) return finishInventoryOverflowTurn(state, command);
  const d = state.dungeon;
  if (d?.shriekerTheft) {
    const resolveTheft = (current: GameState, chosen: Command) =>
      chosen.type === "resolveChoice"
        ? chooseShriekerTheft(current, chosen.choiceId, chosen.optionId, (next) =>
            finishQuestProvisionFlow(next, [], true),
          )
        : rejectBattleCommand(current, "请先完成 Shrieker 补给弃置");
    return d.shriekerTheft.finishTurnActorId
      ? runTrinketCommand(state, command, resolveTheft, replayLegacyCardReview)
      : resolveTheft(state, command);
  }
  if (state.battle?.shriekerISetupHold)
    return rejectBattleCommand(
      state,
      "Shrieker I 技能、威胁与 Nest 运行时尚未接入，停在开战前（R-261）",
    );
  if (
    d?.contentPacks &&
    d.activeBossThreatScriptId &&
    !bossEnabledForPacks(d.contentPacks, d.activeBossThreatScriptId)
  )
    return rejectBattleCommand(state, "当前 Boss 所属扩展包未启用");
  if (d && (d.stagecoachHeroes || d.conditions?.reservedHeroes || d.trinkets?.reservedHeroes)) {
    const problem =
      stagecoachHoldingsProblem(d) ??
      (state.battle
        ? stagecoachHoldingsProblem({
            ...d,
            conditions: state.battle.conditions ?? d.conditions,
            trinkets: state.battle.trinkets ?? d.trinkets,
          })
        : null);
    if (problem) return rejectBattleCommand(state, problem);
  }
  /** R9/R41：Heart of Darkness 被击败即战役胜利；终局不再接受命令，避免胜利后被改写。 */
  if (d?.campaignVictory)
    return rejectBattleCommand(
      state,
      "战役已胜利（R9、R41）：最终战全部形态已击败，终局不接受进一步命令",
    );
  /** R-044：最终战英雄全灭 = 战役失败，同为终局，拒绝任何续战/换形态命令。 */
  if (d?.finalFormSequence && d.campaignFailure)
    return rejectBattleCommand(state, "战役已失败（R-044）：最终战不再接受部署、战斗或结算命令");
  if (command.type === "prepareFinalBattleForms") return prepareFinalBattleForms(state);
  if (command.type === "deployFinalBattleForm") {
    const deployed = deployFinalBattleForm(state);
    if (!command.startBattle || deployed.events.some((e) => e.type === "commandRefused"))
      return deployed;
    const started = applyEncounterCommand(deployed.state, { type: "startBattle" });
    if (started.events.some((e) => e.type === "commandRefused"))
      return { state, events: started.events };
    return { ...started, events: [...deployed.events, ...started.events] };
  }
  if (command.type === "deployTemplarsI") return deployTemplarsI(state);
  if (command.type === "deployShufflingHorrorI") return deployShufflingHorrorI(state);
  if (command.type === "deployMammothCystI") return deployMammothCystI(state);
  if (command.type === "deployDarkestMidBoss") return deployDarkestMidBoss(state);
  if (command.type === "deployDarkestOrdinaryEncounter")
    return deployDarkestOrdinaryEncounter(state);
  if (
    state.dungeon?.finalFormSequence?.status === "fighting" &&
    state.battle &&
    command.type !== "finishDungeonBattle"
  )
    return runTrinketCommand(state, command, applyCommandCore, replayLegacyCardReview);
  if (state.dungeon?.finalFormSequence && command.type === "finishDungeonBattle")
    return finishFinalBattleForm(state);
  if (state.dungeon?.finalBattleProvisions) {
    if (
      state.dungeon.finalBattleProvisions === "awaiting" &&
      (command.type === "rollDungeonProvisions" || command.type === "resolveChoice")
    )
      return setupDungeonProvisions(state, command);
    if (state.dungeon.finalFormSequence)
      return rejectBattleCommand(
        state,
        "最终战形态流程中；请部署当前形态或使用已接战斗命令，不能走普通村庄/探索流程（R36）",
      );
    return rejectBattleCommand(state, "最终战补给准备中或已完成；须先建立形态流程（R36）");
  }
  if (command.type === "beginFinalBattleProvisions") return beginFinalBattleProvisions(state);
  return runTrinketCommand(state, command, applyCommandCore, replayLegacyCardReview);
}
function applyCommandCore(
  state: GameState,
  command: Command,
  legacyCardReview: boolean,
): ApplyResult {
  if (
    pounderDungeonThreatActive(state) &&
    !state.dungeon?.pounderHamletThreats &&
    state.dungeon?.phase === "inHamlet"
  )
    return rejectBattleCommand(state, "Pounder 村庄轰炸与日末续接尚未开放，保留回村进度");
  const heroes = state.battle ? battleHeroCardHolders(state.battle) : (state.dungeon?.heroes ?? []);
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
    return refused ? rejectBattleCommand(state, refused.message) : continuePoolRebirth(result);
  }
  if (state.dungeon?.campaignFailure)
    return rejectBattleCommand(
      state,
      state.dungeon.campaignFailure === "bossQuestHeroesDefeated"
        ? "Boss任务英雄全灭，战役已失败（R-044）"
        : "驿站等待英雄不足，战役已失败（R9/R25/R33）",
    );
  if (state.dungeon?.pending?.id.startsWith("pool-rebirth:")) {
    const chosen =
      command.type === "resolveChoice"
        ? choosePoolRebirth(state, command.choiceId, command.optionId)
        : rejectBattleCommand(state, "请先完成重生池复活或放弃选择");
    return chosen.events.some((e) => e.type === "commandRefused")
      ? chosen
      : continuePoolRebirth(continueDeathEstates(chosen));
  }
  if (state.dungeon?.replacementPreparation)
    return command.type === "resolveChoice"
      ? chooseReplacementPreparation(state, command.choiceId, command.optionId)
      : rejectBattleCommand(state, "请先完成替补英雄准备（R31）");
  const dispatched = applyPounderIRangedEntry(
    state,
    applyPounderIHamletThreat(
      state,
      command,
      applyCreepingDarknessUnholySpawnStress(
        state,
        applyHigherRuinsBattleSpawn(
          state,
          applyHigherRuinsHamlet(state, command, dispatchCommand(state, command, legacyCardReview)),
        ),
      ),
    ),
  );
  const result = dispatched.events.some((e) => e.type === "commandRefused")
    ? dispatched
    : continuePoolRebirth(
        continueDeathEstates(applyWhisperingWoodsRoundStart(state, command, dispatched)),
      );
  const puff = withAbyssalPuff(state, applyFinalSwipeSpawn(state, result));
  const refused = puff.events.find((event) => event.type === "commandRefused");
  return refused
    ? rejectBattleCommand(state, refused.message)
    : beginShriekerDungeonTheft(state, settlePounderIFireContext(puff));
}
