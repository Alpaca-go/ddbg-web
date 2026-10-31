import { distance, rejectBattleCommand, type BattleEntity, type BattleState } from "../battle";
import { playMonsterSkill } from "../battle-monster";
import type { ApplyResult, GameState } from "../command";
import { selectMonsterTarget, type MonsterTargetHero } from "../monster-target";
import { readMonsterAttackView } from "../monster-skill";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import type { BossScriptId } from "./types";

export type DarkestMidBossSkillAccContext = {
  readonly scriptId: BossScriptId;
  readonly monsterCardId: string;
  readonly bossLabel: string;
  readonly abilityRef: string;
};

function resolveMidBossActor(
  state: GameState,
  actorId: string,
  skillLabel: string,
  ctx: DarkestMidBossSkillAccContext,
): { readonly battle: BattleState; readonly actor: BattleEntity } | ApplyResult {
  const battle = state.battle;
  if (!battle?.encounter) return rejectBattleCommand(state, "尚未进入战斗回合");
  if (resolveEncounterBossScriptId(state) !== ctx.scriptId)
    return rejectBattleCommand(
      state,
      `${skillLabel} 仅适用于 ${ctx.bossLabel} 最暗中途 Boss 战（${ctx.abilityRef}）`,
    );
  const turn = battle.encounter.turn;
  if (turn?.type !== "monster" || turn.actorId !== actorId)
    return rejectBattleCommand(
      state,
      `${skillLabel} 须于 ${ctx.bossLabel} 怪物回合执行（${ctx.abilityRef}）`,
    );
  const actor = battle.entities.find((entity) => entity.id === actorId);
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    actor.monsterCardId !== ctx.monsterCardId
  )
    return rejectBattleCommand(state, `仅 ${ctx.bossLabel} 实体可执行 ${skillLabel}（R-048）`);
  if (actor.life === undefined)
    return rejectBattleCommand(state, `${ctx.bossLabel} 缺少 Life（R-048）`);
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
  if (!card) return rejectBattleCommand(state, `${skillLabel} 战斗目录缺失（R-048）`);
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

export function runDarkestMidBossSkillAcc(
  state: GameState,
  actorId: string,
  skillSlot: number,
  skillLabel: string,
  ctx: DarkestMidBossSkillAccContext,
): ApplyResult {
  const resolved = resolveMidBossActor(state, actorId, skillLabel, ctx);
  if ("events" in resolved) return resolved;
  const { battle, actor } = resolved;
  const card = battle.monsters?.find((entry) => entry.id === actor.monsterCardId);
  if (!card || actor.life !== card.life)
    return rejectBattleCommand(state, `${ctx.bossLabel} Life 与规范化卡不一致（R-048）`);
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
        message: `${ctx.bossLabel} · ${skillLabel}：Acc 最小结算（slot ${skillSlot}；目标 ${targetPick.targetId}；${effectNote}；${ctx.abilityRef}）`,
      },
      ...played.events,
    ],
  };
}
