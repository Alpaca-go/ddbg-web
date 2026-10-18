import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { nextBattleRoll } from "./encounter";
import { completeHamletEvent, hamletEventCompletionProblem } from "./hamlet-event";
import { grantGraveyardVirtue } from "./hamlet-graveyard";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

/** 卡面p14、R28/R32/33、R-048、R-099：全员掷d10，最高者获美德并将压力指示物翻红；已有意志卡则替换洗回。 */
export function applyInGoodSpirits(state: GameState): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    d.pending ||
    d.hamlet?.active !== "hamlet_event:p014" ||
    d.heroes.length !== 4 ||
    new Set(d.heroes.map((hero) => hero.id)).size !== 4 ||
    d.heroes.some((hero) => hero.dead) ||
    d.heroes.some(
      (hero) => !hero.stance || !STANCES.includes(hero.stance as (typeof STANCES)[number]),
    ) ||
    d.resolveCards.length !== 10 ||
    new Set(d.resolveCards.map((card) => card.id)).size !== 10 ||
    d.resolveCards.some((card) => card.verification.unverified) ||
    ["virtue", "affliction"].some(
      (role) => d.resolveCards.filter((card) => card.role === role).length !== 5,
    ) ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    !Number.isSafeInteger(d.cursor + 40) ||
    hamletEventCompletionProblem(d)
  )
    return rejectBattleCommand(
      state,
      "In Good Spirits须在完整回村且美德牌池齐全下结算（R28/R32、R-099）",
    );

  const order = [...d.heroes].sort(
    (a, b) =>
      STANCES.indexOf(a.stance as (typeof STANCES)[number]) -
      STANCES.indexOf(b.stance as (typeof STANCES)[number]),
  );
  let cursor = d.cursor;
  const rolls = order.map((hero) => {
    const roll = nextBattleRoll(state.seed, cursor++);
    return { heroId: hero.id, roll };
  });
  const highest = Math.max(...rolls.map((entry) => entry.roll));
  const winners = rolls.filter((entry) => entry.roll === highest).map((entry) => entry.heroId);

  let next = { ...d, cursor };
  const gained: string[] = [];
  for (const heroId of winners) {
    const granted = grantGraveyardVirtue(next, heroId, state.seed);
    if (granted.status === "refused") return rejectBattleCommand(state, granted.reason);
    next = granted.dungeon;
    const cardId = next.heroes.find((hero) => hero.id === heroId)!.resolveCardId!;
    gained.push(`${heroId}→${cardId}`);
  }

  const completed = completeHamletEvent({ ...state, dungeon: next });
  const rollSummary = rolls.map((entry) => `${entry.heroId}:${entry.roll}`).join("、");
  return {
    ...completed,
    events: [
      {
        type: "dungeonUpdated",
        message: `In Good Spirits：d10 ${rollSummary}，最高${highest}获美德并翻红（${gained.join("；")}）（卡面p14、R28、R-099）`,
      },
      ...completed.events,
    ],
  };
}
