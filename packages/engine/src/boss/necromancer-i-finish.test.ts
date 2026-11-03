import { expect, it } from "vitest";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "./face-the-threat-embark-runtime";
import { NECROMANCER_I_SCRIPT_ID } from "./necromancer-i";
import { nextBattleRoll } from "../battle-roll";

function ok(state: GameState, command: Command) {
  const r = applyCommand(state, command);
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return r;
}
function deployed(): GameState {
  const s = createCoreDungeonQuest(17, "quest:p019", "standard", coreParty, coreQuestSources, true);
  const d = s.dungeon!;
  const context = {
    campaignLevel: 1 as const,
    activeBossThreatScriptId: NECROMANCER_I_SCRIPT_ID,
    imminentThreatDescriptionCardId: "boss_ability:p001",
  };
  const entered: GameState = {
    ...s,
    dungeon: {
      ...d,
      ...context,
      phase: "awaitingRoom",
      explorationSetup: { ...d.explorationSetup!, dungeonLevel: 1 },
      position: d.rooms.find((r) => r.kind === "objective")!.id,
      rooms: d.rooms.map((r) => (r.kind === "objective" ? { ...r, revealed: true } : r)),
      faceTheThreatEmbarkPlan: {
        ...requireFaceTheThreatEmbarkPlanForSandbox(context),
        roomPlacement: "edgeRoomsR30",
      },
    },
  };
  const bound = ok(entered, { type: "prepareDungeonBattle" }).state;
  return ok(ok(bound, { type: "deployNecromancerI" }).state, { type: "startBattle" }).state;
}
/** 显式濒死Boss/攻击回合夹具；由真实技能触发死亡，不声称自然打完77点Life。 */
function victory(): GameState {
  const s = deployed(),
    b = s.battle!;
  const rabble = b.monsters!.find((c) => c.id === "monster_medium:p040")!;
  const boss = b.entities.find((e) => e.id === "boss:necromancer:1")!;
  const cursor = Array.from({ length: 100 }, (_, i) => i + b.rngCursor).find(
    (i) => nextBattleRoll(s.seed, i) === 1,
  )!;
  const prepared: GameState = {
    ...s,
    battle: {
      ...b,
      rngCursor: cursor,
      lootPool: { ...b.lootPool!, gold: 9 },
      entities: [
        ...b.entities.map((e) =>
          e.id === boss.id
            ? { ...e, wounds: e.life! - 1 }
            : e.id === "hero-0"
              ? { ...e, areaId: "A", wounds: 4, stress: 3 }
              : e,
        ),
        {
          ...boss,
          id: "summoned-rabble",
          monsterCardId: rabble.id,
          life: rabble.life!,
          dodge: 0,
          areaId: "E",
          stance: "defensive",
          wounds: 0,
        },
      ],
      encounter: {
        ...b.encounter!,
        turn: { type: "hero", actorId: "hero-0", actions: 1, usedSkillIds: [], mustMove: false },
      },
    },
  };
  const result = ok(prepared, {
    type: "playHeroSkill",
    actorId: "hero-0",
    targetId: boss.id,
    skillId: "hero_skill:p001",
  });
  expect(result.state.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "victory" });
  expect(result.state.battle!.entities.find((e) => e.id === "summoned-rabble")).toMatchObject({
    dead: true,
    wounds: 0,
  });
  return result.state;
}
const finish = { type: "finishDungeonBattle" } as const;

it("真实Boss死亡清场后可回传：清理目标、清除威胁并记录击败，普通牌池不掺入Boss/召唤物", () => {
  const s = victory(),
    before = structuredClone(s),
    d = s.dungeon!,
    b = s.battle!;
  const result = ok(s, finish),
    after = result.state.dungeon!;
  expect(result.state.battle).toBeUndefined();
  expect(after.phase).toBe("ready");
  expect(after.bossQuestVictory).toBe(true);
  expect(after.activeBossThreatScriptId).toBeUndefined();
  expect(after.defeatedRuinsBossIdentities).toEqual(["necromancer"]);
  expect(after.rooms.find((r) => r.id === d.position)!.cleared).toBe(true);
  expect(after.monsterPool).toEqual(d.monsterPool);
  expect(after.roomCards).toEqual({ ...d.roomCards!, active: null });
  expect(after.cursor).toBe(b.rngCursor);
  expect(after.decision).toBe(b.choiceCursor);
  expect(s).toEqual(before);
  expect(result).toEqual(applyCommand(JSON.parse(JSON.stringify(s)), finish));
  expect(applyCommand(result.state, finish).state).toBe(result.state);
});

