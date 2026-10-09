import { distance, rejectBattleCommand, writeResolution } from "./battle";
import type { ApplyResult, GameState, MonsterSkillResolvedEvent, PendingChoice } from "./command";
import { nextBattleRoll, recordMonsterSkill } from "./encounter";
import { needsMonsterSkillShuffleChoice, resolveMonsterSkill } from "./monster-skill";
import type { MonsterCombatState } from "./monster-skill";
import type { ShuffleIntent } from "./shuffle";

/** 调用方手动指定已选技能 / 单个目标；不执行姿态选招、目标 AI 或移动。 */
export type PlayMonsterSkillCommand = {
  readonly type: "playMonsterSkill";
  readonly actorId: string;
  readonly targetId: string;
  readonly skillSlot: number;
  readonly shuffleChoice?: "push" | "pull";
};

/** 说明书 §6.5、§6.10（R19–24）；共享技能骰与先攻 RNG。 */
export function playMonsterSkill(state: GameState, command: PlayMonsterSkillCommand): ApplyResult {
  const battle = state.battle;
  if (!battle) return rejectBattleCommand(state, "尚未创建战斗沙盒");
  const turn = battle.encounter?.turn;
  if (turn && (turn.type !== "monster" || turn.actorId !== command.actorId))
    return rejectBattleCommand(state, "当前不是这只怪物的行动回合");
  const actor = battle.entities.find((entry) => entry.id === command.actorId);
  const target = battle.entities.find((entry) => entry.id === command.targetId);
  const card = battle.monsters?.find((entry) => entry.id === actor?.monsterCardId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    !target ||
    target.side !== "hero" ||
    target.dead ||
    !card
  )
    return rejectBattleCommand(state, "怪物、英雄目标或已关联怪物卡不可用");
  if (actor.life !== card.life)
    return rejectBattleCommand(state, "怪物 Life 与规范化卡不一致（R-048）");
  const areaDistance = distance(battle.areas, actor.areaId, target.areaId);
  if (areaDistance === null) return rejectBattleCommand(state, "英雄目标区域不可达");
  const heights = { low: 0, normal: 1, high: 2 };
  const actorArea = battle.areas.find((entry) => entry.id === actor.areaId)!;
  const targetArea = battle.areas.find((entry) => entry.id === target.areaId)!;
  // MonsterCombatState 不含英雄专用的压力 / 形态 / 姿态字段。
  const combat: MonsterCombatState = {
    actor: {
      id: actor.id,
      wounds: actor.wounds,
      ...(actor.buffStacks === undefined ? {} : { buffStacks: actor.buffStacks }),
      ...(actor.shuffleResist === undefined ? {} : { shuffleResist: actor.shuffleResist }),
    },
    target,
    areaDistance,
    light: battle.light,
    targetAreaLower: heights[actorArea.elevation] > heights[targetArea.elevation],
    guardedHeroOmitted:
      !target.guard &&
      battle.entities.some((entry) => entry.side === "hero" && !entry.dead && entry.guard),
    untargetedHeroesBesideTarget: battle.entities
      .filter(
        (entry) =>
          entry.side === "hero" &&
          !entry.dead &&
          entry.id !== target.id &&
          entry.areaId === target.areaId,
      )
      .map((entry) => ({ id: entry.id, stress: entry.stress! })),
    ...(command.shuffleChoice === undefined ? {} : { shuffleChoice: command.shuffleChoice }),
  };
  const needsChoice =
    command.shuffleChoice === undefined && needsMonsterSkillShuffleChoice(card, command.skillSlot);
  const probe = resolveMonsterSkill(
    card,
    command.skillSlot,
    { ...combat, ...(needsChoice ? { shuffleChoice: "push" as const } : {}) },
    1,
  );
  if (probe.status === "refused") return rejectBattleCommand(state, probe.reason);
  if (needsChoice) {
    const choice: PendingChoice = {
      id: `monster-shuffle:${battle.choiceCursor}:${actor.id}:${command.skillSlot}:${target.id}`,
      prompt: "选择怪物技能的位移方向",
      actorId: target.id,
      options: [
        { id: "push", label: "推离 Push" },
        { id: "pull", label: "拉近 Pull" },
      ],
    };
    return {
      state: {
        ...state,
        battle: {
          ...battle,
          choiceCursor: battle.choiceCursor + 1,
          pending: { type: "shuffleDirection", choice, command: { ...command } },
        },
      },
      events: [],
      pendingChoice: choice,
    };
  }
  const roll = nextBattleRoll(state.seed, battle.rngCursor);
  const result = resolveMonsterSkill(card, command.skillSlot, combat, roll);
  if (result.status === "refused") return rejectBattleCommand(state, result.reason);
  const event: MonsterSkillResolvedEvent = {
    type: "monsterSkillResolved",
    message: "已选怪物攻击已结算",
    actorId: actor.id,
    skillSlot: command.skillSlot,
    roll,
    actorDead: result.actorDead,
    resolution: result.resolution,
  };
  const intents: ShuffleIntent[] = [];
  if (result.resolution.actorShuffle)
    intents.push({
      entityId: actor.id,
      relativeToId: target.id,
      move: result.resolution.actorShuffle,
    });
  if (result.resolution.targetShuffle)
    intents.push({
      entityId: target.id,
      relativeToId: actor.id,
      move: result.resolution.targetShuffle,
    });
  const applied: ApplyResult = {
    state: {
      ...state,
      battle: {
        ...battle,
        pending: null,
        rngCursor: battle.rngCursor + 1,
        entities: battle.entities.map((entry) => {
          const updated = writeResolution(entry, actor.id, target.id, result.resolution, false);
          return entry.id === actor.id ? { ...updated, dead: result.actorDead } : updated;
        }),
        shuffleIntents: intents,
        shuffleContinuation: intents.length
          ? {
              ...event,
              ...(result.resolution.outcome === "crit"
                ? { criticalContext: { combat, entities: battle.entities } }
                : {}),
            }
          : null,
      },
    },
    events: [event],
  };
  return intents.length ? applied : recordMonsterSkill(applied, event);
}
