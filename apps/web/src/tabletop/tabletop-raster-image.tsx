import { useState } from "react";
import { AssetPlaceholder } from "./asset-placeholder";

/** 印刷稿 raster：加载失败时同尺寸降级为带标签占位（避免浏览器裂图）。 */
export function TabletopRasterImage({
  src,
  label,
  placeholderLabel,
  assetType,
  className = "",
  testId,
  onLoadError,
}: {
  readonly src?: string;
  /** 加载成功时 alt 等用；缺图时若未提供 placeholderLabel 则用作占位文案 */
  readonly label: string;
  /** 缺图占位仅显示此中文短名（不展示 assetType / 英文 key） */
  readonly placeholderLabel?: string;
  readonly assetType: string;
  readonly className?: string;
  readonly testId?: string;
  readonly onLoadError?: () => void;
}) {
  const [failed, setFailed] = useState(!src);
  const showImg = Boolean(src) && !failed;

  if (!showImg) {
    const phProps = {
      assetType,
      label: placeholderLabel ?? label,
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
      onError={() => {
        onLoadError?.();
        setFailed(true);
      }}
    />
  );
}
