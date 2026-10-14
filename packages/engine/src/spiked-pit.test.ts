import { expect, it } from "vitest";
import statsFile from "../../data/normalized/corebox/hero_stat.json";
import skillFile from "../../data/normalized/corebox/hero_skill.json";
import monsterFile from "../../data/normalized/corebox/monster_medium.json";
import quirkFile from "../../data/normalized/corebox/quirk.json";
import diseaseFile from "../../data/normalized/corebox/disease.json";
import resolveFile from "../../data/normalized/corebox/virtue_affliction.json";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import {
  normalizedHeroSkillFileSchema,
  normalizedMonsterMediumFileSchema,
  normalizedQuirkFileSchema,
} from "../../data/src/normalize/schema";
import { diseaseFileSchema } from "../../data/src/disease";
import {
  approvedExtraRuinsTiles,
  approvedExtraRuinsTileSchema,
} from "../../data/src/normalize/approved-ruins-tiles";
import { createBattleState } from "./battle";
import type { BattleEntity, BattleSetup } from "./battle";
import { applyCommand } from "./command";
import type { ApplyResult, GameState, Command } from "./command";
import { roomTileBattleAreas } from "./battle-monster-movement";
import { createConditionPool } from "./conditions";
import type { MonsterCardView } from "./monster-skill";
import type { HeroSkillCardView } from "./hero-skill";
import type { ResolveCard } from "./pressure";
import { nextBattleRoll } from "./encounter";
import { applySpikedPit, endTurnSpikedPit } from "./battle-spiked-pit";

const clean = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));
const tile = approvedExtraRuinsTiles.find((tile) => tile.number === 4)!;
const stats = normalizedHeroStatFileSchema
  .parse(statsFile)
  .cards.filter((stat) => stat.level === 1);
const skills = clean<(HeroSkillCardView & { level: number })[]>(
  normalizedHeroSkillFileSchema.parse(skillFile).cards,
);
const monsters = clean<MonsterCardView[]>(
  normalizedMonsterMediumFileSchema.parse(monsterFile).cards.filter((card) => "skills" in card),
);
const quirks = normalizedQuirkFileSchema.parse(quirkFile).cards;
const diseases = diseaseFileSchema.parse(diseaseFile).cards;
const quirk = (name: string) => quirks.find((quirk) => quirk.name === name)!.id;
const disease = (name: string) => diseases.find((disease) => disease.name === name)!.id;
// 局部战斗布置使用获批几何／数值，不是完整任务验收。
function setup(
  hero: Partial<BattleEntity> = {},
  monster: Partial<BattleEntity> = {},
  seed = 1,
  cardId = "monster_medium:p001",
): GameState {
  const card = monsters.find((card) => card.id === cardId)!;
  return createBattleState(seed, {
    heroStats: clean<NonNullable<BattleSetup["heroStats"]>>(stats),
    skills,
    monsters: [card],
    light: 5,
    resolveCards: clean<ResolveCard[]>(resolveFile.cards),
    conditions: createConditionPool(diseases, quirks),
    areas: roomTileBattleAreas(tile),
    entities: [
      ...stats.map((stat, index): BattleEntity => ({
        id: `h${index}`,
        side: "hero",
        hero: stat.name,
        heroStatId: stat.id,
        heroLevel: 1,
        life: stat.life,
        wounds: 0,
        stress: 0,
        areaId: ["S11", "S11", "S12", "S10"][index]!,
        stance: (["aggressive", "defensive", "ranged", "support"] as const)[index]!,
        dodge: stat.dodge,
        skillIds: skills
          .filter((skill) => skill.hero === stat.name && skill.level === 1)
          .slice(0, 3)
          .map((skill) => skill.id),
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
        ...(index ? {} : hero),
      })),
      {
        id: "m",
        side: "monster",
        hero: null,
        monsterCardId: card.id,
        life: card.life,
        wounds: 0,
        areaId: "S5",
        stance: "aggressive",
        stanceSlots: 1,
        dodge: 0,
        skillIds: [],
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
        ...monster,
      },
    ],
  });
}
const entity = (state: GameState, id = "h0") =>
  state.battle!.entities.find((entity) => entity.id === id)!;
