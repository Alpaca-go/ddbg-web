# 交接：英雄注解层统一（2026-11-26）

## 本次已完成

`packages/data/src/core/heroes/annotations/` 已统一为目标模式：

- 18 个 `hNN-*.ts` 每个只导出一个 `hNN` 模块（`defineHeroModule`），数据在 `entries`，
  逐卡修正在可选 `fixes`。
- 所有 entry / fix key 为 canonical `hero_skill:<pack>:hNN:pNNN`；
  `canonicalHeroSkillCards` 已提前到所有注解之前。
- 共享 runner：`applyCardFixes`、`assertCardMeta`、`defineHeroModule`（`patch-helpers.ts`）。
- `TARGET_COUNTS` / `EFFECT_KINDS` 已并入各英雄 `entries`；
  `removal-data.ts`、`text-rules-data.ts`、`target-counts-data.ts`、`effect-kind-data.ts` 已删除。
- `index.ts` 改为对 18 个模块做泛型聚合；`core-higher-skills.build.ts` 按 `card.id` 查 `higher`。

详细阶段记录见 [PLAN-2026-11-25-hero-annotations-unification.md](../plans/PLAN-2026-11-25-hero-annotations-unification.md)。

## 验证

- `pnpm test`：630 文件 / 4426 测试通过，1 skipped。
- `pnpm exec vitest run packages/data`：100 文件 / 399 测试通过。
- `normalized/**` 66 个 JSON 的 sha256 与重构前基线完全一致。
- `pnpm typecheck`、`pnpm lint`、`pnpm build` 通过。

## 已知遗留（低优先）

1. h15 的 Festering Vapours 三个 fix 块内容相同，可抽一个 helper。
2. h12/h16 各有一份 `rangeZeroUnlabeled`；h12 的 `stressMinusOneAnchor` 与 h17 的
   `stressDeltaAnchor` 是同类变体，可提到 `patch-helpers.ts`。
3. h12/h13/h15/h16/h17/h18 仍保留一行 `assertXxx` 包装，内部只调 `assertCardMeta`；
   删掉包装并改调用点可以进一步统一，但纯属清理。
4. `abomination-projection-data.ts`（520 行）当前没有被任何模块引用，需确认删除或接线。
5. `docs/project-structure-report-2026-11-25.md` 的注解层描述已加补记；其余章节仍是
   2026-11-25 快照。

## 接手建议

- 先读 `annotations/README.md` 和 `docs/repo-layout.md` 的「英雄注解层」一节。
- 新增/修改英雄注解时只动对应 `hNN-*.ts`；不要新增 `switch (card.id)`、
  不要写 legacy ID、不要新增跨英雄中央表。
- 任何结构改动后先跑 `packages/data` 测试，再比较 `normalized/**` 的 sha256。
