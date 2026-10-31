import { distance, rejectBattleCommand, type BattleEntity, type BattleState } from "../battle";
import { playMonsterSkill } from "../battle-monster";
import type { ApplyResult, GameState } from "../command";
import { selectMonsterTarget, type MonsterTargetHero } from "../monster-target";
import { readMonsterAttackView } from "../monster-skill";
import {
  HEART_OF_DARKNESS_MONSTER_CARD_ID,
  impendingDoomSkillLabelFromDie,
  impendingDoomSkillSlotFromDie,
} from "./heart-of-darkness-impending-doom";
import { readFinalFormSequence } from "./final-form-sequence";

/** `monster_large:p020` · boss_ability:p037 三招 Acc/Crit/伤害（效果线 hold 至 verified_monster_effects）。 */
export const KNOW_THIS_SKILL_SLOT = 1;
export const PUNCTURE_SKILL_SLOT = 2;
export const DISSOLUTION_SKILL_SLOT = 3;

function heartOfDarknessActive(state: GameState): boolean {
  const sequence = readFinalFormSequence(state);
  return sequence?.current?.id === "heartOfDarkness" && sequence.progress.status === "fighting";
}

function resolveHeartOfDarknessActor(
  state: GameState,
  actorId: string,
  skillLabel: string,
): { readonly battle: BattleState; readonly actor: BattleEntity } | ApplyResult {
  const battle = state.battle;
  if (!battle?.encounter) return rejectBattleCommand(state, "尚未进入战斗回合");
  if (!heartOfDarknessActive(state))
    return rejectBattleCommand(
      state,
      `${skillLabel} 仅适用于最终战 Heart of Darkness 形态（boss_ability:p037）`,
    );
  const turn = battle.encounter.turn;
  if (turn?.type !== "monster" || turn.actorId !== actorId)
    return rejectBattleCommand(
      state,
      `${skillLabel} 须于 Heart of Darkness 怪物回合执行（boss_ability:p037）`,
    );
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    actor.monsterCardId !== HEART_OF_DARKNESS_MONSTER_CARD_ID
  )
    return rejectBattleCommand(state, `仅 Heart of Darkness 实体可执行 ${skillLabel}（R-048）`);
  if (actor.life === undefined)
    return rejectBattleCommand(state, "Heart of Darkness 缺少 Life（R-048）");
  return { battle, actor };
}

function selectPrintedHeroTarget(
  state: GameState,
  battle: BattleState,
  actor: BattleEntity,
  skillSlot: number,
  skillLabel: string,
): { readonly targetId: string } | ApplyResult {
  const card = battle.monsters?.find((entry) => entry.id === actor.monsterCardId);
  if (!card) return rejectBattleCommand(state, "Heart of Darkness 战斗目录缺失（R-048）");
  const attack = readMonsterAttackView(card, skillSlot);
  if (attack.status === "refused") return rejectBattleCommand(state, attack.reason);
  const heroes: MonsterTargetHero[] = [];
  for (const hero of battle.entities.filter((entry) => entry.side === "hero" && !entry.dead)) {
    if (
      !battle.areas.some((area) => area.id === actor.areaId) ||
      !battle.areas.some((area) => area.id === hero.areaId)
    )
      return rejectBattleCommand(state, "角色区域不在已核实几何内（R-048）");
    heroes.push({
      id: hero.id,
      areaId: hero.areaId,
      stance: hero.stance!,
      areaDistance: distance(battle.areas, actor.areaId, hero.areaId),
      wounds: hero.wounds,
      stress: hero.stress!,
      markStacks: hero.markStacks ?? 0,
      guard: hero.guard,
      dead: hero.dead,
    });
  }
  const picked = selectMonsterTarget(
    {
      verification: card.verification,
      skills: card.skills.map((skill) => ({ slot: skill.slot, target: skill.target ?? null })),
    },
    skillSlot,
    heroes,
  );
  if (picked.status === "refused") return rejectBattleCommand(state, picked.reason);
  if (picked.status === "noFiniteTarget")
    return rejectBattleCommand(state, `${skillLabel}：无卡面目标优先级下的有限距离英雄（R-048）`);
  return { targetId: picked.targetId };
}

