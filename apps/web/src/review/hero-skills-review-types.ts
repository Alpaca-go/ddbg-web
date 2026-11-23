/** Phase A0.5 复核矩阵与工作台类型。 */

export const REVIEW_VERDICTS = ["confirmed", "needs_fix", "ambiguous", "stop"] as const;
export type ReviewVerdict = (typeof REVIEW_VERDICTS)[number];

export type ReviewEvidence = {
  readonly page?: number;
  readonly line_signature?: string;
  readonly notes?: string;
};

export type ReviewMatrixRow = {
  readonly canonical_id: string;
  readonly kind: "hero_skill" | "hero_stat";
  readonly hero: string;
  readonly name: string | null;
  readonly level: number | null;
  readonly face: "front" | "back" | null;
  readonly print_page: number | null;
  readonly png_rel: string | null;
  readonly art_map_id: string | null;
  readonly art_bridge: string | null;
  readonly verified_keys_present: readonly string[];
  readonly printed_lines: unknown;
  readonly current_effects: unknown;
  readonly verdict: ReviewVerdict | null;
  readonly evidence: ReviewEvidence | null;
  readonly reviewer: string | null;
  readonly date: string | null;
  readonly qid: string | null;
  readonly notes: string | null;
  readonly batch: string | null;
  readonly review_blocked: boolean;
  readonly review_blocked_reason: string | null;
};

export type ReviewMatrix = {
  readonly schema: string;
  readonly title: string;
  readonly plan: string;
  readonly created: string;
  readonly counts: {
    readonly total: number;
    readonly hero_skill: number;
    readonly hero_stat: number;
    readonly expected: {
      readonly total: number;
      readonly hero_skill: number;
      readonly hero_stat: number;
    };
    readonly note: string;
  };
  readonly batches: Record<
    string,
    {
      readonly status: string;
      readonly hero: string;
      readonly skill_count: number;
      readonly stat_count: number;
      readonly canonical_ids: readonly string[];
      readonly expected_cache_relative_paths: readonly string[];
    }
  >;
  readonly policy: Record<string, unknown>;
  readonly rows: readonly ReviewMatrixRow[];
};

export type ReviewArtResolution = {
  readonly pngRel: string | null;
  readonly artMapId: string | null;
  readonly printPage: number | null;
  readonly url: string | null;
  readonly bridge: string | null;
  readonly cacheProbe: "unknown" | "hit" | "miss";
  readonly blocked: boolean;
  readonly blockedReason: string | null;
};
