import { expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import rawCurios from "../../data/normalized/corebox/curio.json";
import rooms from "../../data/normalized/corebox/room.json";
import quirks from "../../data/normalized/corebox/quirk.json";
import resolveCards from "../../data/normalized/corebox/virtue_affliction.json";
import diseases from "../../data/normalized/corebox/disease.json";
import { diseaseFileSchema } from "../../data/src/disease";
import { normalizedQuirkFileSchema } from "../../data/src/normalize/schema";
import { createConditionPool } from "./conditions";
import type { ResolveCard } from "./pressure";
import { curioFileSchema } from "../../data/src/curio";
import { roomFileSchema } from "../../data/src/room";
import { createDungeonSandbox } from "./dungeon";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createRng, rollD10 } from "./rng";

const cards = curioFileSchema.parse(rawCurios).cards;
function setup(seed: number): GameState {
  const s = createDungeonSandbox(
    seed,
    layout,
    distribution,
    "standard",
    "D",
    [
      { id: "h0", life: 10, wounds: 0, stress: 0, level: 1, attributesVerified: true },
      { id: "h1", life: 10, wounds: 0, stress: 0, level: 1, attributesVerified: true },
    ],
    [],
    { dungeonLevel: 1, light: 5, provisions: [{ id: "torch", face: "torch" }] },
    cards,
    roomFileSchema.parse(rooms).cards,
  );
  return {
    ...s,
    dungeon: {
      ...s.dungeon!,
      exploration: null,
      phase: "awaitingRoom",
      rooms: s.dungeon!.rooms.map((r) => (r.id === "D" ? { ...r, kind: "curio" } : r)),
    },
  };
}
const begin = (s: GameState) => applyCommand(s, { type: "resolveDungeonRoom" }).state;
const pick = (s: GameState, optionId: string) =>
  applyCommand(s, { type: "resolveChoice", choiceId: s.dungeon!.pending!.id, optionId }).state;

it("守卫1–5 / 无守卫6–10共用游标；重掷拒绝，有守卫才可抽房间牌", () => {
  const outcomes = new Set<string>();
  for (let seed = 1; seed <= 30; seed++) {
    const s = setup(seed),
      before = structuredClone(s),
      next = begin(s);
    const rng = createRng(seed);
    for (let i = 0; i < s.dungeon!.cursor; i++) rng.next();
    const roll = rollD10(rng),
      guarded = roll <= 5;
    expect(next.dungeon!.curioRoom).toMatchObject({
      guardRoll: roll,
      stage: guarded ? "guarded" : "reward",
    });
    expect(next.dungeon!.cursor).toBe(s.dungeon!.cursor + 1);
    expect(begin(next)).toBe(next);
    const prepared = applyCommand(next, { type: "prepareDungeonBattle" });
    expect(prepared.state === next).toBe(!guarded);
    expect(next.dungeon!.curio!.deck).toBeNull();
    expect(s).toEqual(before);
    outcomes.add(guarded ? "guarded" : "reward");
  }
  expect(outcomes.size).toBe(2);
});

it("无守卫完整24张自然抽牌；选英雄、先Torch、奖励只给一次，不需伪造探索骰；命令回放一致", () => {
  let initial: GameState | undefined;
  for (let seed = 1; seed <= 1000; seed++) {
    const s = setup(seed),
      entered = begin(s);
    if (entered.dungeon!.curioRoom!.stage !== "reward") continue;
    const drawn = pick(entered, "use:torch");
    if (drawn.dungeon!.curio!.active?.cardId === "curio:p021") {
      initial = s;
      break;
    }
  }
  expect(initial).toBeDefined();
  const before = structuredClone(initial!);
  const log: Command[] = [];
  let s = initial!;
  const send = (c: Command) => {
    log.push(c);
    s = applyCommand(s, c).state;
  };
  const choose = (optionId: string) =>
    send({ type: "resolveChoice", choiceId: s.dungeon!.pending!.id, optionId });
  send({ type: "resolveDungeonRoom" });
  expect(s.dungeon!.curio!.active).toBeNull();
  expect(s.dungeon!.explorationSetup!.provisions).toHaveLength(1);
  choose("use:torch");
  expect(s.dungeon!.curio!.active!.heroId).toBe("");
  choose("h1");
  expect(s.dungeon!.curio!.active).toMatchObject({ roomId: "D", heroId: "h1", protected: true });
  expect(s.dungeon!.exploration).toBeNull();
  expect(s.dungeon!.explorationSetup!.provisions).toHaveLength(0);
  send({ type: "resolveDungeonCurio" });
  expect(s.dungeon).toMatchObject({
    phase: "ready",
    position: "D",
    gold: 10,
    curioRoom: { stage: "completed" },
  });
  expect(s.dungeon!.rooms.find((r) => r.id === "D")!.cleared).toBe(true);
  expect(s.dungeon!.heroes).toEqual(initial!.dungeon!.heroes);
  expect(s.dungeon!.curio!.discard).toEqual(["curio:p021"]);
  expect(s.dungeon!.curio!.deck).toHaveLength(23);
  expect(applyCommand(s, { type: "resolveDungeonCurio" }).state).toBe(s);
  expect(begin(s)).toBe(s);
  expect(log.reduce((s, c) => applyCommand(s, c).state, initial!)).toEqual(s);
  expect(initial).toEqual(before);
});

