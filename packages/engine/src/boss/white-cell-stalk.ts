import { distance, rejectBattleCommand } from "../battle";
import type { ApplyResult, GameState } from "../command";
import { finishTurn } from "../encounter";
import { readPrintedRange } from "../hero-skill";
import { readMonsterAttackView } from "../monster-skill";
import { addStatusStack, statusProjection } from "../status";

/** FRONT p104 / R20–24：指定 Mammoth Cyst 的无 Acc 友方技能。 */
export function playWhiteCellReconstitute(
  state: GameState,
  actorId: string,
  targetId: string,
  slot: number,
): ApplyResult {
  const b = state.battle!;
  const actor = b.entities.find((e) => e.id === actorId);
  const target = b.entities.find((e) => e.id === targetId);
  const card = b.monsters?.find((c) => c.id === actor?.monsterCardId);
  const skill = card?.skills.find((s) => s.slot === slot);
  if (
    !actor ||
    actor.dead ||
    actor.side !== "monster" ||
    card?.id !== "monster_medium:p104" ||
    actor.life !== card.life ||
    !target ||
    target.dead ||
    target.side !== "monster" ||
    target.monsterCardId !== "monster_large:p016" ||
    slot !== 1 ||
    skill?.target !== "Mammoth Cyst" ||
    b.encounter?.turn.type !== "monster" ||
    b.encounter.turn.actorId !== actorId
  )
    return rejectBattleCommand(
      state,
      "Reconstitute 需要 White Cell Stalk 回合与存活 Mammoth Cyst（R-048）",
    );
  const attack = readMonsterAttackView(card, slot);
  if (attack.status !== "ready") return rejectBattleCommand(state, attack.reason);
  const printed = readPrintedRange(attack.view);
  const range = distance(b.areas, actor.areaId, target.areaId);
  const heights = { low: 0, normal: 1, high: 2 };
  const origin = b.areas.find((a) => a.id === actor.areaId);
  const destination = b.areas.find((a) => a.id === target.areaId);
  const lower =
    !!origin && !!destination && heights[origin.elevation] > heights[destination.elevation];
  const effects = skill.verified_monster_effects?.effects;
  const heal = effects?.find((e) => e.type === "heal" && e.scope === "target");
  const buff = effects?.find(
    (e) => e.type === "status" && e.kind === "buff" && e.scope === "target",
  );
  if (
    printed.kind !== "exact" ||
    range === null ||
    range > printed.distance + Number(lower) ||
    !heal ||
    heal.type !== "heal" ||
    !buff ||
    buff.type !== "status"
  )
    return rejectBattleCommand(state, "Reconstitute 缺完整效果或目标不在射程（R-048）");
  const added = addStatusStack(
    target.statusStacks ?? [],
    { kind: "buff", duration: buff.duration },
    "target",
    {
      resistances: [],
      immunities: [],
    },
  );
  if (added.status === "refused") return rejectBattleCommand(state, added.reason);
  const entities = b.entities.map((e) =>
    e.id === targetId
      ? {
          ...e,
          wounds: Math.max(0, e.wounds - heal.amount),
          statusStacks: added.stacks,
          ...statusProjection(added.stacks, e.innateProtection),
        }
      : e,
  );
  return finishTurn({ ...state, battle: { ...b, entities, monsterAction: null } }, actorId, [
    {
      type: "dungeonUpdated",
      message: `${actorId} Reconstitute → ${targetId}：治疗 ${heal.amount}，Buff ${buff.duration}t；无攻击骰（R20/R24）`,
    },
  ]);
}
