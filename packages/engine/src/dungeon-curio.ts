import { curioCatalogSchema, isNegativeCurioEffect } from "../../data/src/curio";
import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { createRng } from "./rng";
import { continueDungeonExploration } from "./dungeon-exploration";
import { gainDisease, gainPositiveQuirk, replaceConditionQuirk } from "./conditions";
import { readHeroPassiveDefence } from "./battle-skill-status";
import { triggerDungeonPassive } from "./dungeon-passive";
import { resolveDungeonPressure } from "./dungeon-pressure";
import { passiveStress } from "./passive";
import { applyPassiveStatus } from "./passive-runtime";
import { nextProvisionFace, PROVISION_FACES, PROVISION_LABELS } from "./loot";
import type { ProvisionFace } from "./loot";
import {
  drawTrinket,
  chooseTrinket,
  trinketOptions,
  trinketPoolProblem,
} from "./trinket-acquisition";

const refuse = (state: GameState, message: string): ApplyResult => ({
  state,
  events: [{ type: "commandRefused", message }],
});
const finish = (state: GameState, dungeon: DungeonState, message: string): ApplyResult => ({
  state: { ...state, dungeon },
  events: [{ type: "dungeonUpdated", message }],
});

/** R10 / R12 / R14：完整牌池只洗一次；Torch 先弃，随后才揭示顶牌，抽空不擅自洗回。 */
export function drawDungeonCurio(state: GameState, rollId: string, optionId: string): ApplyResult {
  let d = state.dungeon!;
  const c = d.curio;
  const roomSource = d.curioRoom;
  const fromRoom =
    d.phase === "awaitingRoom" &&
    roomSource?.roomId === d.position &&
    roomSource.stage === "reward" &&
    rollId === `room-curio:${d.position}`;
  const roll = d.exploration?.rolls?.find(
    (r) => r.id === rollId && !r.resolved && r.face === "curio",
  );
  if (
    (!fromRoom && (!roll || d.phase !== "awaitingHazards")) ||
    !c ||
    !curioCatalogSchema.safeParse(c.cards).success ||
    c.active
  )
    return refuse(state, "需要完整 24 张 Curio 与有效探索停点（R-048）；未抽牌、未消费 Torch");
  const heroId = fromRoom ? "" : roll?.heroId;
  if (!fromRoom && (!heroId || !d.heroes.some((h) => h.id === heroId && !h.dead)))
    return refuse(state, "Curio 处理英雄无效；未抽牌或消耗 Torch");
  const available = [...(c.deck ?? c.cards.map((card) => card.id)), ...c.discard];
  if (
    available.length !== 24 ||
    new Set(available).size !== 24 ||
    available.some((id) => !c.cards.some((card) => card.id === id))
  )
    return refuse(state, "Curio 牌池不守恒，拒绝缩减牌堆（R-048）");
  if (c.deck?.length === 0)
    return refuse(state, "Curio 已抽空；Q-61 待确认，未自动洗回弃牌，也未消费 Torch");
  const protectedCard = optionId.startsWith("use:");
  const tokenId = optionId.slice(4);
  if (
    protectedCard
      ? !d.explorationSetup?.provisions.some((p) => p.id === tokenId && p.face === "torch")
      : optionId !== "draw"
  )
    return refuse(state, "必须在抽卡前选择使用 Torch 或直接抽牌");
  const beforeEvents: import("./command").GameEvent[] = [];
  if (!fromRoom && !d.pendingCurioDraw) {
    const passive = triggerDungeonPassive(d, state.seed, [heroId!], "beforeCurio");
    if (passive.status === "refused") return refuse(state, passive.reason);
    d = passive.dungeon;
    beforeEvents.push(...passive.events);
    if (d.heroes.some((h) => h.dead)) {
      const stopped = finish(
        state,
        { ...d, phase: "awaitingReplacement", pending: null },
        "Curio 交互前被动导致死亡，未抽卡、未扣 Torch",
      );
      return { ...stopped, events: [...beforeEvents, ...stopped.events] };
    }
    if (d.heroes.some((h) => h.stress === 10)) {
      const pressure = resolveDungeonPressure({
        ...state,
        dungeon: {
          ...d,
          phase: "blockedPressure",
          pressureSource: fromRoom ? "curioRoom" : "exploration",
          pending: null,
          pendingCurioDraw: { rollId, optionId },
        },
      });
      const continued = continueDungeonExploration(pressure);
      return { ...continued, events: [...beforeEvents, ...continued.events] };
    }
  }
  const deck = [...(c.deck ?? c.cards.map((card) => card.id))];
  let cursor = d.cursor;
  if (c.deck === null) {
    const rng = createRng(state.seed);
    for (let i = 0; i < cursor; i++) rng.next();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
      cursor++;
    }
  }
  const cardId = deck.shift()!;
  const card = c.cards.find((card) => card.id === cardId)!;
  const { pendingCurioDraw: _pendingDraw, ...ready } = d;
  void _pendingDraw;
  const drawn = finish(
    state,
    {
      ...ready,
      cursor,
      phase: "awaitingCurio",
      ...(fromRoom ? { curioRoom: { ...roomSource!, stage: "drawing" } } : {}),
      pending: null,
      ...(protectedCard
        ? {
            explorationSetup: {
              ...d.explorationSetup!,
              provisions: d.explorationSetup!.provisions.filter((p) => p.id !== tokenId),
            },
          }
        : {}),
      curio: {
        ...c,
        deck,
        active: {
          cardId,
          heroId: heroId!,
          rollId,
          protected: protectedCard,
          ...(fromRoom ? { roomId: d.position } : {}),
        },
      },
    },
    `${fromRoom ? "房间 Curio" : heroId} ${protectedCard ? `先弃 ${tokenId}，忽略已核实负面效果；` : "未用 Torch；"}抽到 ${cardId} ${card.name}（印刷 p${card.source.page}）`,
  );
  if (fromRoom) {
    const pending = {
      id: `dungeon-room-curio-hero:${d.decision}`,
      prompt: "选择处理已揭示房间 Curio 的英雄（R15）",
      options: d.heroes.filter((h) => !h.dead).map((h) => ({ id: h.id, label: h.id })),
    };
    return {
      ...drawn,
      state: {
        ...drawn.state,
        dungeon: { ...drawn.state.dungeon!, pending, decision: d.decision + 1 },
      },
      events: [...beforeEvents, ...drawn.events],
      pendingChoice: pending,
    };
  }
  return { ...drawn, events: [...beforeEvents, ...drawn.events] };
}

