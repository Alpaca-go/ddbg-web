import { readFileSync } from "node:fs";
import { beforeEach, expect, it } from "vitest";
import { createBattleState, type BattleSetup, type BattleEntity } from "../../../battle";
import type { HeroSkillCardView } from "../../../hero-skill";
import { applyCommand, type Command, type GameState, type ApplyResult } from "../../../command";
import { hagIInitialDeployment } from "./hag-i-projection";
import { captureHagIHero } from "./hag-i-captive";
import { ensureHagIBossScriptRegistered, HAG_I_SCRIPT_ID } from "./hag-i";
import { FACE_THE_THREAT_QUEST_ID } from "../../../boss/quest-bridge";

beforeEach(() => ensureHagIBossScriptRegistered());
const read = <T>(name: string): T[] =>
  (
    JSON.parse(
      readFileSync(
        new URL(`../../../../../data/normalized/corebox/${name}.json`, import.meta.url),
        "utf8",
      ),
    ) as { cards: T[] }
  ).cards;
const stats = read<NonNullable<BattleSetup["heroStats"]>[number]>("hero_stat");
const smite = read<HeroSkillCardView>("hero_skill").find((s) => s.id === "hero_skill:p001")!;

// 已开始战斗的受控前置：原语入锅、受控伤口／Buff，不充当自然战役或印刷数值来源。
function fixture(): GameState {
  const plan = hagIInitialDeployment();
  const names = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"];
  const stances = ["aggressive", "defensive", "ranged", "support"] as const;
  const heroes = names.map((name, i): BattleEntity => {
    const stat = stats.find((s) => s.name === name && s.level === 1 && s.attributesVerified)!;
    return {
      id: `h${i}`,
      side: "hero",
      hero: name,
      heroStatId: stat.id,
      life: stat.life,
      wounds: 0,
      stress: 0,
      dodge: 0,
      areaId: ["A", "I", "J", "J"][i]!,
      stance: stances[i]!,
      skillIds: i === 0 ? [smite.id] : [],
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    };
  });
  const state = createBattleState(7, {
    ...plan,
    entities: [...heroes, ...plan.entities],
    heroStats: stats,
    skills: [smite],
    light: 5,
  });
  return {
    ...state,
    dungeon: {
      phase: "inBattle",
      cursor: 0,
      heroes: [],
      questDistribution: { questId: FACE_THE_THREAT_QUEST_ID, campaignLevel: 1 },
      activeBossThreatScriptId: HAG_I_SCRIPT_ID,
    } as unknown as NonNullable<GameState["dungeon"]>,
    battle: {
      ...state.battle!,
      encounter: {
        round: 1,
        deck: ["hero", "monster", "hero", "hero"],
        actedIds: [],
        turn: { type: "monster", actorId: "boss:hag" },
      },
    },
  };
}

function run(state: GameState, command: Command): ApplyResult {
  const result = applyCommand(state, command);
  const refused = result.events.find((e) => e.type === "commandRefused");
  expect(refused, refused?.message).toBeUndefined();
  return result;
}

function choose(result: ApplyResult): ApplyResult {
  expect(result.state.battle!.pending?.type).toBe("hagRelease");
  const command: Command = {
    type: "resolveChoice",
    choiceId: result.pendingChoice!.id,
    optionId: "E",
  };
  const restored = JSON.parse(JSON.stringify(result.state)) as GameState;
  const fromJson = run(restored, command);
  const chosen = run(result.state, command);
  expect(JSON.parse(JSON.stringify(fromJson))).toEqual(JSON.parse(JSON.stringify(chosen)));
  expect(chosen.state.battle!.rngCursor).toBe(result.state.battle!.rngCursor);
  expect(applyCommand(chosen.state, command).state).toBe(chosen.state);
  return chosen;
}

it.each([false, true])("R-255 玩家技能打翻锅／击败 Hag（Hag=%s）：先释放再续接一次", (hagDead) => {
  const captured = captureHagIHero(fixture(), "h3").state;
  const targetId = hagDead ? "boss:hag" : "boss:hag:cauldron-empty";
  const input: GameState = {
    ...captured,
    battle: {
      ...captured.battle!,
      entities: captured.battle!.entities.map((e) =>
        e.id === "h0"
          ? { ...e, areaId: hagDead ? "B" : "F", buffStacks: 10 }
          : e.id === targetId
            ? { ...e, wounds: e.life! - 1 }
            : e,
      ),
      encounter: {
        ...captured.battle!.encounter!,
        turn: { type: "hero", actorId: "h0", actions: 2, usedSkillIds: [] },
      },
    },
  };
  const before = structuredClone(input);
  const hit = run(input, { type: "playHeroSkill", actorId: "h0", targetId, skillId: smite.id });
  expect(hit.state.battle!.hagCauldron!.hero.id).toBe("h3");
  expect(hit.state.battle!.encounter!.turn).toEqual(input.battle!.encounter!.turn);
  expect(hit.events.some((e) => e.type === "battleFinished")).toBe(false);
  const released = choose(hit);
  expect(released.state.battle!.hagCauldron).toBeUndefined();
  expect(released.state.battle!.entities.find((e) => e.id === "h3")).toMatchObject({
    areaId: "E",
    stance: "aggressive",
    wounds: 0,
  });
  expect(
    released.state.battle!.entities.find((e) => e.id === "boss:hag:cauldron-empty"),
  ).toMatchObject({ life: 66, wounds: 0, protection: true, dead: hagDead });
  expect(released.events.some((e) => e.type === "heroSkillResolved")).toBe(false);
  expect(released.state.battle!.encounter!.turn).toEqual(
    hagDead
      ? { type: "finished", outcome: "victory" }
      : { type: "hero", actorId: "h0", actions: 1, usedSkillIds: [smite.id] },
  );
  expect(input).toEqual(before);
});