it("选择过期或池不守恒原子拒绝；完整抽空Q-61保留Torch与处理选择", () => {
  let s = begin(setup(1));
  for (let seed = 2; !s.dungeon!.pending; seed++) s = begin(setup(seed));
  const stale = s.dungeon!.pending!.id;
  const revealed = pick(s, "use:torch");
  expect(
    applyCommand(revealed, { type: "resolveChoice", choiceId: stale, optionId: "draw" }).state,
  ).toBe(revealed);
  for (const exhausted of [false, true]) {
    const blocked = {
      ...s,
      dungeon: {
        ...s.dungeon!,
        curio: { ...s.dungeon!.curio!, deck: [], discard: exhausted ? cards.map((c) => c.id) : [] },
      },
    };
    const before = structuredClone(blocked);
    expect(pick(blocked, "use:torch")).toBe(blocked);
    expect(blocked).toEqual(before);
  }
});

it("房间交互前Fear压力10：先选英雄再检定，资料补齐后只恢复一次，不重抽或再扣Torch", () => {
  const initial = setup(80);
  const fear = quirks.cards.find((q) => q.name === "Fear of the Unknown")!.id;
  const prepared: GameState = {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      conditions: createConditionPool(
        diseaseFileSchema.parse(diseases).cards,
        normalizedQuirkFileSchema.parse(quirks).cards,
      ),
      heroes: initial.dungeon!.heroes.map((h) =>
        h.id === "h0" ? { ...h, stress: 9, quirkIds: [fear] } : h,
      ),
    },
  };
  const drawn = pick(begin(prepared), "use:torch");
  const blocked = pick(drawn, "h0");
  expect(blocked.dungeon!.phase).toBe("blockedPressure");
  expect(blocked.dungeon!.heroes[0]!.stress).toBe(10);
  expect(blocked.dungeon!.curio!.deck).toEqual(drawn.dungeon!.curio!.deck);
  expect(blocked.dungeon!.curio!.active!.cardId).toBe("curio:p021");
  const repaired: GameState = {
    ...blocked,
    dungeon: { ...blocked.dungeon!, resolveCards: resolveCards.cards as ResolveCard[] },
  };
  const resumed = applyCommand(repaired, { type: "resolveDungeonPressure" });
  expect(resumed.state.dungeon!.phase).toBe("awaitingCurio");
  expect(resumed.state.dungeon!.heroes[0]!.stress).toBe(0);
  expect(resumed.events.filter((e) => e.type === "resolveTested")).toHaveLength(1);
  expect(resumed.state.dungeon!.curio!.deck).toEqual(drawn.dungeon!.curio!.deck);
  const done = applyCommand(resumed.state, { type: "resolveDungeonCurio" }).state;
  expect(done.dungeon!.phase).toBe("ready");
  expect(done.dungeon!.gold).toBe(10);
  expect(done.dungeon!.curio!.discard).toHaveLength(1);
  expect(done.dungeon!.explorationSetup!.provisions).toHaveLength(0);
});

it("已抽房间Curio处理前心脏病死亡，取消整张奖励并弃牌一次", () => {
  const initial = setup(80),
    fear = quirks.cards.find((q) => q.name === "Fear of the Unknown")!.id;
  const prepared: GameState = {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      resolveCards: resolveCards.cards as ResolveCard[],
      conditions: createConditionPool(
        diseaseFileSchema.parse(diseases).cards,
        normalizedQuirkFileSchema.parse(quirks).cards,
      ),
      heroes: initial.dungeon!.heroes.map((h) =>
        h.id === "h0"
          ? {
              ...h,
              stress: 9,
              resolveTested: true,
              resolveCardId: resolveCards.cards[0]!.id,
              quirkIds: [fear],
            }
          : h,
      ),
    },
  };
  const drawn = pick(begin(prepared), "use:torch"),
    stopped = pick(drawn, "h0");
  expect(stopped.dungeon).toMatchObject({
    phase: "awaitingReplacement",
    gold: 0,
    cursor: drawn.dungeon!.cursor,
  });
  expect(stopped.dungeon!.heroes[0]!.dead).toBe(true);
  expect(stopped.dungeon!.curio!.active).toBeNull();
  expect(stopped.dungeon!.curio!.discard).toEqual(["curio:p021"]);
  expect(stopped.dungeon!.curioRoom!.stage).toBe("completed");
  expect(stopped.dungeon!.exploration).toBeNull();
});
