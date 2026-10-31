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
  applyShufflingHorrorUndulations,
  DARKEST_MID_BOSS_HERO_STANCE_AREAS,
  SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID,
} from "./darkest-shuffling-horror-combat-runtime";
import { bossQuestScriptId } from "./quest-bridge";

const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

const horrorCard: MonsterCardView = {
  id: SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID,
  name: "Shuffling Horror",
  life: 109,
  dodge: 0,
  speed: 1,
  verification: { unverified: true, reasons: ["fixture"] },
  skills: [],
  typeTags: ["Eldritch"],
} as MonsterCardView;

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
      monsters: [horrorCard],
      areas: [
        ...areas,
        {
          id: "darkest-mid-boss-aggressive",
          elevation: "normal",
          capacity: 4,
          adjacent: [],
        },
      ],
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
    expect(
      result.events.find((event) => event.type === "dungeonUpdated")?.message,
    ).toContain("h2→h1→h3→h0");
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
