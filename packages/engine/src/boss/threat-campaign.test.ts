import { describe, expect, it, beforeEach } from "vitest";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import {
  NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
  NECROMANCER_I_SCRIPT_ID,
  applyBossThreatAfterBattleToPool,
  clearedBossThreatScriptIdAfterVictory,
  dungeonMonsterPoolThrough,
  ensureNecromancerIBossScriptRegistered,
  setActiveBossThreat,
  syncHamletBlockedBuildingsForBossThreat,
} from "../index";
import { coreQuestSources } from "../test-helpers/core-quest";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty } from "../test-helpers/core-quest";
import { rollHamletCaretaker } from "../hamlet-event";

function hamletJourney(seed = 40) {
  let game = createCoreDungeonQuest(seed, "quest:p001", "radiant", coreParty, coreQuestSources);
  const step = (command: Command) => {
    const r = applyCommand(game, command);
    expect(r.events.some((e) => e.type === "commandRefused"), JSON.stringify(r.events)).toBe(
      false,
    );
    game = r.state;
    return r;
  };
  let r = step({ type: "rollDungeonProvisions" });
  while (r.pendingChoice)
    r = step({
      type: "resolveChoice",
      choiceId: r.pendingChoice.id,
      optionId: r.pendingChoice.options[0]!.id,
    });
  r = step({ type: "leaveDungeon" });
  step({ type: "resolveChoice", choiceId: r.pendingChoice!.id, optionId: "agree" });
  for (const type of [
    "summarizeDungeonQuest",
    "beginReturnToHamlet",
    "finishReturnToHamlet",
    "drawHamletEvent",
    "rollHamletCaretaker",
  ] as const)
    step({ type });
  return game;
}

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(result.events.some((e) => e.type === "commandRefused"), JSON.stringify(result.events)).toBe(
    false,
  );
  return result.state;
}

