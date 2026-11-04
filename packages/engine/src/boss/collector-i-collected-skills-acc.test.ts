import { describe, expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "../command";
import { nextBattleRoll } from "../battle-roll";
import { readPrintedRange, readPrintedTargets } from "../hero-skill";
import { readMonsterAttackView, type MonsterCardView } from "../monster-skill";
import { selectMonsterSkill } from "../monster-stance";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "./face-the-threat-embark-runtime";
import {
  COLLECTOR_I_COLLECTED_HIGHWAYMAN_CARD_ID,
  COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID,
  COLLECTOR_I_COLLECTED_VESTAL_CARD_ID,
  COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID,
  COLLECTOR_I_SCRIPT_ID,
} from "./collector-i";

const ACTOR_ID = "boss:collector:1";
const COLLECTED_IDS = [
  COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID,
  COLLECTOR_I_COLLECTED_HIGHWAYMAN_CARD_ID,
  COLLECTOR_I_COLLECTED_VESTAL_CARD_ID,
] as const;

function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(
    result.events.filter((event) => event.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return result;
}

function apply(state: GameState, command: Command) {
  return ok(state, command).state;
}

function atObjective() {
  const state = createCoreDungeonQuest(
    41,
    "quest:p019",
    "standard",
    coreParty,
    coreQuestSources,
    true,
  );
  const d = state.dungeon!;
  const threat = {
    campaignLevel: 1 as const,
    activeBossThreatScriptId: COLLECTOR_I_SCRIPT_ID,
    imminentThreatDescriptionCardId: COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID,
  };
  return apply(
    {
      ...state,
      dungeon: {
        ...d,
        ...threat,
        phase: "awaitingRoom",
        rooms: d.rooms.map((room) =>
          room.kind === "objective" ? { ...room, revealed: true } : room,
        ),
        position: d.rooms.find((room) => room.kind === "objective")!.id,
        faceTheThreatEmbarkPlan: {
          ...requireFaceTheThreatEmbarkPlanForSandbox(threat),
          roomPlacement: "edgeRoomsR30",
        },
      },
    },
    { type: "prepareDungeonBattle" },
  );
}

function fightingDeployed(): GameState {
  return apply(apply(atObjective(), { type: "deployCollectorI" }), { type: "startBattle" });
}

function afterCollectAll(state: GameState): GameState {
  const firstTurn = {
    ...state,
    battle: {
      ...state.battle!,
      encounter: {
        ...state.battle!.encounter!,
        deck: state.battle!.encounter!.deck.filter((side) => side !== "monster"),
        turn: { type: "monster" as const, actorId: ACTOR_ID },
      },
    },
  };
  return apply(firstTurn as GameState, { type: "prepareMonsterAction", actorId: ACTOR_ID });
}

function catalogCard(state: GameState, cardId: string): MonsterCardView {
  const card = state.battle!.monsters!.find((entry) => entry.id === cardId);
  expect(card, cardId).toBeDefined();
  expect(card!.skills.length, cardId).toBeGreaterThan(0);
  expect(card!.verification.unverified, cardId).toBe(false);
  return card!;
}

function monsterTurn(state: GameState, actorId: string): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      monsterAction: null,
      encounter: {
        ...state.battle!.encounter!,
        turn: { type: "monster" as const, actorId },
      },
    },
  };
}

function withAttackRoll(state: GameState, attackRoll: number): GameState {
  let cursor = state.battle!.rngCursor;
  while (nextBattleRoll(state.seed, cursor) !== attackRoll) cursor += 1;
  return {
    ...state,
    battle: { ...state.battle!, rngCursor: cursor },
  };
}

function moveAndPlay(state: GameState, attackRoll: number) {
  const action = state.battle!.monsterAction!;
  const positioned = ok(state, { type: "moveMonsterToRange", actorId: action.actorId });
  return ok(withAttackRoll(positioned.state, attackRoll), {
    type: "playMonsterSkill",
    actorId: action.actorId,
    targetId: action.targetId,
    skillSlot: action.skillSlot,
  });
}

function playSupport(state: GameState) {
  const action = state.battle!.monsterAction!;
  return ok(state, {
    type: "playMonsterSkill",
    actorId: action.actorId,
    targetId: action.targetId,
    skillSlot: action.skillSlot,
  });
}

