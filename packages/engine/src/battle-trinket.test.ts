import { expect, it } from "vitest";
import { coreQuestSources, coreParty } from "./test-helpers/core-quest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { createBattleState } from "./battle";
import type { BattleEntity } from "./battle";
import { applyCommand } from "./command";
import type { ApplyResult, Command, GameState } from "./command";
import { approvedExtraRuinsTiles } from "../../data/src/normalize/approved-ruins-tiles";
import { roomTileBattleAreas } from "./battle-monster-movement";
import { drawTrinket, switchTrinketDungeonLevel, trinketPoolProblem } from "./trinket-acquisition";
import trinketFile from "../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";
import type { TrinketPool } from "./trinket-acquisition";
const tile = approvedExtraRuinsTiles.find((t) => t.number === 6)!;
const basePool = coreQuestSources.catalog.trinkets!;
// 真实获批整面；人工设置当前英雄回合，仅用于交互规则测试。
function setup(seed = 1, pool: TrinketPool = basePool): GameState {
  const d = createCoreDungeonQuest(
    seed,
    "quest:p001",
    "radiant",
    coreParty,
    coreQuestSources,
  ).dungeon!;
  const card = coreQuestSources.catalog.monsters.find((c) => c.id === "monster_medium:p001")!;
  const heroes = d.heroes.map((hero, index): BattleEntity => {
    const stat = coreQuestSources.catalog.heroStats.find((s) => s.id === hero.heroStatId)!;
    return {
      id: hero.id,
      side: "hero",
      hero: stat.name,
      heroStatId: stat.id,
      heroLevel: 1,
      life: stat.life,
      wounds: 0,
      stress: 0,
      dodge: stat.dodge,
      stance: hero.stance!,
      areaId: ["T5", "T3", "T8", "T3"][index]!,
      skillIds: hero.skillIds!,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    };
  });
  const s = createBattleState(seed, {
    ...coreQuestSources.catalog,
    trinkets: pool,
    resolveCards: coreQuestSources.resolveCards,
    skills: coreQuestSources.catalog.skills,
    light: 5,
    provisions: [],
    areas: roomTileBattleAreas(tile),
    entities: [
      ...heroes,
      {
        id: "m",
        side: "monster",
        hero: null,
        life: card.life,
        monsterCardId: card.id,
        wounds: 0,
        areaId: "T2",
        stance: "aggressive",
        stanceSlots: 1,
        dodge: card.dodge,
        skillIds: [],
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
    ],
  });
  return {
    ...s,
    battle: {
      ...s.battle!,
      encounter: {
        round: 1,
        deck: ["monster"],
        actedIds: [],
        turn: { type: "hero", actorId: "hero-0", actions: 2, usedSkillIds: [] },
      },
    },
  };
}
const success = (r: ApplyResult) => {
  expect(
    r.events.find((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBeUndefined();
  return r;
};
const open = (s: GameState) => applyCommand(s, { type: "lootTreasureChest", actorId: "hero-0" });
const choose = (r: ApplyResult, id: string) =>
  applyCommand(r.state, { type: "resolveChoice", choiceId: r.pendingChoice!.id, optionId: id });
const ordered = (first: string, held: TrinketPool["held"] = []): TrinketPool => ({
  ...basePool,
  held,
  deck: [
    first,
    ...basePool.cards
      .map((c) => c.id)
      .filter((id) => id !== first && !held.some((h) => h.cardId === id)),
  ],
});
it("II级战斗宝箱弃旧级装备腾位后续接原卡，只扣一次行动且原命令可回放", () => {
  const old = ordered("trinket:p006", [
    { cardId: "trinket:p001", heroId: "hero-0", face: "inverted" },
  ]);
  const switched = switchTrinketDungeonLevel(
    old,
    normalizedTrinketFileSchema.parse(trinketFile).cards,
    2,
  );
  if ("reason" in switched) throw new Error(switched.reason);
  const pool = {
    ...switched,
    deck: [
      "trinket:p017",
      ...switched.cards.filter((c) => c.level === 2 && c.id !== "trinket:p017").map((c) => c.id),
    ],
  };
  const initial = setup(22, pool),
    before = structuredClone(initial);
  const opened = success(open(initial));
  const freed = success(choose(opened, "discard:trinket:p001"));
  expect(freed.state.battle!.trinkets!.incoming).toEqual(opened.state.battle!.trinkets!.incoming);
  expect(freed.state.battle!.trinkets!.inactive![0]!.discard).toEqual(["trinket:p001"]);
  expect(freed.state.battle!.rngCursor).toBe(opened.state.battle!.rngCursor);
  expect(freed.state.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 0 });
  const done = success(choose(freed, "equip:hero-0"));
  expect(done.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
  expect(done.state.battle!.trinkets!.held).toEqual([
    { cardId: "trinket:p017", heroId: "hero-0", face: "upright" },
  ]);
  expect(trinketPoolProblem(done.state.battle!.trinkets!, [{ id: "hero-0", level: 1 }])).toBeNull();
  const commands: Command[] = [
    { type: "lootTreasureChest", actorId: "hero-0" },
    { type: "resolveChoice", choiceId: opened.pendingChoice!.id, optionId: "discard:trinket:p001" },
    { type: "resolveChoice", choiceId: freed.pendingChoice!.id, optionId: "equip:hero-0" },
  ];
  expect(
    commands.reduce((state, command) => success(applyCommand(state, command)).state, initial),
  ).toEqual(done.state);
  expect(initial).toEqual(before);
});
it("整面完整开放，T5/T6标记接通但不改T4黑墙", () => {
  expect(tile.usable).toBe(true);
  expect(tile.specialRegions.every((r) => r.runtimeReady)).toBe(true);
  expect(roomTileBattleAreas(tile).some((a) => a.lootTheChest)).toBe(true);
  expect(roomTileBattleAreas(tile).find((a) => a.id === "T4")!.adjacent).toEqual([]);
});
it("完整14张自然洗牌只抽一次、扣2行动；选择前冻结，装备后只结束一次并可回放", () => {
  const seed = Array.from({ length: 100 }, (_, i) => i + 1).find((seed) => {
    const r = drawTrinket(basePool, [{ id: "hero-0", level: 1 }], "hero-0", seed, 0);
    return (
      r.status === "resolved" &&
      !r.pool.cards.find((c) => c.id === r.pool.incoming!.cardId)!.verification.unverified
    );
  })!;
  const s = setup(seed),
    before = structuredClone(s),
    r = success(open(s));
  expect(r.state.battle!.trinkets!.deck).toHaveLength(13);
  expect(r.state.battle!.rngCursor).toBe(13);
  expect(r.state.battle!.lootChestUsed).toBe(true);
  expect(r.state.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 0 });
  for (const command of [
    { type: "lootTreasureChest", actorId: "hero-0" },
    { type: "moveHero", actorId: "hero-0", path: ["T1"] },
    { type: "useProvision", provisionId: "none", targetId: "hero-0", effect: "heal" },
  ] as const)
    expect(applyCommand(r.state, command).state).toBe(r.state);
  const done = success(choose(r, "equip:hero-1"));
  expect(done.state.battle!.trinkets!.held).toEqual([
    { cardId: r.state.battle!.trinkets!.incoming!.cardId, heroId: "hero-1", face: "upright" },
  ]);
  expect(done.state.battle!.rngCursor).toBe(13);
  expect(done.state.battle!.encounter!.actedIds).toEqual(["hero-0"]);
  expect(done.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
  const log: Command[] = [
    { type: "lootTreasureChest", actorId: "hero-0" },
    { type: "resolveChoice", choiceId: r.pendingChoice!.id, optionId: "equip:hero-1" },
  ];
  expect(log.reduce<GameState>((s, c) => applyCommand(s, c).state, s)).toEqual(done.state);
  expect(s).toEqual(before);
  expect(applyCommand(done.state, log[1]!).state).toBe(done.state);
  const nextTurn = {
    ...done.state,
    battle: {
      ...done.state.battle!,
      entities: done.state.battle!.entities.map((e) =>
        e.id === "hero-1" ? { ...e, areaId: "T5" } : e,
      ),
      encounter: {
        ...done.state.battle!.encounter!,
        turn: { type: "hero" as const, actorId: "hero-1", actions: 2, usedSkillIds: [] },
      },
    },
  };
  expect(applyCommand(nextTurn, { type: "lootTreasureChest", actorId: "hero-1" }).state).toBe(
    nextTurn,
  );
  const nextBattle = setup(seed, done.state.battle!.trinkets!);
  expect(success(open(nextBattle)).state.battle!.trinkets!.deck).toHaveLength(12);
});
it("转交旧反面饰品腾位后继续原入牌，不重抽、不重扣行动；新装备正置", () => {
  const r = success(
    open(
      setup(
        1,
        ordered("trinket:p001", [{ cardId: "trinket:p002", heroId: "hero-0", face: "inverted" }]),
      ),
    ),
  );
  const transfer = success(choose(r, "transfer:trinket:p002:hero-1"));
  expect(transfer.state.battle!.trinkets!.incoming).toEqual(r.state.battle!.trinkets!.incoming);
  expect(transfer.state.battle!.rngCursor).toBe(0);
  expect(transfer.pendingChoice!.id).not.toBe(r.pendingChoice!.id);
  expect(choose(r, "equip:hero-0").state).toBe(r.state);
  const done = success(choose(transfer, "equip:hero-0"));
  expect(done.state.battle!.trinkets!.held).toEqual([
    { cardId: "trinket:p002", heroId: "hero-1", face: "inverted" },
    { cardId: "trinket:p001", heroId: "hero-0", face: "upright" },
  ]);
  expect(done.state.battle!.trinkets!.deck).toHaveLength(12);
  expect(done.state.battle!.encounter!.actedIds).toEqual(["hero-0"]);
});
it("未知饰品保留真实入牌，仅可明确弃牌；不自动装备、丢弃或重抽", () => {
  const r = success(open(setup(1, ordered("trinket:p009"))));
  expect(r.pendingChoice!.options.map((o) => o.id)).toEqual(["discard-new"]);
  expect(r.state.battle!.trinkets!.incoming!.cardId).toBe("trinket:p009");
  expect(choose(r, "equip:hero-0").state).toBe(r.state);
  const done = success(choose(r, "discard-new"));
  expect(done.state.battle!.trinkets!.discard).toEqual(["trinket:p009"]);
  expect(done.state.battle!.trinkets!.held).toEqual([]);
});
it("非T5／一个行动／必须移动／死亡／重复使用／缩减／耗尽均原子拒绝", () => {
  const s = setup(),
    b = s.battle!,
    t = b.encounter!.turn;
  if (t.type !== "hero") throw new Error("fixture");
  const bad: GameState[] = [
    {
      ...s,
      battle: {
        ...b,
        entities: b.entities.map((e) => (e.id === "hero-0" ? { ...e, areaId: "T3" } : e)),
      },
    },
    { ...s, battle: { ...b, encounter: { ...b.encounter!, turn: { ...t, actions: 1 } } } },
    { ...s, battle: { ...b, encounter: { ...b.encounter!, turn: { ...t, mustMove: true } } } },
    {
      ...s,
      battle: {
        ...b,
        entities: b.entities.map((e) => (e.id === "hero-0" ? { ...e, dead: true } : e)),
      },
    },
    { ...s, battle: { ...b, lootChestUsed: true } },
    setup(1, { ...basePool, cards: basePool.cards.slice(1) }),
    setup(1, { ...basePool, deck: [], discard: basePool.cards.map((c) => c.id) }),
  ];
  for (const state of bad) {
    expect(open(state).state).toBe(state);
    expect(state.battle!.rngCursor).toBe(0);
  }
});
