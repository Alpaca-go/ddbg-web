# 战役失败 → 开新战役入口（2026-11-06）

**基线**：`0ba34566`（最暗任务随机抽 1 张已合入）
**授权**：Kyries 2026-11-06「合入，然后继续」；沿用 R-188 补充的胜利面板同款入口。
**范围**：网页只加失败终局面板与「开新战役」按钮；不改引擎、不改战役失败判定。

## 问题

[最终战全灭切片](phase5-final-battle-defeat-2026-11-05.md) 记录：失败后只有战斗页内的一条文案，**没有「开新战役」入口**（胜利面板有）；玩家必须刷新页面才能重开。`campaignFailure` 置位后 `applyCommand` 一律拒绝，是终局态。

## 改动

| 层   | 改动                                                                                                                  |
| ---- | --------------------------------------------------------------------------------------------------------------------- |
| 引擎 | 无。`campaignFailure` 已是终局（`applyCommand` 拒绝全部命令）                                                         |
| 网页 | 新增 `CampaignDefeatPanel`：失败原因、阵亡名单、终局文案、「开新战役」；`DungeonSandbox` 在胜利判定之后优先渲染该面板 |
| 入口 | 复用 `campaignRestartUrl`（清查询串与 hash，回到出征设置页），与胜利面板一致                                          |
| 文案 | 三种失败原因沿用既有原文（`bossQuestHeroesDefeated` / `insufficientWaitingHeroes` / `noWaitingHeroes`），不新增口径   |

失败原因对应：Boss 任务英雄全灭（R-044）、驿站等待英雄不足四人（R9/R25）、等待英雄代币耗尽（R33）。战役失败为终局：不回到村庄、不再接受部署/战斗/结算命令。

## 验证

```bash
pnpm exec vitest run apps/web/src/dungeon-sandbox/quest-return/campaign-defeat-panel.test.tsx
pnpm exec vitest run apps/web/src/dungeon-sandbox/quest-return/campaign-victory-panel.test.tsx
pnpm typecheck
pnpm build
```

- 新增 3 条组件测：面板显示原因/阵亡名单/终局文案且不含「返回村庄」；三种失败原因文案；提供「开新战役」按钮且回调只由页面处理。
- 既有 `necromancer-i` / `prophet-i` 浏览器冒烟断言「Boss任务英雄全灭，战役失败（R-044）。」可见、`结算英雄全灭` 按钮消失；面板沿用同一句原文，且替换整屏后按钮自然消失，两条冒烟无需改断言（本机浏览器版本不可用，未实跑）。
- 全量 `pnpm test --maxWorkers=2 --testTimeout=30000`：**453 文件 / 3284 测通过**；`typecheck`、`build`、变更文件 ESLint / Prettier 通过。

## 边界

- 不改引擎的失败判定、终局命令拒绝或回村流程；不改胜利面板。
- 失败后可查看的战场信息：面板替换整屏，与胜利面板一致，不再保留战斗台面。
