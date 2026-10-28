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
import {
  HAG_I_DESCRIPTION_ABILITY_CARD_ID,
  HAG_I_SCRIPT_ID,
} from "./hag-i";
import {
  SWINE_PRINCE_I_DESCRIPTION_ABILITY_CARD_ID,
  SWINE_PRINCE_I_SCRIPT_ID,
} from "./swine-prince-i";
import {
  FLESH_I_DESCRIPTION_ABILITY_CARD_ID,
  FLESH_I_SCRIPT_ID,
} from "./flesh-i";
import {
  SIREN_I_DESCRIPTION_ABILITY_CARD_ID,
  SIREN_I_SCRIPT_ID,
} from "./siren-i";
import {
  COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID,
  COLLECTOR_I_SCRIPT_ID,
} from "./collector-i";
import {
  FANATIC_I_DESCRIPTION_ABILITY_CARD_ID,
  FANATIC_I_SCRIPT_ID,
} from "./fanatic-i";
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

/** 核心盒 Weald 三 Boss（spec 扩展 §2.3；迫近威胁池接线仍 hold）。 */
export type WealdBossIdentity = "hag" | "brigandPounder" | "shrieker";

export const WEALD_BOSS_DESCRIPTION_CARD_ID: Record<
  WealdBossIdentity,
  Record<CampaignLevel, string | undefined>
> = {
  hag: {
    1: HAG_I_DESCRIPTION_ABILITY_CARD_ID,
    2: undefined,
    3: undefined,
  },
  brigandPounder: {
    1: undefined,
    2: undefined,
    3: undefined,
  },
  shrieker: {
    1: undefined,
    2: undefined,
    3: undefined,
  },
};

export const WEALD_BOSS_IDENTITIES: readonly WealdBossIdentity[] = [
  "hag",
  "brigandPounder",
  "shrieker",
];

/** Warrens 三 Boss（spec 扩展 §2.3；迫近威胁池接线仍 hold）。 */
export type WarrensBossIdentity = "swinePrince" | "flesh" | "brigandVvulf";

export const WARRENS_BOSS_DESCRIPTION_CARD_ID: Record<
  WarrensBossIdentity,
  Record<CampaignLevel, string | undefined>
> = {
  swinePrince: {
    1: SWINE_PRINCE_I_DESCRIPTION_ABILITY_CARD_ID,
    2: undefined,
    3: undefined,
  },
  flesh: {
    1: FLESH_I_DESCRIPTION_ABILITY_CARD_ID,
    2: undefined,
    3: undefined,
  },
  brigandVvulf: {
    1: undefined,
    2: undefined,
    3: undefined,
  },
};

export const WARRENS_BOSS_IDENTITIES: readonly WarrensBossIdentity[] = [
  "swinePrince",
  "flesh",
  "brigandVvulf",
];

/** Cove 三 Boss（spec 扩展 §2.3；迫近威胁池接线仍 hold）。 */
export type CoveBossIdentity = "siren" | "shambler" | "drownedCrew";

export const COVE_BOSS_DESCRIPTION_CARD_ID: Record<
  CoveBossIdentity,
  Record<CampaignLevel, string | undefined>
> = {
  siren: {
    1: SIREN_I_DESCRIPTION_ABILITY_CARD_ID,
    2: undefined,
    3: undefined,
  },
  shambler: {
    1: undefined,
    2: undefined,
    3: undefined,
  },
  drownedCrew: {
    1: undefined,
    2: undefined,
    3: undefined,
  },
};

export const COVE_BOSS_IDENTITIES: readonly CoveBossIdentity[] = [
  "siren",
  "shambler",
  "drownedCrew",
];

const coveDescriptionToIdentity = new Map<string, CoveBossIdentity>();
for (const identity of COVE_BOSS_IDENTITIES) {
  for (const level of [1, 2, 3] as const) {
    const cardId = COVE_BOSS_DESCRIPTION_CARD_ID[identity][level];
    if (cardId) coveDescriptionToIdentity.set(cardId, identity);
  }
}

export function coveBossIdentityForDescriptionCard(
  descriptionCardId: string,
): CoveBossIdentity | undefined {
  return coveDescriptionToIdentity.get(descriptionCardId);
}

const warrensDescriptionToIdentity = new Map<string, WarrensBossIdentity>();
for (const identity of WARRENS_BOSS_IDENTITIES) {
  for (const level of [1, 2, 3] as const) {
    const cardId = WARRENS_BOSS_DESCRIPTION_CARD_ID[identity][level];
    if (cardId) warrensDescriptionToIdentity.set(cardId, identity);
  }
}

export function warrensBossIdentityForDescriptionCard(
  descriptionCardId: string,
): WarrensBossIdentity | undefined {
  return warrensDescriptionToIdentity.get(descriptionCardId);
}

const wealdDescriptionToIdentity = new Map<string, WealdBossIdentity>();
for (const identity of WEALD_BOSS_IDENTITIES) {
  for (const level of [1, 2, 3] as const) {
    const cardId = WEALD_BOSS_DESCRIPTION_CARD_ID[identity][level];
    if (cardId) wealdDescriptionToIdentity.set(cardId, identity);
  }
}

export function wealdBossIdentityForDescriptionCard(
  descriptionCardId: string,
): WealdBossIdentity | undefined {
  return wealdDescriptionToIdentity.get(descriptionCardId);
}

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
  if (descriptionCardId === COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID) {
    return COLLECTOR_I_SCRIPT_ID;
  }
  if (descriptionCardId === FANATIC_I_DESCRIPTION_ABILITY_CARD_ID) {
    return FANATIC_I_SCRIPT_ID;
  }
  if (descriptionCardId === HAG_I_DESCRIPTION_ABILITY_CARD_ID) {
    return HAG_I_SCRIPT_ID;
  }
  if (descriptionCardId === SWINE_PRINCE_I_DESCRIPTION_ABILITY_CARD_ID) {
    return SWINE_PRINCE_I_SCRIPT_ID;
  }
  if (descriptionCardId === FLESH_I_DESCRIPTION_ABILITY_CARD_ID) {
    return FLESH_I_SCRIPT_ID;
  }
  if (descriptionCardId === SIREN_I_DESCRIPTION_ABILITY_CARD_ID) {
    return SIREN_I_SCRIPT_ID;
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
  const ruinsIdentity = ruinsBossIdentityForDescriptionCard(descriptionCardId);
  if (ruinsIdentity) {
    return `${ruinsIdentity} 迫近威胁脚本未注册（spec §2.3）；被动与 Face the Threat 仍 hold`;
  }
  const wealdIdentity = wealdBossIdentityForDescriptionCard(descriptionCardId);
  if (wealdIdentity) {
    return `${wealdIdentity} 迫近威胁脚本未注册（Weald / spec §2.3）；被动与 Face the Threat 仍 hold`;
  }
  const warrensIdentity = warrensBossIdentityForDescriptionCard(descriptionCardId);
  if (warrensIdentity) {
    return `${warrensIdentity} 迫近威胁脚本未注册（Warrens / spec §2.3）；被动与 Face the Threat 仍 hold`;
  }
  const coveIdentity = coveBossIdentityForDescriptionCard(descriptionCardId);
  if (coveIdentity) {
    return `${coveIdentity} 迫近威胁脚本未注册（Cove / spec §2.3）；被动与 Face the Threat 仍 hold`;
  }
  return `未知 Boss 描述卡 ${descriptionCardId}；脚本未注册`;
}
