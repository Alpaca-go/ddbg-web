import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, roomTileBattleAreas } from "./index";
import { nextBattleRoll } from "./encounter";
import type { BattleArea, BattleEntity, GameState, MonsterCardView, SkillStance } from "./index";

const read = (file: string) =>
  JSON.parse(
    readFileSync(new URL(`../../data/normalized/corebox/${file}.json`, import.meta.url), "utf8"),
  );
const soldier = (read("monster_medium").cards as MonsterCardView[]).find(
  (card) => card.id === "monster_medium:p001",
)!;
const tile = read("room_tile_geometry").tiles[0];
const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];
const move = { type: "moveMonsterToRange", actorId: "m" } as const;
const prepare = { type: "prepareMonsterAction", actorId: "m" } as const;
const play = { type: "playMonsterSkill", actorId: "m", targetId: "h0", skillSlot: 1 } as const;

it("R24：普通怪可挤出Small，Small自身不能占满员落点；不改变大型一名挤出规则", () => {
  const areas = graph().map((a) => (a.id === "b" ? { ...a, capacity: 1 } : a));
  const base = start(soldier, areas);
  const small: BattleEntity = {
    ...base.battle!.entities.find((e) => e.id === "m")!,
    id: "small",
    areaId: "b",
    stance: "defensive",
    monsterCardId: "small-card",
  };
  const s: GameState = {
    ...base,
    battle: {
      ...base.battle!,
      entities: [...base.battle!.entities, small],
      monsters: [
        ...base.battle!.monsters!,
        { ...soldier, id: "small-card", type_position_tags: ["Small"] },
      ],
    },
  };
  const selected = applyCommand(applyCommand(s, prepare).state, move);
  expect(selected.state.battle!.pending?.type).toBe("monsterDisplace");
  const choice = selected.state.battle!.pending!.choice;
  const result = applyCommand(selected.state, {
    type: "resolveChoice",
    choiceId: choice.id,
    optionId: "small->a",
  });
  expect(result.events[0]).toMatchObject({
    type: "monsterPositioned",
    to: "b",
    displaced: { entityId: "small", from: "b", to: "a" },
  });
  const tiny = {
    ...s,
    battle: {
      ...s.battle!,
      monsters: s.battle!.monsters!.map((m) => ({ ...m, type_position_tags: ["Small"] })),
    },
  };
  const skipped = applyCommand(applyCommand(tiny, prepare).state, move);
  expect(skipped.events[0]).toMatchObject({ type: "monsterPositioned", to: "a", skipped: true });
});
function graph(pairs = ["ab", "bc", "cd", "de"]): BattleArea[] {
  return [...new Set(pairs.join(""))].sort().map((id) => ({
    id,
    capacity: 8,
    elevation: "normal",
    adjacent: pairs.filter((pair) => pair.includes(id)).map((pair) => pair.replace(id, "")),
  }));
}
function start(
  card = soldier,
  areas: readonly BattleArea[] = graph(),
  from = "a",
  target = "c",
  patches: Record<string, Partial<BattleEntity>> = {},
  seed = 1,
): GameState {
  const heroes: BattleEntity[] = stances.map((stance, index) => ({
    id: `h${index}`,
    side: "hero",
    hero: "CRUSADER",
    skillIds: [],
    areaId: index === 0 ? target : areas.at(-1)!.id,
    stance,
    wounds: 1,
    stress: 3,
    dodge: 1,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  const monster: BattleEntity = {
    id: "m",
    side: "monster",
    hero: null,
    skillIds: [],
    areaId: from,
    stance: "aggressive",
    stanceSlots: 1,
    monsterCardId: card.id,
    life: card.life,
    wounds: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  let state = applyCommand(
    createBattleState(seed, {
      monsters: [card],
      areas,
      skills: [],
      light: 5,
      entities: [...heroes, monster],
    }),
    { type: "startBattle" },
  ).state;
  for (let i = 0; i < 8; i++) {
    state = applyCommand(state, { type: "drawInitiative" }).state;
    const turn = state.battle!.encounter!.turn;
    // Guard 的持续时间尚未接入；沿用既有测试，在回合开始后注入场景状态。
    if (turn.type === "monster")
      return {
        ...state,
        battle: {
          ...state.battle!,
          entities: state.battle!.entities.map((entity) => ({
            ...entity,
            ...(entity.id === "h0" ? { guard: true } : {}),
            ...patches[entity.id],
          })),
        },
      };
    if (turn.type !== "hero") throw new Error("缺少英雄 / 怪物回合");
    const stance = state.battle!.entities.find((entity) => entity.id === turn.actorId)!.stance;
    const direction = stance === "aggressive" ? "backward" : "forward";
    state = applyCommand(state, { type: "changeStance", actorId: turn.actorId, direction }).state;
    state = applyCommand(state, {
      type: "changeStance",
      actorId: turn.actorId,
      direction: direction === "forward" ? "backward" : "forward",
    }).state;
  }
  throw new Error("没有抽到怪物");
}
const ready = (...args: Parameters<typeof start>) => applyCommand(start(...args), prepare).state;
const position = (state: GameState) =>
  state.battle!.entities.find((entity) => entity.id === "m")!.areaId;
// 合成图 / 状态和改动的 Speed / 射程 / 骰表仅作算法夹具，不回填真实数据。
const ranged = (numeric: number | null): MonsterCardView => ({
  ...soldier,
  skills: soldier.skills.map((skill) => ({
    ...skill,
    unlabeled_numbers: skill.unlabeled_numbers.map((item) =>
      item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "range"
        ? { ...item, numeric }
        : item,
    ),
  })),
});

describe("普通怪单目标 Speed 定位（R18、R24–25；R-021/023/024/048/054）", () => {
  it("真实 Room Tile 仅投影通行边，E-F 与角点不通行，未命名标记不加载", () => {
    const areas = roomTileBattleAreas(tile);
    expect(areas.find((area) => area.id === "F")).toEqual({
      id: "F",
      capacity: 2,
      elevation: "high",
      adjacent: [],
    });
    expect(areas.find((area) => area.id === "E")!.adjacent).toEqual(["A", "C", "D"]);
    expect(areas.find((area) => area.id === "D")!.adjacent).not.toContain("I");
    expect(() => roomTileBattleAreas({ ...tile, geometryVerified: false })).toThrow();
    const initial = ready(soldier, areas, "A", "G", {
      h1: { areaId: "D" },
      h2: { areaId: "H" },
      h3: { areaId: "I" },
    });
    const waiting = applyCommand(initial, move);
    expect(waiting.pendingChoice!.options.map((option) => option.id)).toEqual(["B", "E"]);
    const result = applyCommand(waiting.state, {
      type: "resolveChoice",
      choiceId: waiting.pendingChoice!.id,
      optionId: "E",
    });
    expect(position(result.state)).toBe("E");
    expect(result.events[0]).toMatchObject({ skipped: true, steps: 1 });
    expect(result.state.battle!.rngCursor).toBe(initial.battle!.rngCursor);
  });

  it("已在射程内不移动；定位不花攻击骰，攻击完成且不能第二次移动", () => {
    const initial = ready(soldier, graph(), "b");
    const positioned = applyCommand(initial, move);
    expect(positioned.events[0]).toMatchObject({ from: "b", to: "b", steps: 0, skipped: false });
    expect(positioned.state.battle!.rngCursor).toBe(initial.battle!.rngCursor);
    expect(applyCommand(positioned.state, move).state).toBe(positioned.state);
    const attacked = applyCommand(positioned.state, play);
    expect(attacked.events[0]?.type).toBe("monsterSkillResolved");
    expect(attacked.state.battle!.rngCursor).toBe(initial.battle!.rngCursor + 1);
    expect(attacked.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
  });

  it("不换 Guard 目标：移动进射程后保留选招，随后只攻击保存的英雄", () => {
    const initial = ready(soldier, graph(), "a", "c", { h1: { areaId: "b", wounds: 5 } });
    const moved = applyCommand(initial, move);
    expect(position(moved.state)).toBe("b");
    expect(moved.state.battle!.monsterAction).toEqual({
      ...initial.battle!.monsterAction,
      positioned: true,
    });
    expect(moved.state.battle!.encounter).toEqual(initial.battle!.encounter);
    expect(applyCommand(moved.state, { ...play, targetId: "h1" }).state).toBe(moved.state);
    expect(applyCommand(moved.state, play).events[0]?.type).toBe("monsterSkillResolved");
  });

  it("多落点由目标玩家选；冻结其他命令、拒绝过期选项，选招 / RNG 保持且完整回放一致", () => {
    const card: MonsterCardView = {
      ...soldier,
      stanceGroups: [{ stances, rollTable: [{ min: 1, max: 10, skill: 1 }] }],
    };
    const initial = start(card, graph(["ab", "ac", "bd", "cd", "de"]), "a", "d");
    const before = structuredClone(initial);
    const run = () => {
      const chosen = applyCommand(initial, prepare);
      const waiting = applyCommand(chosen.state, move);
      expect(waiting.pendingChoice).toMatchObject({
        actorId: "h0",
        options: [{ id: "b" }, { id: "c" }],
      });
      expect(position(waiting.state)).toBe("a");
      expect(waiting.state.battle!.monsterAction).toEqual(chosen.state.battle!.monsterAction);
      expect(waiting.state.battle!.rngCursor).toBe(initial.battle!.rngCursor + 1);
      for (const command of [
        prepare,
        move,
        play,
        { type: "finishMonsterTurn", actorId: "m" } as const,
        { type: "resolveChoice", choiceId: "stale", optionId: "b" } as const,
        { type: "resolveChoice", choiceId: waiting.pendingChoice!.id, optionId: "d" } as const,
      ])
        expect(applyCommand(waiting.state, command).state).toBe(waiting.state);
      const moved = applyCommand(waiting.state, {
        type: "resolveChoice",
        choiceId: waiting.pendingChoice!.id,
        optionId: "c",
      });
      expect(position(moved.state)).toBe("c");
      expect(moved.state.battle!.rngCursor).toBe(waiting.state.battle!.rngCursor);
      expect(
        applyCommand(moved.state, {
          type: "resolveChoice",
          choiceId: waiting.pendingChoice!.id,
          optionId: "b",
        }).state,
      ).toBe(moved.state);
      return applyCommand(moved.state, play);
    };
    expect(run()).toEqual(run());
    expect(initial).toEqual(before);
  });

  it("整数射程需要等距，可以后退拉开距离；高低地按候选落点重新核对", () => {
    const backed = applyCommand(ready(ranged(2), graph(), "b", "a"), move);
    expect(position(backed.state)).toBe("c");
    expect(backed.events[0]).toMatchObject({ skipped: false });
    const high = graph().map((area) =>
      area.id === "a" ? { ...area, elevation: "high" as const } : area,
    );
    expect(applyCommand(ready(soldier, high), move).events[0]).toMatchObject({ to: "a", steps: 0 });
    const newHigh = graph().map((area) =>
      area.id === "b" ? { ...area, elevation: "high" as const } : area,
    );
    const moved = applyCommand(ready(soldier, newHigh, "a", "d"), move);
    expect(moved.events[0]).toMatchObject({ to: "b", skipped: false });
    expect(applyCommand(moved.state, play).events[0]?.type).toBe("monsterSkillResolved");
  });

  it("满员 / 有敌人区域可穿过但不能成为落点，忽略死者容量", () => {
    const areas = graph().map((area) => (area.id === "b" ? { ...area, capacity: 1 } : area));
    const moved = applyCommand(
      ready({ ...soldier, speed: 2 }, areas, "a", "d", { h1: { areaId: "b" } }),
      move,
    );
    expect(moved.events[0]).toMatchObject({ to: "c", steps: 2, skipped: false });
    const blocked = applyCommand(ready(soldier, areas, "a", "c", { h1: { areaId: "b" } }), move);
    expect(blocked.events[0]).toMatchObject({ to: "a", skipped: true });
    const dead = applyCommand(
      ready(soldier, areas, "a", "c", { h1: { areaId: "b", dead: true } }),
      move,
    );
    expect(dead.events[0]).toMatchObject({ to: "b", skipped: false });
  });

  it("Speed 不够只靠近能出手位置并结束一次回合；0 Speed 不补值，不攻击或重选", () => {
    for (const speed of [0, 1]) {
      const initial = ready({ ...soldier, speed }, graph(), "a", "d");
      const result = applyCommand(initial, move);
      expect(result.events[0]).toMatchObject({ to: speed === 0 ? "a" : "b", skipped: true });
      expect(result.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
      expect(result.events.some((event) => event.type === "monsterSkillResolved")).toBe(false);
      expect(result.state.battle!.monsterAction).toBeNull();
      expect(result.state.battle!.rngCursor).toBe(initial.battle!.rngCursor);
      expect(applyCommand(result.state, play).state).toBe(result.state);
      expect(applyCommand(result.state, prepare).state).toBe(result.state);
    }
  });

  it.each([false, true])("最近落点平手由目标玩家选择，然后跳过（出手位满员=%s）", (full) => {
    const areas = graph(["ab", "ac", "bd", "ce", "df", "ef"]).map((area) =>
      full && ["d", "e"].includes(area.id) ? { ...area, capacity: 1 } : area,
    );
    const initial = ready(
      soldier,
      areas,
      "a",
      "f",
      full
        ? {
            h1: { areaId: "d" },
            h2: { areaId: "e" },
          }
        : {},
    );
    const waiting = applyCommand(initial, move);
    expect(waiting.pendingChoice!.options.map((option) => option.id)).toEqual(["b", "c"]);
    expect(waiting.pendingChoice!.actorId).toBe("h0");
    expect(waiting.state.battle!.rngCursor).toBe(initial.battle!.rngCursor);
    expect(waiting.state.battle!.monsterAction).toEqual(initial.battle!.monsterAction);
    expect(applyCommand(waiting.state, prepare).state).toBe(waiting.state);
    const result = applyCommand(waiting.state, {
      type: "resolveChoice",
      choiceId: waiting.pendingChoice!.id,
      optionId: "b",
    });
    expect(result.events[0]).toMatchObject({ to: "b", skipped: true });
    expect(result.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
  });

  it.each([1, 4])("移动后的攻击方向待选保留定位结果；种子 %i 只结束一次回合", (seed) => {
    const effect = [
      { type: "icon" as const, icon: { key: "target_effects", naming: "confirmed" as const } },
      { type: "icon" as const, icon: { key: "shuffle", naming: "confirmed" as const } },
      { type: "text" as const, text: "Push 1 or Pull 1" },
    ];
    const skill = soldier.skills[0]!;
    const card = {
      ...soldier,
      skills: soldier.skills.map((entry) =>
        entry.slot === 1
          ? { ...skill, effect_lines: [effect], lines: [...skill.lines, effect] }
          : entry,
      ),
    };
    const movement = applyCommand(ready(card, graph(), "a", "c", {}, seed), move);
    expect(movement.events[0]).toMatchObject({ type: "monsterPositioned" });
    const moved = movement.state;
    const waiting = applyCommand(moved, play);
    expect(waiting.events).toEqual([]);
    expect(waiting.pendingChoice!.actorId).toBe("h0");
    expect(waiting.state.battle!.monsterAction).toEqual(moved.battle!.monsterAction);
    expect(waiting.state.battle!.rngCursor).toBe(moved.battle!.rngCursor);
    const rolled = applyCommand(waiting.state, {
      type: "resolveChoice",
      choiceId: waiting.pendingChoice!.id,
      optionId: "push",
    });
    expect(rolled.state.battle!.rngCursor).toBe(moved.battle!.rngCursor + 1);
    expect(rolled.state.battle!.shuffleIntents).toHaveLength(seed === 4 ? 1 : 0);
    const completed = rolled.state.battle!.shuffleIntents.length
      ? applyCommand(rolled.state, { type: "resolveShuffles" })
      : { events: [] };
    expect(
      [...rolled.events, ...completed.events].filter((event) => event.type === "turnEnded"),
    ).toHaveLength(1);
  });

  it("缺 Speed / 容量、区间射程、未核实卡拒绝；多目标允许定位且不消耗 RNG", () => {
    const noSpeed = { ...soldier };
    delete noSpeed.speed;
    const multi: MonsterCardView = {
      ...soldier,
      skills: soldier.skills.map((skill) => ({
        ...skill,
        lines: skill.lines.map((line, index) =>
          index === 0
            ? [
                ...line,
                {
                  type: "icon" as const,
                  icon: { key: "target_hero", naming: "confirmed" as const },
                },
              ]
            : line,
        ),
      })),
    };
    const normal = ready();
    const unverified = {
      ...normal,
      battle: { ...normal.battle!, monsters: [{ ...soldier, verification: { unverified: true } }] },
    };
    for (const initial of [
      start(),
      ready(noSpeed),
      ready(ranged(null)),
      unverified,
      ready(
        soldier,
        graph().map((area) =>
          area.id === "b"
            ? { id: area.id, elevation: area.elevation, adjacent: area.adjacent }
            : area,
        ),
      ),
      ...[-1, NaN, 1.5].map((speed) => ready({ ...soldier, speed })),
    ]) {
      const result = applyCommand(initial, move);
      expect(result.events[0]?.type).toBe("commandRefused");
      expect(result.state).toBe(initial);
    }
    // 目标数量已核实的多目标攻击现在可复用同一套 Speed 定位，不掷攻击骰。
    const multiPositioned = applyCommand(ready(multi), move);
    expect(multiPositioned.events[0]?.type).toBe("monsterPositioned");
    expect(multiPositioned.state.battle!.rngCursor).toBe(ready(multi).battle!.rngCursor);
  });

  it("Large 明确占 2 格的空闲路径可定位和攻击，已经在射程内不要求 Speed", () => {
    const initial = ready(soldier, graph(), "a", "c", { m: { stanceSlots: 2 } });
    const moved = applyCommand(initial, move);
    expect(moved.events[0]).toMatchObject({
      type: "monsterPositioned",
      from: "a",
      to: "b",
      steps: 1,
      skipped: false,
    });
    expect(moved.state.battle!.rngCursor).toBe(initial.battle!.rngCursor);
    expect(applyCommand(moved.state, play).events[0]?.type).toBe("monsterSkillResolved");
    const noSpeed = { ...soldier };
    delete noSpeed.speed;
    const inRange = ready(noSpeed, graph(), "b", "c", { m: { stanceSlots: 2 } });
    expect(applyCommand(inRange, move).events[0]).toMatchObject({
      to: "b",
      steps: 0,
      skipped: false,
    });
  });

  it("Large 只挤出一人，允许落点超容量一格；待选冻结且回放一致（R-060）", () => {
    const areas = graph().map((area) => (area.id === "b" ? { ...area, capacity: 2 } : area));
    const initial = ready(soldier, areas, "a", "c", {
      m: { stanceSlots: 2 },
      h1: { areaId: "b" },
      h2: { areaId: "b" },
    });
    const run = () => {
      const waiting = applyCommand(initial, move);
      expect(waiting.pendingChoice!.options.map((option) => option.id)).toEqual([
        "h1->a",
        "h1->c",
        "h2->a",
        "h2->c",
      ]);
      expect(waiting.state.battle!.entities).toEqual(initial.battle!.entities);
      expect(waiting.state.battle!.monsterAction).toEqual(initial.battle!.monsterAction);
      expect(waiting.state.battle!.rngCursor).toBe(initial.battle!.rngCursor);
      for (const command of [
        move,
        play,
        { type: "finishMonsterTurn", actorId: "m" } as const,
        { type: "resolveChoice", choiceId: "stale", optionId: "h1->a" } as const,
        { type: "resolveChoice", choiceId: waiting.pendingChoice!.id, optionId: "h0->a" } as const,
      ])
        expect(applyCommand(waiting.state, command).state).toBe(waiting.state);
      const moved = applyCommand(waiting.state, {
        type: "resolveChoice",
        choiceId: waiting.pendingChoice!.id,
        optionId: "h1->a",
      });
      expect(moved.events[0]).toMatchObject({
        to: "b",
        displaced: { entityId: "h1", from: "b", to: "a" },
      });
      expect(moved.state.battle!.entities.find((entity) => entity.id === "h2")!.areaId).toBe("b");
      expect(moved.state.battle!.entities.find((entity) => entity.id === "h0")!.areaId).toBe("c");
      expect(moved.state.battle!.rngCursor).toBe(initial.battle!.rngCursor);
      expect(
        applyCommand(moved.state, {
          type: "resolveChoice",
          choiceId: waiting.pendingChoice!.id,
          optionId: "h2->a",
        }).state,
      ).toBe(moved.state);
      const attacked = applyCommand(moved.state, play);
      expect(attacked.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
      expect(attacked.state.battle!.rngCursor).toBe(initial.battle!.rngCursor + 1);
      return attacked;
    };
    expect(run()).toEqual(run());
  });

  it("Large 挤出不能选择攻击目标；唯一合法去处自动完成（R-060）", () => {
    const areas = graph().map((area) => ({
      ...area,
      capacity: area.id === "b" ? 2 : area.id === "c" ? 0 : 8,
    }));
    const initial = ready(ranged(0), areas, "a", "b", {
      m: { stanceSlots: 2 },
      h1: { areaId: "b" },
    });
    const moved = applyCommand(initial, move);
    expect(moved.pendingChoice).toBeUndefined();
    expect(moved.events[0]).toMatchObject({ to: "b", displaced: { entityId: "h1", to: "a" } });
    expect(moved.state.battle!.entities.find((entity) => entity.id === "h0")!.areaId).toBe("b");
    const targetOnly = ready(
      ranged(0),
      areas.map((area) => (area.id === "b" ? { ...area, capacity: 1 } : area)),
      "a",
      "b",
      { m: { stanceSlots: 2 } },
    );
    expect(applyCommand(targetOnly, move).events[0]).toMatchObject({
      type: "commandRefused",
      message: expect.stringContaining("R-060"),
    });
    expect(applyCommand(targetOnly, move).state).toBe(targetOnly);
  });

  it("Large 挤出无去处拒绝、不自动跳过；未知相邻容量仍拒绝（R-060/048）", () => {
    const areas = graph().map((area) => ({
      ...area,
      capacity: area.id === "c" ? 2 : ["b", "d"].includes(area.id) ? 1 : 8,
    }));
    const initial = ready({ ...soldier, speed: 2 }, areas, "a", "d", {
      m: { stanceSlots: 2 },
      h1: { areaId: "b" },
      h2: { areaId: "c" },
      h3: { areaId: "c" },
    });
    const result = applyCommand(initial, move);
    expect(result.events[0]).toMatchObject({
      type: "commandRefused",
      message: expect.stringContaining("R-060"),
    });
    expect(result.state).toBe(initial);
    const unknown = {
      ...initial,
      battle: {
        ...initial.battle!,
        areas: areas.map((area) =>
          area.id === "d"
            ? { id: area.id, adjacent: area.adjacent, elevation: area.elevation }
            : area,
        ),
      },
    };
    expect(applyCommand(unknown, move).events[0]).toMatchObject({
      type: "commandRefused",
      message: expect.stringContaining("R-048"),
    });
    expect(applyCommand(unknown, move).state).toBe(unknown);
  });

  it.each([false, true])(
    "R-023 补充：E-F 黑墙隔开的目标原地跳过，不改图或 RNG（Guard=%s）",
    (guard) => {
      const initial = start(soldier, roomTileBattleAreas(tile), "E", "F", {
        h0: { guard, wounds: guard ? 1 : 5 },
        h1: { areaId: "D", wounds: guard ? 5 : 1 },
        h2: { areaId: "H" },
        h3: { areaId: "I" },
      });
      const before = structuredClone(initial);
      const chosen = applyCommand(initial, prepare);
      expect(chosen.state.battle!.monsterAction?.targetId).toBe("h0");
      const result = applyCommand(chosen.state, move);
      expect(result.events[0]).toMatchObject({
        type: "monsterPositioned",
        from: "E",
        to: "E",
        steps: 0,
        skipped: true,
      });
      expect(result.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
      expect(
        result.events.some(
          (event) => event.type === "commandRefused" || event.type === "monsterSkillResolved",
        ),
      ).toBe(false);
      expect(result.state.battle!.monsterAction).toBeNull();
      expect(result.state.battle!.rngCursor).toBe(initial.battle!.rngCursor);
      expect(result.state.battle!.areas).toEqual(initial.battle!.areas);
      expect(applyCommand(result.state, move).state).toBe(result.state);
      expect(result.state.battle!.encounter!.turn).toEqual({ type: "awaitingInitiative" });
      expect(result.state.battle!.encounter!.actedIds).toContain("m");
      expect(initial).toEqual(before);
    },
  );

  it("R-023 补充：全部出手位满员仍靠近几何出手位，唯一落点或原地停留后跳过", () => {
    const areas = graph().map((area) =>
      ["c", "e"].includes(area.id) ? { ...area, capacity: 1 } : area,
    );
    const initial = ready(soldier, areas, "a", "d", {
      h1: { areaId: "c" },
      h2: { areaId: "e" },
      h3: { areaId: "d" },
    });
    const moved = applyCommand(initial, move);
    expect(moved.events[0]).toMatchObject({ from: "a", to: "b", steps: 1, skipped: true });
    expect(moved.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
    const trapped = ready(
      soldier,
      graph().map((area) => (["b", "d"].includes(area.id) ? { ...area, capacity: 1 } : area)),
      "a",
      "c",
      {
        h1: { areaId: "b" },
        h2: { areaId: "d" },
      },
    );
    expect(applyCommand(trapped, move).events[0]).toMatchObject({
      to: "a",
      steps: 0,
      skipped: true,
    });
  });

  it.each(["Closest", "Furthest"])(
    "R-023 补充：%s 忽略不连通英雄，有限距离同距按姿态",
    (target) => {
      const card = { ...soldier, skills: soldier.skills.map((skill) => ({ ...skill, target })) };
      const initial = start(card, roomTileBattleAreas(tile), "E", "F", {
        h0: { guard: false },
        h1: { areaId: "A" },
        h2: { areaId: "D" },
        h3: { areaId: "C" },
      });
      const chosen = applyCommand(initial, prepare);
      expect(chosen.state.battle!.monsterAction?.targetId).toBe("h1");
      expect(applyCommand(chosen.state, move).events[0]).toMatchObject({
        to: "E",
        skipped: false,
        steps: 0,
      });
    },
  );

  it.each(["Closest", "Furthest"])(
    "R-023 补充：%s 无有限候选时原地结束回合，选招骰只消费一次且可回放",
    (target) => {
      const card = {
        ...soldier,
        stanceGroups: [{ stances, rollTable: [{ min: 1, max: 10, skill: 1 }] }],
        skills: soldier.skills.map((skill) => ({ ...skill, target })),
      };
      const initial = start(card, roomTileBattleAreas(tile), "F", "A", {
        h0: { guard: false },
        h1: { areaId: "D" },
        h2: { areaId: "H" },
        h3: { areaId: "I" },
      });
      const result = applyCommand(initial, prepare);
      expect(result.events[0]).toMatchObject({
        type: "monsterActionSkipped",
        actorId: "m",
        skillSlot: 1,
        skillId: `${soldier.id}:skill1`,
        targetPriority: target,
        selectionRoll: nextBattleRoll(initial.seed, initial.battle!.rngCursor),
      });
      expect(position(result.state)).toBe("F");
      expect(result.state.battle!.rngCursor).toBe(initial.battle!.rngCursor + 1);
      expect(result.state.battle!.monsterAction).toBeNull();
      expect(result.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
      expect(applyCommand(result.state, prepare).state).toBe(result.state);
      expect(applyCommand(initial, prepare)).toEqual(result);
    },
  );
});
