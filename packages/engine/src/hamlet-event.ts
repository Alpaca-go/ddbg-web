import rawEvents from "../../data/normalized/corebox/hamlet_event.json";
import { hamletEventFileSchema } from "../../data/src/hamlet-event";
import type { HamletEventCard } from "../../data/src/hamlet-event";
import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { createRng } from "./rng";
import { nextBattleRoll } from "./encounter";
import { conditionPoolProblem } from "./conditions";
import { beginCaregiversConvention } from "./hamlet-caregivers";
import { applyTownFair } from "./hamlet-town-fair";
import { beginLaborForce } from "./hamlet-labor-force";
import { applyUnsettlingDarkness } from "./hamlet-unsettling-darkness";
import { applyTravelingMerchants } from "./hamlet-traveling-merchants";
import { beginGuildTraining, beginMilitiaTraining } from "./hamlet-guild-training";
import { applyInGoodSpirits } from "./hamlet-in-good-spirits";
import type { DungeonState } from "./dungeon";
import { applySupplyRun } from "./hamlet-supply-run";
import { beginFeast } from "./hamlet-feast";
import { applyLostShipment } from "./hamlet-lost-shipment";
import { mergeHamletCaretakerBlockedWithBossThreat } from "./boss/threat-campaign";
import { applyBossThreatBlackSheepBeforeHamletEvent } from "./boss/threat-passive-runtime";
import { beginHauntedGraveyard } from "./boss/necromancer-ii-graveyard";
import { requiresRuinsActAdvance } from "./act-transition-readiness";

