import { useMemo, useState } from "react";
import heroSkillFile from "../../../../packages/data/normalized/corebox/hero_skill.json";
import heroStatFile from "../../../../packages/data/normalized/corebox/hero_stat.json";
import type { HeroSkillCardView } from "@ddbg/engine";
import { resolveReviewPrintArt, withCacheProbe } from "./hero-skills-review-art";
import {
  assertMatrixShape,
  countVerdicts,
  downloadMatrixJson,
  filterRows,
  loadSeededReviewMatrix,
  mergeImportedMatrix,
  readMatrixFile,
} from "./hero-skills-review-matrix";
import {
  collectVerifiedFields,
  parseHeroSkillWithEngine,
  parseHeroStatWithEngine,
} from "./hero-skills-review-parse";
import type {
  ReviewArtResolution,
  ReviewMatrix,
  ReviewMatrixRow,
} from "./hero-skills-review-types";
import { REVIEW_VERDICTS } from "./hero-skills-review-types";

const skillsById = new Map(
  (heroSkillFile as { cards: HeroSkillCardView[] }).cards.map((c) => [c.id, c]),
);
const statsById = new Map(
  (heroStatFile as { cards: Record<string, unknown>[] }).cards.map((c) => [String(c.id), c]),
);

function JsonBlock({ value, label }: { value: unknown; label: string }) {
  return (
    <section className="rounded border border-stone-600/60 bg-stone-950/50 p-3">
      <h3 className="mb-2 text-sm font-semibold text-amber-100/90">{label}</h3>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-stone-200">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}

function PrintArtPanel({
  art,
  onProbe,
}: {
  art: ReviewArtResolution;
  onProbe: (probe: "hit" | "miss") => void;
}) {
  const [zoom, setZoom] = useState(1);
  const blocked = art.blocked || art.cacheProbe === "miss" || !art.url;

  return (
    <section className="rounded border border-stone-600/60 bg-stone-950/40 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-amber-100/90">印刷面 /print-card-art</h3>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded bg-stone-700 px-3 py-1 text-sm text-white"
            onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
          >
            缩小
          </button>
          <button
            type="button"
            className="rounded bg-stone-700 px-3 py-1 text-sm text-white"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
          >
            放大
          </button>
        </div>
      </div>
      {blocked ? (
        <div
          className="rounded border border-rose-700/70 bg-rose-950/50 p-4 text-sm text-rose-100"
          data-testid="review-art-blocked"
        >
          <p className="font-semibold">复核阻断：无可用印刷卡图</p>
          <p className="mt-1 opacity-90">
            原因：{art.blockedReason ?? "print_art_cache_miss"}。云端 / 当前环境没有
            `.cache/print-card-art` 时禁止语义判定；不得用占位图或网络图源替代。
          </p>
          {art.pngRel ? (
            <p className="mt-2 break-all font-mono text-xs text-rose-100/80">
              期望缓存相对路径：{art.pngRel}
            </p>
          ) : null}
        </div>
      ) : null}
      {art.url ? (
        <div className="mt-3 max-h-[70vh] overflow-auto rounded bg-black/40">
          <img
            src={art.url}
            alt={art.pngRel ?? "print art"}
            className="mx-auto origin-top transition-transform"
            style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
            data-testid="review-print-img"
            onLoad={() => onProbe("hit")}
            onError={() => onProbe("miss")}
          />
        </div>
      ) : null}
      <p className="mt-2 break-all font-mono text-[11px] text-stone-400">
        artMapId={art.artMapId ?? "—"} bridge={art.bridge ?? "—"} cache={art.cacheProbe}
      </p>
    </section>
  );
}

export function HeroSkillsReviewWorkbench() {
  const [matrix, setMatrix] = useState<ReviewMatrix>(() => loadSeededReviewMatrix());
  const [batchOnly, setBatchOnly] = useState<"leper" | "all">("leper");
  const [index, setIndex] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [artOverride, setArtOverride] = useState<ReviewArtResolution | null>(null);

  const shapeErrors = useMemo(() => assertMatrixShape(matrix), [matrix]);
  const rows = useMemo(
    () =>
      filterRows(matrix.rows, {
        batch: batchOnly === "leper" ? "leper" : null,
      }),
    [matrix.rows, batchOnly],
  );
  const safeIndex = rows.length ? Math.min(index, rows.length - 1) : 0;
  const row: ReviewMatrixRow | undefined = rows[safeIndex];
  const counts = countVerdicts(matrix.rows);
  const leperCounts = countVerdicts(filterRows(matrix.rows, { batch: "leper" }));

  const art = useMemo(() => {
    if (!row) return null;
    if (artOverride) return artOverride;
    const resolved = resolveReviewPrintArt(row);
    // 矩阵标注 review_blocked 时，在 onLoad 命中缓存前保持阻断（云端无 .cache 的默认态）
    if (row.review_blocked && resolved.cacheProbe !== "hit") {
      return {
        ...resolved,
        blocked: true,
        blockedReason: row.review_blocked_reason ?? resolved.blockedReason,
      };
    }
    return resolved;
  }, [row, artOverride]);

  const liveCard = row
    ? row.kind === "hero_skill"
      ? skillsById.get(row.canonical_id)
      : statsById.get(row.canonical_id)
    : undefined;

  const verified = liveCard ? collectVerifiedFields(liveCard as Record<string, unknown>) : {};
  const printed =
    row?.kind === "hero_skill" && liveCard
      ? {
          effect_lines: (liveCard as HeroSkillCardView).effect_lines,
          stats_line: (liveCard as HeroSkillCardView).stats_line,
          printed_labels: (liveCard as HeroSkillCardView).printed_labels,
        }
      : liveCard
        ? {
            lines: (liveCard as { lines?: unknown }).lines,
            icons: (liveCard as { icons?: unknown }).icons,
            life: (liveCard as { life?: unknown }).life,
            dodge: (liveCard as { dodge?: unknown }).dodge,
            speed: (liveCard as { speed?: unknown }).speed,
          }
        : null;

  const engineParse = useMemo(() => {
    if (!row || !liveCard) return null;
    try {
      if (row.kind === "hero_skill") {
        return parseHeroSkillWithEngine(liveCard as HeroSkillCardView);
      }
      return parseHeroStatWithEngine(liveCard as never);
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [row, liveCard]);

  const semanticLocked =
    !art || art.blocked || art.cacheProbe === "miss" || art.cacheProbe === "unknown";

  function patchRow(canonicalId: string, patch: Partial<ReviewMatrixRow>) {
    setMatrix((m) => ({
      ...m,
      rows: m.rows.map((r) => (r.canonical_id === canonicalId ? { ...r, ...patch } : r)),
    }));
  }

  return (
    <div className="min-h-dvh bg-stone-900 text-stone-100">
      <header className="sticky top-0 z-10 border-b border-stone-700 bg-stone-950/95 px-3 py-3 backdrop-blur">
        <p className="text-xs uppercase tracking-wide text-amber-200/80">Phase A0.5 · DEV ONLY</p>
        <h1 className="text-lg font-semibold sm:text-xl">英雄技能 / 属性复核工作台</h1>
        <p className="mt-1 text-xs text-stone-400">
          432 = 378 技能 + 54 属性；「每英雄 21」仅技能，属性另有 3
          面。无本机印刷缓存时禁止语义判定。仅本地 dev；未开通公网访问。
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            className={`rounded px-3 py-1.5 ${batchOnly === "leper" ? "bg-amber-700" : "bg-stone-700"}`}
            onClick={() => {
              setBatchOnly("leper");
              setIndex(0);
              setArtOverride(null);
            }}
          >
            Leper 批次（21+3）
          </button>
          <button
            type="button"
            className={`rounded px-3 py-1.5 ${batchOnly === "all" ? "bg-amber-700" : "bg-stone-700"}`}
            onClick={() => {
              setBatchOnly("all");
              setIndex(0);
              setArtOverride(null);
            }}
          >
            全索引 432
          </button>
          <button
            type="button"
            className="rounded bg-stone-700 px-3 py-1.5"
            onClick={() => downloadMatrixJson(matrix)}
            data-testid="review-export"
          >
            导出 JSON
          </button>
          <label className="rounded bg-stone-700 px-3 py-1.5">
            导入 JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              data-testid="review-import"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const incoming = await readMatrixFile(file);
                  const { matrix: next, errors } = mergeImportedMatrix(matrix, incoming);
                  if (errors.length) {
                    setImportError(errors.join("; "));
                    return;
                  }
                  setImportError(null);
                  setMatrix(next);
                } catch (err) {
                  setImportError(err instanceof Error ? err.message : String(err));
                }
              }}
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-stone-400">
          全表：pending {counts.pending} / confirmed {counts.confirmed} · Leper：pending{" "}
          {leperCounts.pending}
          {shapeErrors.length ? ` · 形状错误：${shapeErrors.join("; ")}` : ""}
          {importError ? ` · 导入失败：${importError}` : ""}
        </p>
      </header>

      {!row ? (
        <p className="p-4">无行</p>
      ) : (
        <main className="mx-auto flex max-w-3xl flex-col gap-3 px-3 py-4 pb-28">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="rounded bg-stone-700 px-4 py-2 text-sm disabled:opacity-40"
              disabled={safeIndex <= 0}
              onClick={() => {
                setIndex((i) => Math.max(0, i - 1));
                setArtOverride(null);
              }}
            >
              上一张
            </button>
            <p className="text-center text-sm">
              {safeIndex + 1} / {rows.length}
              <span className="mt-1 block break-all font-mono text-[11px] text-stone-400">
                {row.canonical_id}
              </span>
            </p>
            <button
              type="button"
              className="rounded bg-stone-700 px-4 py-2 text-sm disabled:opacity-40"
              disabled={safeIndex >= rows.length - 1}
              onClick={() => {
                setIndex((i) => Math.min(rows.length - 1, i + 1));
                setArtOverride(null);
              }}
            >
              下一张
            </button>
          </div>

          <section className="rounded border border-stone-600/60 bg-stone-950/40 p-3 text-sm">
            <p>
              {row.kind} · {row.hero} · {row.name ?? "—"} · L{row.level ?? "—"}
              {row.face ? ` · ${row.face}` : ""}
              {row.batch ? ` · batch=${row.batch}` : ""}
            </p>
          </section>

          {art ? (
            <PrintArtPanel
              art={art}
              onProbe={(probe) => setArtOverride(withCacheProbe(resolveReviewPrintArt(row), probe))}
            />
          ) : null}

          <JsonBlock label="提取行 effect_lines / stats_line（或属性 lines）" value={printed} />
          <JsonBlock label="当前全部 verified_*" value={verified} />
          <JsonBlock label="引擎实际解析（非伪解析器）" value={engineParse} />

          <section className="rounded border border-stone-600/60 bg-stone-950/40 p-3">
            <h3 className="mb-2 text-sm font-semibold text-amber-100/90">判定</h3>
            {semanticLocked ? (
              <p className="mb-3 text-sm text-rose-200" data-testid="review-verdict-locked">
                印刷图未命中缓存前，语义 verdict 锁定为 null（不得编造 confirmed）。
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded bg-stone-700 px-3 py-1.5 text-sm disabled:opacity-40"
                disabled={semanticLocked}
                onClick={() =>
                  patchRow(row.canonical_id, {
                    verdict: null,
                    evidence: null,
                    reviewer: null,
                    date: null,
                  })
                }
              >
                pending (null)
              </button>
              {REVIEW_VERDICTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="rounded bg-stone-700 px-3 py-1.5 text-sm disabled:opacity-40"
                  disabled={semanticLocked}
                  onClick={() =>
                    patchRow(row.canonical_id, {
                      verdict: v,
                      date: new Date().toISOString().slice(0, 10),
                    })
                  }
                >
                  {v}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-sm">
              Q 号
              <input
                className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-1.5"
                value={row.qid ?? ""}
                disabled={semanticLocked}
                onChange={(e) => patchRow(row.canonical_id, { qid: e.target.value || null })}
              />
            </label>
            <label className="mt-3 block text-sm">
              备注
              <textarea
                className="mt-1 w-full rounded border border-stone-600 bg-stone-900 px-2 py-1.5"
                rows={3}
                value={row.notes ?? ""}
                disabled={semanticLocked}
                onChange={(e) => patchRow(row.canonical_id, { notes: e.target.value || null })}
              />
            </label>
            <p className="mt-2 text-xs text-stone-400">
              当前 verdict：{row.verdict === null ? "null (pending)" : row.verdict}
            </p>
          </section>
        </main>
      )}
    </div>
  );
}