/** 未核实行不执行半张卡。整卡预检成功后一次提交，已抽顶牌及 Torch 决定不可撤销重抽。 */
export function resolveDungeonCurio(state: GameState): ApplyResult {
  let d = state.dungeon!;
  const c = d.curio;
  const active = c?.active;
  if (d.phase !== "awaitingCurio" || !c || !active) return refuse(state, "当前没有待结算的 Curio");
  if (d.pending) return refuse(state, "请先完成 Curio 待选决定");
  const block = (reason: string) =>
    finish(
      state,
      { ...d, curio: { ...d.curio!, active: { ...d.curio!.active!, blockedReason: reason } } },
      reason,
    );
  if (!curioCatalogSchema.safeParse(c.cards).success)
    return block("Curio 完整资料无效（R-048），保持已抽卡");
  const held = [...(c.deck ?? []), ...c.discard, active.cardId];
  if (
    held.length !== 24 ||
    new Set(held).size !== 24 ||
    held.some((id) => !c.cards.some((card) => card.id === id))
  )
    return block("Curio 牌池不守恒，保持已抽卡");
  const card = c.cards.find((card) => card.id === active.cardId);
  const hero = d.heroes.find((h) => h.id === active.heroId);
  const fromRoom = active.roomId !== undefined;
  if (
    !card ||
    !hero ||
    hero.dead ||
    (fromRoom
      ? active.roomId !== d.position ||
        d.curioRoom?.roomId !== active.roomId ||
        d.curioRoom.stage !== "drawing" ||
        d.curioRoom.heroId !== active.heroId ||
        active.rollId !== `room-curio:${active.roomId}`
      : !d.exploration?.rolls?.some(
          (r) =>
            r.id === active.rollId &&
            r.heroId === active.heroId &&
            r.face === "curio" &&
            !r.resolved,
        ))
  )
    return block("Curio 与英雄 / 未完成骰面不一致，保持停点");
  const unknown = card.rows.filter((r) => r.effect === null);
  if (unknown.length)
    return block(
      `${card.id} p${card.source.page} 待确认：${unknown.map((r) => `${r.printed}（${r.reason}）`).join("；")}；未结算任何效果，不把未知行判作负面或装饰`,
    );
  const effects = card.rows.flatMap((r) =>
    r.effect && (!active.protected || !isNegativeCurioEffect(r.effect)) ? [r.effect] : [],
  );
  const eligiblePositiveQuirk =
    effects.filter((e) => e.type === "drawQuirk" && e.polarity === "positive").length === 1 &&
    effects.every(
      (e) =>
        e.type === "gold" ||
        e.type === "rollProvision" ||
        (e.type === "drawQuirk" && e.polarity === "positive"),
    ) &&
    (!effects.some((e) => e.type === "rollProvision") ||
      effects.findIndex((e) => e.type === "drawQuirk") <
        effects.findIndex((e) => e.type === "rollProvision"));
  const singleTrinket = effects.length === 1 && effects[0]?.type === "drawTrinket";
  // R-064 已核实的正面组合；按卡面行序续接，每个待选保存已完成行。
  const compositeReward =
    active.protected &&
    effects.length > 1 &&
    effects.filter((e) => e.type === "drawTrinket").length === 1 &&
    effects.every(
      (e) =>
        e.type === "drawTrinket" ||
        e.type === "gold" ||
        (e.type === "status" && e.kind === "buff") ||
        (e.type === "drawQuirk" && e.polarity === "positive"),
    );
  const unsupportedReward = effects.find(
    (e) =>
      (e.type === "drawQuirk" && !eligiblePositiveQuirk && !compositeReward) ||
      (e.type === "drawTrinket" && !singleTrinket && !compositeReward),
  );
  if (unsupportedReward)
    return block(
      `图标已按 R-064 确认；Curio ${unsupportedReward.type} 奖惩接口尚未接线，整卡尚未提交`,
    );
  if (
    effects.some((e) => e.type === "drawDisease") &&
    (!d.conditions || !d.battleCatalog || !readHeroPassiveDefence(d.battleCatalog, hero))
  )
    return block(
      "已核实获得疾病图标；完整疾病牌堆 / 施加接口尚未接线，未抽缩减牌堆，整卡效果尚未提交",
    );
  if (
    effects.some((e) => e.type === "drawDisease") &&
    effects.some((e) => e.type === "status" || e.type === "stress")
  )
    return block("Curio 同卡疾病与压力 / 状态的触发先后待 Q-68 确认，整卡尚未提交");
  const negativeStatuses = effects.some((e) => e.type === "status" && e.kind !== "buff");
  const simpleStatusCard = effects.every(
    (e) => e.type === "stress" || e.type === "gold" || e.type === "status",
  );
  if (negativeStatuses && !simpleStatusCard)
    return block("Curio 状态与同卡其他效果的事件续接尚未接线，整卡尚未提交");
  if (
    effects.some((e) => e.type === "status") &&
    (!d.battleCatalog || !readHeroPassiveDefence(d.battleCatalog, hero))
  )
    return block("Curio 状态需要获批完整英雄抗性 / 免疫（R21、R-048），整卡尚未提交");
  const stress = effects.reduce((sum, e) => sum + (e.type === "stress" ? e.amount : 0), 0);
  if (hero.stress + passiveStress(hero, stress, d.explorationSetup?.light ?? 5).amount >= 10)
    return block("Curio 压力到 10 与同卡其他效果的收尾顺序待 Q-62 确认，整卡尚未提交");
  if (
    !Number.isSafeInteger(d.gold) ||
    d.gold < 0 ||
    (d.lootPool && d.lootPool.gold !== d.gold) ||
    !Number.isInteger(hero.stress) ||
    hero.stress < 0 ||
    hero.stress > 9
  )
    return block("金币 / 压力数据无效（R-048）");
  let gold = d.gold;
  for (const effect of effects) {
    if (effect.type === "gold") gold += effect.amount;
  }
  if (!Number.isSafeInteger(gold)) return block("金币超出安全范围");
  const compositeEvents: import("./command").GameEvent[] = [];
  if (compositeReward) {
    // 在第一项奖励前预检全部依赖，缺池或耗尽时不先发半张卡。
    if (!d.trinkets || d.explorationSetup?.dungeonLevel !== d.trinkets.level)
      return block("复合奖励需要完整同等级饰品牌堆（R35、R-048），保持已完成行");
    const problem = trinketPoolProblem(d.trinkets, d.heroes);
    if (problem) return block(problem);
    if (!active.trinketApplied) {
      const preview = drawTrinket(d.trinkets, d.heroes, hero.id, state.seed, d.cursor);
      if (preview.status === "refused") return block(preview.reason);
    }
    if (effects.some((e) => e.type === "drawQuirk") && !active.positiveQuirkApplied) {
      if (!d.conditions) return block("复合奖励需要完整怪癖资料（R26、R-048），保持已完成行");
      const preview = gainPositiveQuirk(d.conditions, d.heroes, hero.id, state.seed, d.cursor);
      if (preview.status === "refused") return block(preview.reason);
    }
    if (d.trinkets.incoming) return awaitTrinket({ ...state, dungeon: d });
    for (let index = active.positiveRewardCursor ?? 0; index < effects.length; index++) {
      const effect = effects[index]!;
      let replacement: { quirkId: string; options: readonly string[] } | undefined;
      if (effect.type === "drawTrinket") {
        const drawn = drawTrinket(d.trinkets!, d.heroes, hero.id, state.seed, d.cursor);
        if (drawn.status === "refused") return block(drawn.reason);
        d = { ...d, trinkets: drawn.pool, cursor: drawn.cursor };
      } else if (effect.type === "drawQuirk") {
        const acquired = gainPositiveQuirk(d.conditions!, d.heroes, hero.id, state.seed, d.cursor);
        if (acquired.status === "refused") return block(acquired.reason);
        d = { ...d, heroes: acquired.heroes, conditions: acquired.pool, cursor: acquired.cursor };
        if (acquired.replaceOptions)
          replacement = { quirkId: acquired.quirkId, options: acquired.replaceOptions };
        compositeEvents.push({
          type: "dungeonUpdated",
          message: `${hero.id} Curio 抽到正面怪癖：${acquired.pool.quirks.find((q) => q.id === acquired.quirkId)!.name}（R26）`,
        });
      } else if (effect.type === "status") {
        const holder = d.heroes.find((h) => h.id === hero.id)!;
        const buff = applyPassiveStatus(
          holder,
          { kind: "buff", duration: effect.duration },
          "target",
          readHeroPassiveDefence(d.battleCatalog!, holder),
        );
        if (buff.status === "refused") return block(buff.reason);
        d = { ...d, heroes: d.heroes.map((h) => (h.id === hero.id ? buff.hero : h)) };
        compositeEvents.push({
          type: "dungeonUpdated",
          message: `${hero.id} Curio：Buff ${effect.duration}t（R21）`,
        });
      }
      d = {
        ...d,
        curio: {
          ...d.curio!,
          active: {
            ...d.curio!.active!,
            positiveRewardCursor: index + 1,
            ...(effect.type === "drawTrinket" ? { trinketApplied: true } : {}),
            ...(effect.type === "drawQuirk" ? { positiveQuirkApplied: true } : {}),
          },
        },
      };
      if (effect.type === "drawTrinket") {
        const waiting = awaitTrinket({ ...state, dungeon: d });
        return { ...waiting, events: [...compositeEvents, ...waiting.events] };
      }
      if (replacement) {
        const choice = {
          id: `dungeon-condition:${d.decision}:${hero.id}`,
          actorId: hero.id,
          prompt: "第四个怪癖为正面：弃掉新卡，或替换一个已有正面怪癖",
          options: replacement.options.map((id) => ({
            id,
            label: `${id === replacement.quirkId ? "弃掉新卡" : "替换"}：${d.conditions!.quirks.find((q) => q.id === id)!.name}`,
          })),
        };
        return {
          state: { ...state, dungeon: { ...d, decision: d.decision + 1, pending: choice } },
          events: compositeEvents,
          pendingChoice: choice,
        };
      }
    }
  }
  if (singleTrinket) {
    if (!d.trinkets) return block("饰品奖励需要完整当前战役等级牌堆，整卡尚未提交（R35、R-048）");
    if (d.explorationSetup?.dungeonLevel !== d.trinkets.level)
      return block("普通地牢等级与饰品池战役等级不一致，未抽牌（R35）");
    const problem = trinketPoolProblem(d.trinkets, d.heroes);
    if (problem) return block(problem);
    if (!active.trinketApplied) {
      const drawn = drawTrinket(d.trinkets, d.heroes, hero.id, state.seed, d.cursor);
      if (drawn.status === "refused") return block(drawn.reason);
      d = {
        ...d,
        trinkets: drawn.pool,
        cursor: drawn.cursor,
        curio: { ...c, active: { ...active, trinketApplied: true } },
      };
    }
    if (d.trinkets!.incoming) return awaitTrinket({ ...state, dungeon: d });
  }
  const awardsProvision = effects.some((e) => e.type === "rollProvision");
  const provisions = d.explorationSetup?.provisions;
  const provisionId = `curio-provision:${active.cardId}:${active.rollId}`;
  if (
    awardsProvision &&
    (!provisions ||
      provisions.length >= 16 ||
      new Set(provisions.map((p) => p.id)).size !== provisions.length ||
      provisions.some((p) => !PROVISION_FACES.includes(p.face) || p.id === provisionId))
  )
    return block("Curio 补给池已满、缺失或实例无效（R12、R-048）；整卡尚未提交，未掷奖励骰");
  const passiveEvents: import("./command").GameEvent[] = [];
  if (eligiblePositiveQuirk && !active.positiveQuirkApplied) {
    if (!d.conditions)
      return block("单一正面怪癖奖励需要完整 35 张怪癖 / 疾病资料，整卡尚未提交（R26、R-048）");
    const acquired = gainPositiveQuirk(d.conditions, d.heroes, hero.id, state.seed, d.cursor);
    if (acquired.status === "refused") return block(acquired.reason);
    d = {
      ...d,
      heroes: acquired.heroes,
      conditions: acquired.pool,
      cursor: acquired.cursor,
      curio: { ...c, active: { ...active, positiveQuirkApplied: true } },
    };
    passiveEvents.push({
      type: "dungeonUpdated",
      message: `${hero.id} Curio 抽到正面怪癖：${acquired.pool.quirks.find((q) => q.id === acquired.quirkId)!.name}（R26）`,
    });
    if (acquired.replaceOptions) {
      const choice = {
        id: `dungeon-condition:${d.decision}:${hero.id}`,
        actorId: hero.id,
        prompt: "第四个怪癖为正面：弃掉新卡，或替换一个已有正面怪癖",
        options: acquired.replaceOptions.map((id) => ({
          id,
          label: `${id === acquired.quirkId ? "弃掉新卡" : "替换"}：${acquired.pool.quirks.find((q) => q.id === id)!.name}`,
        })),
      };
      return {
        state: { ...state, dungeon: { ...d, decision: d.decision + 1, pending: choice } },
        events: passiveEvents,
        pendingChoice: choice,
      };
    }
  }
  const provisionEvents: import("./command").GameEvent[] = [];
  let provisionFace = active.provisionFace;
  if (awardsProvision && provisionFace === undefined) {
    provisionFace = nextProvisionFace(state.seed, d.cursor);
    d = { ...d, cursor: d.cursor + 1 };
    provisionEvents.push({
      type: "provisionRolled",
      actorId: hero.id,
      face: provisionFace,
      message: `Curio 补给骰：${provisionFace === "wild" ? "Wild，选择一面" : PROVISION_LABELS[provisionFace]}`,
    });
  }
  if (awardsProvision && provisionFace === "wild") {
    const choice = {
      id: `dungeon-curio-provision:${d.decision}:${active.rollId}`,
      actorId: hero.id,
      prompt: "Curio 掷出 Wild：选择补给骰面",
      options: PROVISION_FACES.map((face) => ({ id: face, label: PROVISION_LABELS[face] })),
    };
    return {
      state: {
        ...state,
        dungeon: {
          ...d,
          decision: d.decision + 1,
          pending: choice,
          curio: { ...c, active: { ...d.curio!.active!, provisionFace } },
        },
      },
      events: [...passiveEvents, ...provisionEvents],
      pendingChoice: choice,
    };
  }
  const infectionCount = effects.filter((e) => e.type === "drawDisease").length;
  for (
    let appliedCount = active.diseasesApplied ?? 0;
    appliedCount < infectionCount;
    appliedCount++
  ) {
    const acquired = gainDisease(d.conditions!, d.heroes, hero.id, state.seed, d.cursor);
    if (acquired.status === "refused") return block(acquired.reason);
    d = {
      ...d,
      heroes: acquired.heroes,
      cursor: acquired.cursor,
      conditions: acquired.pool,
      curio: { ...d.curio!, active: { ...active, diseasesApplied: appliedCount + 1 } },
    };
    passiveEvents.push({
      type: "diseaseAcquired",
      entityId: hero.id,
      diseaseId: acquired.diseaseId,
      ...(acquired.quirkId ? { quirkId: acquired.quirkId } : {}),
      message: "Curio 获得疾病；重复感染按 R26–27 抽负面怪癖",
    });
    if (acquired.replaceOptions?.length) {
      const choice = {
        id: `dungeon-condition:${d.decision}:${hero.id}`,
        actorId: hero.id,
        prompt: "选择被新负面怪癖替换的已有正面怪癖",
        options: acquired.replaceOptions.map((id) => ({
          id,
          label: acquired.pool.quirks.find((q) => q.id === id)!.name,
        })),
      };
      return {
        state: { ...state, dungeon: { ...d, decision: d.decision + 1, pending: choice } },
        events: passiveEvents,
        pendingChoice: choice,
      };
    }
  }
  const paid = triggerDungeonPassive(d, state.seed, [hero.id], { type: "stress", amount: stress });
  if (paid.status === "refused") return refuse(state, paid.reason);
  d = paid.dungeon;
  passiveEvents.push(...paid.events);
  if (negativeStatuses && d.heroes.find((h) => h.id === hero.id)!.dead)
    return refuse(state, "Curio死亡后的状态 / 奖励续接未接线，整卡保留原状态");
  for (const effect of effects) {
    if (compositeReward || effect.type !== "status") continue;
    const holder = d.heroes.find((h) => h.id === hero.id)!;
    const buff = applyPassiveStatus(
      holder,
      {
        kind: effect.kind,
        duration: effect.duration,
        ...(effect.amount === undefined ? {} : { amount: effect.amount }),
      },
      "target",
      readHeroPassiveDefence(d.battleCatalog!, holder),
    );
    if (buff.status === "refused") return refuse(state, buff.reason);
    if (buff.wounds.length)
      return refuse(state, "Curio状态追加伤口与其他奖惩的复合续接未接线，整卡保留原状态（R-063）");
    d = { ...d, heroes: d.heroes.map((h) => (h.id === hero.id ? buff.hero : h)) };
    passiveEvents.push({
      type: "dungeonUpdated",
      message: `${hero.id} Curio：${effect.kind === "buff" ? "Buff" : effect.kind} ${effect.duration}t（R21）`,
    });
  }
  const dungeon: DungeonState = {
    ...d,
    ...(awardsProvision && provisionFace && provisionFace !== "wild"
      ? {
          explorationSetup: {
            ...d.explorationSetup!,
            provisions: [...provisions!, { id: provisionId, face: provisionFace }],
          },
        }
      : {}),
    gold,
    ...(d.lootPool ? { lootPool: { ...d.lootPool, gold } } : {}),
    phase: fromRoom
      ? d.heroes.some((h) => h.dead)
        ? "awaitingReplacement"
        : "ready"
      : "awaitingHazards",
    ...(fromRoom
      ? {
          curioRoom: { ...d.curioRoom!, stage: "completed" },
          rooms: d.rooms.map((r) => (r.id === d.position ? { ...r, cleared: true } : r)),
        }
      : {}),
    pending: null,
    exploration: fromRoom
      ? d.exploration
      : {
          ...d.exploration!,
          rolls: d.exploration!.rolls!.map((r) =>
            r.id === active.rollId ? { ...r, resolved: true } : r,
          ),
        },
    curio: {
      ...c,
      active: null,
      last: {
        cardId: active.cardId,
        heroId: active.heroId,
        rollId: active.rollId,
        protected: active.protected,
        ...(fromRoom ? { roomId: active.roomId } : {}),
      },
      discard: [...c.discard, card.id],
    },
  };
  const continued = continueDungeonExploration(
    finish(
      state,
      dungeon,
      `${card.name} 已结算：${active.protected ? "Torch 忽略负面；" : ""}金币 +${gold - d.gold}；${fromRoom ? "房间清理完成，弃牌返回地图" : "弃牌并续接剩余探索骰"}`,
    ),
  );
  return {
    ...continued,
    events: [...compositeEvents, ...passiveEvents, ...provisionEvents, ...continued.events],
  };
}

