import { resolveTurnStartStatus } from "../../../src/shared/battle/battle-status";
import { describe, expect, it } from "vitest";
import { createBattleState, type BattleEntity } from "../../../src/shared/battle/battle";
import { applyCommand, type GameState } from "../../../src/shared/core/command";
import { coreQuestSources } from "../../helpers/core-quest";
import { savedCommandSchema } from "../../../../data/src/quest-save";

const stat = coreQuestSources.catalog.heroStats.find(
  (c) => c.name === "CRUSADER" && c.level === 1,
)!;
function setup(): GameState {
  const entities: BattleEntity[] = (["aggressive", "defensive", "ranged", "support"] as const).map(
    (stance, i) => ({
      id: `h${i}`,
      side: "hero",
      hero: "CRUSADER",
      heroStatId: stat.id,
      heroLevel: 1,
      areaId: i < 2 ? "A" : "B",
      stance,
      skillIds: [],
      life: stat.life,
      wounds: 0,
      stress: 0,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    }),
  );
  entities.push({
    id: "m",
    side: "monster",
    hero: null,
    areaId: "B",
    stance: "aggressive",
    stanceSlots: 1,
    skillIds: [],
    life: 4,
    wounds: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  });
  return {
    ...createBattleState(7, {
      entities,
      skills: [],
      heroStats: [stat],
      light: 5,
      wealdMechanics: true,
      areas: ["A", "B"].map((id) => ({
        id,
        capacity: 8,
        elevation: "normal" as const,
        adjacent: id === "A" ? ["B"] : ["A"],
      })),
    }),
    dungeon: {
      phase: "inBattle",
      mode: "radiant",
      heroes: [],
      contentPacks: ["core", "weald"],
      roomCards: { active: { roomId: "R1", cardId: "room:weald:02" } },
    } as unknown as NonNullable<GameState["dungeon"]>,
  };
}
const command = { type: "startBattle", wealdUnprepared: true } as const;
describe("Ambush / Unprepared!（R-234）", () => {
  it("正式战斗开始跨区域施加减益 2t，不影响怪物且不重复", () => {
    const state = setup();
    const result = applyCommand(state, command);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    for (const hero of result.state.battle!.entities.filter((e) => e.side === "hero"))
      expect(hero.statusStacks).toEqual([{ kind: "debuff", remaining: 2 }]);
    expect(result.state.battle!.entities.find((e) => e.id === "m")!.statusStacks).toBeUndefined();
    const legacy = applyCommand(state, { type: "startBattle" });
    expect(result.state.battle!.rngCursor).toBe(legacy.state.battle!.rngCursor);
    expect(legacy.state.battle!.entities[0]!.statusStacks).toBeUndefined();
    expect(applyCommand(result.state, command).state).toBe(result.state);
    expect(applyCommand(JSON.parse(JSON.stringify(state)), command)).toEqual(result);
    expect(state.battle!.entities[0]!.statusStacks).toBeUndefined();
  });
  it("沿用真实 Jester 减益抗性缩短持续时间，正常英雄到第二次回合开始移除", () => {
    const jester = coreQuestSources.catalog.heroStats.find(
      (c) => c.name === "JESTER" && c.level === 1,
    )!;
    const base = setup();
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        heroStats: [stat, jester],
        entities: base.battle!.entities.map((e) =>
          e.id === "h0" ? { ...e, hero: "JESTER", heroStatId: jester.id, life: jester.life } : e,
        ),
      },
    };
    const result = applyCommand(state, command);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(result.state.battle!.entities[0]!.statusStacks).toEqual([
      { kind: "debuff", remaining: 1 },
    ]);
    const hero = result.state.battle!.entities[1]!;
    const first = resolveTurnStartStatus(hero, state.seed, result.state.battle!.rngCursor);
    if (first.status !== "resolved") throw new Error(first.reason);
    expect(first.entity.statusStacks).toEqual([{ kind: "debuff", remaining: 1 }]);
    const second = resolveTurnStartStatus(first.entity, state.seed, first.rngCursor);
    if (second.status !== "resolved") throw new Error(second.reason);
    expect(second.entity.statusStacks).toEqual([]);
  });
  it("缺任一英雄已核实防御栏则整条开始命令原子拒绝", () => {
    const base = setup();
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) =>
          e.id === "h3" ? { ...e, heroStatId: "missing" } : e,
        ),
      },
    };
    const result = applyCommand(state, command);
    expect(result.events[0]!.type).toBe("commandRefused");
    expect(result.state).toBe(state);
  });
  it("其他房间、未启用 Weald、Stygian 均不类推该普通卡效果", () => {
    for (const variant of ["room", "pack", "stygian"] as const) {
      const base = setup();
      const d = base.dungeon!;
      const state = {
        ...base,
        dungeon: {
          ...d,
          ...(variant === "room"
            ? {
                roomCards: {
                  ...d.roomCards!,
                  active: { ...d.roomCards!.active!, cardId: "room:weald:01" },
                },
              }
            : {}),
          ...(variant === "pack" ? { contentPacks: ["core" as const] } : {}),
          ...(variant === "stygian" ? { mode: "stygian" as const } : {}),
        },
      };
      expect(applyCommand(state, command).state.battle!.entities[0]!.statusStacks).toBeUndefined();
    }
  });
  it("严格命令 schema 接受新旧版本，拒绝 false 或数值", () => {
    expect(savedCommandSchema.parse(command)).toEqual(command);
    expect(savedCommandSchema.parse({ type: "startBattle" })).toEqual({ type: "startBattle" });
    for (const wealdUnprepared of [false, 1])
      expect(savedCommandSchema.safeParse({ ...command, wealdUnprepared }).success).toBe(false);
  });
});
