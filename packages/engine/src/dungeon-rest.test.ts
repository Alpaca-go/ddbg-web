import diseases from "../../data/normalized/corebox/disease.json";
import quirks from "../../data/normalized/corebox/quirk.json";
import { diseaseFileSchema } from "../../data/src/disease";
import { normalizedQuirkFileSchema } from "../../data/src/normalize/schema";
import { createConditionPool } from "./conditions";
import { describe, expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import stats from "../../data/normalized/corebox/hero_stat.json";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";
import { canRestDungeon } from "./dungeon-rest";
import { scoutRestSchema } from "../../data/src/scout-rest";
import { QUIRK_NAMES } from "./passive";

function setup(): GameState {
  const heroes = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].map((name, i) => {
    const stat = stats.cards.find((s) => s.name === name && s.level === 1)!;
    return {
      id: `hero-${i}`,
      level: 1,
      life: stat.life,
      attributesVerified: stat.attributesVerified,
      wounds: 4,
      stress: 4,
    };
  });
  const s = createDungeonSandbox(31, layout, distribution, "standard", "D", heroes, [], {
    dungeonLevel: 1,
    light: 5,
    provisions: [{ id: "food-1", face: "food" }],
  });
  return {
    ...s,
    dungeon: {
      ...s.dungeon!,
      rooms: s.dungeon!.rooms.map((r) => (r.id === "D" ? { ...r, cleared: true } : r)),
    },
  };
}
const choose = (s: GameState, optionId: string) =>
  applyCommand(s, { type: "resolveChoice", choiceId: s.dungeon!.pending!.id, optionId });
const begin = (s: GameState, mode = "collective") =>
  choose(applyCommand(s, { type: "restDungeon" }).state, mode).state;

