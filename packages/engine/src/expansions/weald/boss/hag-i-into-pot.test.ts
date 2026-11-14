import { readFileSync } from "node:fs";
import { beforeEach, expect, it } from "vitest";
import { createBattleState, type BattleEntity, type BattleSetup } from "../../../battle";
import { applyCommand, type ApplyResult, type GameState, type Command } from "../../../command";
import { hagIInitialDeployment, buildHagICombatCatalog } from "./hag-i-projection";
import { ensureHagIBossScriptRegistered, HAG_I_SCRIPT_ID } from "./hag-i";
import { FACE_THE_THREAT_QUEST_ID } from "../../../boss/quest-bridge";
import { readMonsterAttackView, resolveMonsterSkill } from "../../../monster-skill";
import { endAfterCasualties } from "../../../encounter";

beforeEach(() => ensureHagIBossScriptRegistered());

// 受控的已开始战斗，不注入伤害／骰面；不冒充正式任务入口或自然日志验收。
function fixture(miss = false): GameState {
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
    const stat = stats.find((s) => s.name === name && s.attributesVerified && s.level === 1)!;
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
  const plan = hagIInitialDeployment();
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
      activeBossThreatScriptId: HAG_I_SCRIPT_ID,
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

it.each([false, true])(
  "R-255 命中／落空对照（miss=%s）：Self Pull 先结算，随后同回合第二招",
  (miss) => {
    const state = fixture(miss);
    const before = structuredClone(state);
    const prepared = run(state, { type: "prepareMonsterAction", actorId: "boss:hag" });
    expect(prepared.state.battle!.monsterAction).toMatchObject({
      skillSlot: 1,
      targetId: "h0",
      selectionRoll: null,
    });
    expect(prepared.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
    const first = play(prepared.state);
    const b = first.state.battle!;
    // R-020：Hag 的 Shuffle 防御也限制自身 Pull 1；仍经共用自身位移先行结算。
    expect(b.entities.find((e) => e.id === "boss:hag")!.areaId).toBe("B");
    expect(b.hagSecondSkillPending).toBe(true);
    expect(b.hagCauldron?.hero.id).toBe(miss ? undefined : "h0");
    expect(b.entities.some((e) => e.id === "h0")).toBe(miss);
    expect(b.hagActionsThisRound ?? 0).toBe(0);
    expect(b.encounter!.turn).toEqual(state.battle!.encounter!.turn);
    expect(b.rngCursor - state.battle!.rngCursor).toBe(1);
    const resolved = first.events.find(
      (e) => e.type === "monsterSkillResolved" && e.phase !== "ownPending",
    );
    expect(resolved?.type === "monsterSkillResolved" && resolved.resolution).toMatchObject({
      outcome: miss ? "miss" : "hit",
      damageDealt: null,
    });
    const blocked = applyCommand(first.state, {
      type: "playMonsterSkill",
      actorId: "boss:hag",
      skillSlot: 1,
      targetId: "h1",
    });
    expect(blocked.state).toBe(first.state);
    const secondPrepared = run(first.state, { type: "prepareMonsterAction", actorId: "boss:hag" });
    expect([2, 3]).toContain(secondPrepared.state.battle!.monsterAction!.skillSlot);
    const second = play(secondPrepared.state);
    expect(second.state.battle!.hagSecondSkillPending).toBeUndefined();
    expect(second.state.battle!.hagActionsThisRound).toBe(1);
    expect(second.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
    expect(second.state.battle!.encounter!.actedIds).not.toContain("boss:hag");
    if (!miss) {
      const nextTurn = run(second.state, { type: "drawInitiative" });
      expect(nextTurn.state.battle!.encounter!.turn).toEqual({
        type: "monster",
        actorId: "boss:hag",
      });
      const nextPrepared = run(nextTurn.state, {
        type: "prepareMonsterAction",
        actorId: "boss:hag",
      });
      expect([2, 3]).toContain(nextPrepared.state.battle!.monsterAction!.skillSlot);
      const finished = play(nextPrepared.state);
      expect(finished.state.battle!.hagActionsThisRound).toBe(2);
      expect(finished.state.battle!.encounter!.actedIds).toContain("boss:hag");
    }
    expect(state).toEqual(before);
    expect(first).toEqual(
      play(run(state, { type: "prepareMonsterAction", actorId: "boss:hag" }).state),
    );
  },
);

it("锅内英雄仍存活时，不把棋盘英雄全灭误判成队伍全灭", () => {
  const captured = play(
    run(fixture(), { type: "prepareMonsterAction", actorId: "boss:hag" }).state,
  ).state;
  const fallen = {
    ...captured,
    battle: {
      ...captured.battle!,
      entities: captured.battle!.entities.map((e) =>
        e.side === "hero" ? { ...e, dead: true } : e,
      ),
    },
  };
  expect(fallen.battle.hagCauldron!.hero.dead).toBe(false);
  expect(endAfterCasualties({ state: fallen, events: [] })).toBeNull();
});

it("R-254 未印刷伤害不补 0，漂移卡面拒绝；缺 Full 在掷骰／移动前拒绝", () => {
  const hag = buildHagICombatCatalog()[0]!;
  const reordered = {
    ...hag,
    skills: hag.skills.map((s) => ({
      ...s,
      printed_labels: s.printed_labels.map((label) => ({ value: label.value, label: label.label })),
      unlabeled_numbers: s.unlabeled_numbers.map((n) => ({ anchor: n.anchor, numeric: n.numeric })),
    })),
  };
  expect(readMonsterAttackView(reordered, 1).status).toBe("ready");
  expect(
    readMonsterAttackView({ ...hag, skills: [{ ...hag.skills[0]!, name: "changed" }] }, 1).status,
  ).toBe("refused");
  const pure = resolveMonsterSkill(
    hag,
    1,
    {
      actor: { id: "hag", wounds: 0 },
      target: { id: "hero", side: "hero", wounds: 0, dodge: 0, stress: 0 },
      areaDistance: 1,
    },
    5,
  );
  expect(pure.status === "resolved" && pure.resolution.damageDealt).toBeNull();
  const prepared = run(fixture(), { type: "prepareMonsterAction", actorId: "boss:hag" }).state;
  const missing = {
    ...prepared,
    battle: {
      ...prepared.battle!,
      monsters: prepared.battle!.monsters!.filter((c) => !c.id.endsWith(":back")),
    },
  };
  const unverified = {
    ...prepared,
    battle: {
      ...prepared.battle!,
      monsters: prepared.battle!.monsters!.map((c) =>
        c.id.endsWith(":back") ? { ...c, verification: { unverified: true } } : c,
      ),
    },
  };
  for (const invalid of [missing, unverified]) {
    const result = applyCommand(invalid, {
      type: "playMonsterSkill",
      actorId: "boss:hag",
      targetId: "h0",
      skillSlot: 1,
    });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(result.state).toBe(invalid);
  }
});
