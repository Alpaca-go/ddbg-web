import { isCollectedVestalCard } from "./boss/collected-vestal";
import { isInvokingMonster, moveInvokingMonster } from "./battle-invocation";
import { distance, rejectBattleCommand } from "./battle";
import type { ApplyResult, GameState } from "./command";
import { applyEncounterCommand, nextBattleRoll, finishTurn } from "./encounter";
import {
  applyFanaticSentenceRendered,
  fanaticSentenceRenderedShouldReplaceSkill,
} from "./boss/fanatic-i-combat-runtime";
import {
  ancestor2SkillAiShouldReplacePrepare,
  applyAncestor2SkillFromStanceSelection,
} from "./boss/ancestor2-skill-ai";
import {
  applyCollectorCollectAll,
  collectorCollectAllShouldReplaceSkill,
} from "./boss/collector-i-combat-runtime";
import {
  applyProphetCalamitousPrognostication,
  applyProphetRubbleOfRuin,
  prophetCalamitousShouldReplaceSkill,
  prophetRubbleShouldReplaceSkill,
} from "./boss/prophet-i-combat-runtime";
import {
  readSwinePrinceIWilburMarkSkillSlot,
  swinePrinceIWilburMarkShouldForceSkill,
} from "./boss/swine-prince-i-combat-runtime";
import {
  hagIntoThePotShouldForceSkill,
  readHagIIntoThePotSkillSlot,
} from "./boss/hag-i-combat-runtime";
import { getBossScript } from "./boss/registry";
import { resolveEncounterBossScriptId } from "./boss/encounter-rules";
import { readMonsterSelfStatuses } from "./monster-self-status";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import type { SkillStance } from "./hero-skill";
import { selectMonsterSkill } from "./monster-stance";
import { selectMonsterTarget } from "./monster-target";
import type { MonsterTargetHero } from "./monster-target";
import { readPrintedRange, readPrintedTargets } from "./hero-skill";
import { readMonsterAttackView } from "./monster-skill";
import type { MonsterSkillSelection } from "./monster-stance";

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
  if (!actor || actor.side !== "monster" || actor.dead || !card)
    return rejectBattleCommand(state, "怪物或已关联卡牌不可用（R-048）");
  if (actor.oneBodyPoolId) {
    if (actor.life === undefined)
      return rejectBattleCommand(state, "One Body 部位缺少共享 Life（R-048）");
  } else if (actor.life !== card.life)
    return rejectBattleCommand(state, "怪物或已关联卡牌不可用（R-048）");
  const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];
  const position = stances.indexOf(actor.stance!);
  if (position < 0 || (actor.stanceSlots !== 1 && actor.stanceSlots !== 2))
    return rejectBattleCommand(state, "缺少已核实的怪物姿态 / 占格数（R-048）");
  const occupied = stances.slice(position, position + actor.stanceSlots);
  if (occupied.length !== actor.stanceSlots)
    return rejectBattleCommand(state, "怪物姿态占格超出轨道（R17）");
  if (isInvokingMonster(battle, actor.id)) return moveInvokingMonster(state, actor.id);
  if (collectorCollectAllShouldReplaceSkill(state, actor.id)) {
    return applyCollectorCollectAll(state, actor.id);
  }
  if (prophetCalamitousShouldReplaceSkill(state, actor.id)) {
    return applyProphetCalamitousPrognostication(state, actor.id);
  }
  if (prophetRubbleShouldReplaceSkill(state, actor.id)) {
    return applyProphetRubbleOfRuin(state, actor.id);
  }
  if (fanaticSentenceRenderedShouldReplaceSkill(state, actor.id)) {
    return applyFanaticSentenceRendered(state, actor.id);
  }
  if (ancestor2SkillAiShouldReplacePrepare(state, actor.id)) {
    return applyAncestor2SkillFromStanceSelection(state, actor.id);
  }
  const forceWilburMark = swinePrinceIWilburMarkShouldForceSkill(state, actor.id);
  const forceIntoThePot = hagIntoThePotShouldForceSkill(state, actor.id);
  let selected: MonsterSkillSelection;
  let needsRoll = false;
  if (forceWilburMark) {
    const scriptId = resolveEncounterBossScriptId(state);
    const script = scriptId ? getBossScript(scriptId) : undefined;
    const slot = script ? readSwinePrinceIWilburMarkSkillSlot(script) : null;
    if (slot === null) {
      return rejectBattleCommand(state, "Wilbur Mark AI 未声明（R-048）");
    }
    const attack = readMonsterAttackView(card, slot);
    if (attack.status === "refused") {
      return rejectBattleCommand(state, attack.reason);
    }
    selected = { status: "selected", skillSlot: slot, roll: null };
  } else if (forceIntoThePot) {
    const scriptId = resolveEncounterBossScriptId(state);
    const script = scriptId ? getBossScript(scriptId) : undefined;
    const slot = script ? readHagIIntoThePotSkillSlot(script) : null;
    if (slot === null) {
      return rejectBattleCommand(state, "Hag Into the Pot! AI 未声明（R-048）");
    }
    const attack = readMonsterAttackView(card, slot);
    if (attack.status === "refused") {
      return rejectBattleCommand(state, attack.reason);
    }
    selected = { status: "selected", skillSlot: slot, roll: null };
  } else {
    let pick = selectMonsterSkill(card, occupied);
    if (pick.status === "refused") return rejectBattleCommand(state, pick.reason);
    if (pick.status === "needsRoll") {
      needsRoll = true;
      pick = selectMonsterSkill(card, occupied, nextBattleRoll(state.seed, battle.rngCursor));
    }
    if (pick.status !== "selected") {
      return rejectBattleCommand(state, pick.status === "refused" ? pick.reason : "选招骰表无效");
    }
    selected = pick;
  }

  const self = readMonsterSelfStatuses(card, selected.skillSlot);
  if (self.status === "refused") return rejectBattleCommand(state, self.reason);
  if (self.status === "ready") {
    if (actor.wounds >= card.life) return rejectBattleCommand(state, "死亡的怪物不能使用自身技能");
    const applied = applyBattleSkillStatuses(
      battle,
      battle.entities,
      actor.id,
      [],
      undefined,
      battle.rngCursor,
      self.effects,
    );
    if (applied.status === "refused") return rejectBattleCommand(state, applied.reason);
    return finishTurn(
      {
        ...state,
        battle: {
          ...battle,
          entities: applied.entities,
          monsterAction: null,
          rngCursor: battle.rngCursor + (needsRoll ? 1 : 0),
        },
      },
      actor.id,
      [
        {
          type: "monsterSelfSkillResolved",
          actorId: actor.id,
          skillSlot: selected.skillSlot,
          skillId: `${card.id}:skill${selected.skillSlot}`,
          selectionRoll: selected.roll,
          effects: self.effects,
          message: "怪物纯自身状态技能已生效；不掷攻击骰（R19–20/R24）",
        },
        ...applied.events,
      ],
    );
  }
  const support = isCollectedVestalCard(card.id);
  const heroes: MonsterTargetHero[] = [];
  for (const hero of battle.entities.filter(
    (entry) => entry.side === (support ? "monster" : "hero") && !entry.dead,
  )) {
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
      stress: support ? 0 : hero.stress!,
      markStacks: support ? 0 : (hero.markStacks ?? 0),
      guard: support ? false : hero.guard,
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
