# 英雄注解层统一计划（2026-11-25）

目标：把 `packages/data/src/core/heroes/annotations/` 从「三种形态、五套 ID」重构成
**一个英雄一个文件、一个模块、一个 `entries` 数据对象、一套 canonical ID、一个共享 fix runner**。
行为不变；验收标准是 `packages/data/normalized/**` 逐字节不变。

## 目标模式

每个 `hNN-*.ts` 只允许以下骨架：

```ts
import type { HeroName } from "../hero-registry";
import type { HeroAnnotationEntries, ... } from "./types";
import { defineHeroModule, type CardFix } from "./patch-helpers";

const HERO: HeroName = "...";

const entries: HeroAnnotationEntries = {
  status: [...],
  range: [...],
  // 只写该英雄实际有的表；没有就不写
};

function fixes(cards: readonly NormalizedHeroSkillCard[]): Readonly<Record<string, CardFix>> {
  return {
    "hero_skill:...": (card) => { ... },
  };
}

export const hNN = defineHeroModule({ id: "hNN", hero: HERO, entries, fixes });
```

约束：

1. 文件只导出一个 `hNN`（或 `crusaderAnnotations` 这类旧名在迁移期保留，最终统一为 `hNN`）。
2. 所有 entry ID、fix key、patch key 都是 canonical：`hero_skill:<pack>:hNN:pNNN`。
3. 不再从 ID 尾巴读页码；需要页码时读 `card.pages[0]` 或 entry 的显式 `page`。
4. 不再有 `assertXxx`；`applyCardFixes` 统一断言 hero / 唯一命中 / verification。
5. 数据表不再单独 `export`，只存在于 `entries`。
6. 数据表需要的跨英雄表（`TARGET_COUNTS`、`EFFECT_KINDS`）并入各英雄 `entries`。

## 契约

```ts
export type HeroAnnotationEntries = {
  status?: readonly StatusEffectEntry[];
  range?: readonly RangeEntry[];
  support?: readonly SupportEffectEntry[];
  damage?: readonly DamageEntry[];
  self?: readonly SelfEffectEntry[];
  targetStress?: readonly TargetStressEntry[];
  layout?: readonly LayoutEntry[];
  bounty?: readonly BountyStatusRow[];
  rallyingFlare?: readonly RallyingFlareEntry[];
  shuffle?: readonly ShuffleEntry[];
  ignores?: readonly IgnoresEntry[];
  removal?: readonly RemovalEntry[];
  higher?: readonly CoreHigherSkillRow[];
  targetCount?: readonly TargetCountEntry[];
  effectKind?: readonly EffectKindEntry[];
};

export type HeroAnnotationModule = {
  id: `h${number}`;
  hero: HeroName;
  entries: HeroAnnotationEntries;
  apply: HeroAnnotationApplier;
};
```

`index.ts` 只做泛型聚合：

```ts
const MODULES = [h01, h02, ..., h18];
const collect = (key) => MODULES.flatMap((m) => m.entries[key] ?? []);
export const STATUS_EFFECTS = collect("status");
// ...
export function applyHeroAnnotations(cards) {
  return MODULES.reduce((cur, m) => m.apply(cur), [...cards]);
}
```

`build.ts` 把 `canonicalHeroSkillCards` 提前到 `buildHeroSkills` 之后、所有注解之前；
`core-higher-skills.build.ts` 改为按 `card.id` 查 `higher` 行。

## 阶段与批次

| 批次 | 内容                                                                  | 验收                              |
| ---- | --------------------------------------------------------------------- | --------------------------------- |
| 0    | 基线：HEAD、`normalized/corebox/hero_skill.json` sha256               | 记录在案                          |
| 1    | 契约 + `CardFix`/`applyCardFixes`/`defineHeroModule` + 试点 h01、h14  | 结构可读，旧导出仍可用            |
| 2    | 纯数据 11 个：h01–h11（每 2–3 个一批）                                | 每批只动该英雄文件 + index 对应段 |
| 3    | 补丁型 6 个：h12/h13/h15/h16/h17/h18（每 2 个一批）                   | **检查点：pnpm test**             |
| 4    | ID 全量 canonical + 13 个 applier 统一按 `card.id` + canonical 化提前 | 检查点后单独验证                  |
| 5    | `TARGET_COUNTS`/`EFFECT_KINDS` 拆入各英雄 `entries`                   | 中央文件删除                      |
| 6    | 清理旧导出、`assertX`、重复 helper、README                            | 结构定稿                          |
| 7    | 验证：typecheck/lint/test、normalized 零 diff、build                  | 全绿                              |

## 检查点

- 阶段 3 结束跑一次 `pnpm test`（用户同意破例）。
- 阶段 4 结束再跑一次 `pnpm test`，并比较 `hero_skill.json` 的 sha256。
- 阶段 7 跑 `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build`。

## 风险

- ID 翻转是唯一高危步骤；单独成批，不与其他改动混。
- Musketeer canonical 页是全局页（358–378），`card.pages[0]` 是本地页（1–21）。
- Abomination 双面卡依赖 `hero ?? "ABOMINATION"`；canonical 化后仍按 `card.hero` 取。
- 现有逐卡测试只覆盖 h13–h18；h01–h12 靠 `normalized` 输出兜底，零 diff 是硬验收。

## 执行状态（2026-11-25 夜）

- 阶段 1–6 已完成：18 个 hNN 全部改为「单文件 + `hNN` 模块 + `entries` + `fixes`」；
  数据表不再单独导出；`TARGET_COUNTS` / `EFFECT_KINDS` 已拆入各英雄；
  `removal-data.ts`、`text-rules-data.ts`、`target-counts-data.ts`、`effect-kind-data.ts` 已删除。
- canonical ID 已全量：所有 entry / fix key 为 `hero_skill:<pack>:hNN:pNNN`；
  `canonicalHeroSkillCards` 提前到注解之前；8 个 applier 统一按 `card.id` 匹配。
- 共享 runner：`applyCardFixes` + `assertCardMeta` + `defineHeroModule`；
  六个 `assertX` 已收敛，`applyPatches` 已删除，h14 改用 `defineHeroModule`。
- 验证结果：
  - `pnpm exec vitest run packages/data`：100 文件 / 399 测试全过。
  - `pnpm test`（完整套件）：630 文件 / 4426 测试通过，1 skipped，exit 0。
  - `normalized/**` 66 个 JSON 的 sha256 与改造前基线完全一致。
  - `pnpm typecheck`、`pnpm lint`、`pnpm build` 通过。
- 结构定稿。唯一未做的低优先清理：h15 的 Festering 三段块可再抽公共 helper；不影响目标模式与验收。
