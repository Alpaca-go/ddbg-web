/**
 * 引擎真实解析封装：只调用 packages/engine 的公开/既有 API，不另写伪解析器。
 */
import {
  resolveHeroSkillEffects,
  readPrintedRange,
  readPrintedTargets,
  heroSkillUsesSelfTarget,
  type HeroSkillCardView,
} from "@ddbg/engine";
import { readHeroPassiveDefence } from "../../../../packages/engine/src/battle-skill-status";

export type SkillEngineParseRoll = {
  readonly roll: number;
  readonly status: string;
  readonly outcome: string | null | undefined;
  readonly reason: string | null | undefined;
  readonly damageDealt: number | null | undefined;
  readonly skipped: readonly { readonly code?: string }[];
};

export type SkillEngineParseResult = {
  readonly source: "resolveHeroSkillEffects";
  readonly range: ReturnType<typeof readPrintedRange>;
  readonly targets: ReturnType<typeof readPrintedTargets>;
  readonly selfTarget: boolean;
  readonly rolls: readonly SkillEngineParseRoll[];
};

export type StatEngineParseResult = {
  readonly source: "readHeroPassiveDefence";
  readonly life: number | null | undefined;
  readonly dodge: number | null | undefined;
  readonly speed: number | null | undefined;
  readonly attributesVerified: boolean | null | undefined;
  readonly defence: ReturnType<typeof readHeroPassiveDefence> | null;
};

function combatFor(card: HeroSkillCardView) {
  const self = heroSkillUsesSelfTarget(card);
  const friendly =
    self ||
    (card.verified_target_stress?.amount ?? 0) < 0 ||
    (card.stats_line ?? card.effect_lines[0] ?? []).some(
      (s) => s.type === "icon" && s.icon.key === "target_hero",
    );
  const range = readPrintedRange(card);
  const targets = readPrintedTargets(card);
  return {
    actor: {
      id: "h",
      wounds: 5,
      stress: 3,
      form: (["Rake", "Rage", "Slam"].includes(
        (card as HeroSkillCardView & { name?: string }).name ?? "",
      )
        ? "beast"
        : "human") as "beast" | "human",
    },
    allies: [] as const,
    target: {
      id: self ? "h" : "t",
      side: (friendly ? "hero" : "monster") as "hero" | "monster",
      wounds: 5,
      ...(friendly ? { stress: 3 } : {}),
      dodge: 0,
      statusStacks: [],
      monsterTypeTags: ["Human", "Eldritch", "Unholy"],
    },
    light: 4,
    shuffleChoice: "push" as const,
    areaDistance:
      range.kind === "exact" ? range.distance : range.kind === "interval" ? range.min : 0,
    targetsInArea: targets.kind === "exact" ? targets.max : 1,
  };
}

/** 对技能卡跑 d10=1..10 的真实引擎解析摘要。 */
export function parseHeroSkillWithEngine(card: HeroSkillCardView): SkillEngineParseResult {
  const combat = combatFor(card);
  const rolls: SkillEngineParseRoll[] = [];
  for (let roll = 1; roll <= 10; roll++) {
    const r = resolveHeroSkillEffects(card, combat, roll);
    rolls.push({
      roll,
      status: r.resolution.status,
      outcome: r.resolution.outcome,
      reason: r.resolution.reason,
      damageDealt: r.resolution.damageDealt,
      skipped: r.resolution.skipped ?? [],
    });
  }
  return {
    source: "resolveHeroSkillEffects",
    range: readPrintedRange(card),
    targets: readPrintedTargets(card),
    selfTarget: heroSkillUsesSelfTarget(card),
    rolls,
  };
}

type HeroStatCard = {
  readonly id: string;
  readonly name?: string;
  readonly level?: number;
  readonly life?: number;
  readonly dodge?: number;
  readonly speed?: number;
  readonly attributesVerified?: boolean;
  readonly verified_higher_condition_defence?: unknown;
  readonly verified_condition_defence?: unknown;
  readonly rawId?: string;
  readonly face?: "front" | "back";
};

/** 属性面：用引擎 readHeroPassiveDefence 读抗性/免疫，不另写解析。 */
export function parseHeroStatWithEngine(stat: HeroStatCard): StatEngineParseResult {
  const defence = readHeroPassiveDefence(
    { heroStats: [stat as never] },
    { heroStatId: stat.id, side: "hero" },
  );
  return {
    source: "readHeroPassiveDefence",
    life: stat.life,
    dodge: stat.dodge,
    speed: stat.speed,
    attributesVerified: stat.attributesVerified,
    defence: defence ?? null,
  };
}

/** 从卡对象抽取全部 verified_*（展示用，非判定）。 */
export function collectVerifiedFields(card: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(card)) {
    if (k.startsWith("verified_") || k === "attributesVerified") out[k] = v;
  }
  return out;
}