describe("Scout Ahead柴火休息（R15、QUEST p1、R-070）", () => {
  it("同意前取消不消耗；分配期间冻结导航、补给、退出和摘要，陈旧选择拒绝", () => {
    const s = setup(),
      pending = applyCommand(s, { type: "restDungeon" }).state;
    expect(choose(pending, "decline").state.dungeon!.rest).toEqual(s.dungeon!.rest);
    const allocating = choose(pending, "collective").state;
    expect(
      applyCommand(allocating, {
        type: "resolveChoice",
        choiceId: pending.dungeon!.pending!.id,
        optionId: "collective",
      }).state,
    ).toBe(allocating);
    const commands: Command[] = [
      { type: "restDungeon" },
      { type: "scoutDungeon" },
      { type: "leaveDungeon" },
      { type: "beginDungeonExploration" },
      { type: "summarizeDungeonQuest" },
      { type: "useProvision", provisionId: "food-1", targetId: "hero-0", effect: "heal" },
    ];
    for (const command of commands)
      expect(applyCommand(allocating, command).state).toBe(allocating);
    expect(choose(allocating, "heal:7").state).toBe(allocating);
  });
  it("共同分配八点才原子恢复、弃柴火；资源 / RNG与输入不变，仅用一次", () => {
    const s = setup(),
      before = structuredClone(s);
    let next = begin(s);
    for (let i = 0; i < 7; i++) {
      next = choose(next, i < 4 ? "heal:0" : "stress:1").state;
      expect(next.dungeon!.heroes).toEqual(s.dungeon!.heroes);
      expect(next.dungeon!.rest!.used).toBe(false);
    }
    next = choose(next, "stress:1").state;
    expect(next.dungeon!.heroes[0]!.wounds).toBe(0);
    expect(next.dungeon!.heroes[1]!.stress).toBe(0);
    expect(next.dungeon!.rest!.used).toBe(true);
    expect(scoutRestSchema.safeParse(next.dungeon!.rest).success).toBe(true);
    expect(next.dungeon!.cursor).toBe(s.dungeon!.cursor);
    expect(next.dungeon!.gold).toBe(s.dungeon!.gold);
    expect(next.dungeon!.explorationSetup).toEqual(s.dungeon!.explorationSetup);
    expect(s).toEqual(before);
    expect(canRestDungeon(next)).toBe(false);
    expect(applyCommand(next, { type: "restDungeon" }).state).toBe(next);
  });
  it("分配意见不一：每人2点、自选Life / 压力，不超额不交给同伴", () => {
    let s = begin(setup(), "equal");
    for (let i = 0; i < 4; i++) {
      expect(s.dungeon!.pending!.actorId).toBe(`hero-${i}`);
      expect(choose(s, `heal:${(i + 1) % 4}`).state).toBe(s);
      s = choose(s, `heal:${i}`).state;
      s = choose(s, `stress:${i}`).state;
    }
    expect(s.dungeon!.heroes.every((h) => h.wounds === 3 && h.stress === 3)).toBe(true);
    expect(s.dungeon!.pending).toBeNull();
  });
  it("起点、灰点、未清理房间、Trap / Dark、错误任务、旧状态无柴火和死亡停点拒绝", () => {
    const s = setup();
    const { rest: _removed, ...noRest } = s.dungeon!;
    void _removed;
    for (const dungeon of [
      noRest,
      { ...s.dungeon!, position: "S" },
      { ...s.dungeon!, rooms: s.dungeon!.rooms.map((r) => ({ ...r, cleared: false })) },
      { ...s.dungeon!, position: s.dungeon!.rooms.find((r) => r.kind === "trap")!.id },
      {
        ...s.dungeon!,
        questDistribution: { ...s.dungeon!.questDistribution!, questId: "quest:p002" },
      },
      ...(
        ["awaitingHazards", "awaitingRoom", "inBattle", "exited", "awaitingReplacement"] as const
      ).map((phase) => ({ ...s.dungeon!, phase })),
    ]) {
      const state = { ...s, dungeon };
      expect(canRestDungeon(state)).toBe(false);
      expect(applyCommand(state, { type: "restDungeon" }).state).toBe(state);
    }
  });
  it("死门英雄可以治疗脱离；超额恢复封顶，余下分配不增加Life或负压力", () => {
    const s = setup();
    const door = {
      ...s,
      dungeon: {
        ...s.dungeon!,
        heroes: s.dungeon!.heroes.map((h, i) =>
          i === 0 ? { ...h, wounds: h.life! } : { ...h, wounds: 0, stress: 0 },
        ),
      },
    };
    let next = begin(door);
    next = choose(next, "heal:0").state;
    for (let i = 0; i < 7; i++) next = choose(next, "stress:1").state;
    expect(next.dungeon!.heroes[0]!.wounds).toBe(door.dungeon!.heroes[0]!.life! - 1);
    expect(next.dungeon!.heroes[1]!.stress).toBe(0);
    expect(next.dungeon!.cursor).toBe(door.dungeon!.cursor);
  });

  it.each([
    ["Fast Healer", "heal:0", 1, 4],
    ["Infirm", "heal:0", 3, 4],
    ["Resilient", "stress:0", 4, 1],
  ])("%s同次休息总量只触发一次（R-070）", (name, option, wounds, stress) => {
    const original = setup();
    const id = `quirk:p${String(QUIRK_NAMES.indexOf(name as (typeof QUIRK_NAMES)[number]) + 1).padStart(3, "0")}`;
    const state = {
      ...original,
      dungeon: {
        ...original.dungeon!,
        conditions: createConditionPool(
          diseaseFileSchema.parse(diseases).cards,
          normalizedQuirkFileSchema.parse(quirks).cards,
        ),
        heroes: original.dungeon!.heroes.map((h, i) => (i === 0 ? { ...h, quirkIds: [id] } : h)),
      },
    };
    const before = structuredClone(state);
    let next = begin(state);
    next = choose(next, option as string).state;
    expect(next.dungeon!.heroes).toEqual(state.dungeon!.heroes);
    next = choose(next, option as string).state;
    for (let i = 0; i < 6; i++) next = choose(next, "stress:1").state;
    expect(next.dungeon!.heroes[0]).toMatchObject({ wounds, stress });
    expect(next.dungeon!.rest!.used).toBe(true);
    expect(next.dungeon!.cursor).toBe(state.dungeon!.cursor);
    expect(state).toEqual(before);
  });
  it("未分配治疗或减压时不触发 Fast Healer / Resilient，HL2治疗仍只加一次（R-070）", () => {
    const original = setup();
    const state = {
      ...original,
      dungeon: {
        ...original.dungeon!,
        conditions: createConditionPool(
          diseaseFileSchema.parse(diseases).cards,
          normalizedQuirkFileSchema.parse(quirks).cards,
        ),
        heroes: original.dungeon!.heroes.map((h, i) =>
          i === 0
            ? {
                ...h,
                level: 2,
                life: stats.cards.find((s) => s.name === "CRUSADER" && s.level === 2)!.life,
                quirkIds: ["quirk:p003", "quirk:p009", "quirk:p022"],
              }
            : h,
        ),
      },
    };
    let unallocated = begin(state);
    for (let i = 0; i < 8; i++) unallocated = choose(unallocated, "stress:1").state;
    expect(unallocated.dungeon!.heroes[0]).toEqual(state.dungeon!.heroes[0]);
    let allocated = begin(state);
    for (let i = 0; i < 2; i++) allocated = choose(allocated, "heal:0").state;
    for (let i = 0; i < 2; i++) allocated = choose(allocated, "stress:0").state;
    for (let i = 0; i < 4; i++) allocated = choose(allocated, "stress:1").state;
    expect(allocated.dungeon!.heroes[0]).toMatchObject({ wounds: 1, stress: 1 });
  });
  it("同种子与命令日志可回放，均分总额与schema篡改拒绝", () => {
    const s = setup();
    const commands: Command[] = [
      { type: "restDungeon" },
      { type: "resolveChoice", choiceId: "dungeon-rest:0", optionId: "equal" },
    ];
    let state = commands.reduce((s, c) => applyCommand(s, c).state, s);
    for (let i = 0; i < 8; i++) {
      const command: Command = {
        type: "resolveChoice",
        choiceId: state.dungeon!.pending!.id,
        optionId: `heal:${Math.floor(i / 2)}`,
      };
      commands.push(command);
      state = applyCommand(state, command).state;
    }
    expect(commands.reduce((s, c) => applyCommand(s, c).state, s)).toEqual(state);
    expect(scoutRestSchema.safeParse({ ...state.dungeon!.rest, used: false }).success).toBe(false);
    expect(scoutRestSchema.safeParse({ questId: "quest:p001", used: true }).success).toBe(false);
  });
});
