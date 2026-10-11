import { playHeroSkill, rejectBattleCommand } from "./battle";
import type { BattleState, PlayHeroSkillCommand } from "./battle";
import type { HeroSkillResolution } from "./hero-skill";
import { playHeroSkillTargets } from "./battle-hero-targets";
import type { PlayHeroSkillTargetsCommand } from "./battle-hero-targets";
import type { HeroHealthEffect, HeroHealthResolution } from "./hero-health";
import { applyEncounterCommand } from "./encounter";
import type { EncounterCommand, EncounterEvent } from "./encounter";
import { applyBattleShuffles } from "./battle-shuffle";
import { playMonsterSkill } from "./battle-monster";
import type { PlayMonsterSkillCommand } from "./battle-monster";
import { prepareMonsterAction } from "./battle-monster-action";
import { moveMonsterToRange } from "./battle-monster-movement";
import type { MoveMonsterToRangeCommand, MonsterPositionedEvent } from "./battle-monster-movement";
import { moveHero } from "./battle-hero-movement";
import { consumeResolveProvision } from "./resolve-trigger";
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
  readonly seed: number;
  readonly notes: readonly string[];
  readonly battle?: BattleState;
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
  readonly type: "heroSkillResolved";
  readonly message: string;
  readonly actorId: string;
  readonly roll: number | null;
  readonly resolution: HeroSkillResolution;
};

export type HeroSkillTargetsResolvedEvent = {
  readonly type: "heroSkillTargetsResolved";
  readonly message: string;
  readonly actorId: string;
  readonly roll: number | null;
  readonly resolutions: readonly HeroSkillResolution[];
};

export type MonsterSkillResolvedEvent = {
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

export type Command =
  | UseProvisionCommand
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
    }
  | {
      readonly type: "ping";
      readonly message: string;
    };

export type GameEvent =
  | {
      readonly type: "lootRevealed" | "lootResolved";
      readonly actorId: string;
      readonly tokenId: string;
      readonly kind: import("./loot").LootKind;
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
      readonly roll: number;
      readonly triggered: boolean;
      readonly message: string;
    }
  | {
      readonly type: "provisionConsumed";
      readonly entityId: string;
      readonly provisionId: string;
      readonly message: string;
    }
  | { readonly type: "heartAttack"; readonly entityId: string; readonly message: string }
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
  if (command.type === "resolveChoice") {
    const pending = state.battle?.pending;
    if (
      !pending ||
      pending.choice.id !== command.choiceId ||
      !pending.choice.options.some((option) => option.id === command.optionId)
    ) {
      return rejectBattleCommand(state, "选择不存在、已过期或选项无效");
    }
    if (pending.type === "shuffleArea")
      return applyBattleShuffles(state, [...pending.path, command.optionId]);
    if (pending.type === "resolveProvision")
      return consumeResolveProvision(state, command.optionId);
    if (pending.type === "lootReward") return resolveLootChoice(state, command.optionId);
    if (pending.type === "startingProvision")
      return chooseStartingProvision(state, command.optionId);
    if (pending.type === "turnStartProvision")
      return beginResolveTurn(
        { state: { ...state, battle: { ...state.battle!, pending: null } }, events: [] },
        pending.actorId,
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
  if (command.type === "interactLoot") return interactLoot(state, command.actorId);
  if (command.type === "prepareMonsterAction") return prepareMonsterAction(state, command);
  if (command.type === "moveMonsterToRange") return moveMonsterToRange(state, command);
  if (command.type === "moveHero") return moveHero(state, command);
  if (command.type === "playHeroSkill") return playHeroSkill(state, command);
  if (command.type === "playHeroSkillTargets") return playHeroSkillTargets(state, command);
  if (command.type === "playMonsterSkill") return playMonsterSkill(state, command);
  if (command.type !== "ping") return applyEncounterCommand(state, command);
  return {
    state: { ...state, notes: [...state.notes, command.message] },
    events: [{ type: "pong", message: command.message }],
  };
}

/** 任一后续规则拒绝时，整次命令回滚骰子、行动和事件。 */
export function applyCommand(state: GameState, command: Command): ApplyResult {
  const result = dispatchCommand(state, command);
  const refused = result.events.find((event) => event.type === "commandRefused");
  return refused ? rejectBattleCommand(state, refused.message) : result;
}
