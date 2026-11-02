import { rejectBattleCommand, type BattleEntity, type BattleState } from "../battle";
import { playMonsterSkill } from "../battle-monster";
import type { ApplyResult, GameState } from "../command";
import { readMonsterAttackView } from "../monster-skill";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import type { DarkestMidBossSkillAccContext } from "./darkest-mid-boss-skill-acc-core";

function resolveMidBossSelfActor(
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
  if (!actor || actor.side !== "monster" || actor.dead || actor.monsterCardId !== ctx.monsterCardId)
    return rejectBattleCommand(state, `仅 ${ctx.bossLabel} 实体可执行 ${skillLabel}（R-048）`);
  if (actor.life === undefined)
    return rejectBattleCommand(state, `${ctx.bossLabel} 缺少 Life（R-048）`);
  return { battle, actor };
}

/** Self 目标、无 Acc 伤害行：经 `playMonsterSkill` 以使用者自身为目标结算 verified 自身效果。 */
export function runDarkestMidBossSkillSelf(
  state: GameState,
  actorId: string,
  skillSlot: number,
  skillLabel: string,
  ctx: DarkestMidBossSkillAccContext,
): ApplyResult {
  const resolved = resolveMidBossSelfActor(state, actorId, skillLabel, ctx);
  if ("events" in resolved) return resolved;
  const { battle, actor } = resolved;
  const card = battle.monsters?.find((entry) => entry.id === actor.monsterCardId);
  if (!card || actor.life !== card.life)
    return rejectBattleCommand(state, `${ctx.bossLabel} Life 与规范化卡不一致（R-048）`);
  const skill = card.skills.find((entry) => entry.slot === skillSlot);
  if (!skill || skill.target !== "Self")
    return rejectBattleCommand(state, `${skillLabel} 卡面目标不是 Self（R-048）`);
  const attack = readMonsterAttackView(card, skillSlot);
  if (attack.status === "refused") return rejectBattleCommand(state, attack.reason);
  if (
    attack.view.stats_line?.some(
      (segment) => segment.type === "text" && segment.text.includes("Acc"),
    )
  )
    return rejectBattleCommand(state, `${skillLabel} 不是无 Acc 的 Self 效果技能（R-048）`);

  const prepared: GameState = {
    ...state,
    battle: {
      ...battle,
      monsterAction: {
        actorId: actor.id,
        skillSlot,
        targetId: actor.id,
        selectionRoll: null,
      },
    },
  };
  const skillPlan = skill.verified_monster_effects;
  const played = playMonsterSkill(prepared, {
    type: "playMonsterSkill",
    actorId: actor.id,
    skillSlot,
    targetId: actor.id,
  });
  if (played.events.some((event) => event.type === "commandRefused")) return played;
  const effectNote = skillPlan ? "含 verified 效果线" : "效果线 hold";
  return {
    ...played,
    events: [
      {
        type: "dungeonUpdated",
        message: `${ctx.bossLabel} · ${skillLabel}：Self 效果最小结算（slot ${skillSlot}；${effectNote}；${ctx.abilityRef}）`,
      },
      ...played.events,
    ],
  };
}