function success(result: ApplyResult) {
  expect(
    result.events.find((event) => event.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBeUndefined();
  return result;
}
function turn(state: GameState, actorId = "h0", actions = 2): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      encounter: {
        round: 1,
        deck: ["hero", "monster"],
        actedIds: [],
        turn:
          actorId === "m"
            ? { type: "monster", actorId }
            : { type: "hero", actorId, actions, usedSkillIds: [] },
      },
    },
  };
}
const finishShuffle = (result: ApplyResult, area?: string): ApplyResult => {
  let next = success(applyCommand(result.state, { type: "resolveShuffles" }));
  for (let step = 0; step < 5 && next.pendingChoice; step++)
    next = success(
      applyCommand(next.state, {
        type: "resolveChoice",
        choiceId: next.pendingChoice.id,
        optionId:
          area && next.pendingChoice.options.some((option) => option.id === area)
            ? area
            : next.pendingChoice.options[0]!.id,
      }),
    );
  return next;
};

it("整面完整运行时才开放，三处标记精确投影；关闭或缺半面不能绕过", () => {
  expect(tile.usable).toBe(true);
  expect(tile.specialRegions.every((region) => region.runtimeReady)).toBe(true);
  expect(approvedExtraRuinsTileSchema.safeParse({ ...tile, usable: false }).success).toBe(false);
  const projected = roomTileBattleAreas(tile);
  expect(projected.filter((area) => area.spikedPit).map((area) => area.id)).toEqual(["S8", "S9"]);
  expect(projected.filter((area) => area.circleOfPower).map((area) => area.id)).toEqual(["S5"]);
  expect(
    roomTileBattleAreas({ ...tile, usable: false }).some(
      (area) => area.spikedPit || area.circleOfPower,
    ),
  ).toBe(false);
});

it.each(["S8", "S9"])("%s：伤害3先行，Bleed1·3t独立；英雄／怪物均生效", (areaId) => {
  for (const id of ["h0", "m"]) {
    const state = setup({ areaId }, { areaId }, 1, "monster_medium:p018");
    const before = structuredClone(state);
    const result = success(applySpikedPit(state, id)!);
    expect(entity(result.state, id).wounds).toBe(3);
    expect(entity(result.state, id).statusStacks).toMatchObject([
      { kind: "bleed", amount: 1, remaining: 3 },
    ]);
    expect(result.state.battle!.rngCursor).toBe(0);
    expect(state).toEqual(before);
  }
});

it("Circle of Power只治疗本区结束回合的存活怪物，不治疗英雄或死怪", () => {
  const state = setup({ areaId: "S5", wounds: 5 }, { wounds: 5 });
  const healed = endTurnSpikedPit(state, "m", [])!;
  expect(entity(healed.state, "m").wounds).toBe(1);
  expect(endTurnSpikedPit(state, "h0", [])).toBeNull();
  const dead = setup(
    {},
    { dead: true, wounds: monsters.find((card) => card.id === "monster_medium:p001")!.life },
  );
  expect(endTurnSpikedPit(dead, "m", [])).toBeNull();
});

it("普通移动入坑不额外触发；同回合离开无伤，结束时仍在坑才伤害并施加Bleed", () => {
  const state = turn(setup());
  const entered = success(applyCommand(state, { type: "moveHero", actorId: "h0", path: ["S8"] }));
  expect(entity(entered.state).wounds).toBe(0);
  const left = success(
    applyCommand(entered.state, { type: "moveHero", actorId: "h0", path: ["S11"] }),
  );
  expect(entity(left.state).wounds).toBe(0);
  const standing = success(
    applyCommand(entered.state, { type: "changeStance", actorId: "h0", direction: "backward" }),
  );
  expect(entity(standing.state).wounds).toBe(3);
  expect(entity(standing.state).statusStacks).toMatchObject([
    { kind: "bleed", amount: 1, remaining: 3 },
  ]);
  expect(
    standing.events.filter(
      (event) => event.type === "passiveTriggered" && event.trigger === "spikedPit",
    ),
  ).toHaveLength(1);
});

