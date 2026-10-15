import { curioCatalogSchema, isNegativeCurioEffect } from "../../data/src/curio";
import type { ApplyResult, GameEvent, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { continueDungeonExploration } from "./dungeon-exploration";
import {
  gainDisease,
  gainNegativeQuirk,
  gainPositiveQuirk,
  conditionPoolProblem,
} from "./conditions";
import { readHeroPassiveDefence } from "./battle-skill-status";
import { triggerDungeonPassive } from "./dungeon-passive";
import { resolveDungeonPressure } from "./dungeon-pressure";
import { applyPassiveStatus } from "./passive-runtime";
import { nextProvisionFace, PROVISION_FACES, PROVISION_LABELS } from "./loot";
import { drawTrinket, trinketOptions, trinketPoolProblem } from "./trinket-acquisition";

/** R-069：最后只弃牌一次；死亡取消后续行，已经发出的金币保留。 */
function complete(state: GameState, d: DungeonState, events: readonly GameEvent[]): ApplyResult {
  const active = d.curio!.active!,
    fromRoom = active.roomId !== undefined;
  const dead = d.heroes.some((h) => h.dead);
  const next: DungeonState = {
    ...d,
    pending: null,
    phase: dead ? "awaitingReplacement" : fromRoom ? "ready" : "awaitingHazards",
    ...(fromRoom
      ? {
          curioRoom: { ...d.curioRoom!, stage: "completed" },
          rooms: d.rooms.map((r) => (r.id === d.position ? { ...r, cleared: true } : r)),
        }
      : {
          exploration: {
            ...d.exploration!,
            rolls: d.exploration!.rolls!.map((r) =>
              r.id === active.rollId ? { ...r, resolved: true } : r,
            ),
          },
        }),
    curio: {
      ...d.curio!,
      active: null,
      last: active,
      discard: [...d.curio!.discard, active.cardId],
    },
  };
  return continueDungeonExploration({
    state: { ...state, dungeon: next },
    events: [
      ...events,
      {
        type: "dungeonUpdated",
        message: `${active.cardId} 已结算${dead ? "；英雄死亡，取消剩余效果及未发奖励（R-069）" : ""}；弃牌一次，${fromRoom ? "房间清理完成" : "续接剩余探索骰"}`,
      },
    ],
  });
}

/** 未命名行先挡整卡；已知效果按印刷行序，各待选保存下一行，不从净值推断效果。 */
export function resolveCurioRows(state: GameState): ApplyResult {
  let d = state.dungeon!;
  const active = d.curio?.active;
  if (d.phase !== "awaitingCurio" || !active || d.pending)
    return {
      state,
      events: [{ type: "commandRefused", message: "当前没有可续接的Curio，或尚有待选决定" }],
    };
  const events: GameEvent[] = [];
  const block = (reason: string): ApplyResult => ({
    state: {
      ...state,
      dungeon: {
        ...d,
        curio: { ...d.curio!, active: { ...d.curio!.active!, blockedReason: reason } },
      },
    },
    events: [...events, { type: "dungeonUpdated", message: reason }],
  });
  const c = d.curio!,
    card = c.cards.find((r) => r.id === active.cardId);
  const hero = d.heroes.find((h) => h.id === active.heroId);
  const held = [...(c.deck ?? []), ...c.discard, active.cardId];
  if (
    !curioCatalogSchema.safeParse(c.cards).success ||
    held.length !== 24 ||
    new Set(held).size !== 24 ||
    held.some((id) => !c.cards.some((r) => r.id === id))
  )
    return block("Curio完整资料或牌池守恒无效（R-048），保持已抽卡");
  if (
    !card ||
    !hero ||
    (active.roomId !== undefined
      ? active.roomId !== d.position ||
        d.curioRoom?.stage !== "drawing" ||
        d.curioRoom.roomId !== active.roomId ||
        d.curioRoom.heroId !== hero.id ||
        active.rollId !== `room-curio:${active.roomId}`
      : !d.exploration?.rolls?.some(
          (r) =>
            r.id === active.rollId && r.heroId === hero.id && r.face === "curio" && !r.resolved,
        ))
  )
    return block("Curio与英雄 / 未完成骰面不一致，保持停点");
  if (hero.dead) return complete(state, d, events);
  const unknown = card.rows.filter((r) => r.effect === null);
  if (unknown.length)
    return block(
      `${card.id} p${card.source.page} 待确认：${unknown.map((r) => `${r.printed}（${r.reason}）`).join("；")}；未结算任何效果，不把未知行判作负面或装饰`,
    );
  const effects = card.rows.flatMap((r) =>
    r.effect && (!active.protected || !isNegativeCurioEffect(r.effect)) ? [r.effect] : [],
  );
  const index = active.effectIndex ?? 0;
  if (
    !Number.isInteger(index) ||
    !Number.isSafeInteger(state.seed) ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    index < 0 ||
    index > effects.length ||
    !Number.isSafeInteger(d.gold) ||
    d.gold < 0 ||
    (d.lootPool && d.lootPool.gold !== d.gold) ||
    !Number.isInteger(hero.stress) ||
    hero.stress < 0 ||
    hero.stress > 9 ||
    !Number.isSafeInteger(
      d.gold + effects.slice(index).reduce((sum, e) => sum + (e.type === "gold" ? e.amount : 0), 0),
    )
  )
    return block("金币 / 压力 / 行序数据无效（R-048）");
  // 依赖资料预检，不因未知防御或缩减目录先执行半张卡。
  if (effects.some((e) => e.type === "drawDisease" || e.type === "drawQuirk")) {
    if (!d.conditions)
      return block("Curio需要完整怪癖 / 疾病资料（35 / 11张），奖惩接口缺资料（R-048）");
    const problem = conditionPoolProblem(d.conditions, d.heroes);
    if (problem) return block(problem);
  }
  if (
    effects.some((e) => e.type === "status" || e.type === "drawDisease") &&
    (!d.battleCatalog || !readHeroPassiveDefence(d.battleCatalog, hero))
  )
    return block("Curio状态需要获批完整英雄抗性 / 免疫（R21、R-048），尚未结算本卡");
  if (effects.some((e) => e.type === "drawTrinket")) {
    if (!d.trinkets || d.explorationSetup?.dungeonLevel !== d.trinkets.level)
      return block("饰品奖励缺完整当前等级牌堆，或地牢与饰品池等级不一致（R35、R-048）");
    const problem = trinketPoolProblem(d.trinkets, d.heroes);
    if (problem) return block(problem);
  }
  if (effects.some((e) => e.type === "rollProvision")) {
    const pool = d.explorationSetup?.provisions;
    if (
      !pool ||
      pool.length > 16 ||
      new Set(pool.map((p) => p.id)).size !== pool.length ||
      pool.some((p) => !PROVISION_FACES.includes(p.face))
    )
      return block("Curio补给池缺失或实例无效（R12、R-048），未开始本卡");
  }
  if (d.trinkets?.incoming) return awaitTrinket(state);
  const advance = (next: number) => {
    const { blockedReason: _reason, ...draw } = d.curio!.active!;
    void _reason;
    d = { ...d, curio: { ...d.curio!, active: { ...draw, effectIndex: next } } };
  };
  for (let i = index; i < effects.length; i++) {
    const holder = d.heroes.find((h) => h.id === hero.id)!;
    if (holder.dead) return complete(state, d, events);
    const effect = effects[i]!;
    if (effect.type === "gold") {
      const gold = d.gold + effect.amount;
      d = { ...d, gold, ...(d.lootPool ? { lootPool: { ...d.lootPool, gold } } : {}) };
      events.push({
        type: "dungeonUpdated",
        message: `${hero.id} Curio：金币 +${effect.amount}（印刷行序，R-069）`,
      });
    } else if (effect.type === "stress") {
      const paid = triggerDungeonPassive(d, state.seed, [hero.id], {
        type: "stress",
        amount: effect.amount,
      });
      if (paid.status === "refused") return block(paid.reason);
      d = paid.dungeon;
      events.push(...paid.events);
      advance(i + 1);
      if (
        !d.heroes.find((h) => h.id === hero.id)!.dead &&
        d.heroes.some((h) => !h.dead && h.stress === 10)
      ) {
        const pressure = resolveDungeonPressure({
          ...state,
          dungeon: { ...d, phase: "blockedPressure", pressureSource: "curio", pending: null },
        });
        return { ...pressure, events: [...events, ...pressure.events] };
      }
      continue;
    } else if (effect.type === "status") {
      const applied = applyPassiveStatus(
        { ...holder, statusStacks: holder.statusStacks ?? holder.combat?.statusStacks ?? [] },
        {
          kind: effect.kind,
          duration: effect.duration,
          ...(effect.amount === undefined ? {} : { amount: effect.amount }),
        },
        "target",
        readHeroPassiveDefence(d.battleCatalog!, holder),
      );
      if (applied.status === "refused") return block(applied.reason);
      const beforeStatus = d,
        statusEventStart = events.length;
      d = { ...d, heroes: d.heroes.map((h) => (h.id === hero.id ? applied.hero : h)) };
      events.push({
        type: "dungeonUpdated",
        message: `${hero.id} Curio：${effect.kind === "buff" ? "Buff" : effect.kind} ${effect.duration}t（R21）`,
      });
      if (applied.wounds.length) {
        const health = triggerDungeonPassive(d, state.seed, [hero.id], {
          type: "stress",
          amount: 0,
          woundAmounts: applied.wounds,
        });
        if (health.status === "refused") {
          d = beforeStatus;
          events.length = statusEventStart;
          return block(health.reason);
        }
        d = health.dungeon;
        events.push(...health.events);
      }
    } else if (effect.type === "drawQuirk" || effect.type === "drawDisease") {
      if (
        effect.type === "drawDisease" &&
        readHeroPassiveDefence(d.battleCatalog!, hero)?.diseaseImmune
      ) {
        events.push({
          type: "dungeonUpdated",
          message: `${hero.id}：免疫本次疾病，保留已有疾病，不抽牌（R21、R-081）`,
        });
        advance(i + 1);
        continue;
      }
      const acquired =
        effect.type === "drawDisease"
          ? gainDisease(d.conditions!, d.heroes, hero.id, state.seed, d.cursor)
          : (effect.polarity === "positive" ? gainPositiveQuirk : gainNegativeQuirk)(
              d.conditions!,
              d.heroes,
              hero.id,
              state.seed,
              d.cursor,
            );
      if (acquired.status === "refused") return block(acquired.reason);
      d = { ...d, conditions: acquired.pool, heroes: acquired.heroes, cursor: acquired.cursor };
      if (effect.type === "drawDisease" && "diseaseId" in acquired)
        events.push({
          type: "diseaseAcquired",
          entityId: hero.id,
          diseaseId: acquired.diseaseId,
          ...(acquired.quirkId ? { quirkId: acquired.quirkId } : {}),
          message: "Curio获得疾病；重复感染按R26–27抽负面怪癖",
        });
      else
        events.push({
          type: "dungeonUpdated",
          message: `${hero.id} Curio 抽到${effect.type === "drawQuirk" && effect.polarity === "positive" ? "正面" : "负面"}怪癖：${d.conditions!.quirks.find((q) => q.id === acquired.quirkId)?.name}（R26）`,
        });
      if (effect.type === "drawQuirk" && effect.polarity === "positive")
        d = {
          ...d,
          curio: { ...d.curio!, active: { ...d.curio!.active!, positiveQuirkApplied: true } },
        };
      advance(i + 1);
      if (acquired.replaceOptions?.length) {
        const incoming = d.conditions!.incomingQuirk!;
        const positive =
          d.conditions!.quirks.find((q) => q.id === incoming.cardId)!.polarity === "positive";
        const choice = {
          id: `dungeon-condition:${d.decision}:${hero.id}`,
          actorId: hero.id,
          prompt: positive
            ? "第四个怪癖为正面：弃掉新卡，或替换一个已有正面怪癖"
            : "选择被新负面怪癖替换的已有正面怪癖",
          options: acquired.replaceOptions.map((id) => ({
            id,
            label: `${id === incoming.cardId ? "弃掉新卡" : "替换"}：${d.conditions!.quirks.find((q) => q.id === id)!.name}`,
          })),
        };
        return {
          state: { ...state, dungeon: { ...d, decision: d.decision + 1, pending: choice } },
          events,
          pendingChoice: choice,
        };
      }
      continue;
    } else if (effect.type === "drawTrinket") {
      const drawn = drawTrinket(d.trinkets!, d.heroes, hero.id, state.seed, d.cursor);
      if (drawn.status === "refused") return block(drawn.reason);
      d = {
        ...d,
        trinkets: drawn.pool,
        cursor: drawn.cursor,
        curio: { ...d.curio!, active: { ...d.curio!.active!, trinketApplied: true } },
      };
      advance(i + 1);
      const waiting = awaitTrinket({ ...state, dungeon: d });
      return { ...waiting, events: [...events, ...waiting.events] };
    } else {
      const provisions = d.explorationSetup?.provisions;
      const id = `curio-provision:${active.cardId}:${active.rollId}`;
      if (
        !provisions ||
        provisions.length >= 16 ||
        new Set(provisions.map((p) => p.id)).size !== provisions.length ||
        provisions.some((p) => !PROVISION_FACES.includes(p.face) || p.id === id)
      )
        return block("Curio补给池已满、缺失或实例无效（R12、R-048）；保留已完成行，未掷奖励骰");
      let face = d.curio!.active!.provisionFace;
      if (face === undefined) {
        face = nextProvisionFace(state.seed, d.cursor);
        d = {
          ...d,
          cursor: d.cursor + 1,
          curio: { ...d.curio!, active: { ...d.curio!.active!, provisionFace: face } },
        };
        events.push({
          type: "provisionRolled",
          actorId: hero.id,
          face,
          message: `Curio补给骰：${face === "wild" ? "Wild，选择一面" : PROVISION_LABELS[face]}`,
        });
      }
      if (face === "wild") {
        const choice = {
          id: `dungeon-curio-provision:${d.decision}:${active.rollId}`,
          actorId: hero.id,
          prompt: "Curio掷出Wild：选择补给骰面",
          options: PROVISION_FACES.map((face) => ({ id: face, label: PROVISION_LABELS[face] })),
        };
        return {
          state: { ...state, dungeon: { ...d, decision: d.decision + 1, pending: choice } },
          events,
          pendingChoice: choice,
        };
      }
      d = {
        ...d,
        explorationSetup: { ...d.explorationSetup!, provisions: [...provisions, { id, face }] },
      };
    }
    advance(i + 1);
  }
  return complete(state, d, events);
}

function awaitTrinket(state: GameState): ApplyResult {
  const d = state.dungeon!,
    pool = d.trinkets!;
  const options = trinketOptions(pool, d.heroes);
  if (!pool.incoming || !options.length || pool.incoming.actorId !== d.curio?.active?.heroId)
    return {
      state,
      events: [{ type: "commandRefused", message: "饰品待选入牌与Curio英雄不一致" }],
    };
  const card = pool.cards.find((c) => c.id === pool.incoming!.cardId)!;
  const choice = {
    id: `dungeon-trinket:${d.decision}:${card.id}`,
    actorId: pool.incoming.actorId,
    prompt: card.verification.unverified
      ? `${card.name} 卡面未核实（R-048）：可弃新卡或保留此停点等待复核`
      : `${card.name}：选择装备者、转交旧饰品腾位或弃牌`,
    options: options.map(({ id, label }) => ({ id, label })),
  };
  return {
    state: { ...state, dungeon: { ...d, decision: d.decision + 1, pending: choice } },
    events: [
      {
        type: "dungeonUpdated",
        message: `${pool.level} 级饰品 ${card.id} ${card.name}：等待获得选择，Curio尚未弃牌`,
      },
    ],
    pendingChoice: choice,
  };
}
