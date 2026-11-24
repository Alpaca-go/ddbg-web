import type { CampaignLevel } from "../../data/src/basic-quests";
import { RUINS_COMBAT_LEVELS } from "./core/bosses/ruins-combat-levels";
import type { RuinsBossIdentity } from "./core/bosses/threat-description-catalog";
import { RUINS_BOSS_IDENTITIES } from "./core/bosses/threat-description-catalog";
import type { DungeonState } from "./dungeon";
import { wealdBossActEntry } from "./weald/bosses/weald-boss-act-entry";
import { WEALD_BOSS_IDENTITIES, type WealdBossIdentity } from "./weald/catalog";
export type BossActCombatEntry = {
  readonly script: string;
  readonly description: string;
  readonly card: string;
  readonly ability: string;
};

export function readCampaignBossDefeatCounts(d: DungeonState) {
  const ruins = d.defeatedRuinsBossIdentities ?? [];
  const weald = d.defeatedWealdBossIdentities ?? [];
  return { ruins, weald, total: ruins.length + weald.length };
}

function validateDefeatRecords(
  ruins: readonly RuinsBossIdentity[],
  weald: readonly WealdBossIdentity[],
) {
  if (
    new Set(ruins).size !== ruins.length ||
    ruins.some((id) => !RUINS_BOSS_IDENTITIES.includes(id))
  )
    throw new Error("遗迹 Boss 击败记录无效");
  if (
    new Set(weald).size !== weald.length ||
    weald.some((id) => !WEALD_BOSS_IDENTITIES.includes(id))
  )
    throw new Error("Weald Boss 击败记录无效");
}

/** Weald 生产路径 III 幕 Boss 后：遗迹与 Weald 击败记录合计为三；纯遗迹路径仍只看遗迹记录。 */
export function campaignActIIIBossesComplete(d: DungeonState): boolean {
  const { ruins, weald } = readCampaignBossDefeatCounts(d);
  try {
    validateDefeatRecords(ruins, weald);
  } catch {
    return false;
  }
  if (
    d.locationBossThreats === true &&
    d.wealdHigherBosses === true &&
    d.bossLocationSources === true
  )
    return ruins.length + weald.length === 3;
  return ruins.length === 3;
}

export function allDefeatedBossIdentityKeys(
  ruins: readonly RuinsBossIdentity[],
  weald: readonly WealdBossIdentity[],
): ReadonlySet<string> {
  return new Set<string>([...ruins, ...weald]);
}

export function bossActEntryFromCeasedScript(
  script: string,
  level: CampaignLevel,
): BossActCombatEntry | undefined {
  const wealdMatch = /^boss:weald:(hag|brigandPounder|shrieker):(\d)$/.exec(script);
  if (wealdMatch) {
    const identity = wealdMatch[1] as WealdBossIdentity;
    const scriptLevel = Number(wealdMatch[2]);
    if (scriptLevel !== level) return undefined;
    return wealdBossActEntry(identity, level);
  }
  const ruinsMatch = /^boss:ruins:(\w+):(\d)$/.exec(script);
  if (!ruinsMatch) return undefined;
  const identity = ruinsMatch[1] as RuinsBossIdentity;
  const scriptLevel = Number(ruinsMatch[2]);
  if (!Object.hasOwn(RUINS_COMBAT_LEVELS, identity) || scriptLevel !== level) return undefined;
  const row = RUINS_COMBAT_LEVELS[identity][level - 1]!;
  return {
    script: row.script,
    description: row.description,
    card: row.card,
    ability: row.ability,
  };
}