it.each([true, false])("R-072：实际落点先坑再Vertigo，死门=%s；死亡取消英雄攻击", (dies) => {
  const seed = Array.from({ length: 500 }, (_, index) => index).find(
    (seed) => nextBattleRoll(seed, 0) === 4 && nextBattleRoll(seed, 1) <= 3 === dies,
  )!;
  let state = setup(
    {
      wounds: 14,
      stance: "ranged",
      skillIds: ["hero_skill:p016"],
      quirkIds: [quirk("Soft")],
      diseaseId: disease("Vertigo"),
    },
    { areaId: "S8" },
    seed,
  );
  state = turn({
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((entry) =>
        entry.id === "h2" ? { ...entry, stance: "aggressive" } : entry,
      ),
    },
  });
  const declared = success(
    applyCommand(state, {
      type: "playHeroSkill",
      actorId: "h0",
      targetId: "m",
      skillId: "hero_skill:p016",
    }),
  );
  expect(entity(declared.state, "m").wounds).toBe(0);
  const done = finishShuffle(declared, "S8");
  expect(entity(done.state)).toMatchObject({ areaId: "S8", wounds: 17, dead: dies, stress: 2 });
  expect(entity(done.state).statusStacks).toMatchObject([
    { kind: "bleed", amount: 1, remaining: 3 },
  ]);
  expect(entity(done.state, "m").wounds).toBe(dies ? 0 : 8);
  expect(done.state.battle!.rngCursor).toBe(2);
  expect(
    done.events.findIndex(
      (event) => event.type === "passiveTriggered" && event.trigger === "spikedPit",
    ),
  ).toBeLessThan(
    done.events.findIndex(
      (event) => event.type === "passiveTriggered" && event.trigger === "shuffled",
    ),
  );
  expect(finishShuffle(declared, "S8")).toEqual(done);
});

it("怪物自身落坑死亡取消尚未发生的英雄伤害；不施加死后Bleed，胜利只一次", () => {
  const card = monsters.find((card) => card.id === "monster_medium:p001")!;
  const seed = Array.from({ length: 200 }, (_, index) => index).find(
    (seed) => nextBattleRoll(seed, 0) === 4,
  )!;
  const state = turn(
    setup({ areaId: "S9" }, { areaId: "S8", stance: "defensive", wounds: card.life - 3 }, seed),
    "m",
  );
  const declared = success(
    applyCommand(state, { type: "playMonsterSkill", actorId: "m", targetId: "h0", skillSlot: 2 }),
  );
  expect(entity(declared.state).wounds).toBe(0);
  const done = finishShuffle(declared, "S9");
  expect(entity(done.state, "m")).toMatchObject({ dead: true, areaId: "S9" });
  expect(entity(done.state).wounds).toBe(0);
  expect(entity(done.state, "m").statusStacks).toBeUndefined();
  expect(done.events.filter((event) => event.type === "battleFinished")).toHaveLength(1);
  expect(done.state.battle!.rngCursor).toBe(1);
});

it("防护／On Guard先减伤，Fragile／Syphilis追加伤口；坑不是反击来源", () => {
  const state = setup({
    areaId: "S8",
    protection: true,
    riposte: true,
    statusStacks: [
      { kind: "protection", remaining: 2 },
      { kind: "riposte", remaining: 2 },
    ],
    quirkIds: [quirk("On Guard"), quirk("Fragile")],
    diseaseId: disease("Syphilis"),
  });
  const result = success(applySpikedPit(state, "h0")!);
  expect(entity(result.state).wounds).toBe(3); // ceil((3-1)/2) + Fragile1 + HL1
  expect(entity(result.state, "m").wounds).toBe(0);
  expect(result.state.battle!.rngCursor).toBe(0);
});

it("Bleed服从已批准免疫、抗性、Clotter与Hemophilia，不绕过被动接口", () => {
  const immune = success(applySpikedPit(setup({}, { areaId: "S8" }), "m")!);
  expect(entity(immune.state, "m").statusStacks).toEqual([]);
  const base = setup();
  const resistant = {
    ...base,
    battle: {
      ...base.battle!,
      entities: base.battle!.entities.map((entry) =>
        entry.id === "h1" ? { ...entry, areaId: "S8" } : entry,
      ),
    },
  };
  expect(entity(success(applySpikedPit(resistant, "h1")!).state, "h1").statusStacks).toMatchObject([
    { kind: "bleed", amount: 1, remaining: 2 },
  ]);
  const hemophilia = success(
    applySpikedPit(
      setup({ areaId: "S8", quirkIds: [quirk("Clotter")], diseaseId: disease("Hemophilia") }),
      "h0",
    )!,
  );
  expect(entity(hemophilia.state).wounds).toBe(5);
  expect(entity(hemophilia.state).statusStacks).toMatchObject([
    { kind: "bleed", amount: 1, remaining: 2 },
    { kind: "bleed", amount: 1, remaining: 1 },
  ]);
});

