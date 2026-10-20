import { TabletopRasterPiece, type TabletopPieceAspect } from "./tabletop-raster-piece";

/**
 * 右侧有厚度的牌堆示意（仅顶牌尝试加载印刷图）。
 */
export function TabletopCardStack({
  label,
  count,
  pngRel,
  aspect = "room",
  testId,
}: {
  readonly label: string;
  readonly count: number;
  readonly pngRel?: string;
  readonly aspect?: TabletopPieceAspect;
  readonly testId?: string;
}) {
  const layers = Math.min(5, Math.max(1, Math.ceil(count / 4)));

  return (
    <div className="tabletop-card-stack" data-testid={testId}>
      <div className="tabletop-card-stack__pile" aria-hidden="true">
        {Array.from({ length: layers }, (_, i) => (
          <div
            key={i}
            className="tabletop-card-stack__layer"
            style={{ transform: `translate(${i * 2}px, ${-i * 2}px)` }}
          />
        ))}
      </div>
      <TabletopRasterPiece
        {...(pngRel ? { pngRel } : {})}
        label={label}
        aspect={aspect}
        footer={`${label} · ${count}`}
      />
    </div>
  );
}
