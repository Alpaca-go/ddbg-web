import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { readRuinsActTransitionReadiness } from "./act-transition-readiness";
import { switchRuinsActPools } from "./act-transition-pools";
import { drawImminentThreatAfterActAdvance } from "./boss/establish-imminent-threat";
import { conditionPoolProblem } from "./conditions";
import { buildingLevelsProblem } from "./hamlet-buildings";
import { createRng } from "./rng";

/** §2.2/R35、R-037：先校验，再按威胁抽取→怪物洗牌顺序原子提交。 */
export function advanceRuinsAct(state: GameState): ApplyResult {
  const readiness = readRuinsActTransitionReadiness(state);
  if (readiness.kind === "blocked") return rejectBattleCommand(state, readiness.reason);
  const d = state.dungeon!;
  if (d.explorationSetup?.dungeonLevel !== readiness.plan.fromLevel)
    return rejectBattleCommand(state, "源地牢等级与战役等级不符，未提交升幕");
  if (
    d.hamlet ||
    !d.conditions ||
    !d.trinkets ||
    !d.monsterPool ||
    !d.explorationSetup ||
    !Number.isSafeInteger(state.seed) ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    !Number.isSafeInteger(d.cursor + 100)
  )
    return rejectBattleCommand(state, "升幕须在抽村庄事件前，具有完整牌池与有效RNG游标");
  const issue = buildingLevelsProblem(d) ?? conditionPoolProblem(d.conditions, d.heroes);
  if (issue) return rejectBattleCommand(state, issue);
  const switched = switchRuinsActPools(
    readiness.plan.fromLevel,
    d.monsterPool,
    d.trinkets,
    d.heroes,
  );
  if (switched.kind === "blocked") return rejectBattleCommand(state, switched.reason);
  const {
    faceTheThreatEmbarkPlan: _embark,
    bossCombatThreatCeased: _ceased,
    nextQuestOffers: _offers,
    ...base
  } = d;
  void _embark;
  void _ceased;
  void _offers;
  const drawn = drawImminentThreatAfterActAdvance(
    {
      ...state,
      dungeon: { ...base, campaignLevel: readiness.plan.toLevel },
    },
    { type: "drawImminentThreatAfterActAdvance" },
  );
  const refusal = drawn.events.find((e) => e.type === "commandRefused");
  if (refusal) return rejectBattleCommand(state, refusal.message);
  const next = drawn.state.dungeon!;
  if (!next.activeBossThreatScriptId || next.unregisteredImminentThreatHold)
    return rejectBattleCommand(state, "新迫近威胁缺少已注册脚本，未提交升幕");
  const deck = [...switched.monsterPool.remaining!];
  const rng = createRng(state.seed);
  for (let i = 0; i < next.cursor; i++) rng.next();
  let cursor = next.cursor;
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    cursor++;
  }
  return {
    state: {
      ...drawn.state,
      dungeon: {
        ...next,
        cursor,
        discardedQuests: readiness.plan.retiredQuestIds,
        monsterPool: { ...switched.monsterPool, remaining: deck },
        trinkets: switched.trinkets,
        explorationSetup: { ...d.explorationSetup, dungeonLevel: readiness.plan.toLevel },
      },
    },
    events: [
      ...drawn.events,
      {
        type: "dungeonUpdated",
        message: `战役升至${readiness.plan.toLevel}级：旧任务移出、怪物累加洗牌、地牢饰品换级，等待村庄事件（R35/R-037）`,
      },
    ],
  };
}