describe("Collected I · 正式目录卡面（monster_medium:p098/p095/p101 · R-048）", () => {
  const deployed = apply(atObjective(), { type: "deployCollectorI" });

  it.each([
    [
      COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID,
      1,
      "Head Knocker",
      "Closest",
      { kind: "exact" as const, distance: 1 },
      { kind: "exact" as const, max: 1 },
      [{ type: "status", scope: "target", kind: "stun", duration: 1 }],
    ],
    [
      COLLECTOR_I_COLLECTED_HIGHWAYMAN_CARD_ID,
      1,
      "Headhunt",
      "Furthest",
      { kind: "exact" as const, distance: 2 },
      { kind: "exact" as const, max: 1 },
      [{ type: "status", scope: "target", kind: "bleed", duration: 2, amount: 1 }],
    ],
    [
      COLLECTOR_I_COLLECTED_VESTAL_CARD_ID,
      1,
      "Headache",
      "Most Wounded",
      { kind: "exact" as const, distance: 2 },
      { kind: "exact" as const, max: 1 },
      [
        { type: "status", scope: "target", kind: "buff", duration: 2 },
        { type: "heal", scope: "target", amount: 7 },
      ],
    ],
  ])("%s slot %i · %s", (cardId, slot, name, target, range, targets, effects) => {
    const card = catalogCard(deployed, cardId);
    const skill = card.skills.find((entry) => entry.slot === slot)!;
    expect(skill.name).toBe(name);
    expect(skill.target).toBe(target);
    expect(skill.verified_monster_effects?.effects).toEqual(effects);
    expect(
      selectMonsterSkill(
        card,
        [
          cardId === COLLECTOR_I_COLLECTED_VESTAL_CARD_ID
            ? "support"
            : cardId === COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID
              ? "defensive"
              : "ranged",
        ],
        5,
      ),
    ).toMatchObject({
      status: "selected",
      skillSlot: slot,
    });
    const attack = readMonsterAttackView(card, slot);
    expect(attack.status).toBe("ready");
    if (attack.status !== "ready") return;
    expect(readPrintedRange(attack.view)).toEqual(range);
    expect(readPrintedTargets(attack.view)).toEqual(targets);
  });
});