it.each(["S9", "S11", "truncated"])(
  "目标Shuffle只按实际落点触发，起点不额外计（%s）",
  (destination) => {
    const seed = Array.from({ length: 200 }, (_, index) => index).find(
      (seed) => nextBattleRoll(seed, 0) === 4,
    )!;
    const state = turn(setup({ areaId: "S8" }, { areaId: "S8" }, seed, "monster_medium:p010"), "m");
    const declared = success(
      applyCommand(state, { type: "playMonsterSkill", actorId: "m", targetId: "h0", skillSlot: 2 }),
    );
    expect(entity(declared.state).wounds).toBe(3);
    // 截断边界夹具封闭全部相邻落点；不修改生产几何／容量数据。
    const input =
      destination === "truncated"
        ? {
            ...declared,
            state: {
              ...declared.state,
              battle: {
                ...declared.state.battle!,
                areas: declared.state.battle!.areas.map((area) =>
                  area.id !== "S8" ? { ...area, capacity: 0 } : area,
                ),
              },
            },
          }
        : declared;
    const moved = finishShuffle(input, destination);
    expect(entity(moved.state).areaId).toBe(destination === "truncated" ? "S8" : destination);
    expect(entity(moved.state).wounds).toBe(destination === "S11" ? 3 : 6);
    expect(
      moved.events.filter(
        (event) =>
          event.type === "passiveTriggered" &&
          event.trigger === "spikedPit" &&
          event.entityId === "h0",
      ),
    ).toHaveLength(destination === "S11" ? 0 : 1);
    if (destination === "truncated")
      expect(moved.events.find((event) => event.type === "shuffleResolved")).toMatchObject({
        path: [],
      });
    expect(moved.state.battle!.rngCursor).toBe(1);
  },
);

it("经过S8而最终在S11不触发；多步仅为意图边界夹具，不回填卡牌数值", () => {
  const seed = Array.from({ length: 200 }, (_, index) => index).find(
    (seed) => nextBattleRoll(seed, 0) === 4,
  )!;
  const state = turn(setup({ areaId: "S5" }, { areaId: "S5" }, seed, "monster_medium:p010"), "m");
  const declared = success(
    applyCommand(state, { type: "playMonsterSkill", actorId: "m", targetId: "h0", skillSlot: 2 }),
  );
  const input = {
    ...declared.state,
    battle: {
      ...declared.state.battle!,
      shuffleIntents: declared.state.battle!.shuffleIntents.map((intent) => ({
        ...intent,
        move: { ...intent.move, distance: 2 },
      })),
    },
  };
  const waiting = success(applyCommand(input, { type: "resolveShuffles" }));
  const through = success(
    applyCommand(waiting.state, {
      type: "resolveChoice",
      choiceId: waiting.pendingChoice!.id,
      optionId: "S8",
    }),
  );
  const done = success(
    applyCommand(through.state, {
      type: "resolveChoice",
      choiceId: through.pendingChoice!.id,
      optionId: "S11",
    }),
  );
  expect(entity(done.state)).toMatchObject({ areaId: "S11", wounds: 3 });
  expect(
    done.events.filter(
      (event) =>
        event.type === "passiveTriggered" &&
        event.trigger === "spikedPit" &&
        event.entityId === "h0",
    ),
  ).toHaveLength(0);
});

it("R-071：S1真实远程怪完整四轮只跳过，无法清场与拾取S1宝箱，最终撤退", () => {
  const base = setup({}, { areaId: "S1", stance: "ranged" }, 19, "monster_medium:p007");
  const initial = { ...base, battle: { ...base.battle!, lootAreas: ["S1", "S3"] } };
  const snapshot = structuredClone(initial),
    commands: Command[] = [];
  let result: ApplyResult = { state: initial, events: [] };
  const events: ApplyResult["events"][number][] = [];
  const step = (command: Command) => {
    commands.push(command);
    result = success(applyCommand(result.state, command));
    events.push(...result.events);
  };
  step({ type: "startBattle" });
  const started = result.state;
  expect(started.battle!.loot!.placed.some((entry) => entry.areaId === "S1")).toBe(true);
  for (let count = 0; count < 120; count++) {
    const current = result.state.battle!.encounter!.turn;
    if (current.type === "finished") break;
    if (current.type === "awaitingInitiative") step({ type: "drawInitiative" });
    else if (current.type === "monster")
      step({ type: "prepareMonsterAction", actorId: current.actorId });
    else if (current.type === "hero")
      step({
        type: "changeStance",
        actorId: current.actorId,
        direction:
          entity(result.state, current.actorId).stance === "aggressive" ? "backward" : "forward",
      });
    else throw new Error("不应停场或待选");
  }
  expect(result.state.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "retreat" });
  expect(entity(result.state, "m")).toMatchObject({ areaId: "S1", wounds: 0, dead: false });
  expect(events.filter((event) => event.type === "monsterActionSkipped")).toHaveLength(4);
  expect(initial.battle!.areas.find((area) => area.id === "S1")!.adjacent).toEqual([]);
  const firstTurn = turn(started);
  for (const command of [
    { type: "moveHero", actorId: "h0", path: ["S1"] },
    { type: "interactLoot", actorId: "h0" },
  ] as const)
    expect(applyCommand(firstTurn, command).events[0]).toMatchObject({ type: "commandRefused" });
  expect(
    commands.reduce<GameState>((state, command) => applyCommand(state, command).state, initial),
  ).toEqual(result.state);
  expect(initial).toEqual(snapshot);
});

