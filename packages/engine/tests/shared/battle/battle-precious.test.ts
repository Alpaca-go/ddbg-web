import { applyEncounterCommand } from "../../../src/shared/dungeon/encounter";
import { describe, expect, it } from "vitest";
import { createBattleState, type BattleEntity } from "../../../src/shared/battle/battle";
import { applyCommand, type GameState } from "../../../src/shared/core/command";
import { coreQuestSources } from "../../helpers/core-quest";
import { savedCommandSchema } from "../../../../data/src/shared/quest-save";

const card = coreQuestSources.catalog.monsters.find((c) => c.id === "monster_medium:p001")!;
function setup(version = true): GameState {
  const stances = ["aggressive", "defensive", "ranged", "support"] as const;
  const heroes: BattleEntity[] = stances.map((stance, i) => ({
    id: `h${i}`,
    side: "hero",
    hero: "CRUSADER",
    areaId: "A",
    stance,
    skillIds: [],
    wounds: 0,
    stress: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  const monsters: BattleEntity[] = ["D", "D", "B"].map((areaId, i) => ({
    id: `m${i}`,
    side: "monster",
    hero: null,
    areaId,
    stance: stances[i]!,
    stanceSlots: 1,
    monsterCardId: card.id,
    life: card.life,
    skillIds: [],
    wounds: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  const base: GameState = {
    ...createBattleState(4, {
      entities: [...heroes, ...monsters],
      monsters: [card],
      skills: [],
      light: 5,
      wealdMechanics: true,
      areas: ["A", "B", "D"].map((id) => ({
        id,
        capacity: 8,
        elevation: "normal" as const,
        adjacent: id === "D" ? ["A"] : id === "A" ? ["D"] : [],
      })),
    }),
    dungeon: {
      phase: "inBattle",
      mode: "radiant",
      heroes: [],
      contentPacks: ["core", "weald"],
      roomCards: { active: { roomId: "R1", cardId: "room:weald:04" } },
    } as unknown as NonNullable<GameState["dungeon"]>,
  };
  const started = applyCommand(base, {
    type: "startBattle",
    ...(version ? { wealdPrecious: true as const } : {}),
  });
  const refusal = started.events.find((e) => e.type === "commandRefused");
  if (refusal) throw new Error(refusal.message);
  return {
    ...started.state,
    battle: {
      ...started.state.battle!,
      encounter: { ...started.state.battle!.encounter!, turn: { type: "monster", actorId: "m0" } },
    },
  };
}
const command = { type: "finishMonsterTurn", actorId: "m0" } as const;
const stacks = [
  { kind: "buff", remaining: 2 },
  { kind: "buff", remaining: 2 },
];
describe("Precious 结束回合（R-234／R-237）", () => {
  it("D 结束回合给所有其他怪物两项独立增益，不限所在区域，不额外耗骰", () => {
    const state = setup();
    const result = applyEncounterCommand(state, command);
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    for (const id of ["m1", "m2"])
      expect(result.state.battle!.entities.find((e) => e.id === id)!.statusStacks).toEqual(stacks);
    for (const e of result.state.battle!.entities.filter((e) => e.id === "m0" || e.side === "hero"))
      expect(e.statusStacks).toBeUndefined();
    expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
    expect(
      result.events.filter((e) => e.type === "passiveTriggered" && e.trigger === "precious"),
    ).toHaveLength(1);
    expect(applyEncounterCommand(result.state, command).events[0]!.type).toBe("commandRefused");
    expect(applyEncounterCommand(JSON.parse(JSON.stringify(state)), command)).toEqual(result);
    expect(state.battle!.entities.every((e) => e.statusStacks === undefined)).toBe(true);
  });
  it("旧版本、非 D 区和死者均不错误触发或受益", () => {
    expect(
      applyEncounterCommand(setup(false), command).state.battle!.entities.find(
        (e) => e.id === "m1",
      )!.statusStacks,
    ).toBeUndefined();
    const state = setup();
    const elsewhere = {
      ...state,
      battle: {
        ...state.battle!,
        entities: state.battle!.entities.map((e) => (e.id === "m0" ? { ...e, areaId: "B" } : e)),
      },
    };
    expect(
      applyEncounterCommand(elsewhere, command).state.battle!.entities.find((e) => e.id === "m1")!
        .statusStacks,
    ).toBeUndefined();
    const dead = {
      ...state,
      battle: {
        ...state.battle!,
        entities: state.battle!.entities.map((e) => (e.id === "m2" ? { ...e, dead: true } : e)),
      },
    };
    expect(
      applyEncounterCommand(dead, command).state.battle!.entities.find((e) => e.id === "m2")!
        .statusStacks,
    ).toBeUndefined();
  });
  it("缺受益怪物已核实防御栏时拒绝，不提交任何增益或结束回合", () => {
    const state = setup();
    const invalid = {
      ...state,
      battle: {
        ...state.battle!,
        entities: state.battle!.entities.map((e) =>
          e.id === "m2" ? { ...e, monsterCardId: "missing" } : e,
        ),
      },
    };
    const result = applyEncounterCommand(invalid, command);
    expect(result.events[0]!.type).toBe("commandRefused");
    expect(result.state).toEqual(invalid);
  });
  it("正式怪物技能收尾进入同一结束回合钩子", () => {
    const base = setup();
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) => (e.id === "h0" ? { ...e, dodge: 100 } : e)),
      },
    };
    const result = applyCommand(state, {
      type: "playMonsterSkill",
      actorId: "m0",
      targetId: "h0",
      skillSlot: 1,
    });
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(result.state.battle!.entities.find((e) => e.id === "m2")!.statusStacks).toEqual(stacks);
    expect(result.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
  });
  it("正式技能后的房间防御缺口使整条命令回滚伤口、骰序与回合", () => {
    const state = setup();
    const invalid = {
      ...state,
      battle: {
        ...state.battle!,
        entities: state.battle!.entities.map((e) =>
          e.id === "m2"
            ? { ...e, monsterCardId: "missing" }
            : e.id === "h0"
              ? { ...e, dodge: 100 }
              : e,
        ),
      },
    };
    const result = applyCommand(invalid, {
      type: "playMonsterSkill",
      actorId: "m0",
      targetId: "h0",
      skillSlot: 1,
    });
    expect(result.events[0]!.type).toBe("commandRefused");
    expect(result.state).toBe(invalid);
  });
  it("错房间／未选包／Stygian 不类推普通 Stash 效果", () => {
    for (const kind of ["room", "pack", "stygian"] as const) {
      const base = setup();
      const d = base.dungeon!;
      const state = {
        ...base,
        dungeon: {
          ...d,
          ...(kind === "room"
            ? {
                roomCards: {
                  ...d.roomCards!,
                  active: { ...d.roomCards!.active!, cardId: "room:weald:02" },
                },
              }
            : {}),
          ...(kind === "pack" ? { contentPacks: ["core" as const] } : {}),
          ...(kind === "stygian" ? { mode: "stygian" as const } : {}),
        },
      };
      expect(
        applyEncounterCommand(state, command).state.battle!.entities.find((e) => e.id === "m1")!
          .statusStacks,
      ).toBeUndefined();
    }
  });
  it("新开始命令的严格 schema 保留标记并拒绝错误值", () => {
    const start = { type: "startBattle", wealdPrecious: true };
    expect(savedCommandSchema.parse(start)).toEqual(start);
    expect(savedCommandSchema.safeParse({ ...start, wealdPrecious: false }).success).toBe(false);
  });
});
