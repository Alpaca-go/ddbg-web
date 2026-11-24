import { getBossScript } from "../../boss/registry";
import type { CampaignLevel } from "../../../../data/src/basic-quests";
import { WEALD_BOSS_DESCRIPTION_CARD_ID, type WealdBossIdentity } from "../catalog";
import { WEALD_HIGHER_BOSS_ENTRIES } from "./higher-boss-entries";

export type WealdBossActCombatEntry = {
  readonly script: `boss:weald:${string}:${CampaignLevel}`;
  readonly description: string;
  readonly card: string;
  readonly ability: string;
};

function wealdBossScriptId(
  identity: WealdBossIdentity,
  level: CampaignLevel,
): WealdBossActCombatEntry["script"] {
  return `boss:weald:${identity}:${level}` as WealdBossActCombatEntry["script"];
}

/** 升幕读回：按战役等级对齐最近一次击败的 Weald Boss 与出征／威胁面（含 I 与 II／III 条目）。 */
export function wealdBossActEntry(
  identity: WealdBossIdentity,
  level: CampaignLevel,
): WealdBossActCombatEntry | undefined {
  if (level >= 2) {
    const script = wealdBossScriptId(identity, level);
    const row = WEALD_HIGHER_BOSS_ENTRIES.find((entry) => entry.scriptId === script);
    if (!row) return undefined;
    return {
      script,
      description: row.descriptionAbilityCardId,
      card: row.combatMonsterCardId,
      ability: row.combatAbilityCardId,
    };
  }
  const script = wealdBossScriptId(identity, 1);
  const combat = getBossScript(script)?.combatEntry;
  const description = WEALD_BOSS_DESCRIPTION_CARD_ID[identity][1];
  if (!combat || !description) return undefined;
  return {
    script,
    description,
    card: combat.combatMonsterCardId,
    ability: combat.combatAbilityCardId,
  };
}
