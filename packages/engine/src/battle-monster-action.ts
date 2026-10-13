import { distance, rejectBattleCommand } from "./battle";
import type { ApplyResult, GameState } from "./command";
import { applyEncounterCommand, nextBattleRoll } from "./encounter";
import type { SkillStance } from "./hero-skill";
import { selectMonsterSkill } from "./monster-stance";
import { selectMonsterTarget } from "./monster-target";
import type { MonsterTargetHero } from "./monster-target";
import { readPrintedRange, readPrintedTargets } from "./hero-skill";
import { readMonsterAttackView } from "./monster-skill";

export type PrepareMonsterActionCommand = {
  readonly type: "prepareMonsterAction";
  readonly actorId: string;
};

export type PreparedMonsterAction = {
  readonly actorId: string;
  readonly skillSlot: number;
  readonly targetId: string;
  readonly selectionRoll: number | null;
  /** Speed 定位最多执行一次；攻击仍走既有技能命令与 RNG。 */
  readonly positioned?: true;
};

export type MonsterActionPreparedEvent = PreparedMonsterAction & {
  readonly type: "monsterActionPrepared";
  readonly message: string;
  /** 选招时的卡面信息，仅供历史日志；不参与后续行动状态。 */
  readonly skillId: string;
  readonly targetPriority: string;
};

/** R-015、R-024，说明书 §6.10（R17、R22、R24）：先选招，再选目标，不移动。 */
export function prepareMonsterAction(
  state: GameState,
  command: PrepareMonsterActionCommand,
): ApplyResult {
  const battle = state.battle;
  if (!battle) return rejectBattleCommand(state, "尚未创建战斗沙盒");
  const turn = battle.encounter?.turn;
  if (turn?.type !== "monster" || turn.actorId !== command.actorId)
    return rejectBattleCommand(state, "只能为当前遭遇战怪物回合选招");
  if (battle.monsterAction) return rejectBattleCommand(state, "已保存本回合选招，不能重新掷骰");
  const actor = battle.entities.find((entry) => entry.id === command.actorId);
  const card = battle.monsters?.find((entry) => entry.id === actor?.monsterCardId);
  if (!actor || actor.side !== "monster" || actor.dead || !card || actor.life !== card.life)
    return rejectBattleCommand(state, "怪物或已关联卡牌不可用（R-048）");
  const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];
  const position = stances.indexOf(actor.stance!);
  if (position < 0 || (actor.stanceSlots !== 1 && actor.stanceSlots !== 2))
    return rejectBattleCommand(state, "缺少已核实的怪物姿态 / 占格数（R-048）");
  const occupied = stances.slice(position, position + actor.stanceSlots);
  if (occupied.length !== actor.stanceSlots)
    return rejectBattleCommand(state, "怪物姿态占格超出轨道（R17）");
  let selected = selectMonsterSkill(card, occupied);
  if (selected.status === "refused") return rejectBattleCommand(state, selected.reason);
  const needsRoll = selected.status === "needsRoll";
  if (needsRoll)
    selected = selectMonsterSkill(card, occupied, nextBattleRoll(state.seed, battle.rngCursor));
  if (selected.status !== "selected")
    return rejectBattleCommand(
      state,
      selected.status === "refused" ? selected.reason : "选招骰表无效",
    );

  const heroes: MonsterTargetHero[] = [];
  for (const hero of battle.entities.filter((entry) => entry.side === "hero" && !entry.dead)) {
    if (
      !battle.areas.some((area) => area.id === actor.areaId) ||
      !battle.areas.some((area) => area.id === hero.areaId)
    )
      return rejectBattleCommand(state, "角色区域不在已核实几何内（R-048）");
    const areaDistance = distance(battle.areas, actor.areaId, hero.areaId);
    heroes.push({
      id: hero.id,
      areaId: hero.areaId,
      stance: hero.stance!,
      areaDistance,
      wounds: hero.wounds,
      stress: hero.stress!,
      markStacks: hero.markStacks ?? 0,
      guard: hero.guard,
      dead: hero.dead,
    });
  }
  const target = selectMonsterTarget(
    {
      verification: card.verification,
      skills: card.skills.map((skill) => ({ slot: skill.slot, target: skill.target ?? null })),
    },
    selected.skillSlot,
    heroes,
  );
  if (target.status === "refused") return rejectBattleCommand(state, target.reason);
  const selectionDetails = {
    skillId: `${card.id}:skill${selected.skillSlot}`,
    targetPriority: card.skills.find((skill) => skill.slot === selected.skillSlot)!.target!,
  };
  if (target.status === "noFiniteTarget") {
    const attack = readMonsterAttackView(card, selected.skillSlot);
    if (attack.status === "refused") return rejectBattleCommand(state, attack.reason);
    const targets = readPrintedTargets(attack.view);
    if (
      !["exact", "interval"].includes(readPrintedRange(attack.view).kind) ||
      targets.kind !== "exact"
    )
      return rejectBattleCommand(state, "无有限距离目标的跳过需要已核实射程与目标数量（R-048）");
    const finished = applyEncounterCommand(
      {
        ...state,
        battle: {
          ...battle,
          rngCursor: battle.rngCursor + (needsRoll ? 1 : 0),
        },
      },
      { type: "finishMonsterTurn", actorId: actor.id },
    );
    return {
      ...finished,
      events: [
        {
          type: "monsterActionSkipped",
          actorId: actor.id,
          skillSlot: selected.skillSlot,
          selectionRoll: selected.roll,
          ...selectionDetails,
          message: "Closest / Furthest 没有有限距离英雄，原地跳过剩余回合（R-023 补充）",
        },
        ...finished.events,
      ],
    };
  }
  const action: PreparedMonsterAction = {
    actorId: actor.id,
    skillSlot: selected.skillSlot,
    targetId: target.targetId,
    selectionRoll: selected.roll,
  };
  return {
    state: {
      ...state,
      battle: {
        ...battle,
        monsterAction: action,
        rngCursor: battle.rngCursor + (needsRoll ? 1 : 0),
      },
    },
    events: [
      {
        ...action,
        ...selectionDetails,
        type: "monsterActionPrepared",
        message: "已按姿态选招并确定英雄目标",
      },
    ],
  };
}
