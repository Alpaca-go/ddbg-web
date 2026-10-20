/** R-048：未核实或缺缓存时的同尺寸实物占位；界面只显示中文名称，资产 key 仅留在 data-asset-type。 */
export function AssetPlaceholder({
  assetType,
  label,
  className = "",
  testId,
}: {
  readonly assetType: string;
  readonly label: string;
  readonly className?: string;
  readonly testId?: string;
}) {
  return (
    <div
      className={`tabletop-asset-ph ${className}`}
      data-testid={testId}
      data-asset-type={assetType}
      role="img"
      aria-label={label}
    >
      <span className="tabletop-asset-ph__label">{label}</span>
    </div>
  );
}
