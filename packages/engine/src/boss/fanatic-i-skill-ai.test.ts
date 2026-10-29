import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBattleState } from "../battle";
import type { BattleEntity, BattleSetup } from "../battle";
import { applyCommand } from "../command";
import type { ApplyResult, Command, GameState } from "../command";
import type { MonsterCardView } from "../monster-skill";
import { selectMonsterSkill } from "../monster-stance";
import { nextBattleRoll } from "../battle-roll";
import { fanaticSentenceRenderedShouldReplaceSkill } from "./fanatic-i-combat-runtime";
import {
  FANATIC_I_COMBAT_MONSTER_CARD_ID,
  FANATIC_I_PYRE_MONSTER_CARD_ID,
  FANATIC_I_SCRIPT_ID,
} from "./fanatic-i";

function cards<T>(file: string): T[] {
  return JSON.parse(
    readFileSync(new URL(`../../../data/normalized/corebox/${file}.json`, import.meta.url), "utf8"),
  ).cards;
}
const monsters = cards<MonsterCardView>("monster_large");
const fanatic = monsters.find((c) => c.id === FANATIC_I_COMBAT_MONSTER_CARD_ID)!;
const profiles = cards<NonNullable<BattleSetup["heroStats"]>[number]>("hero_stat");
const stances = ["aggressive", "defensive", "ranged", "support"] as const;
const names = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"];
function ok(state: GameState, command: Command): ApplyResult {
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result;
}
function setup(slot: number, roll = 5, pyre: "absent" | "full" = "absent"): GameState {
  const initial = createBattleState(7, {
    entities: [
      ...stances.map((stance, i): BattleEntity => {
        const stat = profiles.find(
          (s) => s.name === names[i] && s.level === 1 && s.attributesVerified,
        )!;
        return {
          id: `h${i}`,
          side: "hero",
          hero: stat.name,
          heroStatId: stat.id,
          life: stat.life,
          areaId: i === 3 ? "d" : "c",
          stance,
          wounds: 0,
          stress: slot === 2 && i === 1 ? 3 : 0,
          skillIds: [],
          dodge: 0,
          guard: false,
          dead: false,
          bleed: [],
          blight: [],
        };
      }),
      {
        id: "fanatic",
        side: "monster",
        hero: null,
        monsterCardId: fanatic.id,
        life: fanatic.life,
        stance: "aggressive",
        stanceSlots: 2,
        areaId: "a",
        wounds: 0,
        dodge: 1,
        skillIds: [],
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
    ],
    areas: ["a", "b", "c", "d", "e"].map((id, i, all) => ({
      id,
      elevation: "normal",
      capacity: 10,
      adjacent: all.filter((_, j) => Math.abs(i - j) === 1),
    })),
    monsters,
    heroStats: profiles,
    skills: [],
    light: 5,
  });
  const started = ok(
    {
      ...initial,
      dungeon: {
        phase: "inBattle",
        heroes: [],
        cursor: 0,
        activeBossThreatScriptId: FANATIC_I_SCRIPT_ID,
        questDistribution: { questId: "quest:p019", campaignLevel: 1 },
      } as unknown as NonNullable<GameState["dungeon"]>,
    },
    { type: "startBattle" },
  ).state;
  let cursor = started.battle!.rngCursor;
  const selectedSlot = (n: number) => (n <= 2 ? 1 : n <= 6 ? 2 : 3);
  while (
    selectedSlot(nextBattleRoll(started.seed, cursor)) !== slot ||
    nextBattleRoll(started.seed, cursor + 1) !== roll
  )
    cursor++;
  // 仅隔离当前回合与输入骰序；所有卡面、AI、移动和攻击均走公开命令。
  return {
    ...started,
    battle: {
      ...started.battle!,
      rngCursor: cursor,
      entities: started.battle!.entities.map((e) =>
        e.monsterCardId === FANATIC_I_PYRE_MONSTER_CARD_ID && pyre === "absent"
          ? { ...e, dead: true }
          : e,
      ),
      areas: started.battle!.areas.map((a) =>
        a.id === "c" && pyre === "full" ? { ...a, capacity: 5 } : a,
      ),
      encounter: {
        round: 1,
        deck: ["hero", "monster", "monster"],
        actedIds: [],
        turn: { type: "monster", actorId: "fanatic" },
      },
    },
  };
}
function play(state: GameState): ApplyResult {
  const positioned = ok(state, { type: "moveMonsterToRange", actorId: "fanatic" });
  const action = positioned.state.battle!.monsterAction!;
  const played = ok(positioned.state, {
    type: "playMonsterSkill",
    actorId: "fanatic",
    targetId: action.targetId,
    skillSlot: action.skillSlot,
  });
  if (!played.state.battle!.shuffleIntents.length) return played;
  const shuffled = ok(played.state, { type: "resolveShuffles" });
  return { ...shuffled, events: [...played.events, ...shuffled.events] };
}

describe("C-017 · Fanatic I 卡面技能 AI（R20–24、R-015/024/048）", () => {
  it("四姿态十个骰面与印刷分段一致，大型取所占前姿态", () => {
    expect(fanatic.speed).toBe(2);
    const expected = [1, 1, 2, 2, 2, 2, 3, 3, 3, 3];
    for (const stance of stances)
      for (let roll = 1; roll <= 10; roll++) {
        expect(selectMonsterSkill(fanatic, [stance], roll)).toMatchObject({
          skillSlot: expected[roll - 1],
        });
      }
    expect(selectMonsterSkill(fanatic, ["defensive", "ranged"], 6)).toMatchObject({ skillSlot: 2 });
  });

  it.each([1, 2, 3])("Pyre 不在场时 slot %i：公开选招→目标→移动→技能可结算且确定性回放", (slot) => {
    const initial = setup(slot);
    const before = structuredClone(initial);
    expect(fanaticSentenceRenderedShouldReplaceSkill(initial, "fanatic")).toBe(false);
    const prepared = ok(initial, { type: "prepareMonsterAction", actorId: "fanatic" });
    expect(prepared.state.battle!.monsterAction).toMatchObject({
      skillSlot: slot,
      targetId: slot === 2 ? "h1" : "h0",
    });
    const result = play(prepared.state);
    expect(play(ok(initial, { type: "prepareMonsterAction", actorId: "fanatic" }).state)).toEqual(
      result,
    );
    expect(initial).toEqual(before);
    expect(result.state.battle!.rngCursor).toBe(initial.battle!.rngCursor + 2);
    expect(result.state.battle!.fanaticActionsThisRound).toBe(1);
    expect(result.state.battle!.encounter!.actedIds).not.toContain("fanatic");
    const heroes = result.state.battle!.entities.filter((e) => e.side === "hero");
    const actor = result.state.battle!.entities.find((e) => e.id === "fanatic")!;
    if (slot === 1) {
      expect(actor.statusStacks).toEqual([{ kind: "buff", remaining: 3 }]);
      expect(heroes.map((e) => [e.wounds, e.stress])).toEqual([
        [1, 2],
        [1, 2],
        [1, 2],
        [0, 0],
      ]);
    } else if (slot === 2) {
      expect(heroes[1]).toMatchObject({
        wounds: 3,
        stress: 4,
        areaId: "e",
        stance: "support",
        statusStacks: expect.arrayContaining([{ kind: "stun", remaining: 1 }]),
      });
      expect(actor.areaId).toBe("b");
    } else {
      expect(heroes.map((e) => [e.wounds, e.stress])).toEqual([
        [5, 1],
        [5, 1],
        [5, 1],
        [0, 0],
      ]);
    }
    expect(result.events.filter((e) => e.type === "turnEnded")).toHaveLength(1);
  });

  it("Pyre 区域满员时走印刷选招；有空间则继续沿用 Sentence 优先", () => {
    const full = setup(3, 5, "full");
    expect(
      ok(full, { type: "prepareMonsterAction", actorId: "fanatic" }).state.battle!.monsterAction,
    ).toMatchObject({ skillSlot: 3 });
    const available = {
      ...full,
      battle: { ...full.battle!, areas: full.battle!.areas.map((a) => ({ ...a, capacity: 10 })) },
    };
    const moved = ok(available, { type: "prepareMonsterAction", actorId: "fanatic" });
    expect(moved.state.battle!.monsterAction).toBeNull();
    expect(moved.state.battle!.entities.find((e) => e.id === "fanatic")!.areaId).toBe("b");
    expect(moved.state.battle!.rngCursor).toBe(available.battle!.rngCursor);
  });

  it("Righteous Condemnation 全落空仍只获得一堆自身 Buff，不施加目标效果", () => {
    const base = setup(1, 10);
    const initial = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) => (e.side === "hero" ? { ...e, dodge: 20 } : e)),
      },
    };
    const result = play(ok(initial, { type: "prepareMonsterAction", actorId: "fanatic" }).state);
    expect(result.state.battle!.entities.find((e) => e.id === "fanatic")!.statusStacks).toEqual([
      { kind: "buff", remaining: 3 },
    ]);
    expect(
      result.state
        .battle!.entities.filter((e) => e.side === "hero")
        .every((e) => e.wounds === 0 && e.stress === 0),
    ).toBe(true);
  });

  it("Most Stressed 同压力按姿态，Guard 优先；保存后不能重选或换招", () => {
    const base = setup(2);
    const initial = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) => (e.id === "h2" ? { ...e, stress: 3 } : e)),
      },
    };
    expect(
      ok(initial, { type: "prepareMonsterAction", actorId: "fanatic" }).state.battle!.monsterAction!
        .targetId,
    ).toBe("h1");
    const guarded = {
      ...initial,
      battle: {
        ...initial.battle!,
        entities: initial.battle!.entities.map((e) => (e.id === "h3" ? { ...e, guard: true } : e)),
      },
    };
    const chosen = ok(guarded, { type: "prepareMonsterAction", actorId: "fanatic" }).state;
    expect(chosen.battle!.monsterAction!.targetId).toBe("h3");
    for (const command of [
      { type: "prepareMonsterAction", actorId: "fanatic" },
      { type: "playMonsterSkill", actorId: "fanatic", targetId: "h1", skillSlot: 2 },
    ] as const) {
      const refused = applyCommand(chosen, command);
      expect(refused.events[0]!.type).toBe("commandRefused");
      expect(refused.state).toBe(chosen);
    }
  });

  it("技能计划漂移时拒绝整次定位命令，保留已选目标和骰序", () => {
    const initial = setup(2);
    const prepared = ok(initial, { type: "prepareMonsterAction", actorId: "fanatic" }).state;
    const changed = {
      ...prepared,
      battle: {
        ...prepared.battle!,
        monsters: prepared.battle!.monsters!.map((card) =>
          card.id !== fanatic.id
            ? card
            : {
                ...card,
                skills: card.skills.map((skill) =>
                  skill.slot !== 2
                    ? skill
                    : {
                        ...skill,
                        verified_monster_effects: {
                          ...skill.verified_monster_effects!,
                          effects: skill.verified_monster_effects!.effects.slice(1),
                        },
                      },
                ),
              },
        ),
      },
    };
    const result = applyCommand(changed, { type: "moveMonsterToRange", actorId: "fanatic" });
    expect(result.events[0]).toMatchObject({
      type: "commandRefused",
      message: expect.stringContaining("原语内容"),
    });
    expect(result.state).toBe(changed);
  });
});
