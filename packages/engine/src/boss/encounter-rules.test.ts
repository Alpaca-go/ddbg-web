import { readFileSync } from "node:fs";
import { describe, expect, it, beforeEach } from "vitest";
import { createBattleState, type BattleEntity } from "../battle";
import { type GameState } from "../command";
import { applyEncounterCommand } from "../encounter";
import type { SkillStance, HeroSkillCardView } from "../hero-skill";
import type { EncounterCommand } from "../encounter";
import {
  bossQuestScriptId,
  clearBossScriptsForTest,
  encounterForcesRetreatAfterRound,
  ensureCoreBossScriptsRegistered,
  FACE_THE_THREAT_QUEST_ID,
  FIXTURE_BOSS_COMBAT_MONSTER_CARD_ID,
  FIXTURE_BOSS_SCRIPT_ID,
  fixtureBossSkeletonScript,
  isBossEncounter,
  NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
  registerBossScript,
  resolveEncounterBossBattleRules,
} from "./index";

const skill = (
  JSON.parse(
    readFileSync(
      new URL("../../../data/normalized/corebox/hero_skill.json", import.meta.url),
      "utf8",
    ),
  ) as { cards: HeroSkillCardView[] }
).cards.find((card) => card.id === "hero_skill:p001")!;

const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

function sandboxBattle(
  seed: number,
  monsters: Partial<BattleEntity>[],
  dungeon?: GameState["dungeon"],
): GameState {
  const heroes: BattleEntity[] = stances.map((stance, index) => ({
    id: `h${index}`,
    side: "hero",
    areaId: "a",
    stance,
    hero: "CRUSADER",
    skillIds: [skill.id],
    wounds: 0,
    stress: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  const enemies: BattleEntity[] = monsters.map((overrides, index) => ({
    id: `m${index}`,
    side: "monster",
    areaId: "a",
    stance: stances[index]!,
    stanceSlots: 1,
    hero: null,
    skillIds: [],
    wounds: 0,
    life: 100,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    ...overrides,
  }));
  return {
    ...createBattleState(seed, {
      entities: [
        ...heroes,
        ...enemies.map((entity) => ({
          ...entity,
          monsterCardId: entity.monsterCardId ?? entity.id,
        })),
      ],
      monsters: enemies.map((entity) => ({
        id: entity.monsterCardId ?? entity.id,
        life: entity.life!,
        verification: { unverified: false },
        type_position_tags: ["Beast"],
        resistances: [],
        immunities: [],
        skills: [],
      })),
      areas: [{ id: "a", elevation: "normal", adjacent: [] }],
      light: 5,
      skills: [skill],
    }),
    ...(dungeon ? { dungeon } : {}),
  };
}

function bossQuestDungeon(campaignLevel: 1 | 2 | 3 = 1): GameState["dungeon"] {
  return {
    questDistribution: { questId: FACE_THE_THREAT_QUEST_ID, counts: [] },
    campaignLevel,
  } as unknown as GameState["dungeon"];
}

function swap(state: GameState): EncounterCommand {
  const turn = state.battle!.encounter!.turn;
  if (turn.type !== "hero") throw new Error("不是英雄回合");
  const stance = state.battle!.entities.find((entity) => entity.id === turn.actorId)!.stance;
  return {
    type: "changeStance",
    actorId: turn.actorId,
    direction: stance === "aggressive" ? "backward" : "forward",
  };
}

function playThroughRoundFour(initial: GameState): GameState {
  let state = applyEncounterCommand(initial, { type: "startBattle" }).state;
  for (let index = 0; index < 200; index += 1) {
    const encounter = state.battle!.encounter!;
    if (encounter.turn.type === "finished") break;
    const command: EncounterCommand =
      encounter.turn.type === "awaitingInitiative"
        ? { type: "drawInitiative" }
        : encounter.turn.type === "monster"
          ? { type: "finishMonsterTurn", actorId: encounter.turn.actorId }
          : swap(state);
    state = applyEncounterCommand(state, command).state;
  }
  return state;
}

describe("encounter 轮数撤退与 Boss 规则", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    registerBossScript(fixtureBossSkeletonScript);
    for (const key of Object.keys(bossQuestScriptId))
      delete bossQuestScriptId[key as keyof typeof bossQuestScriptId];
  });

  it("普通遭遇：第 4 轮结束被迫撤退", () => {
    const finished = playThroughRoundFour(sandboxBattle(0, [{}]));
    expect(finished.battle!.encounter!.round).toBe(4);
    expect(finished.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "retreat" });
    expect(encounterForcesRetreatAfterRound(finished, 4)).toBe(true);
    expect(isBossEncounter(finished)).toBe(false);
  });

  it("Boss 遭遇：映射脚本且部署 Boss 战斗卡时不触发第 4 轮撤退", () => {
    bossQuestScriptId[FACE_THE_THREAT_QUEST_ID] = FIXTURE_BOSS_SCRIPT_ID;
    const initial = sandboxBattle(
      0,
      [{ monsterCardId: FIXTURE_BOSS_COMBAT_MONSTER_CARD_ID }],
      bossQuestDungeon(),
    );
    expect(resolveEncounterBossBattleRules(initial)?.countsRounds).toBe(false);
    const finished = playThroughRoundFour(initial);
    expect(finished.battle!.encounter!.round).toBeGreaterThan(4);
    expect(finished.battle!.encounter!.turn.type).not.toBe("finished");
    expect(isBossEncounter(finished)).toBe(true);
  });

  it("生产路径：Face the Threat I 级 + Necromancer 战斗卡注册脚本时不触发第 4 轮撤退", () => {
    ensureCoreBossScriptsRegistered();
    const initial = sandboxBattle(
      0,
      [{ monsterCardId: NECROMANCER_I_COMBAT_MONSTER_CARD_ID }],
      bossQuestDungeon(1),
    );
    expect(resolveEncounterBossBattleRules(initial)?.countsRounds).toBe(false);
    const finished = playThroughRoundFour(initial);
    expect(finished.battle!.encounter!.round).toBeGreaterThan(4);
    expect(isBossEncounter(finished)).toBe(true);
  });

  it("Boss 任务但未映射脚本：仍按普通第 4 轮撤退", () => {
    const finished = playThroughRoundFour(
      sandboxBattle(
        0,
        [{ monsterCardId: FIXTURE_BOSS_COMBAT_MONSTER_CARD_ID }],
        bossQuestDungeon(2),
      ),
    );
    expect(finished.battle!.encounter!.round).toBe(4);
    expect(finished.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "retreat" });
  });
});
