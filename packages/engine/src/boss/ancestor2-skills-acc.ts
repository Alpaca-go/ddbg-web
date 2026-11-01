import { distance, rejectBattleCommand, type BattleEntity, type BattleState } from "../battle";
import { playMonsterSkill } from "../battle-monster";
import type { ApplyResult, GameState } from "../command";
import { selectMonsterTarget, type MonsterTargetHero } from "../monster-target";
import { readMonsterAttackView } from "../monster-skill";
import {
  ANCESTOR_2_MONSTER_CARD_ID,
} from "./ancestor2-swift-teleportation";
import { readFinalFormSequence } from "./final-form-sequence";

/** `monster_large:p018` · boss_ability:p035 三招 Acc/Crit/伤害（slot 2 效果线已 verified；其余 hold）。 */
export const REFASHION_THEM_SKILL_SLOT = 1;
export const UNMAKE_THEM_ALL_SKILL_SLOT = 2;
export const EMBRACE_FUTILITY_SKILL_SLOT = 3;

function ancestor2Active(state: GameState): boolean {
  const sequence = readFinalFormSequence(state);
  return sequence?.current?.id === "ancestor2" && sequence.progress.status === "fighting";
}

function resolveAncestor2Actor(
  state: GameState,
  actorId: string,
  skillLabel: string,
): { readonly battle: BattleState; readonly actor: BattleEntity } | ApplyResult {
  const battle = state.battle;
  if (!battle?.encounter) return rejectBattleCommand(state, "尚未进入战斗回合");
  if (!ancestor2Active(state))
    return rejectBattleCommand(
      state,
      `${skillLabel} 仅适用于最终战 Ancestor 2 形态（boss_ability:p035）`,
    );
  const turn = battle.encounter.turn;
  if (turn?.type !== "monster" || turn.actorId !== actorId)
    return rejectBattleCommand(
      state,
      `${skillLabel} 须于 Ancestor 2 怪物回合执行（boss_ability:p035）`,
    );
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    actor.monsterCardId !== ANCESTOR_2_MONSTER_CARD_ID
  )
    return rejectBattleCommand(state, `仅 Ancestor 2 实体可执行 ${skillLabel}（R-048）`);
  if (actor.life === undefined)
    return rejectBattleCommand(state, "Ancestor 2 缺少 Life（R-048）");
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
  if (!card) return rejectBattleCommand(state, "Ancestor 2 战斗目录缺失（R-048）");
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

function runAncestor2SkillAcc(
  state: GameState,
  actorId: string,
  skillSlot: number,
  skillLabel: string,
): ApplyResult {
  const resolved = resolveAncestor2Actor(state, actorId, skillLabel);
  if ("events" in resolved) return resolved;
  const { battle, actor } = resolved;
  const card = battle.monsters?.find((entry) => entry.id === actor.monsterCardId);
  if (!card || actor.life !== card.life)
    return rejectBattleCommand(state, "Ancestor 2 Life 与规范化卡不一致（R-048）");
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
  const skillPlan = card.skills.find((entry) => entry.slot === skillSlot)?.verified_monster_effects;
  const played = playMonsterSkill(prepared, {
    type: "playMonsterSkill",
    actorId: actor.id,
    skillSlot,
    targetId: targetPick.targetId,
  });
  if (played.events.some((event) => event.type === "commandRefused")) return played;
  const effectNote = skillPlan ? "含 verified 效果线" : "效果线 hold";
  return {
    ...played,
    events: [
      {
        type: "dungeonUpdated",
        message: `Ancestor 2 · ${skillLabel}：Acc 最小结算（slot ${skillSlot}；目标 ${targetPick.targetId}；${effectNote}；boss_ability:p035）`,
      },
      ...played.events,
    ],
  };
}

export function applyAncestor2RefashionThem(state: GameState, actorId: string): ApplyResult {
  return runAncestor2SkillAcc(state, actorId, REFASHION_THEM_SKILL_SLOT, "Refashion Them");
}

export function applyAncestor2UnmakeThemAll(state: GameState, actorId: string): ApplyResult {
  return runAncestor2SkillAcc(state, actorId, UNMAKE_THEM_ALL_SKILL_SLOT, "Unmake Them All");
}

export function applyAncestor2EmbraceFutility(state: GameState, actorId: string): ApplyResult {
  return runAncestor2SkillAcc(state, actorId, EMBRACE_FUTILITY_SKILL_SLOT, "Embrace Futility");
}

export type ApplyAncestor2RefashionThemCommand = {
  readonly type: "applyAncestor2RefashionThem";
  readonly actorId: string;
};

export type ApplyAncestor2UnmakeThemAllCommand = {
  readonly type: "applyAncestor2UnmakeThemAll";
  readonly actorId: string;
};

export type ApplyAncestor2EmbraceFutilityCommand = {
  readonly type: "applyAncestor2EmbraceFutility";
  readonly actorId: string;
};
