# 英雄技能注解层（hero-annotations）

`packages/data/normalized/corebox/hero_skill.json` 的逐卡审校层。
`build.ts` 通过 [index.ts](index.ts) 的 apply 函数，把这里的数据与补丁叠加到规范化数据上。

18 名英雄一律按核心内容（R-200），因此全部数据都在 `normalized/corebox/`，
ID 里的 pack 段只用于归类；**不要按包拆出去**。

## 两种文件形态

目录里只有两类文件，差异来自内容本身，不是历史遗留：

| 形态        | 文件    | 内容                                                                                                                                                                 |
| ----------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 纯数据      | h01–h11 | 只有数据表：`statusEntries` / `rangeEntries` / `damageEntries` / `layoutEntries` / `coreHigherRows` / `supportEntries` / `bountyStatusRows` / `rallyingFlareEntries` |
| 数据 + 补丁 | h12–h18 | 除数据表外，还有逐卡修正：工厂函数 + `HeroSkillPatch[]` + `HeroAnnotationModule`                                                                                     |

为什么不能全部做成纯数据：h12–h18 的卡需要重建效果行、替换图标 key、
重写 `unlabeled_numbers` 锚点，这些不是数值表能表达的。
把它们硬做成一套 DSL，会让格式复杂到和代码一样（见
[docs/HANDOFF-2026-11-23-hero-annotations.md](../../../../docs/HANDOFF-2026-11-23-hero-annotations.md)）。

## 统一文件骨架

所有 `hNN-*.ts` 按以下顺序排列（[h14-leper.ts](h14-leper.ts) 是参考实现）：

1. imports
2. 数据导出（若有）
3. patch 工厂函数（若有）
4. patch 表 `xxxPatches(cards)`（若有）
5. `export const xxxAnnotations: HeroAnnotationModule`（若有）

h01–h11 只有 1–2；h12–h18 是 1–5。

## 数据表与 applier 的对应

| 数据导出                            | 消费方                                               |
| ----------------------------------- | ---------------------------------------------------- |
| `statusEntries`                     | [status-effects.ts](status-effects.ts)               |
| `rangeEntries`                      | [ranges.ts](ranges.ts)                               |
| `selfEffectEntries`                 | [self-effects.ts](self-effects.ts)                   |
| `targetStressEntries`               | [target-stress.ts](target-stress.ts)                 |
| `removalEntries`                    | [removal.ts](removal.ts)                             |
| `TARGET_COUNTS`                     | [target-counts.ts](target-counts.ts)                 |
| `supportEntries`                    | [support-effects.ts](support-effects.ts)             |
| `layoutEntries`                     | [layout.ts](layout.ts)                               |
| `damageEntries`                     | [damage.ts](damage.ts)                               |
| `rallyingFlareEntries`              | [rallying-flare.ts](rallying-flare.ts)               |
| `bountyStatusRows`                  | [bounty-statuses.ts](bounty-statuses.ts)             |
| `shuffleEntries` / `ignoresEntries` | [text-rules.ts](text-rules.ts)                       |
| `coreHigherRows`                    | [../core-higher-skills.ts](../core-higher-skills.ts) |

补丁类（h12–h18）由 `index.ts` 的 `applyHeroAnnotations` 按 `HERO_ANNOTATIONS` 顺序执行，
元数据断言统一由 [patch-helpers.ts](patch-helpers.ts) 的 `applyPatches` 完成。

## 规则

- 旧字段仍写 `annotation_*`；A2 新增的文本/移除/目标规则直接写嵌套 `rules.*`
  （`rules.shuffle`、`rules.ignores`、`rules.removal`、`rules.targets`），引擎优先读 `rules`，
  文本解析作未注解卡的 fallback。
- 所有签名断言保留（`lineSignature`），不得放宽（R-048）。
- 评审注释（`R-xxx` / `Q-xxx`）随对应行保留。
- 改写后必须零 diff：

```powershell
$env:WRITE_NORMALIZED='1'
pnpm exec vitest run packages/data/src/normalize/normalize.test.ts
git diff --stat -- packages/data/normalized   # 必须为空
```
