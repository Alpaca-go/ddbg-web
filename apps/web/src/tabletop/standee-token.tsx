import { PRINT_CARD_ART_PUBLIC_PREFIX } from "../card-art/resolve-print-hero-skill-art";
import { TabletopRasterImage } from "./tabletop-raster-image";

/** 印刷整图 + 底座 + 伤口数字徽标；不裁切卡面或绘制血条。 */
export function StandeeToken({
  label,
  pngRel,
  assetType = "hero_standee",
  wounds,
  life,
  selected = false,
  onClick,
  testId,
  size = "battle",
}: {
  readonly label: string;
  readonly pngRel?: string;
  readonly assetType?: string;
  readonly wounds?: number;
  readonly life?: number;
  readonly selected?: boolean;
  readonly onClick?: () => void;
  readonly testId?: string;
  readonly size?: "battle" | "row";
}) {
  const Tag = onClick ? "button" : "div";
  const imgSrc = pngRel
    ? `${PRINT_CARD_ART_PUBLIC_PREFIX}/${pngRel.replace(/^\//, "")}`
    : undefined;

  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={[
        "tt-token",
        size === "row" ? "tt-token--row" : "tt-token--battle",
        selected ? "tt-token--selected" : "",
      ].join(" ")}
      onClick={onClick}
      data-testid={testId}
      aria-pressed={onClick ? selected : undefined}
    >
      <div className="tt-token__figure" data-asset-type={assetType}>
        <TabletopRasterImage
          {...(imgSrc ? { src: imgSrc } : {})}
          label={label}
          placeholderLabel={assetType === "hero_standee" ? "英雄立牌" : "怪物卡"}
          assetType={assetType}
          className="tt-token__img"
        />
      </div>
      <div className="tt-token__base" aria-hidden="true" />
      {wounds !== undefined && (
        <div
          className="tt-token__woundbar"
          aria-label={`伤口 ${wounds}${life !== undefined ? `/${life}` : ""}`}
        >
          <span className="tt-token__woundtext">
            伤口 {wounds}
            {life !== undefined ? `/${life}` : ""}
          </span>
        </div>
      )}
      {size === "battle" && <span className="tt-token__name">{label}</span>}
    </Tag>
  );
}
