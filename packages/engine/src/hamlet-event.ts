import rawEvents from "../../data/normalized/corebox/hamlet_event.json";
import { hamletEventFileSchema } from "../../data/src/hamlet-event";
import type { HamletEventCard } from "../../data/src/hamlet-event";
import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { createRng } from "./rng";
import { nextBattleRoll } from "./encounter";

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
  readonly remainingDays?: number;
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
/** R32/33：完整16张只抽一次；未接通卡保留原入牌，不能改概率或先启用准备天数。 */
export function drawHamletEvent(state: GameState): ApplyResult {
  const d = state.dungeon;
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
  const drawn = shuffle(
      catalog.map((c) => c.id),
      state.seed,
      d.cursor,
    ),
    id = drawn.deck.shift()!;
  const card = catalog.find((c) => c.id === id)!;
  const ready =
    card.runtime !== "unimplemented" && card.dayBadge.status === "confirmed" && card.days !== null;
  // R32明确结算后洗回；只有完成的事件才洗回，未完成不替换或重抽。
  const returned = ready ? shuffle([...drawn.deck, id], state.seed, drawn.cursor) : drawn;
  const hamlet: HamletEventState = {
    deck: returned.deck,
    permanentlyRemoved: [],
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
  return {
    state: { ...state, dungeon: { ...d, cursor: returned.cursor, hamlet } },
    events: [
      {
        type: "dungeonUpdated",
        message: ready
          ? `${card.name}：准备${card.days}天，事件已结算并洗回；等待首日看守人（R32/33）`
          : `${card.name}：事件效果尚未接通，保留原卡；准备天数和看守人尚未开始`,
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
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        cursor,
        hamlet: { ...h, phase: "heroActions", caretaker, blockedBuildings: blocked, heroOrder },
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `第${h.day}天：${h.noCaretaker ? "Busy Week不放置看守人、不掷骰" : `d10 ${rolls.join("→")}，封锁${blocked.join("、")}`}；等待${heroOrder[0]}的村庄行动（R33）`,
      },
    ],
  };
}
