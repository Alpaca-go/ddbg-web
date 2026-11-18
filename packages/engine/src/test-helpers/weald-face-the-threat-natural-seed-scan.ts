import { naturalParty } from "./natural-quest";
import {
  wealdFaceTheThreatNaturalActOneAdvanceReady,
  wealdFaceTheThreatNaturalActOnePrefix,
  type WealdNaturalActOneDriveOptions,
} from "./weald-face-the-threat-natural-prefix";

/** 第十六刀战役保全驱动：等候代币优先驿站复活 + 保守战斗 + 村庄治疗/有序目标技能。 */
export const WEALD_NATURAL_ACT_ONE_CAMPAIGN_SURVIVAL_DRIVE: WealdNaturalActOneDriveOptions = {
  skillFallback: true,
  handleDeaths: true,
  preferStagecoachRevival: true,
  survival: true,
  restThreshold: 4,
  hamletHealFirst: true,
  hamletOrderedSkillTargets: true,
  wealdProductionRooms: true,
};

/**
 * 明亮连续战役驱动：上面保守驱动 + 正式新战役 + 明亮侦察 + 战斗补给。
 * 0–127 内三 Boss 自然全胜可读回种子：Pounder 7、Hag 13、Shrieker 56／60／83／91／97。
 */
export const WEALD_NATURAL_ACT_ONE_RADIANT_CAMPAIGN_DRIVE: WealdNaturalActOneDriveOptions = {
  ...WEALD_NATURAL_ACT_ONE_CAMPAIGN_SURVIVAL_DRIVE,
  party: naturalParty,
  currentCampaign: true,
  radiant: true,
  combatProvisions: true,
};

/**
 * 有界种子扫描元数据（第十四刀）。
 * 算法：`wealdFaceTheThreatNaturalActOnePrefix` 逐 seed 调用；停点取 prefix.stop、campaignFailure 或抛错信息；
 * 「抵达 Face the Threat」= 已完成本幕 2 个普通任务或当前 questId 为 quest:p019。
 */
export const WEALD_NATURAL_ACT_ONE_SEED_SCAN = {
  start: 0,
  end: 127,
  /** 扩展扫描上限（不入默认 vitest 快照，仅供本地调查）。 */
  extendedEnd: 511,
  /** 第十六刀：未扫过的种子带下界（假设不同 RNG 分支可能连通 Hag 全胜）。 */
  extendedBandStart: 512,
  extendedBandEnd: 639,
  algorithm:
    "生产 establishImminentThreat → 至多 3 趟出征（2 普通 + p019）→ 公开回村；无输赢筛选、不换种子",
} as const;

export type WealdNaturalActOneSeedScanRow = {
  readonly seed: number;
  readonly hagVictory: boolean;
  readonly actAdvanceReady: boolean;
  readonly stop: string | null;
  readonly reachedFaceTheThreat: boolean;
  readonly error?: string;
};

export function scanWealdNaturalActOneSeed(
  seed: number,
  options: WealdNaturalActOneDriveOptions = {},
): WealdNaturalActOneSeedScanRow {
  try {
    const prefix = wealdFaceTheThreatNaturalActOnePrefix(seed, options);
    const d = prefix.game.dungeon!;
    const completed = d.completedRegularQuests?.length ?? 0;
    const reachedFaceTheThreat = d.questDistribution?.questId === "quest:p019" || completed >= 2;
    const stop = prefix.stop ?? (d.campaignFailure ? String(d.campaignFailure) : null);
    return {
      seed,
      hagVictory: prefix.hagVictory,
      actAdvanceReady: wealdFaceTheThreatNaturalActOneAdvanceReady(prefix.game),
      stop,
      reachedFaceTheThreat,
    };
  } catch (error) {
    return {
      seed,
      hagVictory: false,
      actAdvanceReady: false,
      stop: null,
      reachedFaceTheThreat: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function scanWealdNaturalActOneSeeds(
  range: { readonly start: number; readonly end: number },
  options: WealdNaturalActOneDriveOptions = {},
): readonly WealdNaturalActOneSeedScanRow[] {
  const rows: WealdNaturalActOneSeedScanRow[] = [];
  for (let seed = range.start; seed <= range.end; seed++) {
    rows.push(scanWealdNaturalActOneSeed(seed, options));
  }
  return rows;
}

/** 按停点聚合，便于快照与文档记录。 */
export function summarizeWealdNaturalActOneSeedScan(
  rows: readonly WealdNaturalActOneSeedScanRow[],
): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const row of rows) {
    const key = row.hagVictory
      ? row.actAdvanceReady
        ? "hagVictory:actAdvanceReady"
        : "hagVictory:notAdvanceReady"
      : row.error
        ? `error:${row.error}`
        : (row.stop ?? "noStop");
    summary[key] = (summary[key] ?? 0) + 1;
  }
  return summary;
}

export function assertWealdNaturalActOneSeedScanBounds(
  rows: readonly WealdNaturalActOneSeedScanRow[],
): void {
  const wins = rows.filter((row) => row.hagVictory && row.actAdvanceReady);
  if (wins.length > 0) {
    const seeds = wins.map((row) => row.seed).join(",");
    throw new Error(
      `扫描发现 ${wins.length} 个自然全胜可读回种子（${seeds}）；须改固定回归种子并去掉夹具接续`,
    );
  }
}
