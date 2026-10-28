import type { CampaignLevel } from "../../../data/src/basic-quests";
import { ensureCoreBossScriptsRegistered } from "./necromancer-i";
import {
  NECROMANCER_I_DESCRIPTION_ABILITY_CARD_ID,
  NECROMANCER_I_SCRIPT_ID,
} from "./necromancer-i";
import {
  PROPHET_I_DESCRIPTION_ABILITY_CARD_ID,
  PROPHET_I_SCRIPT_ID,
} from "./prophet-i";
import { getBossScript, listBossScripts } from "./registry";
import type { BossScriptId } from "./types";

/** 核心盒 Ruins 四 Boss（spec §2.3 R11 / §2.4）。 */
export type RuinsBossIdentity = "necromancer" | "prophet" | "collector" | "fanatic";

/** Boss Description 印刷 id（extract `boss_ability.json` 核实）。 */
export const RUINS_BOSS_DESCRIPTION_CARD_ID: Record<
  RuinsBossIdentity,
  Record<CampaignLevel, string>
> = {
  necromancer: {
    1: "boss_ability:p001",
    2: "boss_ability:p002",
    3: "boss_ability:p003",
  },
  prophet: {
    1: "boss_ability:p007",
    2: "boss_ability:p008",
    3: "boss_ability:p009",
  },
  collector: {
    1: "boss_ability:p013",
    2: "boss_ability:p014",
    3: "boss_ability:p015",
  },
  fanatic: {
    1: "boss_ability:p019",
    2: "boss_ability:p020",
    3: "boss_ability:p021",
  },
};

export const RUINS_BOSS_IDENTITIES: readonly RuinsBossIdentity[] = [
  "necromancer",
  "prophet",
  "collector",
  "fanatic",
];

const descriptionToIdentity = new Map<string, RuinsBossIdentity>();
for (const identity of RUINS_BOSS_IDENTITIES) {
  for (const level of [1, 2, 3] as const) {
    descriptionToIdentity.set(RUINS_BOSS_DESCRIPTION_CARD_ID[identity][level], identity);
  }
}

export function ruinsBossIdentityForDescriptionCard(
  descriptionCardId: string,
): RuinsBossIdentity | undefined {
  return descriptionToIdentity.get(descriptionCardId);
}

/** 已注册脚本中，由 Description 卡反查 Boss 身份（随脚本落地扩展）。 */
export function ruinsBossIdentityForScriptId(
  scriptId: BossScriptId,
): RuinsBossIdentity | undefined {
  ensureCoreBossScriptsRegistered();
  const script = getBossScript(scriptId);
  const cardId = script?.combatEntry?.descriptionAbilityCardId;
  return cardId ? ruinsBossIdentityForDescriptionCard(cardId) : undefined;
}

/** 静态映射 + 已注册脚本 `combatEntry.descriptionAbilityCardId`。 */
export function resolveScriptIdForDescriptionCard(
  descriptionCardId: string,
): BossScriptId | undefined {
  if (descriptionCardId === NECROMANCER_I_DESCRIPTION_ABILITY_CARD_ID) {
    return NECROMANCER_I_SCRIPT_ID;
  }
  if (descriptionCardId === PROPHET_I_DESCRIPTION_ABILITY_CARD_ID) {
    return PROPHET_I_SCRIPT_ID;
  }
  ensureCoreBossScriptsRegistered();
  for (const script of listBossScripts()) {
    if (script.combatEntry?.descriptionAbilityCardId === descriptionCardId) return script.id;
  }
  return undefined;
}

export function imminentThreatPoolForCampaign(
  campaignLevel: CampaignLevel,
  defeated: readonly RuinsBossIdentity[],
): readonly string[] {
  const remaining = RUINS_BOSS_IDENTITIES.filter((id) => !defeated.includes(id));
  return remaining.map((identity) => RUINS_BOSS_DESCRIPTION_CARD_ID[identity][campaignLevel]);
}

export function unregisteredImminentThreatHold(descriptionCardId: string): string {
  const identity = ruinsBossIdentityForDescriptionCard(descriptionCardId);
  return identity
    ? `${identity} 迫近威胁脚本未注册（spec §2.3）；被动与 Face the Threat 仍 hold`
    : `未知 Boss 描述卡 ${descriptionCardId}；脚本未注册`;
}