function runHeartOfDarknessSkillAcc(
  state: GameState,
  actorId: string,
  skillSlot: number,
  skillLabel: string,
): ApplyResult {
  const resolved = resolveHeartOfDarknessActor(state, actorId, skillLabel);
  if ("events" in resolved) return resolved;
  const { battle, actor } = resolved;
  const card = battle.monsters?.find((entry) => entry.id === actor.monsterCardId);
  if (!card || actor.life !== card.life)
    return rejectBattleCommand(state, "Heart of Darkness Life 与规范化卡不一致（R-048）");
  const targetPick = selectPrintedHeroTarget(state, battle, actor, skillSlot, skillLabel);
  if ("events" in targetPick) return targetPick;

  const prepared: GameState = {
    ...state,
    battle: {
      ...battle,
      monsterAction: {
        actorId: actor.id,
        skillSlot,
        targetId: targetPick.targetId,
        selectionRoll: null,
      },
    },
  };
  const played = playMonsterSkill(prepared, {
    type: "playMonsterSkill",
    actorId: actor.id,
    skillSlot,
    targetId: targetPick.targetId,
  });
  if (played.events.some((event) => event.type === "commandRefused")) return played;
  return {
    ...played,
    events: [
      {
        type: "dungeonUpdated",
        message: `Heart of Darkness · ${skillLabel}：Acc 最小结算（slot ${skillSlot}；目标 ${targetPick.targetId}；效果线 hold；boss_ability:p037）`,
      },
      ...played.events,
    ],
  };
}

export function applyHeartOfDarknessKnowThis(state: GameState, actorId: string): ApplyResult {
  return runHeartOfDarknessSkillAcc(state, actorId, KNOW_THIS_SKILL_SLOT, "Know This");
}

export function applyHeartOfDarknessPuncture(state: GameState, actorId: string): ApplyResult {
  return runHeartOfDarknessSkillAcc(state, actorId, PUNCTURE_SKILL_SLOT, "Puncture");
}

export function applyHeartOfDarknessDissolution(state: GameState, actorId: string): ApplyResult {
  return runHeartOfDarknessSkillAcc(state, actorId, DISSOLUTION_SKILL_SLOT, "Dissolution");
}

/**
 * 读取 `battle.impendingDoomDie`，按 R-139 映射执行 Know This / Puncture / Dissolution（Acc 路径）。
 */
export function applyHeartOfDarknessImpendingDoomSkill(
  state: GameState,
  actorId: string,
): ApplyResult {
  const resolved = resolveHeartOfDarknessActor(state, actorId, "Impending Doom 选招");
  if ("events" in resolved) return resolved;
  const die = resolved.battle.impendingDoomDie;
  if (die === undefined)
    return rejectBattleCommand(
      state,
      "Impending Doom 尚无落位骰（须开战或上回合 Heart 行动后落骰；boss_ability:p037）",
    );
  const slot = impendingDoomSkillSlotFromDie(die);
  const label = impendingDoomSkillLabelFromDie(die);
  if (slot === null || label === null)
    return rejectBattleCommand(
      state,
      `Impending Doom 落位骰面值非法：${String(die)}（须为整数 1–10；R-139）`,
    );
  const played =
    slot === KNOW_THIS_SKILL_SLOT
      ? applyHeartOfDarknessKnowThis(state, actorId)
      : slot === PUNCTURE_SKILL_SLOT
        ? applyHeartOfDarknessPuncture(state, actorId)
        : applyHeartOfDarknessDissolution(state, actorId);
  if (played.events.some((event) => event.type === "commandRefused")) return played;
  return {
    ...played,
    events: [
      {
        type: "dungeonUpdated",
        message: `Heart of Darkness · Impending Doom：d10=${die} → ${label}（slot ${slot}；boss_ability:p037 / R-139）`,
      },
      ...played.events,
    ],
  };
}

export type ApplyHeartOfDarknessKnowThisCommand = {
  readonly type: "applyHeartOfDarknessKnowThis";
  readonly actorId: string;
};

export type ApplyHeartOfDarknessPunctureCommand = {
  readonly type: "applyHeartOfDarknessPuncture";
  readonly actorId: string;
};

export type ApplyHeartOfDarknessDissolutionCommand = {
  readonly type: "applyHeartOfDarknessDissolution";
  readonly actorId: string;
};

export type ApplyHeartOfDarknessImpendingDoomSkillCommand = {
  readonly type: "applyHeartOfDarknessImpendingDoomSkill";
  readonly actorId: string;
};
