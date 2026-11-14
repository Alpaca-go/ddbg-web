import type { MonsterCardView, MonsterSkillView } from "../../../monster-skill";
import type { ApplyResult, GameState, MonsterSkillResolvedEvent } from "../../../command";
import { compileMonsterEffectPlan } from "../../../monster-effect-plan";
import { buildHagICombatCatalog } from "./hag-i-projection";
import { captureHagIHero } from "./hag-i-captive";
import { HAG_I_COMBAT_MONSTER_CARD_ID, HAG_I_SCRIPT_ID } from "./hag-i";
import { resolveEncounterBossScriptId } from "../../../boss/encounter-rules";

/** R-254／R-255：核对核准卡面，再把 Self Pull 交给共用自身效果流程。 */
export function readHagIIntoPotAttack(card: MonsterCardView, skill: MonsterSkillView) {
  const expected = buildHagICombatCatalog().find((c) => c.id === HAG_I_COMBAT_MONSTER_CARD_ID)!;
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value !== null && typeof value === "object")
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, canonical((value as Record<string, unknown>)[key])]),
      );
    return value;
  };
  const signature = (s: MonsterSkillView) =>
    JSON.stringify(
      canonical([
        s.slot,
        s.name,
        s.target,
        s.printed_labels,
        s.unlabeled_numbers,
        s.lines,
        s.effect_lines,
        s.verified_hag_into_pot,
      ]),
    );
  if (
    card.id !== expected.id ||
    card.life !== expected.life ||
    card.verification.unverified ||
    signature(skill) !== signature(expected.skills[0]!)
  )
    return { status: "refused" as const, reason: "R-254：Into the Pot 运行卡面与核准记录不符" };
  const compiled = compileMonsterEffectPlan(
    {
      id: `${card.id}:skill1`,
      hero: null,
      verification: card.verification,
      printed_labels: skill.printed_labels,
      unlabeled_numbers: skill.unlabeled_numbers,
      stats_line: skill.lines[0]!,
      effect_lines: [skill.effect_lines[0]!],
    },
    {
      source: "print_front",
      signatures: ["{self_effects}Self{shuffle}Pull1"],
      effects: [{ type: "shuffle", scope: "self", direction: "pull", distance: 1 }],
    },
  );
  return compiled.status === "refused" ? compiled : { ...compiled, hagIntoPot: true as const };
}

/** 自身位移与目标结算完成后：命中才入锅，落空仍继续同一回合第二招。 */
export function continueHagIIntoPot(
  result: ApplyResult,
  resolved: MonsterSkillResolvedEvent,
): ApplyResult | null {
  const b = result.state.battle;
  const actor = b?.entities.find((e) => e.id === resolved.actorId);
  const card = b?.monsters?.find((c) => c.id === actor?.monsterCardId);
  if (
    !b ||
    resolved.skillSlot !== 1 ||
    actor?.dead ||
    card?.id !== HAG_I_COMBAT_MONSTER_CARD_ID ||
    !card.skills.find((s) => s.slot === 1)?.verified_hag_into_pot ||
    resolveEncounterBossScriptId(result.state) !== HAG_I_SCRIPT_ID
  )
    return null;
  if (b.hagSecondSkillPending)
    return {
      state: result.state,
      events: [{ type: "commandRefused", message: "R-255：第二招不能重复 Into the Pot" }],
    };
  let next = result;
  if (resolved.resolution.outcome === "hit" || resolved.resolution.outcome === "crit") {
    const captured = captureHagIHero(result.state, resolved.resolution.targetId);
    if (captured.events.some((e) => e.type === "commandRefused")) return captured;
    next = { ...captured, events: [...result.events, ...captured.events] };
  }
  return {
    ...next,
    state: {
      ...next.state,
      battle: { ...next.state.battle!, monsterAction: null, hagSecondSkillPending: true },
    },
    events: [
      ...next.events,
      { type: "dungeonUpdated", message: "R-255：Into the Pot 完成，继续本次 Hag 回合的第二招" },
    ],
  };
}

export function finishHagISkillTurn(state: GameState, actorId: string): GameState {
  const b = state.battle;
  if (
    !b?.hagSecondSkillPending ||
    !b.entities.some((e) => e.id === actorId && e.monsterCardId === HAG_I_COMBAT_MONSTER_CARD_ID)
  )
    return state;
  const { hagSecondSkillPending: _second, ...rest } = b;
  void _second;
  return { ...state, battle: rest };
}
