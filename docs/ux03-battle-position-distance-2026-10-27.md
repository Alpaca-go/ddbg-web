# UX-03（局部）：正式战斗站位与射程可读性

状态：待 Kyries 看图验收；**不要 squash merge**。

## 改动摘要

- 正式战斗中央区：`BattleFormalBoard` 将姿态轨改为四格站位板 + 区域令牌（区号），区域格显示「距行动者 N」与卡面射程对比（绿/红框）。
- 区域长文案效果折叠进 `<details>`，减轻 A08 同排撑高。
- 底栏单目标：单选卡片替代下拉，标明「卡面射程内 / 超出 / 待核对」；多目标勾选旁附同样标签。
- 展示用 `battleAreaDistance`（BFS，与引擎 R-021 一致）与 `readPrintedRange`；**不**判定姿态、目标类型、守护等，标签文案已写明。

## 截图（本机采集）

建议在 `main` 与 `cursor/battle-position-distance-ui-ad31` 各跑一遍：

1. `pnpm dev`，1280×800，种子 1，Radiant，进地牢遇敌 → 开始 → 抽先攻 → 英雄回合选 Smite / Zealous Accusation。
2. 保存至仓库外 `.cache/ux03-battle-position/`（不进 Git）：
   - `before-1280.png`：改前基线（`b07bb4e`）战斗中央 + 底栏目标区
   - `after-1280.png`：本 PR 同场景
   - `after-1920.png`：1920×1080 同场景
3. 可选：`pnpm --filter @ddbg/web test:e2e formal-battle` 产出 `test-results/` 内 Playwright 附件。

## 测试

```bash
pnpm typecheck
pnpm exec vitest run apps/web/src/battle-spatial-display.test.ts
pnpm build
```

全仓 `pnpm test` 若因 normalized JSON 快照与当前分支不一致失败，与本次 UI 无关。

## 已知限制

- 射程标签仅覆盖已核实卡面区域距离；区间 numeric=null、无射程整数等为「射程待核对」。
- 仍可选超出射程目标（引擎拒绝），未禁用按钮，避免与 S3 局部选择语义冲突。
- 沙盒非 `formal` 战斗布局未改。
