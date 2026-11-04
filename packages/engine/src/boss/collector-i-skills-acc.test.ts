import { describe, expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "../command";
import { nextBattleRoll } from "../battle-roll";
import { distance } from "../battle";
import { readPrintedRange, readPrintedTargets } from "../hero-skill";
import { readMonsterAttackView, resolveMonsterSkill, type MonsterCardView } from "../monster-skill";
import { selectMonsterSkill } from "../monster-stance";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "./face-the-threat-embark-runtime";
import {
  COLLECTOR_I_COMBAT_MONSTER_CARD_ID,
  COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID,
  COLLECTOR_I_SCRIPT_ID,
} from "./collector-i";
import { collectorCollectAllShouldReplaceSkill } from "./collector-i-combat-runtime";

const SHOW_COLLECTION_SLOT = 1;
const LIFE_STEAL_SLOT = 2;
const ACTOR_ID = "boss:collector:1";

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

function collectorCard(state: GameState): MonsterCardView {
  const card = state.battle!.monsters!.find(
    (entry) => entry.id === COLLECTOR_I_COMBAT_MONSTER_CARD_ID,
  );
  expect(card).toBeDefined();
  return card!;
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

function onCollectorSkillTurn(
  state: GameState,
  selectionRoll: number,
  heroAreas: Readonly<Record<string, string>> = {},
): GameState {
  let cursor = state.battle!.rngCursor;
  while (nextBattleRoll(state.seed, cursor) !== selectionRoll) cursor += 1;
  return {
    ...state,
    battle: {
      ...state.battle!,
      rngCursor: cursor,
      monsterAction: null,
      entities: state.battle!.entities.map((entity) =>
        entity.side === "hero"
          ? {
              ...entity,
              dodge: 0,
              ...(heroAreas[entity.id] ? { areaId: heroAreas[entity.id]! } : {}),
            }
          : entity,
      ),
      encounter: {
        ...state.battle!.encounter!,
        turn: { type: "monster" as const, actorId: ACTOR_ID },
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

function playPrepared(state: GameState) {
  const action = state.battle!.monsterAction!;
  return ok(state, {
    type: "playMonsterSkill",
    actorId: action.actorId,
    targetId: action.targetId,
    skillSlot: action.skillSlot,
  });
}

describe("R-176 · monster_medium:p092 卡面（R-048）", () => {
  it("Speed 2 与四姿态共用选招表 1–5 / 6–10", () => {
    const card = collectorCard(apply(atObjective(), { type: "deployCollectorI" }));
    expect(card.speed).toBe(2);
    expect(card.stanceGroups).toEqual([
      {
        stances: ["aggressive", "defensive", "ranged", "support"],
        rollTable: [
          { min: 1, max: 5, skill: SHOW_COLLECTION_SLOT },
          { min: 6, max: 10, skill: LIFE_STEAL_SLOT },
        ],
      },
    ]);
    for (const roll of [1, 5, 6, 10]) {
      expect(selectMonsterSkill(card, ["aggressive"], roll)).toMatchObject({
        status: "selected",
        skillSlot: roll <= 5 ? SHOW_COLLECTION_SLOT : LIFE_STEAL_SLOT,
        roll,
      });
    }
  });

  it("Show Collection · Acc9 Crit0 · range1 · Crowded · 伤1–2 · stress+1", () => {
    const card = collectorCard(apply(atObjective(), { type: "deployCollectorI" }));
    const skill = card.skills.find((entry) => entry.slot === SHOW_COLLECTION_SLOT)!;
    expect(skill.name).toBe("Show Collection");
    expect(skill.target).toBe("Crowded");
    expect(skill.printed_labels).toEqual([
      { label: "Crit", raw: "Crit 0", value: 0 },
      { label: "Acc", raw: "Acc 9", value: 9 },
    ]);
    expect(skill.verified_monster_effects).toEqual({
      source: "print_front",
      signatures: ["{target_effects}{stress}+1"],
      effects: [{ type: "stress", scope: "target", amount: 1 }],
    });
    const attack = readMonsterAttackView(card, SHOW_COLLECTION_SLOT);
    expect(attack.status).toBe("ready");
    if (attack.status !== "ready") return;
    expect(readPrintedRange(attack.view)).toEqual({ kind: "exact", distance: 1 });
    expect(readPrintedTargets(attack.view)).toEqual({ kind: "exact", max: 2 });
  });

  it("Life Steal · Acc8 Crit1 · range2 · Crowded · 伤5–9 · Self heal9 · bleed/mark", () => {
    const card = collectorCard(apply(atObjective(), { type: "deployCollectorI" }));
    const skill = card.skills.find((entry) => entry.slot === LIFE_STEAL_SLOT)!;
    expect(skill.name).toBe("Life Steal");
    expect(skill.target).toBe("Crowded");
    expect(skill.printed_labels).toEqual([
      { label: "Crit", raw: "Crit 1", value: 1 },
      { label: "Acc", raw: "Acc 8", value: 8 },
    ]);
    expect(skill.verified_monster_effects).toEqual({
      source: "print_front",
      signatures: ["{self_effects}Self{heal}{heal}9{target_effects}2{bleed}2t,{mark}2t"],
      effects: [
        { type: "heal", scope: "self", amount: 9 },
        { type: "status", scope: "target", kind: "bleed", duration: 2, amount: 2 },
        { type: "status", scope: "target", kind: "mark", duration: 2 },
      ],
    });
    const attack = readMonsterAttackView(card, LIFE_STEAL_SLOT);
    expect(attack.status).toBe("ready");
    if (attack.status !== "ready") return;
    expect(readPrintedRange(attack.view)).toEqual({ kind: "exact", distance: 2 });
    expect(readPrintedTargets(attack.view)).toEqual({ kind: "exact", max: 2 });
  });
});

describe("Collector I · deployCollectorI 路径 · R-176 选招与结算", () => {
  function crowdedPatchForRange(state: GameState, range: number): Record<string, string> {
    const areas = state.battle!.areas;
    const areaId =
      areas.find((area) => distance(areas, "C", area.id) === range)?.id ??
      (() => {
        throw new Error(`Collector Room 缺少距 C 为 ${range} 的区域`);
      })();
    return Object.fromEntries(
      state
        .battle!.entities.filter((entity) => entity.side === "hero")
        .map((hero) => [hero.id, areaId]),
    );
  }

  it("无 Collected 时不掷 Show Collection / Life Steal，改走 Collect All 并洗入 3 先攻", () => {
    const started = fightingDeployed();
    const cursorBefore = started.battle!.rngCursor;
    const turn = {
      ...started,
      battle: {
        ...started.battle!,
        encounter: {
          ...started.battle!.encounter!,
          deck: started.battle!.encounter!.deck.filter((side) => side !== "monster"),
          turn: { type: "monster" as const, actorId: ACTOR_ID },
        },
      },
    };
    expect(collectorCollectAllShouldReplaceSkill(turn as GameState, ACTOR_ID)).toBe(true);
    const result = applyCommand(turn as GameState, {
      type: "prepareMonsterAction",
      actorId: ACTOR_ID,
    });
    expect(result.state.battle!.monsterAction).toBeNull();
    expect(result.events.some((event) => event.type === "monsterActionPrepared")).toBe(false);
    expect(
      result.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("Collect All"),
      ),
    ).toBe(true);
    expect(result.state.battle!.rngCursor - cursorBefore).toBe(3);
    expect(result.state.battle!.entities.some((entity) => entity.id.startsWith("collected:"))).toBe(
      true,
    );
  });

  it.each([
    [3, SHOW_COLLECTION_SLOT],
    [8, LIFE_STEAL_SLOT],
  ])("有 Collected 时 d10=%i → slot %i", (selectionRoll, slot) => {
    const withCollected = afterCollectAll(fightingDeployed());
    expect(
      withCollected.battle!.entities.filter((entity) => entity.id.startsWith("collected:")),
    ).toHaveLength(3);
    const turn = onCollectorSkillTurn(
      withCollected,
      selectionRoll,
      crowdedPatchForRange(withCollected, slot === SHOW_COLLECTION_SLOT ? 1 : 2),
    );
    const prepared = ok(turn, { type: "prepareMonsterAction", actorId: ACTOR_ID });
    expect(prepared.state.battle!.monsterAction).toMatchObject({
      actorId: ACTOR_ID,
      skillSlot: slot,
      selectionRoll,
    });
    expect(prepared.events.some((event) => event.type === "monsterActionPrepared")).toBe(true);
    expect(collectorCollectAllShouldReplaceSkill(turn, ACTOR_ID)).toBe(false);
  });

  it("Show Collection 命中 · Crowded 两目标 · 伤 1–2 与压力 +1", () => {
    const card = collectorCard(afterCollectAll(fightingDeployed()));
    const base = afterCollectAll(fightingDeployed());
    const turn = onCollectorSkillTurn(base, 2, crowdedPatchForRange(base, 1));
    const prepared = ok(turn, { type: "prepareMonsterAction", actorId: ACTOR_ID });
    expect(prepared.state.battle!.monsterAction!.skillSlot).toBe(SHOW_COLLECTION_SLOT);
    const played = playPrepared(withAttackRoll(prepared.state, 1));
    const targets = ["hero-0", "hero-1"];
    const skillEvent = played.events.find((event) => event.type === "monsterSkillTargetsResolved");
    expect(skillEvent?.type).toBe("monsterSkillTargetsResolved");
    if (skillEvent?.type !== "monsterSkillTargetsResolved") return;
    expect(skillEvent.resolutions).toHaveLength(2);
    expect(
      skillEvent.resolutions.every(
        (resolution) => resolution.outcome === "hit" || resolution.outcome === "crit",
      ),
    ).toBe(true);
    expect(skillEvent.resolutions.every((resolution) => resolution.targetStress === 1)).toBe(true);
    for (const heroId of targets) {
      const hero = played.state.battle!.entities.find((entity) => entity.id === heroId)!;
      expect(hero.wounds).toBeGreaterThanOrEqual(1);
      expect(hero.wounds).toBeLessThanOrEqual(2);
      expect(hero.stress).toBe(1);
    }
    const resolved = resolveMonsterSkill(
      card,
      SHOW_COLLECTION_SLOT,
      {
        actor: { id: ACTOR_ID, wounds: 0 },
        target: {
          id: "hero-0",
          side: "hero",
          wounds: 0,
          stress: 0,
          dodge: 0,
        },
        areaDistance: 1,
        light: 5,
        targetsInArea: 2,
      },
      1,
    );
    expect(resolved.status).toBe("resolved");
    if (resolved.status !== "resolved") return;
    expect(resolved.resolution.outcome === "hit" || resolved.resolution.outcome === "crit").toBe(
      true,
    );
    expect(resolved.resolution.damageDealt).toBeGreaterThanOrEqual(1);
    expect(resolved.resolution.damageDealt).toBeLessThanOrEqual(2);
    expect(resolved.resolution.targetStress).toBe(1);
  });

  it("Life Steal 命中 · Self 治疗 9 · 流血 2·2t · Mark 2t · 伤 5–9", () => {
    const card = collectorCard(afterCollectAll(fightingDeployed()));
    const base = afterCollectAll(fightingDeployed());
    const turn = onCollectorSkillTurn(base, 9, crowdedPatchForRange(base, 2));
    const prepared = ok(turn, { type: "prepareMonsterAction", actorId: ACTOR_ID });
    expect(prepared.state.battle!.monsterAction!.skillSlot).toBe(LIFE_STEAL_SLOT);
    const wounded = {
      ...prepared.state,
      battle: {
        ...prepared.state.battle!,
        entities: prepared.state.battle!.entities.map((entity) =>
          entity.id === ACTOR_ID ? { ...entity, wounds: 12 } : entity,
        ),
      },
    };
    const played = playPrepared(withAttackRoll(wounded, 1));
    const skillEvent = played.events.find((event) => event.type === "monsterSkillTargetsResolved");
    expect(skillEvent?.type).toBe("monsterSkillTargetsResolved");
    if (skillEvent?.type !== "monsterSkillTargetsResolved") return;
    expect(skillEvent.resolutions).toHaveLength(2);
    expect(
      skillEvent.resolutions.every(
        (resolution) => resolution.outcome === "hit" || resolution.outcome === "crit",
      ),
    ).toBe(true);
    expect(
      skillEvent.resolutions.every((resolution) =>
        (resolution.targetStatusEffects ?? []).some(
          (effect) => effect.kind === "bleed" && effect.amount === 2 && effect.duration === 2,
        ),
      ),
    ).toBe(true);
    expect(
      skillEvent.resolutions.every((resolution) =>
        (resolution.targetStatusEffects ?? []).some(
          (effect) => effect.kind === "mark" && effect.duration === 2,
        ),
      ),
    ).toBe(true);
    for (const heroId of ["hero-0", "hero-1"]) {
      const hero = played.state.battle!.entities.find((entity) => entity.id === heroId)!;
      expect(hero.wounds).toBeGreaterThanOrEqual(5);
      expect(hero.wounds).toBeLessThanOrEqual(9);
      expect(hero.statusStacks?.find((stack) => stack.kind === "bleed")).toMatchObject({
        amount: 2,
      });
      expect(hero.statusStacks?.find((stack) => stack.kind === "mark")).toMatchObject({
        remaining: 2,
      });
    }
    const collectorAfter = played.state.battle!.entities.find((entity) => entity.id === ACTOR_ID)!;
    expect(collectorAfter.wounds).toBe(3);
    const resolved = resolveMonsterSkill(
      card,
      LIFE_STEAL_SLOT,
      {
        actor: { id: ACTOR_ID, wounds: 12 },
        target: {
          id: "hero-0",
          side: "hero",
          wounds: 0,
          stress: 0,
          dodge: 0,
        },
        areaDistance: 2,
        light: 5,
        targetsInArea: 2,
      },
      1,
    );
    expect(resolved.status).toBe("resolved");
    if (resolved.status !== "resolved") return;
    expect(resolved.resolution.outcome === "hit" || resolved.resolution.outcome === "crit").toBe(
      true,
    );
    expect(resolved.resolution.damageDealt).toBeGreaterThanOrEqual(5);
    expect(resolved.resolution.damageDealt).toBeLessThanOrEqual(9);
    expect(resolved.resolution.targetStatusEffects).toEqual([
      { kind: "bleed", amount: 2, duration: 2 },
      { kind: "mark", duration: 2 },
    ]);
  });

  it("verified_monster_effects 漂移时 prepare 后 play 整次拒绝", () => {
    const withCollected = afterCollectAll(fightingDeployed());
    const turn = onCollectorSkillTurn(withCollected, 4, crowdedPatchForRange(withCollected, 1));
    const drifted = {
      ...turn,
      battle: {
        ...turn.battle!,
        monsters: turn.battle!.monsters!.map((entry) =>
          entry.id === COLLECTOR_I_COMBAT_MONSTER_CARD_ID
            ? {
                ...entry,
                skills: entry.skills.map((skill) => {
                  if (skill.slot !== SHOW_COLLECTION_SLOT) return skill;
                  const { verified_monster_effects: _removed, ...rest } = skill;
                  void _removed;
                  return rest;
                }),
              }
            : entry,
        ),
      },
    };
    const prepared = ok(drifted, { type: "prepareMonsterAction", actorId: ACTOR_ID });
    const played = applyCommand(prepared.state, {
      type: "playMonsterSkill",
      actorId: ACTOR_ID,
      targetId: prepared.state.battle!.monsterAction!.targetId,
      skillSlot: SHOW_COLLECTION_SLOT,
    });
    expect(played.events.some((event) => event.type === "commandRefused")).toBe(true);
    expect(played.state).toBe(prepared.state);
  });
});
