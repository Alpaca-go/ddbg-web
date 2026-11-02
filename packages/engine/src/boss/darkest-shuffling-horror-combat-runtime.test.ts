import { readFileSync } from "node:fs";
import { describe, expect, it, beforeEach } from "vitest";
import { createBattleState, type BattleEntity } from "../battle";
import { applyCommand, type GameState } from "../command";
import { createLootState } from "../loot";
import type { SkillStance } from "../hero-skill";
import type { MonsterCardView } from "../monster-skill";
import {
  DARKEST_SHUFFLING_HORROR_SCRIPT_ID,
  ensureDarkestMidBossScriptsRegistered,
} from "./darkest-mid-boss-scripts";
import {
  applyShufflingHorrorEchoingDisassembly,
  applyShufflingHorrorUndulations,
  DARKEST_MID_BOSS_HERO_STANCE_AREAS,
  DARKEST_MID_BOSS_MONSTER_STANCE_AREAS,
  SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID,
  SHUFFLING_HORROR_ECHOING_DISASSEMBLY_SKILL_SLOT,
  SHUFFLING_HORROR_ECHOING_LIGHT_DELTA,
  SHUFFLING_HORROR_ECHOING_STRESS_AMOUNT,
  SHUFFLING_HORROR_ECHOING_SUMMON_CARD_IDS,
} from "./darkest-shuffling-horror-combat-runtime";
import { bossQuestScriptId } from "./quest-bridge";

const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

function loadShufflingHorrorCard(): MonsterCardView {
  const large = JSON.parse(
    readFileSync(new URL("../../../data/normalized/corebox/monster_large.json", import.meta.url), {
      encoding: "utf8",
    }),
  ) as { cards: MonsterCardView[] };
  const card = large.cards.find((entry) => entry.id === SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID);
  if (!card) throw new Error("monster_large:p017 missing from normalized catalog");
  return card;
}

const horrorCard: MonsterCardView = loadShufflingHorrorCard();

const cultistCard: MonsterCardView = {
  id: "monster_medium:p072",
  name: "Cultist Priest",
  life: 26,
  dodge: 15,
  speed: 1,
  verification: { unverified: false, reasons: [] },
  skills: [],
  typeTags: ["Eldritch"],
  type_position_tags: ["Eldritch", "Beast", "Back"],
} as MonsterCardView;

const growthCard: MonsterCardView = {
  id: "monster_medium:p075",
  name: "Malignant Growth",
  life: 28,
  dodge: 0,
  speed: 1,
  verification: { unverified: false, reasons: [] },
  skills: [],
  typeTags: ["Eldritch"],
  type_position_tags: ["Eldritch", "Front"],
} as MonsterCardView;

function monsterStanceAreas() {
  return Object.values(DARKEST_MID_BOSS_MONSTER_STANCE_AREAS).map((id, index, list) => ({
    id,
    elevation: "normal" as const,
    capacity: 4,
    adjacent: [list[index - 1], list[index + 1]].filter(Boolean) as string[],
  }));
}

function horrorDungeon(): GameState["dungeon"] {
  return {
    phase: "inBattle",
    cursor: 0,
    heroes: [],
    questDistribution: { questId: "quest:p016", source: "fixture", counts: [] },
  } as unknown as GameState["dungeon"];
}

