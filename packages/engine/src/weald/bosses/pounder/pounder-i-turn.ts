import { rejectBattleCommand } from "../../../shared/battle/battle";
import type { ApplyResult, GameState } from "../../../shared/core/command";
import { finishTurn } from "../../../shared/dungeon/encounter";
import { readPounderRuntimeContext } from "./pounder-runtime-context";
import { applyPounderIReinforcements } from "./pounder-i-reinforcements";

function active(state: GameState): boolean {
  return (
    !!state.dungeon?.pounderBossBattles &&
    !!state.dungeon.pounderDungeonThreats &&
    !!state.dungeon.pounderHamletThreats &&
    readPounderRuntimeContext(state) !== null
  );
}

/** R-258：仅实际 Matchman 固定技能可对活体 Pounder 定位，不改变普通目标规则。 */
export function isPounderMatchmanAction(state: GameState, actorId: string): boolean {
  if (!active(state)) return false;
  const [pounder, matchman] = readPounderRuntimeContext(state)!.catalog;
  const b = state.battle;
  const action = b?.monsterAction;
  return (
    active(state) &&
    action?.actorId === actorId &&
    action.skillSlot === 1 &&
    b!.entities.some(
      (e) =>
        e.id === actorId && e.side === "monster" && !e.dead && e.monsterCardId === matchman!.id,
    ) &&
    b!.entities.some(
      (e) =>
        e.id === action.targetId &&
        e.side === "monster" &&
        !e.dead &&
        e.monsterCardId === pounder!.id,
    )
  );
}

/** W4／R-258：两个专属角色均不掷选招骰。 */
export function preparePounderITurn(state: GameState, actorId: string): ApplyResult | null {
  if (!active(state)) return null;
  const [pounder, matchman] = readPounderRuntimeContext(state)!.catalog;
  const b = state.battle;
  const actor = b?.entities.find((e) => e.id === actorId);
  if (!active(state) || !b || !actor || ![pounder!.id, matchman!.id].includes(actor.monsterCardId!))
    return null;
  const approved = actor.monsterCardId === pounder!.id ? pounder! : matchman!;
  const card = b.monsters?.find((c) => c.id === actor.monsterCardId);
  if (actor.life !== approved.life || JSON.stringify(card) !== JSON.stringify(approved))
    return rejectBattleCommand(state, "R-258：怪物回合需要核准 Pounder／Matchman I 卡面");
  if (actor.monsterCardId === pounder!.id) {
    if (
      !b.entities.some((e) => e.side === "monster" && !e.dead && e.monsterCardId === matchman!.id)
    )
      return applyPounderIReinforcements(state, actorId);
    return finishTurn(state, actorId, [
      {
        type: "dungeonUpdated",
        message: "R-258：Matchman 已在场，Pounder 不增援也不自行炮击；行动结束",
      },
    ]);
  }
  const target = b.entities.find(
    (e) => e.side === "monster" && !e.dead && e.monsterCardId === pounder!.id,
  );
  if (!target) return rejectBattleCommand(state, "R-258：Matchman 缺少活体 Pounder 目标");
  const action = { actorId, targetId: target.id, skillSlot: 1, selectionRoll: null } as const;
  return {
    state: { ...state, battle: { ...b, monsterAction: action } },
    events: [
      {
        ...action,
        type: "monsterActionPrepared",
        skillId: `${matchman!.id}:skill1`,
        targetPriority: "Pounder",
        message:
          "Fire in the Hole!：固定目标 Pounder，按 Speed 移动至同区后触发炮击（R-258、R-023）",
      },
    ],
  };
}
