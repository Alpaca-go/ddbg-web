/** 战役出征模式：与核心 R37／R-036 Stygian 出征共用。 */
export const CAMPAIGN_EXPEDITION_MODES = ["standard", "radiant", "stygian"] as const;
export type CampaignExpeditionMode = (typeof CAMPAIGN_EXPEDITION_MODES)[number];

export function isCampaignExpeditionMode(mode: string | undefined): mode is CampaignExpeditionMode {
  return mode !== undefined && (CAMPAIGN_EXPEDITION_MODES as readonly string[]).includes(mode);
}
