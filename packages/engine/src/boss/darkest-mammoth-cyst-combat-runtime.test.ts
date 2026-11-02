import { readFileSync } from "node:fs";
import { describe, expect, it, beforeEach } from "vitest";
import { createBattleState, type BattleEntity } from "../battle";
import { applyCommand, type GameState } from "../command";
import { createLootState } from "../loot";
import type { MonsterCardView } from "../monster-skill";
import {
  DARKEST_MAMMOTH_CYST_SCRIPT_ID,
  ensureDarkestMidBossScriptsRegistered,
} from "./darkest-mid-boss-scripts";
import {
  applyMammothCystSummonWhiteCell,
  MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID,
  MAMMOTH_CYST_WHITE_CELL_SUMMON_CARD_ID,
} from "./darkest-mammoth-cyst-combat-runtime";
import { DARKEST_MID_BOSS_MONSTER_STANCE_AREAS } from "./darkest-shuffling-horror-combat-runtime";
import { bossQuestScriptId } from "./quest-bridge";

const mammothCard: MonsterCardView = {
  id: MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID,
  name: "Mammoth Cyst",
  life: 109,
  dodge: 3,
  speed: 1,
  verification: { unverified: true, reasons: ["fixture"] },
  skills: [],
  typeTags: ["Eldritch"],
  type_position_tags: ["Eldritch", "Beast", "Large", "Front"],
} as MonsterCardView;

const stalkCard: MonsterCardView = {
  id: MAMMOTH_CYST_WHITE_CELL_SUMMON_CARD_ID,
  name: "White Cell Stalk",
  life: 16,
  dodge: 4,
  speed: 1,
  verification: { unverified: false, reasons: [] },
  skills: [],
  typeTags: ["Eldritch"],
  type_position_tags: ["Eldritch", "Beast", "Small", "Front"],
} as MonsterCardView;

function monsterStanceAreas() {
  return Object.values(DARKEST_MID_BOSS_MONSTER_STANCE_AREAS).map((id, index, list) => ({
    id,
    elevation: "normal" as const,
    capacity: 4,
    adjacent: [list[index - 1], list[index + 1]].filter(Boolean) as string[],
  }));
}

function mammothDungeon(): GameState["dungeon"] {
  return {
    phase: "inBattle",
    cursor: 0,
    heroes: [],
    questDistribution: { questId: "quest:p018", source: "fixture", counts: [] },
  } as unknown as GameState["dungeon"];
}

function mammothBattle(includeStalk = false): GameState {
  const mammoth: BattleEntity = {
    id: "mammoth",
    side: "monster",
    hero: null,
    monsterCardId: MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID,
    life: mammothCard.life,
    dodge: 3,
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
  const entities: BattleEntity[] = [mammoth];
  if (includeStalk) {
    entities.push({
      id: "stalk-deployed",
      side: "monster",
      hero: null,
      monsterCardId: MAMMOTH_CYST_WHITE_CELL_SUMMON_CARD_ID,
      life: 16,
      dodge: 4,
      areaId: DARKEST_MID_BOSS_MONSTER_STANCE_AREAS.defensive,
      stance: "defensive",
      stanceSlots: 1,
      wounds: 0,
      skillIds: [],
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    });
  }
  return {
    ...createBattleState(7, {
      entities,
      monsters: [mammothCard, stalkCard],
      areas: monsterStanceAreas(),
      light: 4,
      skills: [],
      heroStats: [],
      lootPool: createLootState(),
    }),
    dungeon: mammothDungeon(),
  } as GameState;
}

function onMammothTurn(state: GameState): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      rngCursor: 0,
      encounter: {
        round: 1,
        deck: [],
        actedIds: [],
        turn: { type: "monster", actorId: "mammoth" },
      },
    },
  };
}

describe("Mammoth Cyst · Summon White Cell Stalk", () => {
  beforeEach(() => {
    ensureDarkestMidBossScriptsRegistered();
    bossQuestScriptId["quest:p018"] = DARKEST_MAMMOTH_CYST_SCRIPT_ID;
  });

  it("无 Stalk 时在空槽召唤 White Cell Stalk", () => {
    const result = applyMammothCystSummonWhiteCell(onMammothTurn(mammothBattle()), "mammoth");
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    const stalk = result.state.battle!.entities.find(
      (entity) => entity.monsterCardId === MAMMOTH_CYST_WHITE_CELL_SUMMON_CARD_ID && !entity.dead,
    );
    expect(stalk?.life).toBe(16);
    expect(stalk?.dodge).toBe(4);
    expect(stalk?.stance).toBe("ranged");
    expect(stalk?.areaId).toBe(DARKEST_MID_BOSS_MONSTER_STANCE_AREAS.ranged);
    expect(result.state.battle!.encounter!.turn.type).not.toBe("monster");
  });

  it("已在场存活 Stalk 则拒绝", () => {
    const result = applyMammothCystSummonWhiteCell(onMammothTurn(mammothBattle(true)), "mammoth");
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(true);
    expect(result.events.find((event) => event.type === "commandRefused")?.message).toContain(
      "instead of using a Skill",
    );
  });

  it("怪物姿态轨无空槽则拒绝", () => {
    const base = onMammothTurn(mammothBattle());
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
    const result = applyMammothCystSummonWhiteCell(filled, "mammoth");
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(true);
  });

  it("拒绝非 Mammoth 实体与非 p018 脚本", () => {
    const state = onMammothTurn(mammothBattle());
    expect(
      applyMammothCystSummonWhiteCell(state, "h0").events.some(
        (event) => event.type === "commandRefused",
      ),
    ).toBe(true);
    expect(
      applyMammothCystSummonWhiteCell(
        {
          ...state,
          dungeon: {
            ...state.dungeon!,
            questDistribution: { questId: "quest:p016", source: "fixture", counts: [] },
          },
        },
        "mammoth",
      ).events.some((event) => event.type === "commandRefused"),
    ).toBe(true);
  });

  it("显式命令经 applyCommand 接线", () => {
    const result = applyCommand(onMammothTurn(mammothBattle()), {
      type: "applyMammothCystSummonWhiteCell",
      actorId: "mammoth",
    });
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    expect(
      result.events.some(
        (event) =>
          event.type === "dungeonUpdated" && event.message.includes("Summon White Cell Stalk"),
      ),
    ).toBe(true);
  });

  it("boss_ability:p030 combatReady 仍为 false", () => {
    const abilities = JSON.parse(
      readFileSync(
        new URL("../../../data/normalized/corebox/darkest_boss_abilities.json", import.meta.url),
        "utf8",
      ),
    );
    const card = abilities.cards.find((entry: { id: string }) => entry.id === "boss_ability:p030");
    expect(card?.combatReady).toBe(false);
  });
});
