import { expect, it } from "vitest";
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

function guardedBattleFixture(
  questId: BasicQuestId,
  seed: number,
  kind: GuardedKind,
  position = "D",
): GameState {
  let state = createCoreDungeonQuest(seed, questId, "radiant", naturalParty, coreQuestSources);
  const d = state.dungeon!;
  state = {
    ...state,
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
  return state;
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

it(
  "I 级五任务守卫战入口：随机部署后 startDungeonBattle 不因未接怪物技能硬拒（B02）",
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

    for (const questId of CAMPAIGN_L1_QUESTS) {
      for (const kind of [...GUARDED_KINDS, "curio"] as const) {
        for (let seed = 1; seed <= SEEDS_PER_QUEST; seed++) {
          const attempt = attemptStartDungeonBattle(guardedBattleFixture(questId, seed, kind));
          if (attempt.status === "admitted") admitted++;
          else if (attempt.status === "skipped") skipped++;
          else skillRefusals.push({ questId, seed, kind, message: attempt.message });
        }
      }
    }

    const totalAttempts = CAMPAIGN_L1_QUESTS.length * (GUARDED_KINDS.length + 1) * SEEDS_PER_QUEST;
    expect(skillRefusals, JSON.stringify(skillRefusals.slice(0, 8), null, 2)).toEqual([]);
    expect(admitted + skipped).toBe(totalAttempts);
    expect(admitted).toBeGreaterThan(500);
  },
);
