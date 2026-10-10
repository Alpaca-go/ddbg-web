import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, roomTileBattleAreas } from "./index";
import type {
  BattleEntity,
  BattleSetup,
  Command,
  GameState,
  HeroSkillCardView,
  SkillStance,
} from "./index";

function cards<T>(file: string): T[] {
  return JSON.parse(
    readFileSync(new URL(`../../data/normalized/corebox/${file}.json`, import.meta.url), "utf8"),
  ).cards;
}
const profiles = cards<NonNullable<BattleSetup["heroStats"]>[number]>("hero_stat");
const smite = cards<HeroSkillCardView>("hero_skill")[0]!;
const stances: SkillStance[] = ["aggressive", "defensive", "ranged", "support"];
function setup(): GameState {
  const heroes: BattleEntity[] = ["HIGHWAYMAN", "HELLION", "CRUSADER", "VESTAL"].map((name, i) => {
    const stat = profiles.find((entry) => entry.name === name && entry.attributesVerified)!;
    return {
      id: `h${i}`,
      side: "hero",
      hero: name,
      heroStatId: stat.id,
      life: stat.life,
      areaId: "a",
      stance: stances[i]!,
      skillIds: [],
      wounds: 0,
      stress: 0,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    };
  });
  let state = applyCommand(
    createBattleState(1, {
      heroStats: profiles,
      light: 5,
      skills: [smite],
      entities: [
        ...heroes,
        {
          id: "m",
          side: "monster",
          hero: null,
          life: 100,
          stanceSlots: 2,
          areaId: "b",
          stance: "aggressive",
          skillIds: [],
          wounds: 0,
          dodge: 0,
          guard: false,
          dead: false,
          bleed: [],
          blight: [],
        },
      ],
      // 合成几何夹具，不是新增卡牌标注。
      areas: [
        { id: "a", adjacent: ["b"], capacity: 8, elevation: "normal" },
        { id: "b", adjacent: ["a", "c"], capacity: 2, elevation: "normal" },
        { id: "c", adjacent: ["b"], capacity: 1, elevation: "high" },
        { id: "x", adjacent: [], capacity: 1, elevation: "normal" },
      ],
    }),
    { type: "startBattle" },
  ).state;
  for (let i = 0; i < 6; i++) {
    state = applyCommand(state, { type: "drawInitiative" }).state;
    const turn = state.battle!.encounter!.turn;
    if (turn.type === "hero") return state;
    if (turn.type !== "monster") throw new Error("无英雄回合");
    state = applyCommand(state, { type: "finishMonsterTurn", actorId: turn.actorId }).state;
  }
  throw new Error("无英雄回合");
}
const move = (path: string[], actorId = "h0"): Command => ({ type: "moveHero", actorId, path });
const entity = (state: GameState) => state.battle!.entities.find((entry) => entry.id === "h0")!;
function refused(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(result.events[0]?.type).toBe("commandRefused");
  expect(result.state).toBe(state);
  return result;
}

