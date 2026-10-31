import type { ApplyResult, GameState, GameEvent } from "./command";
import type { DungeonState } from "./dungeon";
import { rejectBattleCommand } from "./battle";
import { recoverHamletPools } from "./hamlet-return-pools";
import { gainNegativeQuirk, gainPositiveQuirk, replaceConditionQuirk } from "./conditions";
import { statusProjection } from "./status";
import { readDungeonQuestProgress } from "./dungeon-quest";
import { createRng } from "./rng";
import { dungeonQuestSummarySchema } from "../../data/src/quest-summary";
import { PROVISION_FACES } from "./loot";
import { useDungeonProvision } from "./dungeon-provision-use";
import type { UseProvisionCommand } from "./provision-use";
import { restoreTemporarySkillUpgrades } from "./hamlet-embark";
import { resolveDungeonPressure } from "./dungeon-pressure";

/** R32 a-c已完成后，R-074按当前姿态顺序逐英雄转换；待选只续接，不重抽。 */
function convertResolve(result: ApplyResult): ApplyResult {
  let d = result.state.dungeon!;
  const events: GameEvent[] = [...result.events];
  for (const id of d.hamletReturn!.order) {
    if (d.hamletReturn!.convertedHeroIds.includes(id)) continue;
    const role = d.hamletReturn!.resolveRoles[id];
    if (role) {
      const gained = (role === "virtue" ? gainPositiveQuirk : gainNegativeQuirk)(
        d.conditions!,
        d.heroes,
        id,
        result.state.seed,
        d.cursor,
      );
      if (gained.status === "refused") return rejectBattleCommand(result.state, gained.reason);
      d = { ...d, heroes: gained.heroes, conditions: gained.pool, cursor: gained.cursor };
      events.push({
        type: "dungeonUpdated",
        message: `${id}：${role === "virtue" ? "美德转正面" : "苦难转负面"}怪癖 ${gained.quirkId}（R32、R-074）`,
      });
      if (gained.replaceOptions) {
        const pending = {
          id: `hamlet-quirk:${d.decision}`,
          actorId: id,
          prompt: "回村获得第四怪癖：选择替换正面怪癖（正面新卡也可弃置）",
          options: gained.replaceOptions.map((cardId) => ({
            id: cardId,
            label: d.conditions!.quirks.find((q) => q.id === cardId)!.name,
          })),
        };
        return {
          state: { ...result.state, dungeon: { ...d, pending, decision: d.decision + 1 } },
          events,
          pendingChoice: pending,
        };
      }
    }
    d = finishConvertedHero(d, id);
    if (d.heroes.some((h) => h.dead))
      return {
        state: {
          ...result.state,
          dungeon: {
            ...d,
            phase: "awaitingReplacement",
            hamletReturn: { ...d.hamletReturn!, phase: "awaitingReplacement" },
            replacementResume: "hamletConvert",
          },
        },
        events: [
          ...events,
          {
            type: "dungeonUpdated",
            message: "回村转换产生永久死亡，等待驿站替换；尚未发XP或兑换补给（R26/R29）",
          },
        ],
      };
  }
  return {
    state: {
      ...result.state,
      dungeon: { ...d, hamletReturn: { ...d.hamletReturn!, phase: "provisions" } },
    },
    events: [
      ...events,
      {
        type: "dungeonUpdated",
        message: "意志转换完成：可使用剩余补给，或结束回村按每颗1金币兑换并发XP（R32/R29）",
      },
    ],
  };
}
function finishConvertedHero(d: DungeonState, id: string): DungeonState {
  return {
    ...d,
    heroes: d.heroes.map((h) =>
      h.id === id
        ? {
            ...h,
            resolveCardId: undefined,
            resolveTested: false,
            ...(h.combat
              ? {
                  combat: {
                    ...h.combat,
                    resolveCardId: null,
                    resolveTested: false,
                    quirkIds: h.quirkIds ?? [],
                    dead: h.dead ?? false,
                  },
                }
              : {}),
          }
        : h,
    ),
    hamletReturn: {
      ...d.hamletReturn!,
      convertedHeroIds: [...d.hamletReturn!.convertedHeroIds, id],
    },
  };
}
export function beginReturnToHamlet(state: GameState): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    state.battle ||
    d.phase !== "exited" ||
    !d.questSummary ||
    d.questSummary.awarded ||
    d.pending ||
    d.hamletReturn ||
    d.heroes.length !== 4 ||
    d.heroes.some((h) => h.dead) ||
    !d.explorationSetup ||
    readDungeonQuestProgress(d).status !== "matched"
  )
    return rejectBattleCommand(
      state,
      "回村须先离开、完成任务摘要及所有选择，且英雄替换已完成（R32）",
    );
  const stances = ["aggressive", "defensive", "ranged", "support"];
  const progress = readDungeonQuestProgress(d);
  if (
    !dungeonQuestSummarySchema.safeParse(d.questSummary).success ||
    progress.status !== "matched" ||
    [...d.questSummary.clearedRoomIds].sort().join("|") !==
      [...progress.completedRoomIds].sort().join("|") ||
    d.heroes.some(
      (h) =>
        !Number.isSafeInteger(h.stress) ||
        h.stress < 0 ||
        h.stress > 9 ||
        !Number.isSafeInteger(h.life) ||
        h.life! < 1 ||
        !Number.isSafeInteger(h.wounds) ||
        h.wounds! < 0 ||
        h.wounds! > h.life!,
    ) ||
    !Number.isSafeInteger(d.gold) ||
    d.gold < 0
  )
    return rejectBattleCommand(state, "回村摘要或英雄伤口/压力数据无效，未支付或洗牌");
  if (
    new Set(d.heroes.map((h) => h.stance)).size !== 4 ||
    d.heroes.some((h) => !stances.includes(h.stance!)) ||
    d.resolveCards.length !== 10 ||
    new Set(d.resolveCards.map((c) => c.id)).size !== 10 ||
    d.resolveCards.some((c) => c.verification.unverified) ||
    ["virtue", "affliction"].some(
      (role) => d.resolveCards.filter((c) => c.role === role).length !== 5,
    )
  )
    return rejectBattleCommand(state, "回村缺完整意志牌池或当前姿态（R-048）");
  const held = d.heroes.flatMap((h) => (h.resolveCardId ? [h.resolveCardId] : []));
  if (
    new Set(held).size !== held.length ||
    held.some((id) => !d.resolveCards.some((c) => c.id === id)) ||
    ["virtue", "affliction"].some((role) => {
      const ids = d.resolveCards.filter((c) => c.role === role).map((c) => c.id);
      const deck = d.resolveDecks[role as "virtue" | "affliction"];
      const expected = ids.filter((id) => !held.includes(id));
      return (
        deck &&
        (deck.length !== expected.length ||
          new Set(deck).size !== expected.length ||
          deck.some((id) => !expected.includes(id)))
      );
    })
  )
    return rejectBattleCommand(state, "意志持牌/牌堆不守恒，未开始回村");
  const recovered = recoverHamletPools(d, state.seed);
  if (recovered.status === "refused") return rejectBattleCommand(state, recovered.reason);
  let next: DungeonState = recovered.dungeon;
  // R34：任务结束归还铁匠临时技能（R-080归还目标可能已是Guild永久卡）。
  const restoredHeroes = restoreTemporarySkillUpgrades(next.heroes);
  // R32 b/c是回村重置；不作为治疗或探索升光事件，伤口和压力保持原值。
  next = {
    ...next,
    phase: "returningToHamlet",
    explorationSetup: { ...d.explorationSetup, light: 5 },
    heroes: restoredHeroes.map((h) => ({
      ...h,
      resolveCardId: undefined,
      resolveTested: false,
      statusStacks: [],
      ...statusProjection([], h.innateProtection ?? h.combat?.innateProtection),
      ...(h.combat
        ? {
            combat: {
              ...h.combat,
              resolveCardId: null,
              resolveTested: false,
              statusStacks: [],
              ...(h.combat.hero === "ABOMINATION" ? { form: "human" as const } : {}),
              ...statusProjection([], h.combat.innateProtection),
              bleed: [],
              blight: [],
            },
          }
        : {}),
    })),
    trinkets: {
      ...next.trinkets!,
      held: next.trinkets!.held.map((t) => ({ ...t, face: "upright" })),
    },
    hamletReturn: {
      phase: "converting",
      convertedHeroIds: [],
      resolveRoles: Object.fromEntries(
        d.heroes.flatMap((h) =>
          h.resolveCardId
            ? [[h.id, d.resolveCards.find((c) => c.id === h.resolveCardId)!.role]]
            : [],
        ),
      ),
      order: [...d.heroes]
        .sort((a, b) => stances.indexOf(a.stance!) - stances.indexOf(b.stance!))
        .map((h) => h.id),
    },
  };
  next = recycleResolve(next, held, state.seed);
  return convertResolve({
    state: { ...state, dungeon: next },
    events: [
      {
        type: "dungeonUpdated",
        message: "回村：弃牌洗回、移除状态、光照5、饰品正置；伤口/压力不恢复（R32 a-c）",
      },
    ],
  });
}

