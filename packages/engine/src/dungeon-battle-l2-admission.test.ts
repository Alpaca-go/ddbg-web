import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import type { BasicQuestId } from "../../data/src/basic-quests";
import { questsForCampaignLevel } from "../../data/src/basic-quests";
import {
  isSkillAdmissionRefusal,
  isLevelApprovalAdmissionRefusal,
} from "./dungeon-battle-admission";
import { createCampaignQuestSandbox } from "./test-helpers/campaign-quest-sandbox";
import { guildQuest } from "./test-helpers/guild-quest";
import { coreQuestSources, coreParty } from "./test-helpers/core-quest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import reduceDistribution from "../../data/normalized/corebox/reduce_to_rubble_distribution.json";
import { createDungeonSandbox } from "./dungeon";
import { createTrinketPool } from "./trinket-acquisition";
import trinkets from "../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";

const GUARDED_KINDS = ["treasure", "lair", "objective"] as const;
type GuardedKind = (typeof GUARDED_KINDS)[number] | "curio";

const SEEDS_PER_QUEST = 80;

function guardedBattleFixture(
  campaignLevel: 2 | 3,
  questId: BasicQuestId,
  seed: number,
  kind: GuardedKind,
  position = "D",
): GameState {
  let state = createCampaignQuestSandbox(campaignLevel, questId, seed, position);
  const d = state.dungeon!;
  state = {
    ...state,
    dungeon: {
      ...d,
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
  | { readonly status: "skillRefused"; readonly message: string }
  | { readonly status: "levelRefused"; readonly message: string }
  | { readonly status: "otherRefused"; readonly message: string };

function attemptStartDungeonBattle(state: GameState): AdmissionAttempt {
  const room = applyCommand(state, { type: "prepareDungeonBattle" });
  if (room.events.find((e) => e.type === "commandRefused"))
    return { status: "skipped", stage: "prepareDungeonBattle" };
  const deployed = applyCommand(room.state, { type: "prepareDungeonMonsters" });
  if (deployed.events.find((e) => e.type === "commandRefused"))
    return { status: "skipped", stage: "prepareDungeonMonsters" };
  const battle = applyCommand(deployed.state, { type: "startDungeonBattle" });
  const refused = battle.events.find((e) => e.type === "commandRefused");
  if (!refused) return { status: "admitted" };
  const message = refused.message;
  if (isLevelApprovalAdmissionRefusal(message)) return { status: "levelRefused", message };
  if (isSkillAdmissionRefusal(message)) return { status: "skillRefused", message };
  return { status: "otherRefused", message };
}

function scanCampaign(campaignLevel: 2 | 3) {
  const quests = questsForCampaignLevel(campaignLevel);
  const levelRefusals: {
    questId: BasicQuestId;
    seed: number;
    kind: GuardedKind;
    message: string;
  }[] = [];
  const skillRefusals: typeof levelRefusals = [];
  let admitted = 0;
  let skipped = 0;
  for (const quest of quests) {
    const questId = quest.id as BasicQuestId;
    for (const kind of [...GUARDED_KINDS, "curio"] as const) {
      for (let seed = 1; seed <= SEEDS_PER_QUEST; seed++) {
        let attempt: AdmissionAttempt;
        try {
          attempt = attemptStartDungeonBattle(
            guardedBattleFixture(campaignLevel, questId, seed, kind),
          );
        } catch {
          skipped++;
          continue;
        }
        if (attempt.status === "admitted") admitted++;
        else if (attempt.status === "skipped") skipped++;
        else if (attempt.status === "levelRefused")
          levelRefusals.push({ questId, seed, kind, message: attempt.message });
        else if (attempt.status === "skillRefused")
          skillRefusals.push({ questId, seed, kind, message: attempt.message });
      }
    }
  }
  return { quests, admitted, skipped, levelRefusals, skillRefusals };
}

it(
  "II 级五任务守卫战：已批高等级不因 level>1 无批准硬拒；未批仍保留部署语义",
  {
    timeout: 240_000,
  },
  () => {
    const { levelRefusals, admitted } = scanCampaign(2);
    expect(levelRefusals, JSON.stringify(levelRefusals.slice(0, 8), null, 2)).toEqual([]);
    expect(admitted).toBeGreaterThan(80);
  },
);

it("DL3 牌堆：未批 Bone Bearer 部署仍因完整战斗字段拒战并保留真实部署", () => {
  const heroes = coreParty.map((hero, index) => {
    const stat = coreQuestSources.catalog.heroStats.find((s) => s.id === hero.heroStatId)!;
    return {
      id: `hero-${index}`,
      heroStatId: hero.heroStatId,
      level: 1,
      life: stat.life,
      wounds: 0,
      stress: 0,
      attributesVerified: true as const,
      stance: hero.stance,
      skillIds: [...hero.skillIds],
    };
  });
  const catalog = {
    ...coreQuestSources.catalog,
    trinkets: createTrinketPool(normalizedTrinketFileSchema.parse(trinkets).cards, 3),
  };
  for (let seed = 1; seed <= 500; seed++) {
    const position = "D";
    let state = createDungeonSandbox(
      seed,
      layout,
      reduceDistribution,
      "radiant",
      position,
      heroes,
      coreQuestSources.resolveCards,
      { dungeonLevel: 3, light: 5, provisions: [] },
      coreQuestSources.curios,
      coreQuestSources.rooms,
      coreQuestSources.monsters,
      catalog,
    );
    state = {
      ...state,
      dungeon: {
        ...state.dungeon!,
        campaignLevel: 3,
        phase: "awaitingRoom",
        position,
        rooms: state.dungeon!.rooms.map((r) =>
          r.id === position ? { ...r, kind: "lair", cleared: false } : r,
        ),
      },
    };
    const room = applyCommand(state, { type: "prepareDungeonBattle" });
    if (room.events.find((e) => e.type === "commandRefused")) continue;
    const deployed = applyCommand(room.state, { type: "prepareDungeonMonsters" });
    if (deployed.events.find((e) => e.type === "commandRefused")) continue;
    if (
      !deployed.state.dungeon!.monsterPool!.active!.monsters.some(
        (m) => m.cardId === "monster_medium:p016",
      )
    )
      continue;
    const battle = applyCommand(deployed.state, { type: "startDungeonBattle" });
    expect(battle.state).toBe(deployed.state);
    expect(battle.events).toEqual([
      expect.objectContaining({
        type: "commandRefused",
        message: expect.stringMatching(/完整战斗字段.*保留真实部署/),
      }),
    ]);
    return;
  }
  expect.fail("未在 500 个 seed 内抽到 Bone Bearer 部署");
});

it("guild II 自然前缀：真实 lair 部署不因高等级批准硬拒", { timeout: 120_000 }, () => {
  const base = guildQuest(coreQuestSources, 6).game;
  const d = base.dungeon!;
  const lair = d.rooms.find((r) => r.kind === "lair")!.id;
  const state: GameState = {
    ...base,
    dungeon: {
      ...d,
      campaignLevel: 2,
      phase: "awaitingRoom",
      position: lair,
      explorationSetup: { ...d.explorationSetup!, dungeonLevel: 2 },
      rooms: d.rooms.map((r) => (r.id === lair ? { ...r, cleared: false } : r)),
    },
  };
  const attempt = attemptStartDungeonBattle(state);
  expect(attempt.status).not.toBe("levelRefused");
});

it("Reduce to Rubble II seed18：混合部署可 admitted 或仅 skillRefused", () => {
  const state = guardedBattleFixture(2, "quest:p008", 18, "lair", "A");
  const deployed = applyCommand(applyCommand(state, { type: "prepareDungeonBattle" }).state, {
    type: "prepareDungeonMonsters",
  }).state;
  expect(deployed.dungeon!.monsterPool!.active!.monsters.length).toBeGreaterThan(0);
  const attempt = attemptStartDungeonBattle(state);
  expect(attempt.status).not.toBe("levelRefused");
});
