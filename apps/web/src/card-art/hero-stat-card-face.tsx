import { TabletopRasterImage } from "../tabletop/tabletop-raster-image";

/**
 * 英雄统计卡印刷稿：尚无 hero_stat 素材 map 时统一降级占位（P3 / V-14）。
 */
export function HeroStatCardFace({
  heroStatId,
  label,
  className = "",
  testId,
}: {
  readonly heroStatId?: string;
  readonly label: string;
  readonly className?: string;
  readonly testId?: string;
}) {
  void heroStatId;
  return (
    <TabletopRasterImage
      assetType="hero_stat"
      label={label}
      className={className}
      {...(testId ? { testId } : {})}
    />
  );
}
