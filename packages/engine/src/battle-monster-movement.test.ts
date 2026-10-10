import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, roomTileBattleAreas } from "./index";
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

  it("最近落点平手同样由目标玩家选择，然后跳过", () => {
    const initial = ready(soldier, graph(["ab", "ac", "bd", "ce", "df", "ef"]), "a", "f");
    const waiting = applyCommand(initial, move);
    expect(waiting.pendingChoice!.options.map((option) => option.id)).toEqual(["b", "c"]);
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

  it("缺 Speed / 容量、区间射程、未核实卡、大型怪、多目标均原样拒绝，不消耗 RNG", () => {
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
      ready(multi),
      unverified,
      ready(
        soldier,
        graph().map((area) =>
          area.id === "b"
            ? { id: area.id, elevation: area.elevation, adjacent: area.adjacent }
            : area,
        ),
      ),
      ready(soldier, graph(), "a", "c", { m: { stanceSlots: 2 } }),
      ready(
        soldier,
        graph().map((area) => (["b", "d"].includes(area.id) ? { ...area, capacity: 1 } : area)),
        "a",
        "c",
        {
          h1: { areaId: "b" },
          h2: { areaId: "d" },
        },
      ),
      ...[-1, NaN, 1.5].map((speed) => ready({ ...soldier, speed })),
    ]) {
      const result = applyCommand(initial, move);
      expect(result.events[0]?.type).toBe("commandRefused");
      expect(result.state).toBe(initial);
    }
  });

  it("黑墙断图不补路径；既有准备命令对不可达英雄拒绝并保持 RNG", () => {
    const initial = start(soldier, roomTileBattleAreas(tile), "E", "F", {
      h1: { areaId: "D" },
      h2: { areaId: "H" },
      h3: { areaId: "I" },
    });
    const result = applyCommand(initial, prepare);
    expect(result.state).toBe(initial);
    expect(result.events[0]).toMatchObject({
      type: "commandRefused",
      message: "英雄区域距离不可达，拒绝猜测目标排序",
    });
  });
});