it("英雄实际战后状态、持牌/补给和金币回传，不额外支付金币/XP或推进战役等级", () => {
  const s = victory(),
    d = s.dungeon!,
    b = s.battle!;
  const after = ok(s, finish).state.dungeon!;
  for (const e of b.entities.filter((e) => e.side === "hero")) {
    const hero = after.heroes.find((h) => h.id === e.id)!;
    expect(hero).toMatchObject({
      wounds: e.wounds,
      stress: e.stress,
      stance: e.stance,
      dead: e.dead,
      combat: e,
    });
    expect(hero.xp).toBe(d.heroes.find((h) => h.id === e.id)!.xp);
  }
  expect(after.gold).toBe(9);
  expect(after.lootPool).toEqual(b.lootPool);
  expect(after.conditions).toEqual(b.conditions);
  expect(after.trinkets).toEqual(b.trinkets);
  expect(after.explorationSetup!.provisions).toEqual(b.provisions);
  expect(after.campaignLevel).toBe(1);
});

it("未结束、Boss仍活着、残留怪物、撤退或全灭不能冒充Boss胜利，原子拒绝", () => {
  const initial = deployed(),
    s = victory(),
    b = s.battle!;
  const variants: GameState[] = [
    initial,
    {
      ...s,
      battle: {
        ...b,
        entities: b.entities.map((e) =>
          e.id === "boss:necromancer:1" ? { ...e, dead: false } : e,
        ),
      },
    },
    {
      ...s,
      battle: {
        ...b,
        entities: b.entities.map((e) => (e.id === "summoned-rabble" ? { ...e, dead: false } : e)),
      },
    },
    {
      ...s,
      battle: {
        ...b,
        encounter: { ...b.encounter!, turn: { type: "finished", outcome: "retreat" } },
      },
    },
    {
      ...s,
      battle: {
        ...b,
        entities: b.entities.map((e) => (e.side === "hero" ? { ...e, dead: true } : e)),
      },
    },
  ];
  for (const state of variants) {
    const r = applyCommand(state, finish);
    expect(r.state).toBe(state);
    expect(r.events[0]!.type).toBe("commandRefused");
  }
});

it("错级/错房、遗留选择、英雄身份漂移和倒退RNG不回传奖励", () => {
  const s = victory(),
    d = s.dungeon!,
    b = s.battle!;
  const variants: GameState[] = [
    { ...s, dungeon: { ...d, campaignLevel: 2 } },
    { ...s, dungeon: { ...d, explorationSetup: { ...d.explorationSetup!, dungeonLevel: 3 } } },
    { ...s, dungeon: { ...d, activeBossThreatScriptId: "boss:ruins:prophet:1" } },
    {
      ...s,
      dungeon: {
        ...d,
        roomCards: { ...d.roomCards!, active: { ...d.roomCards!.active!, roomId: "wrong" } },
      },
    },
    { ...s, battle: { ...b, rngCursor: d.cursor - 1 } },
    { ...s, battle: { ...b, choiceCursor: -1 } },
    {
      ...s,
      battle: {
        ...b,
        entities: b.entities.map((e) => (e.id === "hero-0" ? { ...e, heroStatId: "unknown" } : e)),
      },
    },
    {
      ...s,
      battle: {
        ...b,
        pending: {
          type: "hallAscension",
          actorId: "hero-0",
          choice: { id: "pending", prompt: "待选", options: [{ id: "x", label: "x" }] },
        },
      },
    },
  ];
  for (const state of variants) expect(applyCommand(state, finish).state).toBe(state);
});

it("存活英雄与阵亡英雄状态均回传，死亡后仍沿用既有替补停点", () => {
  const s = victory(),
    b = s.battle!;
  const fallen: GameState = {
    ...s,
    battle: {
      ...b,
      entities: b.entities.map((e) => (e.id === "hero-3" ? { ...e, dead: true } : e)),
    },
  };
  const after = ok(fallen, finish).state.dungeon!;
  expect(after.phase).toBe("awaitingReplacement");
  expect(after.replacementResume).toBe("ready");
  expect(after.heroes.find((h) => h.id === "hero-3")!.dead).toBe(true);
  expect(after.bossQuestVictory).toBe(true);
});

it("交接后沿用离开确认和R-122回村流程，仅回村支付一次3XP", () => {
  let state = ok(victory(), finish).state;
  const before = state.dungeon!;
  const exit = ok(state, { type: "leaveDungeon" });
  state = ok(exit.state, {
    type: "resolveChoice",
    choiceId: exit.pendingChoice!.id,
    optionId: "agree",
  }).state;
  for (const type of [
    "summarizeDungeonQuest",
    "beginReturnToHamlet",
    "finishReturnToHamlet",
  ] as const)
    state = ok(state, { type }).state;
  expect(state.dungeon!.phase).toBe("inHamlet");
  expect(state.dungeon!.questSummary).toMatchObject({
    xpPerHero: 3,
    stagecoachXp: 3,
    awarded: true,
  });
  expect(state.dungeon!.heroes.map((h) => h.xp)).toEqual(before.heroes.map((h) => (h.xp ?? 0) + 3));
  expect(state.dungeon!.stagecoachXp).toBe((before.stagecoachXp ?? 0) + 3);
  expect(applyCommand(state, { type: "finishReturnToHamlet" }).state).toBe(state);
});
