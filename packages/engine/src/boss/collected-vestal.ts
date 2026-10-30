import type { ApplyResult, GameState } from "../command";
import { distance, rejectBattleCommand } from "../battle";
import { readMonsterAttackView } from "../monster-skill";
import { finishTurn } from "../encounter";
import { addStatusStack, statusProjection } from "../status";

export function isCollectedVestalCard(id: string | undefined): boolean {
  return ["monster_medium:p101", "monster_medium:p102", "monster_medium:p103"].includes(id ?? "");
}

/** R20/R24：无 Acc 的友方治疗不伪造攻击骰；只接受完整核图后的三张卡。 */
export function playCollectedVestalSkill(
  state: GameState,
  actorId: string,
  targetId: string,
  slot: number,
): ApplyResult {
  const b = state.battle!;
  const actor = b.entities.find((e) => e.id === actorId);
  const target = b.entities.find((e) => e.id === targetId);
  const card = b.monsters?.find((c) => c.id === actor?.monsterCardId);
  if (
    !actor ||
    actor.dead ||
    !isCollectedVestalCard(card?.id) ||
    !card ||
    !target ||
    target.dead ||
    target.side !== "monster" ||
    slot !== 1 ||
    b.encounter?.turn.type !== "monster" ||
    b.encounter.turn.actorId !== actorId
  )
    return rejectBattleCommand(state, "Collected Vestal 友方目标或卡牌不符（R-048）");
  if (
    b.monsterAction &&
    (b.monsterAction.actorId !== actorId ||
      b.monsterAction.targetId !== targetId ||
      b.monsterAction.skillSlot !== slot)
  )
    return rejectBattleCommand(state, "必须使用已保存的友方目标");
  const attack = readMonsterAttackView(card, slot);
  const range = distance(b.areas, actor.areaId, target.areaId);
  const heights = { low: 0, normal: 1, high: 2 };
  const origin = b.areas.find((a) => a.id === actor.areaId),
    destination = b.areas.find((a) => a.id === target.areaId);
  const reach =
    2 + Number(origin && destination && heights[origin.elevation] > heights[destination.elevation]);
  const plan = card.skills[0]?.verified_monster_effects;
  const heal = plan?.effects.find((e) => e.type === "heal");
  if (
    attack.status !== "ready" ||
    !heal ||
    range === null ||
    range > reach ||
    actor.life !== card.life
  )
    return rejectBattleCommand(state, "Collected Vestal 缺完整效果或目标不在射程（R-048）");
  const added = addStatusStack(target.statusStacks ?? [], { kind: "buff", duration: 2 }, "target", {
    resistances: [],
    immunities: [],
  });
  if (added.status === "refused") return rejectBattleCommand(state, added.reason);
  const stacks = added.stacks;
  const entities = b.entities.map((e) =>
    e.id === targetId
      ? {
          ...e,
          wounds: Math.max(0, e.wounds - heal.amount),
          statusStacks: stacks,
          ...statusProjection(stacks, e.innateProtection),
        }
      : e,
  );
  return finishTurn({ ...state, battle: { ...b, entities, monsterAction: null } }, actorId, [
    {
      type: "dungeonUpdated",
      message: `${actorId} Headache → ${targetId}：治疗 ${heal.amount}，Buff 2t；无攻击骰（R20/R24）`,
    },
  ]);
}