describe("Collector I · deployCollectorI · Collected 技能闭环", () => {
  it("Collect All 使用真实目录卡落 G/E/A 并洗入三枚怪物先攻", () => {
    const collected = afterCollectAll(fightingDeployed());
    expect(
      collected
        .battle!.entities.filter((entity) => entity.id.startsWith("collected:"))
        .map((entity) => [entity.monsterCardId, entity.areaId]),
    ).toEqual([
      [COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID, "G"],
      [COLLECTOR_I_COLLECTED_HIGHWAYMAN_CARD_ID, "E"],
      [COLLECTOR_I_COLLECTED_VESTAL_CARD_ID, "A"],
    ]);
    for (const cardId of COLLECTED_IDS) {
      expect(catalogCard(collected, cardId).skills[0]?.verified_monster_effects).toBeDefined();
    }
    expect(collected.battle!.encounter!.deck.filter((side) => side === "monster")).toHaveLength(3);
  });

  it("G/E/A 被英雄占满时 Collect All 挤占后仍保留目录技能", () => {
    const started = fightingDeployed();
    const crowded = {
      ...started,
      battle: {
        ...started.battle!,
        entities: started.battle!.entities.map((entity) => {
          if (entity.id === "hero-0") return { ...entity, areaId: "G" };
          if (entity.id === "hero-1") return { ...entity, areaId: "E" };
          if (entity.id === "hero-2") return { ...entity, areaId: "A" };
          return entity;
        }),
      },
    };
    const collected = afterCollectAll(crowded);
    expect(collected.battle!.entities.find((e) => e.id === "collected:manAtArms")?.areaId).toBe(
      "G",
    );
    expect(collected.battle!.entities.find((e) => e.id === "collected:highwayman")?.areaId).toBe(
      "E",
    );
    expect(collected.battle!.entities.find((e) => e.id === "collected:vestal")?.areaId).toBe("A");
    expect(catalogCard(collected, COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID).skills[0]?.name).toBe(
      "Head Knocker",
    );
  });

  it("Head Knocker 命中 · 伤 5–8 · Stun 1t（G 落区）", () => {
    const base = afterCollectAll(fightingDeployed());
    catalogCard(base, COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID);
    const prepared = ok(monsterTurn(base, "collected:manAtArms"), {
      type: "prepareMonsterAction",
      actorId: "collected:manAtArms",
    });
    const played = moveAndPlay(prepared.state, 1);
    const targetId = prepared.state.battle!.monsterAction!.targetId;
    const hero = played.state.battle!.entities.find((entity) => entity.id === targetId)!;
    expect(hero.wounds).toBeGreaterThanOrEqual(5);
    expect(hero.wounds).toBeLessThanOrEqual(8);
    const skillEvent = played.events.find((event) => event.type === "monsterSkillResolved");
    expect(skillEvent?.type).toBe("monsterSkillResolved");
    if (skillEvent?.type !== "monsterSkillResolved") return;
    expect(skillEvent.resolution.targetStatusEffects).toEqual([{ kind: "stun", duration: 1 }]);
  });

  it("Headhunt 命中 · 伤 7–11 · 流血 1·2t（E 落区）", () => {
    const base = afterCollectAll(fightingDeployed());
    catalogCard(base, COLLECTOR_I_COLLECTED_HIGHWAYMAN_CARD_ID);
    const prepared = ok(monsterTurn(base, "collected:highwayman"), {
      type: "prepareMonsterAction",
      actorId: "collected:highwayman",
    });
    const played = moveAndPlay(prepared.state, 1);
    const targetId = prepared.state.battle!.monsterAction!.targetId;
    const hero = played.state.battle!.entities.find((entity) => entity.id === targetId)!;
    expect(hero.wounds).toBeGreaterThanOrEqual(7);
    expect(hero.wounds).toBeLessThanOrEqual(11);
    expect(hero.statusStacks?.find((stack) => stack.kind === "bleed")).toMatchObject({
      amount: 1,
    });
    const skillEvent = played.events.find((event) => event.type === "monsterSkillResolved");
    expect(skillEvent?.type).toBe("monsterSkillResolved");
    if (skillEvent?.type !== "monsterSkillResolved") return;
    expect(skillEvent.resolution.targetStatusEffects).toEqual([
      { kind: "bleed", amount: 1, duration: 2 },
    ]);
  });

  it("Headache 友方 · 治疗 7 · Buff 2t（A 落区 · 无攻击骰）", () => {
    const base = afterCollectAll(fightingDeployed());
    const woundedBoss = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((entity) =>
          entity.id === ACTOR_ID ? { ...entity, wounds: 20 } : entity,
        ),
      },
    };
    const prepared = ok(monsterTurn(woundedBoss, "collected:vestal"), {
      type: "prepareMonsterAction",
      actorId: "collected:vestal",
    });
    expect(prepared.state.battle!.monsterAction?.targetId).toBe(ACTOR_ID);
    const cursorBefore = prepared.state.battle!.rngCursor;
    const played = playSupport(prepared.state);
    expect(played.state.battle!.rngCursor).toBe(cursorBefore);
    const boss = played.state.battle!.entities.find((entity) => entity.id === ACTOR_ID)!;
    expect(boss.wounds).toBe(13);
    expect(boss.buffStacks).toBe(1);
  });

  it("四怪物先攻侧可依次 prepare → 移动 → 结算", () => {
    let state = afterCollectAll(fightingDeployed());
    const order: readonly { readonly id: string; readonly support?: true }[] = [
      { id: "collected:manAtArms" },
      { id: "collected:highwayman" },
      { id: "collected:vestal", support: true },
    ];
    for (const step of order) {
      const turn = monsterTurn(
        step.support
          ? {
              ...state,
              battle: {
                ...state.battle!,
                entities: state.battle!.entities.map((entity) =>
                  entity.id === ACTOR_ID ? { ...entity, wounds: 15 } : entity,
                ),
              },
            }
          : state,
        step.id,
      );
      const prepared = ok(turn, { type: "prepareMonsterAction", actorId: step.id });
      const done = step.support ? playSupport(prepared.state) : moveAndPlay(prepared.state, 1);
      expect(done.events.some((event) => event.type === "turnEnded")).toBe(true);
      state = done.state;
    }
    expect(state.battle!.encounter!.turn.type).not.toBe("monster");
  });

  it("verified_monster_effects 漂移时 playMonsterSkill 整次拒绝", () => {
    const base = afterCollectAll(fightingDeployed());
    const turnBase = monsterTurn(base, "collected:highwayman");
    const drifted = {
      ...turnBase,
      battle: {
        ...turnBase.battle!,
        monsters: turnBase.battle!.monsters!.map((entry) =>
          entry.id === COLLECTOR_I_COLLECTED_HIGHWAYMAN_CARD_ID
            ? {
                ...entry,
                skills: entry.skills.map((skill) => {
                  if (skill.slot !== 1) return skill;
                  const { verified_monster_effects: _removed, ...rest } = skill;
                  void _removed;
                  return rest;
                }),
              }
            : entry,
        ),
      },
    };
    const prepared = ok(drifted, {
      type: "prepareMonsterAction",
      actorId: "collected:highwayman",
    });
    const positioned = ok(prepared.state, {
      type: "moveMonsterToRange",
      actorId: "collected:highwayman",
    });
    const played = applyCommand(positioned.state, {
      type: "playMonsterSkill",
      actorId: "collected:highwayman",
      targetId: prepared.state.battle!.monsterAction!.targetId,
      skillSlot: 1,
    });
    expect(played.events.some((event) => event.type === "commandRefused")).toBe(true);
    expect(played.state).toBe(positioned.state);
  });
});
