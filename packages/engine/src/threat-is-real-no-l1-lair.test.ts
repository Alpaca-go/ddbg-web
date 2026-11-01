import { describe, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import {
  readMonsterPoolInstanceLevel,
  THREAT_IS_REAL_III_QUEST_ID,
} from "./threat-is-real-no-l1-lair";
import { createCampaignQuestSandbox } from "./test-helpers/campaign-quest-sandbox";
import { spawnMonsters } from "./spawn";

function guardedFixture(
  questId: typeof THREAT_IS_REAL_III_QUEST_ID | "quest:p014",
  seed: number,
  kind: "lair" | "treasure",
): GameState {
  const state = createCampaignQuestSandbox(3, questId, seed);
  const d = state.dungeon!;
  const roomId = d.rooms.find((r) => r.kind === kind)?.id ?? d.position;
  return {
    ...state,
    dungeon: {
      ...d,
      phase: "awaitingRoom",
      position: roomId,
      rooms: d.rooms.map((r) =>
        r.id === roomId ? { ...r, kind, cleared: false, revealed: true } : r,
      ),
    },
  };
}

function deployMonsters(state: GameState) {
  const battle = applyCommand(state, { type: "prepareDungeonBattle" });
  if (battle.events.some((e) => e.type === "commandRefused")) return { ok: false as const, battle };
  const deployed = applyCommand(battle.state, { type: "prepareDungeonMonsters" });
  return { ok: !deployed.events.some((e) => e.type === "commandRefused"), battle, deployed };
}

function deployedLevels(state: GameState): number[] {
  const d = state.dungeon!;
  const pool = d.monsterPool!;
  if (!pool.active) return [];
  return pool.active.monsters.map((m) =>
    readMonsterPoolInstanceLevel(pool.cards, m.instanceId),
  ) as number[];
}

describe("A-07 The Threat is Real III · Lair 不生成 Level 1（quest:p015）", () => {
  it("quest:p015 · lair：成功部署的遭遇不含池 Level 1", () => {
    let successes = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const attempt = deployMonsters(guardedFixture(THREAT_IS_REAL_III_QUEST_ID, seed, "lair"));
      if (!attempt.ok) continue;
      successes++;
      const levels = deployedLevels(attempt.deployed!.state);
      expect(levels.every((level) => level !== 1), `seed ${seed}: ${levels.join(",")}`).toBe(true);
    }
    expect(successes).toBeGreaterThan(50);
  });

  it("quest:p015 · 非 lair（treasure）：仍可出现 Level 1", () => {
    let sawLevel1 = false;
    for (let seed = 1; seed <= 400; seed++) {
      const attempt = deployMonsters(guardedFixture(THREAT_IS_REAL_III_QUEST_ID, seed, "treasure"));
      if (!attempt.ok) continue;
      if (deployedLevels(attempt.deployed!.state).some((level) => level === 1)) {
        sawLevel1 = true;
        break;
      }
    }
    expect(sawLevel1).toBe(true);
  });

  it("非 quest:p015 · lair：仍可部署 Level 1（回归）", () => {
    let sawLevel1 = false;
    for (let seed = 1; seed <= 400; seed++) {
      const attempt = deployMonsters(guardedFixture("quest:p014", seed, "lair"));
      if (!attempt.ok) continue;
      if (deployedLevels(attempt.deployed!.state).some((level) => level === 1)) {
        sawLevel1 = true;
        break;
      }
    }
    expect(sawLevel1).toBe(true);
  });

  it("spawnMonsters skipSpawn：跳过的 L1 实例进入 remaining", () => {
    const deck = [
      {
        instanceId: "monster-deck:p001",
        cardId: "monster_medium:p001",
        edge: "front" as const,
        stanceSlots: 1 as const,
        verified: true as const,
      },
      {
        instanceId: "monster-deck:p049",
        cardId: "monster_medium:p049",
        edge: "front" as const,
        stanceSlots: 1 as const,
        verified: true as const,
      },
      {
        instanceId: "monster-deck:p050",
        cardId: "monster_medium:p050",
        edge: "front" as const,
        stanceSlots: 1 as const,
        verified: true as const,
      },
      {
        instanceId: "monster-deck:p051",
        cardId: "monster_medium:p051",
        edge: "front" as const,
        stanceSlots: 1 as const,
        verified: true as const,
      },
      {
        instanceId: "monster-deck:p052",
        cardId: "monster_medium:p052",
        edge: "front" as const,
        stanceSlots: 1 as const,
        verified: true as const,
      },
    ];
    const starts = { aggressive: "a", defensive: "b", ranged: "c", support: "d" };
    const skipped = spawnMonsters(deck, starts, {
      skipSpawn: (c) => c.instanceId === "monster-deck:p001",
    });
    expect(skipped.type).toBe("spawned");
    if (skipped.type !== "spawned") return;
    expect(skipped.monsters.map((m) => m.instanceId)).not.toContain("monster-deck:p001");
    expect(skipped.remaining.map((m) => m.instanceId)).toContain("monster-deck:p001");
  });
});