describe("英雄移动（R18、R-006、R-021、R-048）", () => {
  it("获批 Speed 跨满员敌区，只改区域并扣一个行动，不改输入 / RNG", () => {
    const state = setup();
    const before = structuredClone(state);
    const result = applyCommand(state, move(["b", "c"]));
    expect(result.events[0]?.type).toBe("heroMoved");
    expect(entity(result.state)).toEqual({ ...entity(state), areaId: "c" });
    expect(result.state.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 1 });
    expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
    expect(state).toEqual(before);
    expect(result).toEqual(applyCommand(state, move(["b", "c"])));
  });

  it("第一行动暂时超容量，阻止技能与换姿态，第二行动移动离开并正常收尾", () => {
    const state = applyCommand(setup(), move(["b"])).state;
    expect(state.battle!.encounter!.turn).toMatchObject({ actions: 1, mustMove: true });
    refused(state, { type: "changeStance", actorId: "h0", direction: "backward" });
    const blocked = refused(state, {
      type: "playHeroSkill",
      actorId: "h0",
      skillId: smite.id,
      targetId: "m",
    });
    expect(blocked.events[0]?.message).toContain("必须用下一行动");
    refused(state, move(["a", "b"]));
    const result = applyCommand(state, move(["c"]));
    expect(entity(result.state).areaId).toBe("c");
    expect(result.events.map((event) => event.type)).toEqual(["heroMoved", "turnEnded"]);
    expect(result.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
  });

  it("第二行动不能超容量，但可恰好填满容量；死者不占格", () => {
    const first = applyCommand(setup(), move(["b", "c"])).state;
    refused(first, move(["b"]));
    const state: GameState = {
      ...first,
      battle: {
        ...first.battle!,
        entities: first.battle!.entities.map((e) => (e.id === "m" ? { ...e, dead: true } : e)),
      },
    };
    expect(applyCommand(state, move(["b"])).events[0]?.type).toBe("heroMoved");
  });

  it("非法路径、超 Speed、空路径、未知目标 / 非行动者均原子拒绝", () => {
    const state = setup();
    for (const path of [[], ["c"], ["x"], ["missing"], ["b", "c", "b"]]) refused(state, move(path));
    for (const id of ["h1", "m", "missing"]) refused(state, move(["b"], id));
    const dead: GameState = {
      ...state,
      battle: {
        ...state.battle!,
        entities: state.battle!.entities.map((e) => (e.id === "h0" ? { ...e, dead: true } : e)),
      },
    };
    refused(dead, move(["b"]));
  });

  it("缺失 / null / 非整数 / 未核实 Speed 不补默认；拒绝未知容量和占格数", () => {
    const initial = setup();
    for (const speed of [undefined, null, -1, 1.5]) {
      const state: GameState = {
        ...initial,
        battle: {
          ...initial.battle!,
          heroStats: profiles.map((p) => {
            if (p.id !== entity(initial).heroStatId) return p;
            const changed = { ...p };
            if (speed === undefined) delete changed.speed;
            else changed.speed = speed;
            return changed;
          }),
        },
      };
      refused(state, move(["b"]));
    }
    const unverified: GameState = {
      ...initial,
      battle: {
        ...initial.battle!,
        heroStats: profiles.map((p) => ({ ...p, attributesVerified: false })),
      },
    };
    refused(unverified, move(["b"]));
    const capacity: GameState = {
      ...initial,
      battle: {
        ...initial.battle!,
        areas: initial.battle!.areas.map((a) =>
          a.id === "b" ? { id: a.id, adjacent: a.adjacent, elevation: a.elevation } : a,
        ),
      },
    };
    refused(capacity, move(["b"]));
    const width: GameState = {
      ...initial,
      battle: {
        ...initial.battle!,
        entities: initial.battle!.entities.map((e) => {
          const changed = { ...e };
          if (e.id === "m") delete changed.stanceSlots;
          return changed;
        }),
      },
    };
    refused(width, move(["b"]));
  });

  it("连续两次移动命令可确定性回放，且与换姿态共享行动数", () => {
    const state = setup();
    const commands = [move(["b", "c"]), move(["b", "a"])];
    const replay = () => commands.reduce((s, c) => applyCommand(s, c).state, state);
    expect(replay()).toEqual(replay());
    expect(entity(replay()).areaId).toBe("a");
    const swapped = applyCommand(state, {
      type: "changeStance",
      actorId: "h0",
      direction: "backward",
    }).state;
    expect(applyCommand(swapped, move(["b", "c"])).events.map((e) => e.type)).toEqual([
      "heroMoved",
      "turnEnded",
    ]);
  });

  it("待选决策冻结移动，未开始 / 已结束遭遇战不能移动", () => {
    const initial = setup();
    const choice = {
      id: "test-choice",
      prompt: "合成待选夹具",
      options: [{ id: "b", label: "b" }],
    };
    const pending: GameState = {
      ...initial,
      battle: { ...initial.battle!, pending: { type: "monsterMove", choice } },
    };
    expect(refused(pending, move(["b"])).pendingChoice).toEqual(choice);
    const without = { ...initial.battle! };
    delete without.encounter;
    refused({ ...initial, battle: without }, move(["b"]));
    refused(
      {
        ...initial,
        battle: {
          ...initial.battle!,
          encounter: {
            ...initial.battle!.encounter!,
            turn: { type: "finished", outcome: "victory" },
          },
        },
      },
      move(["b"]),
    );
  });

  it("轮末移动复用先攻收尾，第 4 轮结束产生撤退", () => {
    const initial = setup();
    for (const round of [1, 4]) {
      const state: GameState = {
        ...initial,
        battle: {
          ...initial.battle!,
          encounter: {
            ...initial.battle!.encounter!,
            round,
            deck: [],
            turn: { type: "hero", actorId: "h0", actions: 1, usedSkillIds: [] },
          },
        },
      };
      const result = applyCommand(state, move(["b", "c"]));
      expect(result.events.map((e) => e.type)).toEqual([
        "heroMoved",
        "turnEnded",
        round === 4 ? "battleFinished" : "roundStarted",
      ]);
      expect(result.state.battle!.encounter!.turn).toEqual(
        round === 4 ? { type: "finished", outcome: "retreat" } : { type: "awaitingInitiative" },
      );
      expect(result).toEqual(applyCommand(state, move(["b", "c"])));
    }
  });

  it("获批 Ritual Chamber 的 E-F 黑墙不能直接穿越（R-054）", () => {
    const tile = JSON.parse(
      readFileSync(
        new URL("../../data/normalized/corebox/room_tile_geometry.json", import.meta.url),
        "utf8",
      ),
    ).tiles[0];
    const initial = setup();
    const state: GameState = {
      ...initial,
      battle: {
        ...initial.battle!,
        areas: roomTileBattleAreas(tile),
        entities: initial.battle!.entities.map((e) => ({ ...e, areaId: "E" })),
      },
    };
    refused(state, move(["F"]));
  });
});
