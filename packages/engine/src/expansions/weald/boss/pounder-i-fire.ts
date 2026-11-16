import { distance, rejectBattleCommand } from "../../../battle";
import type { ApplyResult, GameState } from "../../../command";
import { playMonsterSkill } from "../../../battle-monster";
import { selectMonsterTarget } from "../../../monster-target";
import { readPounderRuntimeContext } from "./pounder-runtime-context";
import { planPounderIFireInTheHole } from "./pounder-i-combat-plans";

/** 战斗结束时不遗留已消费的触发上下文；生命／压力待选期间继续保留。 */
export function settlePounderIFireContext(result: ApplyResult): ApplyResult {
  const b = result.state.battle;
  if (!b?.pounderFire || !b.encounter || !["finished", "halted"].includes(b.encounter.turn.type))
    return result;
  const { pounderFire: _fire, ...battle } = b;
  void _fire;
  return { ...result, state: { ...result.state, battle } };
}

/** R-258：Matchman 不掷命中骰；Pounder 炮击走既有多目标、生命和压力续接。 */
export function applyPounderIFireInTheHole(
  state: GameState,
  actorId: string,
  damageStoneWindow?: true,
): ApplyResult {
  const b = state.battle;
  const d = state.dungeon;
  const context = readPounderRuntimeContext(state);
  if (
    !b?.encounter ||
    b.pending ||
    b.monsterAction ||
    b.pounderFire ||
    b.shuffleIntents.length ||
    b.encounter.turn.type !== "monster" ||
    b.encounter.turn.actorId !== actorId ||
    d?.phase !== "inBattle" ||
    !d.pounderDungeonThreats ||
    !d.pounderHamletThreats ||
    !["standard", "radiant"].includes(d.mode) ||
    !context
  )
    return rejectBattleCommand(
      state,
      "Fire in the Hole! 需要新版本 I 级非 Stygian Boss 战及当前 Matchman 回合",
    );
  let plan: ReturnType<typeof planPounderIFireInTheHole>;
  try {
    plan = planPounderIFireInTheHole(b.entities, actorId, context);
  } catch {
    return rejectBattleCommand(state, "R-258：触发炮击需要核准活体 Matchman 与 Pounder");
  }
  if (plan.kind !== "triggerSkill")
    return rejectBattleCommand(state, "R-258：Matchman 必须与活体 Pounder 同区才能触发炮击");
  const pounder = b.entities.find((e) => e.id === plan.actorId)!;
  const approvedCatalog = context.catalog;
  const approved = approvedCatalog.find((c) => c.id === plan.cardId)!;
  const matchman = b.entities.find((e) => e.id === actorId)!;
  const approvedMatchman = approvedCatalog.find((c) => c.id === matchman.monsterCardId);
  const matchmanCard = b.monsters?.find((c) => c.id === matchman.monsterCardId);
  if (
    !approvedMatchman ||
    matchman.life !== approvedMatchman.life ||
    JSON.stringify(matchmanCard) !== JSON.stringify(approvedMatchman)
  )
    return rejectBattleCommand(state, "R-258：触发者需要核准 Matchman I 运行卡面");
  const card = b.monsters?.find((c) => c.id === plan.cardId);
  if (!card || JSON.stringify(card) !== JSON.stringify(approved) || pounder.life !== approved.life)
    return rejectBattleCommand(state, "R-258：炮击需要核准 Pounder I 运行卡面");
  const target = selectMonsterTarget(
    { verification: card.verification, skills: [{ slot: plan.slot, target: "Crowded" }] },
    plan.slot,
    b.entities
      .filter((e) => e.side === "hero")
      .map((e) => ({
        id: e.id,
        areaId: e.areaId,
        stance: e.stance!,
        areaDistance: distance(b.areas, pounder.areaId, e.areaId),
        wounds: e.wounds,
        stress: e.stress!,
        markStacks: e.markStacks ?? 0,
        guard: e.guard,
        dead: e.dead,
      })),
  );
  if (target.status !== "selected")
    return rejectBattleCommand(
      state,
      target.status === "refused" ? target.reason : "炮击无可用英雄目标",
    );
  return playMonsterSkill(
    { ...state, battle: { ...b, pounderFire: { matchmanId: actorId, pounderId: pounder.id } } },
    {
      type: "playMonsterSkill",
      actorId: pounder.id,
      targetId: target.targetId,
      skillSlot: plan.slot,
      ...(damageStoneWindow ? { damageStoneWindow } : {}),
    },
  );
}
