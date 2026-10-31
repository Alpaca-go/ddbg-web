import { isFreeTrinketId, useFreeTrinket } from "./battle-free-trinkets";
import type { FreeTrinketId } from "./battle-free-trinkets";
import type { NormalizedTrinketCard } from "../../data/src/normalize/schema";
import { rejectBattleCommand } from "./battle";
import { triggerBattlePassive } from "./battle-passive";
import type { ApplyResult, GameState } from "./command";
import { resolveBattlePressure } from "./pressure";
import { finalizeFreeTrinketDuringMonsterTurn } from "./battle-monster-retarget";
import { trinketPoolProblem } from "./trinket-acquisition";

export const FORTUNATE_ARMLET_ID = "trinket:p025";
export type UseTrinketCommand = {
  readonly type: "useTrinket";
  readonly actorId: string;
  readonly cardId: typeof FORTUNATE_ARMLET_ID | FreeTrinketId;
};

/** R26 / 印刷 p025：逐半面绑定，不由 verification 推断能力。 */
export function isFortunateArmlet(card: NormalizedTrinketCard): boolean {
  const front = card.upright_half,
    back = card.inverted_half;
  const line = back.effect_lines[0],
    glyph = line?.[0],
    text = line?.[1];
  return (
    card.id === FORTUNATE_ARMLET_ID &&
    card.name === "Fortunate Armlet" &&
    card.level === 2 &&
    !card.verification.unverified &&
    front.name === card.name &&
    back.name === card.name &&
    front.level === 2 &&
    back.level === 2 &&
    front.printed_rotation === 0 &&
    back.printed_rotation === 180 &&
    JSON.stringify(front.effect_lines) ===
      JSON.stringify([[{ type: "text", text: "Acc+1 and Crit+1" }]]) &&
    back.effect_lines.length === 1 &&
    line?.length === 2 &&
    glyph?.type === "icon" &&
    glyph.icon.key === "stress" &&
    glyph.icon.iconId === "dd86508746" &&
    glyph.icon.status === "confirmed" &&
    ["confirmed", "confirmed_rulebook"].includes(glyph.icon.naming) &&
    text?.type === "text" &&
    text.text === " +1"
  );
}

/** 本切片开放完整效果之间的角色回合；不打断待选、回合开始、技能或位移。 */
export function fortunateArmletUseProblem(state: GameState, actorId: string): string | null {
  const b = state.battle,
    turn = b?.encounter?.turn;
  if (
    !b ||
    !turn ||
    !["hero", "monster"].includes(turn.type) ||
    (state.dungeon && state.dungeon.phase !== "inBattle") ||
    b.pending ||
    b.skillPrefix ||
    b.shuffleIntents.length ||
    b.shuffleContinuation ||
    (turn.type === "monster" && !b.monsterAction?.positioned)
  )
    return "饰品反面需要角色回合内的完整效果间隙，不能打断结算（R26）";
  const actor = b.entities.find((e) => e.id === actorId && e.side === "hero" && !e.dead);
  if (!actor || !Number.isSafeInteger(actor.stress) || actor.stress! < 0 || actor.stress! >= 10)
    return "饰品持有者或压力无效（R-048）";
  const pool = b.trinkets;
  if (!pool) return "缺少完整饰品牌池（R-048）";
  const problem = trinketPoolProblem(
    pool,
    b.entities
      .filter((e) => e.side === "hero")
      .map((e) => ({
        id: e.id,
        dead: e.dead,
        ...(e.heroLevel === undefined ? {} : { level: e.heroLevel }),
      })),
  );
  if (problem) return problem;
  const card = pool.cards.find((c) => c.id === FORTUNATE_ARMLET_ID);
  if (!card || !isFortunateArmlet(card)) return "Fortunate Armlet 卡面与已核实效果不符（R-048）";
  if (
    !pool.held.some((h) => h.heroId === actorId && h.cardId === card.id && h.face === "inverted") ||
    b.usedTrinketIds?.includes(card.id)
  )
    return "必须持有反面 Fortunate Armlet，且本角色回合尚未使用（R26、R-028）";
  return null;
}

export function useTrinket(
  state: GameState,
  command: UseTrinketCommand & { allTrinkets?: true | undefined },
): ApplyResult {
  if (isFreeTrinketId(command.cardId))
    return useFreeTrinket(state, { ...command, cardId: command.cardId });
  if (command.cardId !== FORTUNATE_ARMLET_ID)
    return rejectBattleCommand(state, "该饰品的独立使用能力尚未接通（R-048）");
  const problem = fortunateArmletUseProblem(state, command.actorId);
  if (problem) return rejectBattleCommand(state, problem);
  const b = state.battle!;
  const paid = triggerBattlePassive(b, state.seed, [command.actorId], {
    type: "stress",
    amount: 1,
  });
  if (paid.status === "refused") return rejectBattleCommand(state, paid.reason);
  const pressure = resolveBattlePressure({
    state: {
      ...state,
      battle: {
        ...paid.battle,
        usedTrinketIds: [...(b.usedTrinketIds ?? []), command.cardId],
        trinkets: {
          ...b.trinkets!,
          held: b.trinkets!.held.map((h) =>
            h.cardId === command.cardId ? { ...h, face: "upright" as const } : h,
          ),
        },
      },
    },
    events: [
      ...paid.events,
      {
        type: "trinketUsed",
        actorId: command.actorId,
        cardId: command.cardId,
        face: "inverted",
        message: "Fortunate Armlet：压力 +1，翻回正面（R26）",
      },
    ],
  });
  if (pressure.events.some((e) => e.type === "commandRefused")) return pressure;
  return finalizeFreeTrinketDuringMonsterTurn(state, pressure, b, command.allTrinkets);
}
