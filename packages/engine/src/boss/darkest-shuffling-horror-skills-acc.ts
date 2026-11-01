import type { ApplyResult, GameState } from "../command";
import { DARKEST_SHUFFLING_HORROR_SCRIPT_ID } from "./darkest-mid-boss-scripts";
import { SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID } from "./darkest-shuffling-horror-combat-runtime";
import { runDarkestMidBossSkillAcc } from "./darkest-mid-boss-skill-acc-core";

export const SHUFFLING_HORROR_LACERATE_SKILL_SLOT = 1;

const SHUFFLING_HORROR_CTX = {
  scriptId: DARKEST_SHUFFLING_HORROR_SCRIPT_ID,
  monsterCardId: SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID,
  bossLabel: "Shuffling Horror",
  abilityRef: "boss_ability:p033",
} as const;

export function applyShufflingHorrorLacerate(state: GameState, actorId: string): ApplyResult {
  return runDarkestMidBossSkillAcc(
    state,
    actorId,
    SHUFFLING_HORROR_LACERATE_SKILL_SLOT,
    "Lacerate",
    SHUFFLING_HORROR_CTX,
  );
}

export type ApplyShufflingHorrorLacerateCommand = {
  readonly type: "applyShufflingHorrorLacerate";
  readonly actorId: string;
};
