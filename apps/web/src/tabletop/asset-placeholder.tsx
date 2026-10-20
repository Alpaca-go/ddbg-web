/** R-048：未核实或缺缓存时的同尺寸实物占位，标明资产类别。 */
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
      aria-label={`${label}（占位：${assetType}）`}
    >
      <span className="tabletop-asset-ph__type">{assetType}</span>
      <span className="tabletop-asset-ph__label">{label}</span>
    </div>
  );
}
