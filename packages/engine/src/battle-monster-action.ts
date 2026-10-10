import { distance, rejectBattleCommand } from "./battle";
import type { ApplyResult, GameState } from "./command";
import { nextBattleRoll } from "./encounter";
import type { SkillStance } from "./hero-skill";
import { selectMonsterSkill } from "./monster-stance";
import { selectMonsterTarget } from "./monster-target";
import type { MonsterTargetHero } from "./monster-target";

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
    const areaDistance = distance(battle.areas, actor.areaId, hero.areaId);
    if (areaDistance === null)
      return rejectBattleCommand(state, "英雄区域距离不可达，拒绝猜测目标排序");
    heroes.push({
      id: hero.id,
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
    events: [{ ...action, type: "monsterActionPrepared", message: "已按姿态选招并确定英雄目标" }],
  };
}