/** R12 / R18：Wild 的决定沿用已掷骰，整卡奖励在选择完成后提交一次。 */
export function resolveDungeonCurioProvisionChoice(
  state: GameState,
  face: ProvisionFace,
): ApplyResult {
  const d = state.dungeon!;
  if (d.phase !== "awaitingCurio" || d.curio?.active?.provisionFace !== "wild")
    return refuse(state, "当前没有 Curio Wild 待选决定");
  return resolveDungeonCurio({
    ...state,
    dungeon: {
      ...d,
      pending: null,
      curio: { ...d.curio, active: { ...d.curio.active, provisionFace: face } },
    },
  });
}

export function resolveDungeonConditionChoice(state: GameState, optionId: string): ApplyResult {
  const d = state.dungeon!;
  if (!d.conditions) return refuse(state, "缺少疾病 / 怪癖池");
  const applied = replaceConditionQuirk(d.conditions, d.heroes, optionId);
  if (applied.status === "refused") return refuse(state, applied.reason);
  return resolveDungeonCurio({
    ...state,
    dungeon: { ...d, conditions: applied.pool, heroes: applied.heroes, pending: null },
  });
}

function awaitTrinket(state: GameState): ApplyResult {
  const d = state.dungeon!,
    pool = d.trinkets!;
  const options = trinketOptions(pool, d.heroes);
  if (!pool.incoming || !options.length || pool.incoming.actorId !== d.curio?.active?.heroId)
    return refuse(state, "饰品待选入牌与 Curio 英雄不一致");
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
        message: `${pool.level} 级饰品 ${card.id} ${card.name}：等待获得选择，Curio 尚未弃牌`,
      },
    ],
    pendingChoice: choice,
  };
}

export function resolveDungeonTrinketChoice(state: GameState, optionId: string): ApplyResult {
  const d = state.dungeon!;
  if (!d.trinkets || d.phase !== "awaitingCurio" || !d.curio?.active?.trinketApplied)
    return refuse(state, "当前没有 Curio 饰品待选");
  const chosen = chooseTrinket(d.trinkets, d.heroes, optionId);
  if (chosen.status === "refused") return refuse(state, chosen.reason);
  return resolveDungeonCurio({ ...state, dungeon: { ...d, trinkets: chosen.pool, pending: null } });
}
