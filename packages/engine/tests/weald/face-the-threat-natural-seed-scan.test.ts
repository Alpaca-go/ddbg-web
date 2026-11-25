import { describe, expect, it } from "vitest";
import {
  WEALD_NATURAL_ACT_ONE_CAMPAIGN_SURVIVAL_DRIVE,
  WEALD_NATURAL_ACT_ONE_SEED_SCAN,
  assertWealdNaturalActOneSeedScanBounds,
  scanWealdNaturalActOneSeeds,
  summarizeWealdNaturalActOneSeedScan,
} from "../helpers/weald-face-the-threat-natural-seed-scan";

describe("Weald I 幕自然前缀种子扫描（生产路径，有界）", () => {
  const baselineOptions = { skillFallback: true, handleDeaths: true } as const;

  it("0–127：第十三刀默认驱动停点聚合（不宣称 Hag 自然全胜）", () => {
    const rows = scanWealdNaturalActOneSeeds(
      { start: WEALD_NATURAL_ACT_ONE_SEED_SCAN.start, end: WEALD_NATURAL_ACT_ONE_SEED_SCAN.end },
      baselineOptions,
    );
    assertWealdNaturalActOneSeedScanBounds(rows);
    const reached = rows.filter((row) => row.reachedFaceTheThreat).length;
    expect(reached).toBeGreaterThan(0);
    expect(summarizeWealdNaturalActOneSeedScan(rows)).toMatchSnapshot();
  }, 900_000);

  it("0–127：扩展驱动（survival+hamletHealFirst+生产房间版本）仍无自然可读回升幕种子", () => {
    const rows = scanWealdNaturalActOneSeeds(
      { start: WEALD_NATURAL_ACT_ONE_SEED_SCAN.start, end: WEALD_NATURAL_ACT_ONE_SEED_SCAN.end },
      {
        ...baselineOptions,
        survival: true,
        restThreshold: 6,
        hamletHealFirst: true,
        wealdProductionRooms: true,
      },
    );
    assertWealdNaturalActOneSeedScanBounds(rows);
    expect(summarizeWealdNaturalActOneSeedScan(rows)).toMatchSnapshot();
  }, 900_000);

  it("0–127：战役保全驱动（驿站复活优先 + survival + 村庄有序目标技能）仍无自然可读回升幕种子", () => {
    const rows = scanWealdNaturalActOneSeeds(
      { start: WEALD_NATURAL_ACT_ONE_SEED_SCAN.start, end: WEALD_NATURAL_ACT_ONE_SEED_SCAN.end },
      WEALD_NATURAL_ACT_ONE_CAMPAIGN_SURVIVAL_DRIVE,
    );
    assertWealdNaturalActOneSeedScanBounds(rows);
    expect(summarizeWealdNaturalActOneSeedScan(rows)).toMatchSnapshot();
  }, 900_000);

  it("512–639：战役保全驱动扩展种子带（未覆盖假设）仍无自然全胜", () => {
    const rows = scanWealdNaturalActOneSeeds(
      {
        start: WEALD_NATURAL_ACT_ONE_SEED_SCAN.extendedBandStart,
        end: WEALD_NATURAL_ACT_ONE_SEED_SCAN.extendedBandEnd,
      },
      WEALD_NATURAL_ACT_ONE_CAMPAIGN_SURVIVAL_DRIVE,
    );
    assertWealdNaturalActOneSeedScanBounds(rows);
    expect(summarizeWealdNaturalActOneSeedScan(rows)).toMatchSnapshot();
  }, 1_200_000);
});
