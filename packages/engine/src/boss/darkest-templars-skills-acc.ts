import type { ApplyResult, GameState } from "../command";
import { DARKEST_TEMPLARS_SCRIPT_ID } from "./darkest-mid-boss-scripts";
import { runDarkestMidBossSkillAcc } from "./darkest-mid-boss-skill-acc-core";

export const TEMPLAR_IMPALER_MONSTER_CARD_ID = "monster_large:p015" as const;
export const TEMPLAR_WARLORD_MONSTER_CARD_ID = "monster_large:p014" as const;

export const TEMPLAR_TORMENT_SKILL_SLOT = 1;
export const TEMPLAR_BODY_SLAM_SKILL_SLOT = 2;
export const TEMPLAR_STINGER_SHOT_SKILL_SLOT = 2;
export const TEMPLAR_REVELATION_SKILL_SLOT = 3;

const IMPALER_CTX = {
  scriptId: DARKEST_TEMPLARS_SCRIPT_ID,
  monsterCardId: TEMPLAR_IMPALER_MONSTER_CARD_ID,
  bossLabel: "Templar Impaler",
  abilityRef: "boss_ability:p028",
} as const;

const WARLORD_CTX = {
  scriptId: DARKEST_TEMPLARS_SCRIPT_ID,
  monsterCardId: TEMPLAR_WARLORD_MONSTER_CARD_ID,
  bossLabel: "Templar Warlord",
  abilityRef: "boss_ability:p026",
} as const;

export function applyTemplarImpalerTorment(state: GameState, actorId: string): ApplyResult {
  return runDarkestMidBossSkillAcc(
    state,
    actorId,
    TEMPLAR_TORMENT_SKILL_SLOT,
    "Torment",
    IMPALER_CTX,
  );
}

export function applyTemplarImpalerBodySlam(state: GameState, actorId: string): ApplyResult {
  return runDarkestMidBossSkillAcc(
    state,
    actorId,
    TEMPLAR_BODY_SLAM_SKILL_SLOT,
    "Body Slam",
    IMPALER_CTX,
  );
}

export function applyTemplarImpalerRevelation(state: GameState, actorId: string): ApplyResult {
  return runDarkestMidBossSkillAcc(
    state,
    actorId,
    TEMPLAR_REVELATION_SKILL_SLOT,
    "Revelation",
    IMPALER_CTX,
  );
}

export function applyTemplarWarlordTorment(state: GameState, actorId: string): ApplyResult {
  return runDarkestMidBossSkillAcc(
    state,
    actorId,
    TEMPLAR_TORMENT_SKILL_SLOT,
    "Torment",
    WARLORD_CTX,
  );
}

export function applyTemplarWarlordStingerShot(state: GameState, actorId: string): ApplyResult {
  return runDarkestMidBossSkillAcc(
    state,
    actorId,
    TEMPLAR_STINGER_SHOT_SKILL_SLOT,
    "Stinger Shot",
    WARLORD_CTX,
  );
}

export function applyTemplarWarlordRevelation(state: GameState, actorId: string): ApplyResult {
  return runDarkestMidBossSkillAcc(
    state,
    actorId,
    TEMPLAR_REVELATION_SKILL_SLOT,
    "Revelation",
    WARLORD_CTX,
  );
}

export type ApplyTemplarImpalerTormentCommand = {
  readonly type: "applyTemplarImpalerTorment";
  readonly actorId: string;
};
export type ApplyTemplarImpalerBodySlamCommand = {
  readonly type: "applyTemplarImpalerBodySlam";
  readonly actorId: string;
};
export type ApplyTemplarImpalerRevelationCommand = {
  readonly type: "applyTemplarImpalerRevelation";
  readonly actorId: string;
};
export type ApplyTemplarWarlordTormentCommand = {
  readonly type: "applyTemplarWarlordTorment";
  readonly actorId: string;
};
export type ApplyTemplarWarlordStingerShotCommand = {
  readonly type: "applyTemplarWarlordStingerShot";
  readonly actorId: string;
};
export type ApplyTemplarWarlordRevelationCommand = {
  readonly type: "applyTemplarWarlordRevelation";
  readonly actorId: string;
};
