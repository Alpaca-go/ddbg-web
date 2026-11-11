import type { ContentPackId } from "../../../data/src/content-packs";
import { packEnabled } from "../../../data/src/content-packs";
import { ensureCoreBossScriptsRegistered } from "../boss/ensure-core-boss-scripts";
import { registerWealdBosses } from "./weald";
import { registerWarrensBosses } from "./warrens";
import { registerCoveBosses } from "./cove";

/** 注册表是代码缓存，不能充当战役权限；每个状态仍须检查 contentPacks。 */
export function ensureCampaignBossScriptsRegistered(packs?: readonly ContentPackId[]) {
  ensureCoreBossScriptsRegistered();
  if (packEnabled(packs, "weald")) registerWealdBosses();
  if (packEnabled(packs, "warrens")) registerWarrensBosses();
  if (packEnabled(packs, "cove")) registerCoveBosses();
}