it("坑伤害在死门致死后取消Bleed；资料缺失的公开Shuffle原子拒绝", () => {
  const seed = Array.from({ length: 200 }, (_, index) => index).find(
    (seed) => nextBattleRoll(seed, 0) <= 3,
  )!;
  const dead = success(applySpikedPit(setup({ areaId: "S8", wounds: 17 }, {}, seed), "h0")!);
  expect(entity(dead.state).dead).toBe(true);
  expect(entity(dead.state).statusStacks).toBeUndefined();
  expect(dead.state.battle!.rngCursor).toBe(1);
  const state = turn(
    setup({ stance: "ranged", skillIds: ["hero_skill:p016"] }, { areaId: "S8" }, seed),
  );
  const declared = success(
    applyCommand(state, {
      type: "playHeroSkill",
      actorId: "h0",
      targetId: "m",
      skillId: "hero_skill:p016",
    }),
  );
  const missing = { ...declared.state, battle: { ...declared.state.battle!, heroStats: [] } };
  const refused = applyCommand(missing, { type: "resolveShuffles" });
  expect(refused.events[0]).toMatchObject({ type: "commandRefused" });
  expect(refused.state).toBe(missing);
  expect(entity(refused.state)).toMatchObject({ areaId: "S11", wounds: 0 });
});

it("第四轮怪物在坑内结束回合被杀仍是胜利，死亡只收尾一次", () => {
  const card = monsters.find((card) => card.id === "monster_medium:p018")!;
  const base = turn(setup({}, { areaId: "S8", wounds: card.life - 3 }, 1, card.id), "m");
  const state = {
    ...base,
    battle: { ...base.battle!, encounter: { ...base.battle!.encounter!, round: 4, deck: [] } },
  };
  const done = success(applyCommand(state, { type: "finishMonsterTurn", actorId: "m" }));
  expect(done.state.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "victory" });
  expect(done.events.filter((event) => event.type === "casualtyRemoved")).toHaveLength(1);
  expect(done.events.filter((event) => event.type === "battleFinished")).toHaveLength(1);
  expect(entity(done.state, "m").statusStacks).toBeUndefined();
});

it("最后一个行动自身落坑且仍站立：Shuffle与结束回合各触发一次，Bleed独立成堆", () => {
  const seed = Array.from({ length: 200 }, (_, index) => index).find(
    (seed) => nextBattleRoll(seed, 0) === 4,
  )!;
  const base = setup({ stance: "ranged", skillIds: ["hero_skill:p016"] }, { areaId: "S8" }, seed);
  const state = turn(
    {
      ...base,
      battle: {
        ...base.battle!,
        entities: [
          ...base.battle!.entities.map((entry) =>
            entry.id === "h2" ? { ...entry, stance: "aggressive" as const } : entry,
          ),
          { ...entity(base, "m"), id: "m2", stance: "defensive", areaId: "S3" },
        ],
      },
    },
    "h0",
    1,
  );
  const declared = success(
    applyCommand(state, {
      type: "playHeroSkill",
      actorId: "h0",
      targetId: "m",
      skillId: "hero_skill:p016",
    }),
  );
  const done = finishShuffle(declared, "S8");
  expect(entity(done.state).wounds).toBe(6);
  expect(entity(done.state).statusStacks).toMatchObject([
    { kind: "bleed", amount: 1, remaining: 3 },
    { kind: "bleed", amount: 1, remaining: 3 },
  ]);
  expect(
    done.events.filter(
      (event) =>
        event.type === "passiveTriggered" &&
        event.trigger === "spikedPit" &&
        event.entityId === "h0",
    ),
  ).toHaveLength(2);
  expect(done.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
  expect(done.state.battle!.rngCursor).toBe(1);
});