it("Hag 技能遭反击阵亡：释放后续接怪物技能收尾，不重复攻击", () => {
  const captured = captureHagIHero(fixture(), "h3").state;
  const input: GameState = {
    ...captured,
    battle: {
      ...captured.battle!,
      entities: captured.battle!.entities.map((e) =>
        e.id === "boss:hag"
          ? { ...e, wounds: e.life! - 1 }
          : e.side === "hero"
            ? { ...e, riposte: true }
            : e,
      ),
    },
  };
  const prepared = run(input, { type: "prepareMonsterAction", actorId: "boss:hag" });
  let positioned = run(prepared.state, { type: "moveMonsterToRange", actorId: "boss:hag" });
  for (let n = 0; positioned.pendingChoice && n < 8; n++)
    positioned = run(positioned.state, {
      type: "resolveChoice",
      choiceId: positioned.pendingChoice.id,
      optionId: positioned.pendingChoice.options[0]!.id,
    });
  const action = positioned.state.battle!.monsterAction!;
  const struck = run(positioned.state, {
    type: "playMonsterSkill",
    actorId: action.actorId,
    targetId: action.targetId,
    skillSlot: action.skillSlot,
  });
  expect(struck.state.battle!.entities.find((e) => e.id === "boss:hag")!.dead).toBe(true);
  const released = choose(struck);
  expect(released.events.some((e) => e.type === "monsterSkillResolved")).toBe(false);
  expect(released.state.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "victory" });
});

it("Hag 回合开始流血阵亡：释放后清场，不重结算回合开始状态", () => {
  const captured = captureHagIHero(fixture(), "h3").state;
  const input: GameState = {
    ...captured,
    battle: {
      ...captured.battle!,
      entities: captured.battle!.entities.map((e) =>
        e.id === "boss:hag"
          ? {
              ...e,
              wounds: e.life! - 1,
              statusStacks: [{ kind: "bleed", remaining: 2, amount: 1 }],
            }
          : e,
      ),
      encounter: {
        ...captured.battle!.encounter!,
        deck: ["monster"],
        turn: { type: "awaitingInitiative" },
      },
    },
  };
  const started = run(input, { type: "drawInitiative" });
  const hag = started.state.battle!.entities.find((e) => e.id === "boss:hag")!;
  expect(hag).toMatchObject({ dead: true, wounds: 60 });
  const released = choose(started);
  expect(released.state.battle!.entities.find((e) => e.id === hag.id)).toEqual(hag);
  expect(released.state.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "victory" });
});

it("Boil 尚未接线时，不误选或攻击锅外英雄，且不消费 RNG", () => {
  const captured = captureHagIHero(fixture(), "h3").state;
  const input: GameState = {
    ...captured,
    battle: {
      ...captured.battle!,
      entities: captured.battle!.entities.map((e) => (e.id === "h0" ? { ...e, areaId: "F" } : e)),
      encounter: {
        ...captured.battle!.encounter!,
        turn: { type: "monster", actorId: "boss:hag:cauldron-empty" },
      },
    },
  };
  for (const command of [
    { type: "prepareMonsterAction", actorId: "boss:hag:cauldron-empty" },
    { type: "playMonsterSkill", actorId: "boss:hag:cauldron-empty", skillSlot: 1, targetId: "h0" },
  ] as const) {
    const refused = applyCommand(input, command);
    expect(refused.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(refused.state).toBe(input);
  }
});

it("命中已在死门的英雄：立即选择释放，仍继续 Hag 同回合第二招", () => {
  const base = fixture();
  const input: GameState = {
    ...base,
    battle: {
      ...base.battle!,
      entities: base.battle!.entities.map((e) =>
        e.id === "h3"
          ? { ...e, areaId: "E", wounds: e.life! }
          : e.id === "h0"
            ? { ...e, areaId: "J" }
            : e,
      ),
    },
  };
  const prepared = run(input, { type: "prepareMonsterAction", actorId: "boss:hag" });
  expect(prepared.state.battle!.monsterAction!.targetId).toBe("h3");
  let result = run(prepared.state, {
    type: "playMonsterSkill",
    actorId: "boss:hag",
    skillSlot: 1,
    targetId: "h3",
  });
  for (let n = 0; result.state.battle!.shuffleIntents.length && n < 4; n++)
    result = run(result.state, { type: "resolveShuffles" });
  expect(result.state.battle!.hagSecondSkillPending).toBe(true);
  const released = choose(result);
  expect(released.state.battle!.entities.find((e) => e.id === "h3")).toMatchObject({
    wounds: result.state.battle!.hagCauldron!.hero.life!,
    dead: false,
  });
  expect(released.state.battle!.hagSecondSkillPending).toBe(true);
  expect(released.state.battle!.hagActionsThisRound ?? 0).toBe(0);
  const second = run(released.state, { type: "prepareMonsterAction", actorId: "boss:hag" });
  expect([2, 3]).toContain(second.state.battle!.monsterAction!.skillSlot);
});
