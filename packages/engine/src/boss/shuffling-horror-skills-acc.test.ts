import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { applyCommand, type Command, type GameState } from "../command";
import { nextBattleRoll } from "../battle-roll";
import {
  readMonsterAttackView,
  resolveMonsterSkill,
  type MonsterCardView,
} from "../monster-skill";
import { SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID } from "./darkest-shuffling-horror-combat-runtime";
import {
  applyShufflingHorrorLacerate,
  SHUFFLING_HORROR_LACERATE_SKILL_SLOT,
} from "./darkest-shuffling-horror-skills-acc";
import { readDarkestBossEncounter } from "./darkest-content";
import { ensureDarkestMidBossScriptsRegistered } from "./darkest-mid-boss-scripts";

const HERO_SUP = "darkest-mid-boss-hero-support";

function loadLargeCards(): MonsterCardView[] {
  const large = JSON.parse(
    readFileSync(new URL("../../../data/normalized/corebox/monster_large.json", import.meta.url), {
      encoding: "utf8",
    }),
  ) as { cards: MonsterCardView[] };
  return large.cards;
}

function shufflingHorrorCard(): MonsterCardView {
  const card = loadLargeCards().find((entry) => entry.id === SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID);
  expect(card).toBeDefined();
  return card!;
}

const minimalCombat = {
  actor: { id: "horror", wounds: 0, shuffleResist: true },
  target: {
    id: "h0",
    side: "hero" as const,
    wounds: 0,
    stress: 0,
    dodge: 0,
    stance: "aggressive" as const,
    markStacks: 0,
  },
  areaDistance: 2,
};

const RANGE_REFUSAL = "目标区域与使用者的距离不是卡面印的射程（规则书第 19 页）";

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(result.events.some((e) => e.type === "commandRefused"), JSON.stringify(result.events)).toBe(
    false,
  );
  return result;
}

function deployed() {
  ensureDarkestMidBossScriptsRegistered();
  const game = createCoreDungeonQuest(7, "quest:p016", "radiant", coreParty, coreQuestSources);
  const d = game.dungeon!;
  const room = d.rooms.find((r) => r.kind === "objective")!;
  const battlePrep = ok(
    { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
    { type: "prepareDungeonBattle" },
  );
  return ok(battlePrep.state, { type: "prepareDungeonMonsters" }).state;
}

function fighting(): GameState {
  const base = ok(deployed(), { type: "deployDarkestMidBoss" }).state;
  return ok(base, { type: "startBattle" }).state;
}

function horror(state: GameState) {
  return state.battle!.entities.find(
    (entity) => entity.monsterCardId === SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID,
  )!;
}

function onHorrorTurn(state: GameState): GameState {
  const actor = horror(state);
  return {
    ...state,
    battle: {
      ...state.battle!,
      encounter: {
        round: 1,
        deck: ["hero", "monster"],
        actedIds: [],
        turn: { type: "monster", actorId: actor.id },
      },
    },
  };
}

function withHeroAreas(state: GameState, patch: Readonly<Record<string, string>>): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((entity) =>
        entity.side === "hero" && patch[entity.id]
          ? { ...entity, areaId: patch[entity.id]! }
          : entity,
      ),
    },
  };
}

it("monster_large:p017 三招印刷 Acc；卡级 verified（icon 8707d5d8cf→summon）", () => {
  const card = shufflingHorrorCard();
  expect(card.verification).toEqual({ unverified: false, reasons: [] });
  const accSkills = card.skills.filter((skill) =>
    skill.printed_labels.some((label) => label.label === "Acc"),
  );
  expect(accSkills).toHaveLength(3);
  expect(accSkills.map((skill) => skill.name)).toEqual([
    "Lacerate",
    "Undulations",
    "Echoing Disassembly",
  ]);
});

it("Lacerate slot 1：Closest · range 1 · Acc 11；无 verified_monster_effects", () => {
  const card = shufflingHorrorCard();
  const skill = card.skills.find((entry) => entry.slot === SHUFFLING_HORROR_LACERATE_SKILL_SLOT)!;
  expect(skill.name).toBe("Lacerate");
  expect(skill.target).toBe("Closest");
  expect(skill.verified_monster_effects).toBeUndefined();
  expect(skill.printed_labels).toEqual([
    { label: "Crit", raw: "Crit 1", value: 1 },
    { label: "Acc", raw: "Acc 11", value: 11 },
  ]);
  const attack = readMonsterAttackView(card, SHUFFLING_HORROR_LACERATE_SKILL_SLOT);
  expect(attack.status).toBe("ready");
  expect(resolveMonsterSkill(card, 1, minimalCombat, 4)).toMatchObject({
    status: "refused",
    reason: RANGE_REFUSAL,
  });
});

