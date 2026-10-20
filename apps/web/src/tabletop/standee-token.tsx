import { PRINT_CARD_ART_PUBLIC_PREFIX } from "../card-art/resolve-print-hero-skill-art";
import { TabletopRasterImage } from "./tabletop-raster-image";

/** 战斗/列表用竖向立牌占位：图 + 底座 + 脚下伤口条（非 HP 条）。 */
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
  const woundRatio =
    wounds !== undefined && life !== undefined && life > 0 ? Math.min(1, wounds / life) : undefined;

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
          assetType={assetType}
          className="tt-token__img"
        />
      </div>
      <div className="tt-token__base" aria-hidden="true" />
      {woundRatio !== undefined && (
        <div className="tt-token__woundbar" aria-label={`伤口 ${wounds}/${life}`}>
          <span className="tt-token__woundfill" style={{ width: `${woundRatio * 100}%` }} />
          <span className="tt-token__woundtext">
            {wounds}/{life}
          </span>
        </div>
      )}
      {size === "battle" && <span className="tt-token__name">{label.split(" ")[0]}</span>}
    </Tag>
  );
}