function horrorBattle(seed = 7, heroIds = ["h0", "h1", "h2", "h3"]): GameState {
  const heroes: BattleEntity[] = heroIds.map((id, index) => {
    const stance = stances[index]!;
    return {
      id,
      side: "hero",
      areaId: DARKEST_MID_BOSS_HERO_STANCE_AREAS[stance],
      stance,
      hero: "CRUSADER",
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
  const horror: BattleEntity = {
    id: "horror",
    side: "monster",
    hero: null,
    monsterCardId: SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID,
    life: horrorCard.life,
    dodge: 0,
    areaId: "darkest-mid-boss-aggressive",
    stance: "aggressive",
    stanceSlots: 2,
    wounds: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  const areas = Object.values(DARKEST_MID_BOSS_HERO_STANCE_AREAS).map((id, index, list) => ({
    id,
    elevation: "normal" as const,
    capacity: 4,
    adjacent: [list[index - 1], list[index + 1]].filter(Boolean) as string[],
  }));
  return {
    ...createBattleState(seed, {
      entities: [...heroes, horror],
      monsters: [horrorCard, cultistCard, growthCard],
      areas: [...areas, ...monsterStanceAreas()],
      light: 4,
      skills: [],
      heroStats: [],
      lootPool: createLootState(),
    }),
    dungeon: horrorDungeon(),
  } as GameState;
}

function onHorrorTurn(state: GameState): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      rngCursor: 0,
      encounter: {
        round: 1,
        deck: [],
        actedIds: [],
        turn: { type: "monster", actorId: "horror" },
      },
    },
  };
}

describe("Shuffling Horror · Undulations", () => {
  beforeEach(() => {
    ensureDarkestMidBossScriptsRegistered();
    bossQuestScriptId["quest:p016"] = DARKEST_SHUFFLING_HORROR_SCRIPT_ID;
  });

  it("洗混后从 front（aggressive）起放回对应 hero 区域", () => {
    const result = applyShufflingHorrorUndulations(onHorrorTurn(horrorBattle(7)), "horror");
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    const heroes = result.state.battle!.entities.filter((entity) => entity.side === "hero");
    expect(heroes).toHaveLength(4);
    for (const stance of stances) {
      const hero = heroes.find((entry) => entry.stance === stance);
      expect(hero?.areaId).toBe(DARKEST_MID_BOSS_HERO_STANCE_AREAS[stance]);
    }
    expect(result.events.find((event) => event.type === "dungeonUpdated")?.message).toContain(
      "h2→h1→h3→h0",
    );
    expect(result.state.battle!.encounter!.turn.type).not.toBe("monster");
  });

  it("拒绝非 Horror 实体与非 p016 脚本", () => {
    const state = onHorrorTurn(horrorBattle());
    const wrongActor = applyShufflingHorrorUndulations(state, "h0");
    expect(wrongActor.events.some((event) => event.type === "commandRefused")).toBe(true);
    const templars = applyShufflingHorrorUndulations(
      {
        ...state,
        dungeon: {
          ...state.dungeon!,
          questDistribution: { questId: "quest:p017", source: "fixture", counts: [] },
        },
      },
      "horror",
    );
    expect(templars.events.some((event) => event.type === "commandRefused")).toBe(true);
  });

  it("显式命令经 applyCommand 接线并结束 Horror 回合", () => {
    const result = applyCommand(onHorrorTurn(horrorBattle()), {
      type: "applyShufflingHorrorUndulations",
      actorId: "horror",
    });
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    expect(
      result.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("Undulations"),
      ),
    ).toBe(true);
  });

  it("boss_ability:p033 combatReady 仍为 false", () => {
    const abilities = JSON.parse(
      readFileSync(
        new URL("../../../data/normalized/corebox/darkest_boss_abilities.json", import.meta.url),
        "utf8",
      ),
    );
    const card = abilities.cards.find((entry: { id: string }) => entry.id === "boss_ability:p033");
    expect(card?.combatReady).toBe(false);
  });
});

