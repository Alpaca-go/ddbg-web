import { describe, expect, it } from "vitest";
import {
  WEALD_NATURAL_ACT_ONE_SEED_SCAN,
  assertWealdNaturalActOneSeedScanBounds,
  scanWealdNaturalActOneSeeds,
  summarizeWealdNaturalActOneSeedScan,
} from "./test-helpers/weald-face-the-threat-natural-seed-scan";

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
});
