import { afterAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import type { BasicQuestId } from "../../data/src/basic-quests";
import { coreQuestSources } from "./test-helpers/core-quest";
import { naturalParty } from "./test-helpers/natural-quest";
import { isSkillAdmissionRefusal } from "./dungeon-battle-admission";

/** I 级战役出征池（`questsForCampaignLevel(1)` 非 Boss 子集）。 */
const CAMPAIGN_L1_QUESTS: readonly BasicQuestId[] = [
  "quest:p001",
  "quest:p002",
  "quest:p003",
  "quest:p004",
  "quest:p005",
];

const GUARDED_KINDS = ["treasure", "lair", "objective"] as const;
type GuardedKind = (typeof GUARDED_KINDS)[number] | "curio";

const SEEDS_PER_QUEST = 120;

function guardedBattleFixture(initial: GameState, kind: GuardedKind, position = "D"): GameState {
  const d = initial.dungeon!;
  return {
    ...initial,
    dungeon: {
      ...d,
      phase: "awaitingRoom",
      position,
      rooms: d.rooms.map((r) =>
        r.id === position ? { ...r, kind: kind === "curio" ? "curio" : kind, cleared: false } : r,
      ),
      ...(kind === "curio"
        ? { curioRoom: { roomId: position, guardRoll: 3, stage: "guarded" as const } }
        : {}),
    },
  };
}

type AdmissionAttempt =
  | { readonly status: "admitted" }
  | {
      readonly status: "skipped";
      readonly stage: "prepareDungeonBattle" | "prepareDungeonMonsters";
    }
  | { readonly status: "skillRefused"; readonly message: string };

function attemptStartDungeonBattle(state: GameState): AdmissionAttempt {
  const room = applyCommand(state, { type: "prepareDungeonBattle" });
  const roomRefused = room.events.find((e) => e.type === "commandRefused");
  if (roomRefused) {
    return { status: "skipped", stage: "prepareDungeonBattle" };
  }
  const deployed = applyCommand(room.state, { type: "prepareDungeonMonsters" });
  const deployRefused = deployed.events.find((e) => e.type === "commandRefused");
  if (deployRefused) {
    return { status: "skipped", stage: "prepareDungeonMonsters" };
  }
  const battle = applyCommand(deployed.state, { type: "startDungeonBattle" });
  const battleRefused = battle.events.find((e) => e.type === "commandRefused");
  if (!battleRefused) return { status: "admitted" };
  const message = battleRefused.message;
  if (isSkillAdmissionRefusal(message)) return { status: "skillRefused", message };
  return { status: "skipped", stage: "prepareDungeonMonsters" };
}

const totals = { admitted: 0, skipped: 0 };

for (const questId of CAMPAIGN_L1_QUESTS) {
  it(
    `${questId} 守卫战入口：120 种子 × 四房型不因未接怪物技能拒绝（B02）`,
    { timeout: 180_000 },
    () => {
      const skillRefusals: {
        questId: BasicQuestId;
        seed: number;
        kind: GuardedKind;
        message: string;
      }[] = [];
      let admitted = 0;
      let skipped = 0;

      for (let seed = 1; seed <= SEEDS_PER_QUEST; seed++) {
        // 同种子起点不可变：四种房型共享起点，仍执行全部 2400 次真实准入命令。
        const initial = createCoreDungeonQuest(
          seed,
          questId,
          "radiant",
          naturalParty,
          coreQuestSources,
        );
        for (const kind of [...GUARDED_KINDS, "curio"] as const) {
          const attempt = attemptStartDungeonBattle(guardedBattleFixture(initial, kind));
          if (attempt.status === "admitted") admitted++;
          else if (attempt.status === "skipped") skipped++;
          else skillRefusals.push({ questId, seed, kind, message: attempt.message });
        }
      }
      const totalAttempts = (GUARDED_KINDS.length + 1) * SEEDS_PER_QUEST;
      expect(skillRefusals, JSON.stringify(skillRefusals.slice(0, 8), null, 2)).toEqual([]);
      expect(admitted + skipped).toBe(totalAttempts);
      totals.admitted += admitted;
      totals.skipped += skipped;
    },
  );
}

afterAll(() => {
  expect(totals.admitted + totals.skipped).toBe(
    CAMPAIGN_L1_QUESTS.length * (GUARDED_KINDS.length + 1) * SEEDS_PER_QUEST,
  );
  expect(totals.admitted).toBeGreaterThan(500);
});