function recycleResolve(d: DungeonState, held: readonly string[], seed: number): DungeonState {
  let next = d;
  const rng = createRng(seed);
  for (let i = 0; i < next.cursor; i++) rng.next();
  for (const role of ["affliction", "virtue"] as const) {
    if (!d.resolveCards.some((c) => c.role === role && held.includes(c.id))) continue;
    const deck = d.resolveCards.filter((c) => c.role === role).map((c) => c.id);
    let cursor = next.cursor;
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
      cursor++;
    }
    next = { ...next, cursor, resolveDecks: { ...next.resolveDecks, [role]: deck } };
  }
  return next;
}
/** R-075：补给完整结算后新获意志立即再转换；补给已经消耗，待选不重复付费。 */
export function useHamletProvision(state: GameState, command: UseProvisionCommand): ApplyResult {
  const used = useDungeonProvision(state, command);
  if (used.events.some((e) => e.type === "commandRefused")) return used;
  return settleHamletProvisions(used);
}
/** 已消费的回村补给只续接后续转换，不再次调用useDungeonProvision。 */
export function settleHamletProvisions(used: ApplyResult): ApplyResult {
  const state = used.state;
  let d = used.state.dungeon!;
  if (d.heroes.some((h) => h.dead))
    return {
      ...used,
      state: {
        ...used.state,
        dungeon: {
          ...d,
          phase: "awaitingReplacement",
          hamletReturn: { ...d.hamletReturn!, phase: "awaitingReplacement" },
          replacementResume: "hamletProvisions",
        },
      },
    };
  if (d.heroes.some((h) => h.stress === 10)) {
    const pressure = resolveDungeonPressure({
      ...state,
      dungeon: { ...d, phase: "blockedPressure", pressureSource: "provision" },
    });
    if (
      pressure.state.dungeon!.phase === "blockedPressure" ||
      pressure.events.some((e) => e.type === "commandRefused")
    )
      return rejectBattleCommand(state, "回村补给余下意志检定未完成，保持停点");
    return settleHamletProvisions({ ...pressure, events: [...used.events, ...pressure.events] });
  }
  const held = d.heroes.flatMap((h) => (h.resolveCardId ? [h.resolveCardId] : []));
  if (d.phase === "blockedPressure")
    return rejectBattleCommand(state, "回村补给缺少完整意志结算资料，未消费补给");
  if (!held.length)
    return { ...used, state: { ...used.state, dungeon: { ...d, phase: "returningToHamlet" } } };
  const ids = d.heroes.filter((h) => h.resolveCardId).map((h) => h.id);
  const roles = Object.fromEntries(
    d.heroes.flatMap((h) =>
      h.resolveCardId ? [[h.id, d.resolveCards.find((c) => c.id === h.resolveCardId)!.role]] : [],
    ),
  );
  d = recycleResolve(d, held, state.seed);
  d = {
    ...d,
    phase: "returningToHamlet",
    hamletReturn: {
      ...d.hamletReturn!,
      phase: "converting",
      resolveRoles: { ...d.hamletReturn!.resolveRoles, ...roles },
      convertedHeroIds: d.hamletReturn!.convertedHeroIds.filter((id) => !ids.includes(id)),
    },
    heroes: d.heroes.map((h) => ({
      ...h,
      resolveCardId: undefined,
      resolveTested: false,
      ...(h.combat ? { combat: { ...h.combat, resolveCardId: null, resolveTested: false } } : {}),
    })),
  };
  return convertResolve({ ...used, state: { ...used.state, dungeon: d } });
}
export function chooseHamletQuirk(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const d = state.dungeon!,
    p = d.pending;
  if (
    d.hamletReturn?.phase !== "converting" ||
    !p?.id.startsWith("hamlet-quirk:") ||
    p.id !== choiceId ||
    !p.options.some((o) => o.id === optionId)
  )
    return rejectBattleCommand(state, "回村怪癖选择已过期或无效");
  const replaced = replaceConditionQuirk(d.conditions!, d.heroes, optionId);
  if (replaced.status === "refused") return rejectBattleCommand(state, replaced.reason);
  const next = finishConvertedHero(
    { ...d, heroes: replaced.heroes, conditions: replaced.pool, pending: null },
    p.actorId!,
  );
  return convertResolve({
    state: { ...state, dungeon: next },
    events: [
      { type: "dungeonUpdated", message: "回村怪癖选择完成，从下一英雄继续，不重抽（R26、R-074）" },
    ],
  });
}
/** 回村转换已完成的英雄保留标记，只处理原队伍余项。 */
export function resumeHamletConversion(state: GameState): ApplyResult {
  return convertResolve({ state, events: [] });
}
export function finishReturnToHamlet(state: GameState): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    d.hamletReturn?.phase !== "provisions" ||
    d.pending ||
    d.heroes.some((h) => h.dead) ||
    !d.questSummary ||
    d.questSummary.awarded ||
    !d.explorationSetup
  )
    return rejectBattleCommand(
      state,
      "请先完成回村转换、补给效果与英雄替换；XP只发一次（R29/R32）",
    );
  const extraGold = d.explorationSetup.provisions.length,
    summary = d.questSummary;
  const provisions = d.explorationSetup.provisions;
  if (
    !dungeonQuestSummarySchema.safeParse(summary).success ||
    provisions.length > 16 ||
    new Set(provisions.map((p) => p.id)).size !== provisions.length ||
    provisions.some((p) => !p.id || !PROVISION_FACES.includes(p.face)) ||
    d.heroes.some((h) => (h.xp ?? 0) < 0) ||
    (d.stagecoachXp ?? 0) < 0
  )
    return rejectBattleCommand(state, "回村補给或XP记录无效，未兑换或发放");
  const gold = d.gold + extraGold,
    stagecoachXp = (d.stagecoachXp ?? 0) + summary.stagecoachXp;
  if (
    !Number.isSafeInteger(gold) ||
    !Number.isSafeInteger(stagecoachXp) ||
    d.heroes.some((h) => !Number.isSafeInteger((h.xp ?? 0) + summary.xpPerHero))
  )
    return rejectBattleCommand(state, "回村金币/XP超出安全范围，未发放");
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        phase: "inHamlet",
        gold,
        stagecoachXp,
        heroes: d.heroes.map((h) => ({ ...h, xp: (h.xp ?? 0) + summary.xpPerHero })),
        questSummary: { ...summary, awarded: true },
        lootPool: { ...d.lootPool!, gold },
        explorationSetup: { ...d.explorationSetup, provisions: [] },
        hamletReturn: { ...d.hamletReturn, phase: "complete" },
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `回村完成：剩余${extraGold}颗补给换${extraGold}金币，每英雄+${summary.xpPerHero}XP，驿站+${summary.stagecoachXp}XP；等待村庄事件（R29/R32）`,
      },
    ],
  };
}
