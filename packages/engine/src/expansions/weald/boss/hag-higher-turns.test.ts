import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBattleState, type BattleEntity, type BattleSetup } from "../../../battle";
import { applyCommand, type ApplyResult, type GameState, type Command } from "../../../command";
import { hagIInitialDeployment } from "./hag-i-projection";
import { hagHigherContext } from "./hag-higher";
import { FACE_THE_THREAT_QUEST_ID, resolveBossScriptIdForQuest } from "../../../boss/quest-bridge";
import { beginHagIRelease } from "./hag-i-release";
import { applyEncounterCommand, removeCasualties } from "../../../encounter";
import { readHagRuntimeContext } from "./hag-runtime-context";

// 受控的已开始战斗，不注入伤害／骰面；不冒充正式任务入口或自然日志验收。
function fixture(level: 2 | 3, miss = false): GameState {
  const stats = (
    JSON.parse(
      readFileSync(
        new URL("../../../../../data/normalized/corebox/hero_stat.json", import.meta.url),
        "utf8",
      ),
    ) as { cards: NonNullable<BattleSetup["heroStats"]> }
  ).cards;
  const names = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"];
  const stances = ["aggressive", "defensive", "ranged", "support"] as const;
  const heroes = names.map((name, i): BattleEntity => {
    const stat = stats.find((s) => s.name === name && s.attributesVerified && s.level === level)!;
    return {
      id: `h${i}`,
      side: "hero",
      hero: name,
      heroStatId: stat.id,
      life: stat.life,
      wounds: 0,
      stress: 0,
      dodge: i === 0 && miss ? 20 : 0,
      areaId: ["E", "I", "J", "J"][i]!,
      stance: stances[i]!,
      skillIds: [],
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    };
  });
  const original = hagIInitialDeployment();
  const context = hagHigherContext(level);
  const plan = {
    ...original,
    monsters: context.catalog,
    entities: original.entities.map((entity, index) => ({
      ...entity,
      monsterCardId: context.catalog[index]!.id,
      life: context.catalog[index]!.life!,
      dodge: context.catalog[index]!.dodge!,
    })),
  };
  const state = createBattleState(7, {
    ...plan,
    entities: [...heroes, ...plan.entities],
    heroStats: stats,
    light: 5,
    skills: [],
  });
  return {
    ...state,
    dungeon: {
      phase: "inBattle",
      cursor: 0,
      heroes: [],
      questDistribution: { questId: FACE_THE_THREAT_QUEST_ID, campaignLevel: 1 },
      contentPacks: ["core", "weald"],
      campaignLevel: level,
      activeBossThreatScriptId: context.scriptId,
      imminentThreatDescriptionCardId: `boss_ability:weald:p0${12 + level}`,
    } as unknown as NonNullable<GameState["dungeon"]>,
    battle: {
      ...state.battle!,
      encounter: {
        round: 1,
        deck: ["hero", "monster", "hero", "hero", "monster", "hero"],
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

function play(state: GameState): ApplyResult {
  let positioned = run(state, { type: "moveMonsterToRange", actorId: "boss:hag" });
  for (let n = 0; positioned.pendingChoice && n < 8; n++)
    positioned = run(positioned.state, {
      type: "resolveChoice",
      choiceId: positioned.pendingChoice.id,
      optionId: positioned.pendingChoice.options[0]!.id,
    });
  state = positioned.state;
  const action = state.battle!.monsterAction!;
  let result = run(state, {
    type: "playMonsterSkill",
    actorId: action.actorId,
    skillSlot: action.skillSlot,
    targetId: action.targetId,
  });
  const events = [...result.events];
  for (let n = 0; result.state.battle!.shuffleIntents.length && n < 8; n++) {
    result = result.pendingChoice
      ? run(result.state, {
          type: "resolveChoice",
          choiceId: result.pendingChoice.id,
          optionId: result.pendingChoice.options[0]!.id,
        })
      : run(result.state, { type: "resolveShuffles" });
    events.push(...result.events);
  }
  expect(result.state.battle!.shuffleIntents).toEqual([]);
  return { ...result, events };
}

describe.each([2, 3] as const)("R-267 Hag %i 级独立回合续接", (level) => {
  it.each([false, true])("命中／落空（miss=%s）后同回合第二招，Hag 两次行动计数", (miss) => {
    const state = fixture(level, miss);
    const prepared = run(state, { type: "prepareMonsterAction", actorId: "boss:hag" });
    expect(prepared.state.battle!.monsterAction).toMatchObject({
      skillSlot: 1,
      selectionRoll: null,
      targetId: "h0",
    });
    expect(prepared.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
    const first = play(prepared.state);
    expect(first.state.battle!.hagSecondSkillPending).toBe(true);
    expect(first.state.battle!.hagCauldron?.hero.id).toBe(miss ? undefined : "h0");
    expect(first.state.battle!.rngCursor - state.battle!.rngCursor).toBe(1);
    const second = play(
      run(first.state, { type: "prepareMonsterAction", actorId: "boss:hag" }).state,
    );
    expect(second.state.battle!.hagActionsThisRound).toBe(1);
    expect(second.state.battle!.hagSecondSkillPending).toBeUndefined();
    expect(second.state.battle!.encounter!.actedIds).not.toContain("boss:hag");
    // 受控剩余先攻只指定怪物侧，不修改任何攻击骰或选招表。
    const nextTurn: GameState = {
      ...second.state,
      battle: {
        ...second.state.battle!,
        encounter: {
          ...second.state.battle!.encounter!,
          deck: ["monster", "hero"],
          turn: { type: "awaitingInitiative" },
          actedIds: ["boss:hag:cauldron-empty"],
        },
      },
    };
    const drawn = run(nextTurn, { type: "drawInitiative" });
    expect(drawn.state.battle!.encounter!.turn).toEqual({ type: "monster", actorId: "boss:hag" });
    const nextPrepared = run(drawn.state, { type: "prepareMonsterAction", actorId: "boss:hag" });
    const nextFirst = play(nextPrepared.state);
    const finished = miss
      ? play(run(nextFirst.state, { type: "prepareMonsterAction", actorId: "boss:hag" }).state)
      : nextFirst;
    expect(finished.state.battle!.hagActionsThisRound).toBe(2);
    expect(finished.state.battle!.encounter!.actedIds).toContain("boss:hag");

    expect(first).toEqual(
      play(run(state, { type: "prepareMonsterAction", actorId: "boss:hag" }).state),
    );
  });

  it("独立开战有三张怪物先攻，原正式高等级出征映射仍关闭", () => {
    const state = fixture(level);
    const { encounter: _encounter, ...battle } = state.battle!;
    void _encounter;
    const started = applyEncounterCommand({ ...state, battle }, { type: "startBattle" });
    expect(
      started.events.some((e) => e.type === "commandRefused"),
      JSON.stringify(started.events),
    ).toBe(false);
    expect(started.state.battle!.encounter!.deck.filter((s) => s === "monster")).toHaveLength(3);
    expect(resolveBossScriptIdForQuest(FACE_THE_THREAT_QUEST_ID, state.dungeon)).toBeUndefined();
  });

  it("打翻 Full 进入可恢复的释放待选；Hag 死亡后移走空锅，不重掷或重结算攻击", () => {
    const first = play(
      run(fixture(level), { type: "prepareMonsterAction", actorId: "boss:hag" }).state,
    );
    const captured = first.state;
    const potId = captured.battle!.hagCauldron!.cauldronId;
    const broken: GameState = {
      ...captured,
      battle: {
        ...captured.battle!,
        entities: captured.battle!.entities.map((e) =>
          e.id === potId ? { ...e, wounds: e.life!, dead: true } : e,
        ),
      },
    };
    const offered = beginHagIRelease({ state: broken, events: [] }, { type: "hagSecond" })!;
    expect(offered.pendingChoice!.options.length).toBeGreaterThan(1);
    const command: Command = {
      type: "resolveChoice",
      choiceId: offered.pendingChoice!.id,
      optionId: offered.pendingChoice!.options[0]!.id,
    };
    const restored = JSON.parse(JSON.stringify(offered.state)) as GameState;
    const released = run(restored, command);
    expect(released).toEqual(run(offered.state, command));
    expect(released.state.battle!.hagCauldron).toBeUndefined();
    expect(released.state.battle!.rngCursor).toBe(captured.battle!.rngCursor);
    const deadHag: GameState = {
      ...released.state,
      battle: {
        ...released.state.battle!,
        entities: released.state.battle!.entities.map((e) =>
          e.id === "boss:hag" ? { ...e, dead: true } : e,
        ),
      },
    };
    const cleaned = removeCasualties({ state: deadHag, events: [] }, ["boss:hag"]);
    expect(cleaned.state.battle!.entities.find((e) => e.id === potId)!.dead).toBe(true);
    expect(cleaned.state.battle!.rngCursor).toBe(captured.battle!.rngCursor);
  });

  it("Full 固定 Boil 不掷选招骰，只能选择板块上英雄", () => {
    const captured = play(
      run(fixture(level), { type: "prepareMonsterAction", actorId: "boss:hag" }).state,
    ).state;
    const potId = captured.battle!.hagCauldron!.cauldronId;
    const pot = captured.battle!.entities.find((e) => e.id === potId)!;
    const { hagSecondSkillPending: _second, ...rest } = captured.battle!;
    void _second;
    const state: GameState = {
      ...captured,
      battle: {
        ...rest,
        monsterAction: null,
        entities: rest.entities.map((e) => (e.id === "h1" ? { ...e, areaId: pot.areaId } : e)),
        encounter: { ...rest.encounter!, turn: { type: "monster", actorId: potId } },
      },
    };
    const prepared = run(state, { type: "prepareMonsterAction", actorId: potId });
    expect(prepared.state.battle!.monsterAction).toMatchObject({
      skillSlot: 1,
      selectionRoll: null,
      targetId: "h1",
    });
    expect(prepared.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
    expect(prepared.state.battle!.hagCauldron).toEqual(state.battle!.hagCauldron);
    const positioned = run(prepared.state, { type: "moveMonsterToRange", actorId: potId });
    const resolved = run(positioned.state, {
      type: "playMonsterSkill",
      actorId: potId,
      skillSlot: 1,
      targetId: "h1",
    });
    expect(resolved.state.battle!.hagCauldron).toEqual(state.battle!.hagCauldron);
    expect(resolved.events.find((e) => e.type === "monsterSkillResolved")).toMatchObject({
      resolution: { targetId: "h1" },
    });

    expect(
      applyCommand(state, {
        type: "playMonsterSkill",
        actorId: potId,
        skillSlot: 1,
        targetId: "h0",
      }).state,
    ).toBe(state);
  });

  it("篡改高等级目录或描述卡不能启用专属回合", () => {
    const state = fixture(level);
    const altered: GameState = {
      ...state,
      dungeon: { ...state.dungeon!, imminentThreatDescriptionCardId: "boss_ability:weald:p013" },
    };
    expect(readHagRuntimeContext(altered)).toBeNull();
    const tampered: GameState = {
      ...state,
      battle: {
        ...state.battle!,
        monsters: state.battle!.monsters!.map((c, i) => (i ? c : { ...c, life: 999 })),
      },
    };
    expect(readHagRuntimeContext(tampered)).toBeNull();
  });
});
