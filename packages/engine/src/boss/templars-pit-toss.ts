import { rejectBattleCommand } from "../battle";
import type { BattleState } from "../battle";
import type { ApplyResult, GameState } from "../command";
import type { MonsterSkillResolvedEvent } from "../command";
import { nextBattleRoll } from "../encounter";
import {
  TEMPLAR_BODY_SLAM_SKILL_SLOT,
  TEMPLAR_IMPALER_MONSTER_CARD_ID,
} from "./darkest-templars-skills-acc";
import { templarsProductionCombatActive } from "./templars-i-deploy";

/** R-193：Body Slam 命中后 Pit Toss 的橙星 d10 → 坑区 id。 */
export function templarsPitTossTargetArea(roll: number): string | null {
  if (!Number.isSafeInteger(roll) || roll < 1 || roll > 10) return null;
  if (roll <= 2) return "B";
  if (roll <= 4) return "E";
  if (roll <= 6) return "H";
  if (roll <= 8) return "K";
  return "N";
}

function areaVacancy(
  battle: NonNullable<GameState["battle"]>,
  areaId: string,
): { readonly free: number; readonly areaExists: boolean } {
  const area = battle.areas.find((a) => a.id === areaId);
  if (!area || !Number.isSafeInteger(area.capacity)) return { free: 0, areaExists: false };
  const occupied = battle.entities
    .filter((e) => !e.dead && e.areaId === areaId)
    .reduce((sum, e) => sum + (e.side === "hero" ? 1 : e.stanceSlots!), 0);
  return { free: Math.max(0, area.capacity! - occupied), areaExists: true };
}

function stripDeferTemplarsPitToss(battle: BattleState): BattleState {
  if (!battle.deferTemplarsPitToss) return battle;
  const rest = { ...battle };
  delete rest.deferTemplarsPitToss;
  return rest;
}

/**
 * Body Slam 命中且目标存活：掷 d10，若 Pit 有空间则英雄落入橙星区；满区不移动。
 * Pit Toss 不触发尖刺伤害；英雄未因本技能位移则不视为「进入」尖刺区（R-193）。
 */
export function chainTemplarImpalerBodySlamPitTossAfterMonsterSkill(
  result: ApplyResult,
  resolved: MonsterSkillResolvedEvent,
): ApplyResult {
  if (result.events.some((e) => e.type === "commandRefused")) return result;
  let battle = result.state.battle!;
  battle = stripDeferTemplarsPitToss(battle);
  const resultStripped: ApplyResult =
    battle === result.state.battle! ? result : { ...result, state: { ...result.state, battle } };
  if (!templarsProductionCombatActive(resultStripped.state)) return resultStripped;
  if (
    resolved.actorDead ||
    resolved.skillSlot !== TEMPLAR_BODY_SLAM_SKILL_SLOT ||
    resolved.resolution.outcome === "miss"
  )
    return resultStripped;
  const actor = battle.entities.find((e) => e.id === resolved.actorId);
  const target = battle.entities.find((e) => e.id === resolved.resolution.targetId);
  if (
    !actor ||
    actor.dead ||
    actor.monsterCardId !== TEMPLAR_IMPALER_MONSTER_CARD_ID ||
    !target ||
    target.side !== "hero" ||
    target.dead
  )
    return resultStripped;
  const roll = nextBattleRoll(resultStripped.state.seed, battle.rngCursor);
  const pitArea = templarsPitTossTargetArea(roll);
  if (!pitArea) return rejectBattleCommand(resultStripped.state, "Pit Toss d10 无效（R-048）");
  const { free, areaExists } = areaVacancy(battle, pitArea);
  if (!areaExists)
    return rejectBattleCommand(resultStripped.state, "Pit Toss 橙星区不在几何内（R-048）");
  const pitIgnored = free < 1;
  const entities = pitIgnored
    ? battle.entities
    : battle.entities.map((e) => (e.id === target.id ? { ...e, areaId: pitArea } : e));
  return {
    state: {
      ...resultStripped.state,
      battle: {
        ...battle,
        entities,
        rngCursor: battle.rngCursor + 1,
      },
    },
    events: [
      ...resultStripped.events,
      {
        type: "dungeonUpdated",
        message: `Templar Impaler · Pit Toss：d10=${roll}→${pitArea}${pitIgnored ? "（满区 ignore，不移动）" : ""}（R-193）`,
      },
    ],
  };
}
