import type { ApplyResult, GameState } from "../command";
import { DARKEST_MAMMOTH_CYST_SCRIPT_ID } from "./darkest-mid-boss-scripts";
import { MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID } from "./darkest-mammoth-cyst-combat-runtime";
import { runDarkestMidBossSkillAcc } from "./darkest-mid-boss-skill-acc-core";
import { runDarkestMidBossSkillSelf } from "./darkest-mid-boss-skill-self-core";

/** slot 3 Revivify 为 Self、无 Acc 伤害行，走 Self 效果命令（非 Acc 路径）。 */
export const MAMMOTH_BULGING_GAZE_SKILL_SLOT = 1;
export const MAMMOTH_DIGESTION_SKILL_SLOT = 2;
export const MAMMOTH_REVIVIFY_SKILL_SLOT = 3;

const MAMMOTH_CTX = {
  scriptId: DARKEST_MAMMOTH_CYST_SCRIPT_ID,
  monsterCardId: MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID,
  bossLabel: "Mammoth Cyst",
  abilityRef: "boss_ability:p029",
} as const;

export function applyMammothCystBulgingGaze(state: GameState, actorId: string): ApplyResult {
  return runDarkestMidBossSkillAcc(
    state,
    actorId,
    MAMMOTH_BULGING_GAZE_SKILL_SLOT,
    "Bulging Gaze",
    MAMMOTH_CTX,
  );
}

export function applyMammothCystDigestion(state: GameState, actorId: string): ApplyResult {
  return runDarkestMidBossSkillAcc(
    state,
    actorId,
    MAMMOTH_DIGESTION_SKILL_SLOT,
    "Digestion",
    MAMMOTH_CTX,
  );
}

export function applyMammothCystRevivify(state: GameState, actorId: string): ApplyResult {
  return runDarkestMidBossSkillSelf(
    state,
    actorId,
    MAMMOTH_REVIVIFY_SKILL_SLOT,
    "Revivify",
    MAMMOTH_CTX,
  );
}

export type ApplyMammothCystBulgingGazeCommand = {
  readonly type: "applyMammothCystBulgingGaze";
  readonly actorId: string;
};
export type ApplyMammothCystDigestionCommand = {
  readonly type: "applyMammothCystDigestion";
  readonly actorId: string;
};
export type ApplyMammothCystRevivifyCommand = {
  readonly type: "applyMammothCystRevivify";
  readonly actorId: string;
};