describe("Shuffling Horror · Echoing Disassembly", () => {
  beforeEach(() => {
    ensureDarkestMidBossScriptsRegistered();
    bossQuestScriptId["quest:p016"] = DARKEST_SHUFFLING_HORROR_SCRIPT_ID;
  });

  it("空槽召唤 Cultist Priest 与 Malignant Growth", () => {
    const result = applyShufflingHorrorEchoingDisassembly(onHorrorTurn(horrorBattle()), "horror");
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    const monsters = result.state.battle!.entities.filter(
      (entity) => entity.side === "monster" && !entity.dead,
    );
    expect(monsters).toHaveLength(3);
    for (const cardId of SHUFFLING_HORROR_ECHOING_SUMMON_CARD_IDS) {
      const entity = monsters.find((entry) => entry.monsterCardId === cardId);
      expect(entity?.life).toBe(cardId === "monster_medium:p072" ? 26 : 28);
      expect(entity?.stanceSlots).toBe(1);
    }
    expect(result.state.battle!.encounter!.turn.type).not.toBe("monster");
  });

  it("Crowded 区英雄 +2 压力、Torch −1，与召唤并存", () => {
    const base = onHorrorTurn(horrorBattle());
    const crowdedArea = DARKEST_MID_BOSS_HERO_STANCE_AREAS.aggressive;
    const patch = Object.fromEntries(
      base
        .battle!.entities.filter((entity) => entity.side === "hero")
        .map((hero, index) => [
          hero.id,
          index < 2 ? crowdedArea : DARKEST_MID_BOSS_HERO_STANCE_AREAS.ranged,
        ]),
    );
    const game: GameState = {
      ...base,
      battle: {
        ...base.battle!,
        light: 4,
        entities: base.battle!.entities.map((entity) =>
          entity.side === "hero" && patch[entity.id]
            ? { ...entity, areaId: patch[entity.id]!, stress: 1 }
            : entity,
        ),
      },
    };
    expect(
      horrorCard.skills.find(
        (skill) => skill.slot === SHUFFLING_HORROR_ECHOING_DISASSEMBLY_SKILL_SLOT,
      )?.verified_monster_effects?.effects,
    ).toEqual([
      { type: "stress", scope: "target", amount: SHUFFLING_HORROR_ECHOING_STRESS_AMOUNT },
      { type: "light", scope: "target", amount: SHUFFLING_HORROR_ECHOING_LIGHT_DELTA },
    ]);
    const crowdedHeroes = game.battle!.entities.filter(
      (entity) => entity.side === "hero" && entity.areaId === crowdedArea,
    );
    expect(crowdedHeroes).toHaveLength(2);
    const result = applyShufflingHorrorEchoingDisassembly(game, "horror");
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    for (const hero of crowdedHeroes) {
      expect(result.state.battle!.entities.find((entity) => entity.id === hero.id)!.stress).toBe(
        1 + SHUFFLING_HORROR_ECHOING_STRESS_AMOUNT,
      );
    }
    expect(result.state.battle!.light).toBe(4 + SHUFFLING_HORROR_ECHOING_LIGHT_DELTA);
    expect(result.events.find((event) => event.type === "dungeonUpdated")?.message).toContain(
      "Torch -1",
    );
    expect(
      result.state.battle!.entities.filter(
        (entity) => entity.monsterCardId === "monster_medium:p075" && !entity.dead,
      ),
    ).toHaveLength(1);
  });

  it("已在场则跳过对应召唤物", () => {
    const base = onHorrorTurn(horrorBattle());
    const withPriest: GameState = {
      ...base,
      battle: {
        ...base.battle!,
        entities: [
          ...base.battle!.entities,
          {
            id: "priest",
            side: "monster",
            hero: null,
            monsterCardId: "monster_medium:p072",
            life: 26,
            dodge: 15,
            areaId: DARKEST_MID_BOSS_MONSTER_STANCE_AREAS.defensive,
            stance: "defensive",
            stanceSlots: 1,
            wounds: 0,
            skillIds: [],
            guard: false,
            dead: false,
            bleed: [],
            blight: [],
          },
        ],
      },
    };
    const result = applyShufflingHorrorEchoingDisassembly(withPriest, "horror");
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    expect(result.events.find((event) => event.type === "dungeonUpdated")?.message).toContain(
      "跳过已在场 monster_medium:p072",
    );
    expect(
      result.state.battle!.entities.filter(
        (entity) => entity.monsterCardId === "monster_medium:p075" && !entity.dead,
      ),
    ).toHaveLength(1);
  });

  it("怪物姿态轨已满则拒绝", () => {
    const base = onHorrorTurn(horrorBattle());
    const filled: GameState = {
      ...base,
      battle: {
        ...base.battle!,
        entities: [
          ...base.battle!.entities,
          {
            id: "filler-a",
            side: "monster",
            hero: null,
            monsterCardId: "monster_medium:p001",
            life: 7,
            dodge: 0,
            areaId: DARKEST_MID_BOSS_MONSTER_STANCE_AREAS.defensive,
            stance: "defensive",
            stanceSlots: 1,
            wounds: 0,
            skillIds: [],
            guard: false,
            dead: false,
            bleed: [],
            blight: [],
          },
          {
            id: "filler-b",
            side: "monster",
            hero: null,
            monsterCardId: "monster_medium:p002",
            life: 7,
            dodge: 0,
            areaId: DARKEST_MID_BOSS_MONSTER_STANCE_AREAS.ranged,
            stance: "ranged",
            stanceSlots: 1,
            wounds: 0,
            skillIds: [],
            guard: false,
            dead: false,
            bleed: [],
            blight: [],
          },
          {
            id: "filler-c",
            side: "monster",
            hero: null,
            monsterCardId: "monster_medium:p003",
            life: 7,
            dodge: 0,
            areaId: DARKEST_MID_BOSS_MONSTER_STANCE_AREAS.support,
            stance: "support",
            stanceSlots: 1,
            wounds: 0,
            skillIds: [],
            guard: false,
            dead: false,
            bleed: [],
            blight: [],
          },
        ],
      },
    };
    const result = applyShufflingHorrorEchoingDisassembly(filled, "horror");
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(true);
  });

  it("拒绝非 Horror 实体与非 p016 脚本", () => {
    const state = onHorrorTurn(horrorBattle());
    expect(
      applyShufflingHorrorEchoingDisassembly(state, "h0").events.some(
        (event) => event.type === "commandRefused",
      ),
    ).toBe(true);
    expect(
      applyShufflingHorrorEchoingDisassembly(
        {
          ...state,
          dungeon: {
            ...state.dungeon!,
            questDistribution: { questId: "quest:p017", source: "fixture", counts: [] },
          },
        },
        "horror",
      ).events.some((event) => event.type === "commandRefused"),
    ).toBe(true);
  });

  it("显式命令经 applyCommand 接线", () => {
    const result = applyCommand(onHorrorTurn(horrorBattle()), {
      type: "applyShufflingHorrorEchoingDisassembly",
      actorId: "horror",
    });
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    expect(
      result.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("Echoing Disassembly"),
      ),
    ).toBe(true);
  });
});