const catalog = hamletEventFileSchema.parse(rawEvents).cards;
export type HamletEventState = {
  readonly deck: readonly string[];
  readonly permanentlyRemoved: readonly string[];
  readonly active: string | null;
  readonly last: string;
  readonly phase: "eventBlocked" | "awaitingCaretaker" | "heroActions" | "preparationComplete";
  readonly preparationDays: number | null;
  readonly day: number;
  readonly noCaretaker: boolean;
  readonly extraBlock: boolean;
  readonly caretaker: string | null;
  readonly blockedBuildings: readonly string[];
  readonly heroOrder: readonly string[];
  readonly actedHeroes?: readonly string[];
  readonly visitedBuildings?: readonly string[];
  readonly higherThreatVisits?: Readonly<Record<string, string>>;
  /** 当前游商访问已经出售一件；访问结束删除，后续访问重新计数。 */
  readonly nomadSold?: true;
  readonly guildUpgrades?: number;
  readonly remainingDays?: number;
  /** Labor Force：整个本次村庄准备期间不能访问，独立于每日看守人。 */
  readonly weekBlockedBuildings?: readonly string[];
  /** 当前事件尚未选择的英雄，与准备日行动分开。 */
  readonly eventRemainingHeroes?: readonly string[];
  /** Flesh I Creeping Sickness：建筑上未转移的伤口代币（Hamlet 阶段结束清空）。 */
  readonly buildingWounds?: Readonly<Partial<Record<string, number>>>;
  readonly hauntedGraveyard?: {
    readonly rolls: readonly { readonly heroId: string; readonly roll: number }[];
    readonly guardHeroId?: string;
  };
};
function shuffle(ids: readonly string[], seed: number, cursor: number) {
  const rng = createRng(seed),
    deck = [...ids];
  for (let i = 0; i < cursor; i++) rng.next();
  let nextCursor = cursor;
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    nextCursor++;
  }
  return { deck, cursor: nextCursor };
}
export function currentHamletEvent(state: GameState): HamletEventCard | undefined {
  return catalog.find(
    (c) => c.id === (state.dungeon?.hamlet?.active ?? state.dungeon?.hamlet?.last),
  );
}
/** R32/33：首轮洗满16张；后续出征后从hamletMemory续抽。未接通卡保留原入牌，不能改概率或先启用准备天数。 */
export function drawHamletEvent(state: GameState): ApplyResult {
  const d = state.dungeon;
  if (d && requiresRuinsActAdvance(d))
    return rejectBattleCommand(state, "请先推进战役等级，再抽村庄事件（R35）");
  if (
    !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    !d.questSummary?.awarded ||
    d.pending ||
    d.hamlet ||
    !Number.isSafeInteger(d.cursor + 40)
  )
    return rejectBattleCommand(state, "村庄事件须在回村完成后抽取一次（R32/33）");
  const memory = d.hamletMemory;
  if (
    memory &&
    (!Array.isArray(memory.deck) ||
      !Array.isArray(memory.permanentlyRemoved) ||
      memory.deck.some((id) => typeof id !== "string" || !id) ||
      memory.permanentlyRemoved.some((id) => typeof id !== "string" || !id) ||
      new Set(memory.deck).size !== memory.deck.length ||
      memory.permanentlyRemoved.some((id) => memory.deck.includes(id)))
  )
    return rejectBattleCommand(state, "村庄事件牌堆记忆无效，未抽牌（R32/33）");
  const source = memory
    ? memory.deck.filter((id) => !memory.permanentlyRemoved.includes(id))
    : catalog.map((c) => c.id);
  if (!source.length) return rejectBattleCommand(state, "村庄事件牌堆已空，未抽牌（R32/33）");
  const blackSheep = applyBossThreatBlackSheepBeforeHamletEvent(state);
  if (blackSheep.events.some((event) => event.type === "commandRefused")) {
    const refused = blackSheep.events.find((event) => event.type === "commandRefused");
    return rejectBattleCommand(state, refused?.message ?? "The Black Sheep 压力结算失败");
  }
  state = blackSheep.state;
  const blackSheepEvents = blackSheep.events;
  const dAfterSheep = state.dungeon!;
  const drawn = memory
      ? { deck: [...source], cursor: dAfterSheep.cursor }
      : shuffle(source, state.seed, dAfterSheep.cursor),
    id = drawn.deck.shift()!;
  const card = catalog.find((c) => c.id === id);
  if (!card) return rejectBattleCommand(state, "村庄事件卡缺失，未抽牌（R-048）");
  const implemented =
    card.runtime !== "unimplemented" && card.dayBadge.status === "confirmed" && card.days !== null;
  if (card.runtime === "removeDisease" || card.runtime === "removeQuirks") {
    const problem = dAfterSheep.conditions
      ? conditionPoolProblem(dAfterSheep.conditions, dAfterSheep.heroes)
      : "缺疾病牌池";
    if (problem || dAfterSheep.heroes.some((hero) => hero.dead))
      return rejectBattleCommand(state, problem ?? "请先完成死亡英雄补位（R33）");
  }
  const candidates =
    card.runtime === "removeDisease" ? dAfterSheep.heroes.filter((hero) => hero.diseaseId) : [];
  const pending = candidates.length
    ? {
        id: `hamlet-medical:${dAfterSheep.decision}`,
        actorId: "party",
        prompt: "Medical Breakthrough：队伍选择一名英雄，移除其疾病（卡面 p11）",
        options: candidates.map((hero) => ({
          id: hero.id,
          label: `${hero.id}：移除 ${dAfterSheep.conditions!.diseases.find((disease) => disease.id === hero.diseaseId)!.name}`,
        })),
      }
    : null;
  const deferred = [
    "lostShipment",
    "feast",
    "supplyRun",
    "removeQuirks",
    "townFair",
    "laborForce",
    "unsettlingDarkness",
    "travelingMerchants",
    "guildTraining",
    "militiaTraining",
    "inGoodSpirits",
  ];
  const ready = implemented && !pending && !deferred.includes(card.runtime);
  // R32明确结算后洗回；只有完成的事件才洗回，未完成不替换或重抽。
  const returned = ready ? shuffle([...drawn.deck, id], state.seed, drawn.cursor) : drawn;
  const hamlet: HamletEventState = {
    deck: returned.deck,
    permanentlyRemoved: memory ? [...memory.permanentlyRemoved] : [],
    active: ready ? null : id,
    last: id,
    phase: ready ? "awaitingCaretaker" : "eventBlocked",
    preparationDays: ready ? card.days : null,
    day: 1,
    noCaretaker: card.runtime === "noCaretaker",
    extraBlock: card.runtime === "extraBlock",
    caretaker: null,
    blockedBuildings: [],
    heroOrder: [],
  };
  const { hamletMemory: _memory, ...dungeonBase } = dAfterSheep;
  void _memory;
  if (deferred.includes(card.runtime)) {
    const apply =
      card.runtime === "lostShipment"
        ? applyLostShipment
        : card.runtime === "feast"
          ? beginFeast
          : card.runtime === "supplyRun"
            ? applySupplyRun
            : card.runtime === "removeQuirks"
              ? beginCaregiversConvention
              : card.runtime === "laborForce"
                ? beginLaborForce
                : card.runtime === "unsettlingDarkness"
                  ? applyUnsettlingDarkness
                  : card.runtime === "travelingMerchants"
                    ? applyTravelingMerchants
                    : card.runtime === "guildTraining"
                      ? beginGuildTraining
                      : card.runtime === "militiaTraining"
                        ? beginMilitiaTraining
                        : card.runtime === "inGoodSpirits"
                          ? applyInGoodSpirits
                          : applyTownFair;
    const result = apply({
      ...state,
      dungeon: { ...dungeonBase, cursor: drawn.cursor, hamlet },
    });
    const refused = result.events.find((event) => event.type === "commandRefused");
    return refused
      ? rejectBattleCommand(state, refused.message)
      : { ...result, events: [...blackSheepEvents, ...result.events] };
  }
  return {
    state: {
      ...state,
      dungeon: {
        ...dungeonBase,
        cursor: returned.cursor,
        hamlet,
        ...(pending ? { pending, decision: dAfterSheep.decision + 1 } : {}),
      },
    },
    events: [
      ...blackSheepEvents,
      {
        type: "dungeonUpdated",
        message: ready
          ? `${card.name}：准备${card.days}天，事件已结算并洗回；等待首日看守人（R32/33）`
          : pending
            ? `${card.name}：等待队伍选择移除疾病的英雄，尚未开始准备日`
            : `${card.name}：事件效果尚未接通，保留原卡；准备天数和看守人尚未开始`,
      },
    ],
    ...(pending ? { pendingChoice: pending } : {}),
  };
}
/** R32：已抽出的事件与其他15张必须构成完整核心牌池。结算不得重抽或重复洗回。 */
export function hamletEventCompletionProblem(d: DungeonState) {
  const h = d.hamlet;
  return !h ||
    h.phase !== "eventBlocked" ||
    !h.active ||
    !Number.isSafeInteger(d.cursor + 15) ||
    h.deck.length + h.permanentlyRemoved.length !== 15 ||
    new Set([...h.deck, h.active, ...h.permanentlyRemoved]).size !== 16 ||
    [...h.deck, h.active, ...h.permanentlyRemoved].some(
      (id) => !catalog.some((card) => card.id === id),
    ) ||
    h.permanentlyRemoved.some((id) => !catalog.find((c) => c.id === id)?.permanentlyRemoved)
    ? "事件牌池不完整，不能洗回或开始准备"
    : null;
}
/** R32/33：事件全部英雄选择完成后，才洗回并启用印刷准备天数。 */
export function completeHamletEvent(state: GameState, militiaDays?: 0 | 3): ApplyResult {
  const d = state.dungeon!,
    h = d.hamlet!;
  const card = catalog.find((candidate) => candidate.id === h.active)!;
  const days =
    card?.runtime === "militiaTraining" && card.id === "hamlet_event:p016"
      ? militiaDays
      : card?.days;
  if (
    hamletEventCompletionProblem(d) ||
    days == null ||
    (militiaDays !== undefined && card?.runtime !== "militiaTraining")
  )
    return rejectBattleCommand(state, "当前事件不能完成并洗回（R32）");
  const returned = card.permanentlyRemoved
    ? { deck: h.deck, cursor: d.cursor }
    : shuffle([...h.deck, h.active!], state.seed, d.cursor);
  const { eventRemainingHeroes, ...completed } = h;
  void eventRemainingHeroes;
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        cursor: returned.cursor,
        pending: null,
        hamlet: {
          ...completed,
          deck: returned.deck,
          permanentlyRemoved: card.permanentlyRemoved
            ? [...h.permanentlyRemoved, h.active!]
            : h.permanentlyRemoved,
          active: null,
          phase: days === 0 ? "preparationComplete" : "awaitingCaretaker",
          preparationDays: days,
          ...(days === 0 ? { remainingDays: 0 } : {}),
        },
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `${card.name}：事件已结算并${card.permanentlyRemoved ? "永久移出牌堆" : "洗回"}；准备${days}天，${days === 0 ? "可选择下一任务" : "等待首日看守人"}（R32/33）`,
      },
    ],
  };
}
/** 卡面p11、R32/33：仅移除一张疾病；结算完再洗回事件，开始三天准备。 */
export function chooseMedicalBreakthrough(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const d = state.dungeon,
    h = d?.hamlet,
    pending = d?.pending;
  const hero = d?.heroes.find((candidate) => candidate.id === optionId);
  if (
    !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    h?.phase !== "eventBlocked" ||
    h.active !== "hamlet_event:p011" ||
    !pending ||
    pending.id !== choiceId ||
    !pending.id.startsWith("hamlet-medical:") ||
    !pending.options.some((option) => option.id === optionId) ||
    !hero?.diseaseId ||
    d.heroes.some((candidate) => candidate.dead) ||
    !d.conditions ||
    conditionPoolProblem(d.conditions, d.heroes) ||
    !Number.isSafeInteger(d.cursor + 15) ||
    h.deck.length !== 15 ||
    new Set([...h.deck, h.active]).size !== 16 ||
    [...h.deck, h.active].some((id) => !catalog.some((card) => card.id === id))
  )
    return rejectBattleCommand(
      state,
      "请完成当前Medical Breakthrough疾病选择，疾病与事件牌池须完整",
    );
  const returned = shuffle([...h.deck, h.active], state.seed, d.cursor);
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        cursor: returned.cursor,
        pending: null,
        conditions: {
          ...d.conditions,
          diseaseDiscard: [...d.conditions.diseaseDiscard, hero.diseaseId],
        },
        heroes: d.heroes.map((candidate) =>
          candidate.id === hero.id
            ? {
                ...candidate,
                diseaseId: null,
                ...(candidate.combat ? { combat: { ...candidate.combat, diseaseId: null } } : {}),
              }
            : candidate,
        ),
        hamlet: {
          ...h,
          deck: returned.deck,
          active: null,
          phase: "awaitingCaretaker",
          preparationDays: 3,
        },
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `Medical Breakthrough：${hero.id}移除疾病；事件已洗回，准备3天，等待首日看守人（卡面p11、R32/33）`,
      },
    ],
  };
}
const buildings = [
  "survivalist",
  "survivalist",
  "tavern",
  "sanitarium",
  "abbey",
  "graveyard",
  "guild",
  "blacksmith",
  "nomadWagon",
  "nomadWagon",
] as const;
export function caretakerBuilding(roll: number) {
  return Number.isInteger(roll) && roll >= 1 && roll <= 10 ? buildings[roll - 1]! : null;
}
/** R33/HB：按建筑判碰撞，1/2或9/10同栋也要重掷；Busy Week完全不掷看守人。 */
export function rollHamletCaretaker(state: GameState): ApplyResult {
  const d = state.dungeon,
    h = d?.hamlet;
  if (
    !d ||
    d.phase !== "inHamlet" ||
    !h ||
    h.phase !== "awaitingCaretaker" ||
    !h.preparationDays ||
    h.active ||
    d.pending ||
    !Number.isSafeInteger(d.cursor + 10000)
  )
    return rejectBattleCommand(state, "请先完成村庄事件，再开始当天看守人（R33）");
  let cursor = d.cursor;
  const rolls: number[] = [],
    blocked: string[] = [];
  let caretaker: string | null = null;
  if (!h.noCaretaker) {
    const roll = nextBattleRoll(state.seed, cursor++);
    rolls.push(roll);
    caretaker = caretakerBuilding(roll)!;
    blocked.push(caretaker);
  }
  if (h.extraBlock) {
    let building: string;
    do {
      const roll = nextBattleRoll(state.seed, cursor++);
      rolls.push(roll);
      building = caretakerBuilding(roll)!;
    } while (blocked.includes(building));
    blocked.push(building);
  }
  const stances = ["aggressive", "defensive", "ranged", "support"];
  const heroOrder = [...d.heroes]
    .sort((a, b) => stances.indexOf(a.stance!) - stances.indexOf(b.stance!))
    .map((hero) => hero.id);
  const result: ApplyResult = {
    state: {
      ...state,
      dungeon: {
        ...d,
        cursor,
        hamlet: {
          ...h,
          phase: "heroActions",
          caretaker,
          blockedBuildings: mergeHamletCaretakerBlockedWithBossThreat(d, blocked),
          heroOrder,
        },
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `第${h.day}天：${h.noCaretaker ? "Busy Week不放置看守人、不掷骰" : `d10 ${rolls.join("→")}，封锁${blocked.join("、")}`}；等待${heroOrder[0]}的村庄行动（R33）`,
      },
    ],
  };
  const haunted = beginHauntedGraveyard(result);
  const refused = haunted.events.find((e) => e.type === "commandRefused");
  return refused ? rejectBattleCommand(state, refused.message) : haunted;
}
