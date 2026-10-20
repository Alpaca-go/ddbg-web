import { useState } from "react";
import { AssetPlaceholder } from "./asset-placeholder";

/** 印刷稿 raster：加载失败时同尺寸降级为带标签占位（避免浏览器裂图）。 */
export function TabletopRasterImage({
  src,
  label,
  assetType,
  className = "",
  testId,
}: {
  readonly src?: string;
  readonly label: string;
  readonly assetType: string;
  readonly className?: string;
  readonly testId?: string;
}) {
  const [failed, setFailed] = useState(!src);
  const showImg = Boolean(src) && !failed;

  if (!showImg) {
    const phProps = {
      assetType,
      label,
      className: ["tabletop-raster-img-fallback", className].filter(Boolean).join(" "),
      ...(testId ? { testId } : {}),
    };
    return <AssetPlaceholder {...phProps} />;
  }

  return (
    <img
      src={src}
      alt=""
      className={className}
      {...(testId ? { "data-testid": testId } : {})}
      data-card-art="print"
      onError={() => setFailed(true)}
    />
  );
}