it("Undulations / Echoing Disassembly 已有几何命令；generic resolve 不走 R-048 未验证门", () => {
  const card = shufflingHorrorCard();
  for (const slot of [2, 3] as const) {
    expect(readMonsterAttackView(card, slot).status).toBe("ready");
    expect(resolveMonsterSkill(card, slot, minimalCombat, 4)).toMatchObject({
      status: "refused",
      reason: RANGE_REFUSAL,
    });
  }
});

describe("Shuffling Horror Lacerate Acc 最小结算", () => {
  it("encounter combatReady 仍为 false", () => {
    expect(readDarkestBossEncounter("quest:p016")!.combatReady).toBe(false);
  });

  it("Lacerate · Closest 1 · 命中仅 Acc/Crit/伤害（效果线 hold）", () => {
    const base = fighting();
    const heroes = base.battle!.entities.filter((entity) => entity.side === "hero");
    const card = base.dungeon!.battleCatalog!.monsters.find(
      (entry) => entry.id === SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID,
    )!;
    expect(
      card.skills.find((skill) => skill.slot === SHUFFLING_HORROR_LACERATE_SKILL_SLOT)
        ?.verified_monster_effects,
    ).toBeUndefined();

    let cursor = 0;
    while (nextBattleRoll(base.seed, cursor) !== 5) cursor += 1;
    const patch = Object.fromEntries(heroes.map((hero) => [hero.id, HERO_SUP]));
    let game = onHorrorTurn(withHeroAreas(base, patch));
    const actor = horror(game);
    game = {
      ...game,
      battle: {
        ...game.battle!,
        rngCursor: cursor,
        light: 5,
        entities: game.battle!.entities.map((entity) =>
          entity.side === "hero" ? { ...entity, dodge: 0, bleed: [] } : entity,
        ),
      },
    };
    const result = applyShufflingHorrorLacerate(game, actor.id);
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    expect(
      result.events.some(
        (event) =>
          event.type === "dungeonUpdated" &&
          event.message.includes("Lacerate") &&
          event.message.includes("效果线 hold"),
      ),
    ).toBe(true);
    const skillEvent = result.events.find((event) => event.type === "monsterSkillResolved");
    expect(skillEvent?.type).toBe("monsterSkillResolved");
    if (skillEvent?.type === "monsterSkillResolved") {
      expect(skillEvent.resolution.outcome).toBe("hit");
      const target = result.state.battle!.entities.find(
        (entity) => entity.id === skillEvent.resolution.targetId,
      )!;
      expect(target.bleed ?? []).toHaveLength(0);
    }
  });

  it("非 Shuffling Horror 遭遇拒绝", () => {
    const game = onHorrorTurn(fighting());
    const wrong: GameState = {
      ...game,
      dungeon: {
        ...game.dungeon!,
        questDistribution: { questId: "quest:p018", source: "fixture", counts: [] },
      },
    };
    expect(
      applyShufflingHorrorLacerate(wrong, horror(wrong).id).events.some(
        (event) => event.type === "commandRefused",
      ),
    ).toBe(true);
  });

  it("applyCommand · applyShufflingHorrorLacerate", () => {
    const base = fighting();
    const heroes = base.battle!.entities.filter((entity) => entity.side === "hero");
    let cursor = 0;
    while (nextBattleRoll(base.seed, cursor) !== 5) cursor += 1;
    const patch = Object.fromEntries(heroes.map((hero) => [hero.id, HERO_SUP]));
    let state = onHorrorTurn(withHeroAreas(base, patch));
    const actor = horror(state);
    state = {
      ...state,
      battle: {
        ...state.battle!,
        rngCursor: cursor,
        light: 5,
        entities: state.battle!.entities.map((entity) =>
          entity.side === "hero" ? { ...entity, dodge: 0 } : entity,
        ),
      },
    };
    const result = applyCommand(state, {
      type: "applyShufflingHorrorLacerate",
      actorId: actor.id,
    });
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  });
});