describe("Boss 威胁被动战役接线（Necromancer I）", () => {
  beforeEach(() => {
    ensureNecromancerIBossScriptRegistered();
  });

  it("setActiveBossThreat 写入村庄 graveyard 封锁并拒绝访问", () => {
    let game = hamletJourney();
    expect(game.dungeon!.hamlet!.blockedBuildings).not.toContain("graveyard");
    game = ok(game, { type: "setActiveBossThreat", scriptId: NECROMANCER_I_SCRIPT_ID });
    expect(game.dungeon!.activeBossThreatScriptId).toBe(NECROMANCER_I_SCRIPT_ID);
    expect(game.dungeon!.hamlet!.blockedBuildings).toContain("graveyard");
    const refused = applyCommand(game, {
      type: "visitHamletBuilding",
      actorId: game.dungeon!.hamlet!.heroOrder[0]!,
      serviceId: "graveyardVirtue",
      quirkIds: [],
    });
    expect(refused.events.some((e) => e.type === "commandRefused")).toBe(true);
  });

  it("清除威胁后去掉 graveyard 封锁（保留看守人）", () => {
    let game = hamletJourney();
    game = ok(game, { type: "setActiveBossThreat", scriptId: NECROMANCER_I_SCRIPT_ID });
    const caretaker = game.dungeon!.hamlet!.caretaker!;
    game = ok(game, { type: "setActiveBossThreat", scriptId: null });
    expect(game.dungeon!.activeBossThreatScriptId).toBeUndefined();
    expect(game.dungeon!.hamlet!.blockedBuildings).not.toContain("graveyard");
    if (caretaker !== "graveyard") {
      expect(game.dungeon!.hamlet!.blockedBuildings).toContain(caretaker);
    }
  });

  it("rollHamletCaretaker 合并威胁封锁", () => {
    const state = {
      seed: 903,
      notes: [],
      dungeon: {
        phase: "inHamlet",
        cursor: 0,
        heroes: coreParty.map((h, i) => ({ ...h, id: `hero-${i}` })),
        activeBossThreatScriptId: NECROMANCER_I_SCRIPT_ID,
        hamlet: {
          deck: [],
          permanentlyRemoved: [],
          active: null,
          last: "hamlet_event:p001",
          phase: "awaitingCaretaker",
          preparationDays: 1,
          day: 1,
          noCaretaker: false,
          extraBlock: false,
          caretaker: null,
          blockedBuildings: [],
          heroOrder: coreParty.map((_, i) => `hero-${i}`),
        },
      },
    } as unknown as GameState;
    const next = rollHamletCaretaker(state).state;
    expect(next.dungeon!.hamlet!.blockedBuildings).toContain("graveyard");
  });

  it("applyBossThreatAfterBattleToPool 在激活威胁时永久移除非 Unholy", () => {
    const humanId = "monster_medium:p018";
    const unholyId = "monster_medium:p001";
    const pool = {
      cards: coreQuestSources.monsters,
      remaining: ["monster-deck:p018", "monster-deck:p001"],
      discarded: [],
      active: null,
    };
    const patch = applyBossThreatAfterBattleToPool(
      {
        activeBossThreatScriptId: NECROMANCER_I_SCRIPT_ID,
        battleCatalog: coreQuestSources.catalog,
      } as unknown as import("../dungeon").DungeonState,
      pool,
      [{ cardId: humanId }, { cardId: unholyId }],
      ["monster-deck:p018", "monster-deck:p001"],
    );
    expect(patch.removedCombatCardIds).toEqual([humanId]);
    expect(patch.pool.permanentlyRemovedCombatCardIds).toEqual([humanId]);
    expect(patch.instanceIds).not.toContain("monster-deck:p018");
    expect(patch.instanceIds).toContain("monster-deck:p001");
    expect(dungeonMonsterPoolThrough(patch.pool, 1).length).toBeLessThan(
      dungeonMonsterPoolThrough(pool, 1).length,
    );
  });

  it("Boss 战胜利且 Necromancer 死亡时标记清除迫近威胁", () => {
    const state = {
      seed: 905,
      notes: [],
      dungeon: {
        activeBossThreatScriptId: NECROMANCER_I_SCRIPT_ID,
        phase: "inBattle",
        position: "D",
        monsterPool: { active: { roomId: "D", monsters: [], blockedReason: "" } },
      },
      battle: {
        entities: [
          {
            id: "boss",
            side: "monster",
            monsterCardId: NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
            dead: true,
            wounds: 9,
          },
        ],
        encounter: {
          turn: { type: "finished", outcome: "victory" },
          round: 1,
          deck: [],
          actedIds: [],
        },
      },
    } as unknown as GameState;
    expect(clearedBossThreatScriptIdAfterVictory(state)).toBe(NECROMANCER_I_SCRIPT_ID);
  });


  it("syncHamletBlockedBuildingsForBossThreat 幂等", () => {
    const hamlet = {
      deck: [],
      permanentlyRemoved: [],
      active: null,
      last: "x",
      phase: "heroActions" as const,
      preparationDays: 1,
      day: 1,
      noCaretaker: false,
      extraBlock: false,
      caretaker: "tavern",
      blockedBuildings: ["tavern"],
      heroOrder: [],
    };
    const d = {
      activeBossThreatScriptId: NECROMANCER_I_SCRIPT_ID,
      hamlet,
    } as unknown as import("../dungeon").DungeonState;
    const twice = syncHamletBlockedBuildingsForBossThreat(
      d,
      syncHamletBlockedBuildingsForBossThreat(d, hamlet),
    );
    expect([...twice.blockedBuildings].sort()).toEqual(["graveyard", "tavern"]);
  });
});

describe("setActiveBossThreat 命令", () => {
  beforeEach(() => ensureNecromancerIBossScriptRegistered());

  it("拒绝未注册脚本", () => {
    const result = setActiveBossThreat(
      { seed: 1, notes: [], dungeon: { phase: "inHamlet" } } as unknown as GameState,
      { type: "setActiveBossThreat", scriptId: "boss:unknown:x" as typeof NECROMANCER_I_SCRIPT_ID },
    );
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
  });
});
