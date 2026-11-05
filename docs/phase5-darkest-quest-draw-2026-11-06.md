# 最暗任务随机抽 1 张（2026-11-06）

**基线**：`00f559ed`（III→最暗入口与固定 p016 已合入）
**授权**：Kyries 2026-11-06「合入，然后继续」；关闭 [Q-155](rulings.md)，见 **R-192**。
**范围**：把第 4 幕入口从「固定 p016」补成规格书 §14.7.3 的「3 张最暗任务随机抽 1 张」；不改任务数据、最终战形态流程、存档模型或 `usable` / `combatReady`。

## 接入

| 层     | 改动                                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 抽签   | `enterDarkestDungeon` 内用 `state.seed` + 当前 `d.cursor` 对 p016–p018 做 Fisher–Yates 洗牌取首张，游标前进 2                                                                              |
| 确定性 | 命令无载荷；同种子同游标同结果。严格存档仍受 `QuestStart` 只有 seed/quest/mode/party 的限制（见下）                                                                                        |
| 明示   | 待选 prompt 与事件文案同时给出抽到的任务与它将取消的最终形态（读 `darkest_boss_content.encounters[].skipFinalForm`）：p016→Ancestor 2nd Form、p017→Ancestor 1st Form、p018→Gestating Heart |
| 网页   | 入口按钮改为「进入最暗地牢（随机抽 1 张最暗任务）」，不再预先命名 p016；抽到后才在待选中显示任务名与取消形态                                                                               |
| 守卫   | 仍要求 Act III Boss 胜利、3 XP 已发、回村完成、该次村庄阶段结束；`offerNextQuest` 继续拒绝，不回落 2 选 1                                                                                  |

依据：规格书 §14.7.3 / §15 L1 QuestSelect；R-191（只打 1 张、无三连）、R-192（时点 / RNG / 明示）、R-120（不进普通池）、R-048。

## 验证

```bash
pnpm exec vitest run packages/engine/src/darkest-entry.test.ts
pnpm exec vitest run apps/web/src/dungeon-sandbox/hamlet/hamlet-event-section.test.tsx
pnpm typecheck
```

- 引擎 9 测：入口前置、单候选且抽签消费 2 步 RNG、**24 个种子覆盖三张任务**、同种子同结果、确认后 `questDistribution.questId` 与抽到的任务一致、16 房 / 3 Boss 位 / 26 张最暗怪 / III 饰品、补给停点、重复入口拒绝、II→III 残留摘要不误触发、存档命令 schema。
- 网页组件 2 测：按钮文案为随机抽 1 张；点击后待选含任务与「取消最终战的…形态」；确认后进入 `awaitingProvisions`（16 房 / 26 怪 / III 饰品）；II 级不显示最暗按钮。
- 全量 `pnpm test --maxWorkers=2 --testTimeout=30000`：451/452 文件通过、3280 测通过；唯一失败是 `quest-save.test.ts` 的自然战斗回放**超时**（20s 自带上限，无断言失败），单跑该文件 3 测全过（17.6s）——属于已知 Windows 并行长场景超时，与本次改动无关。另跑 `typecheck`、`build`、变更文件 ESLint / Prettier 通过。

## 边界（诚实）

- **p017 / p018 的 Boss 特殊机制仍 hold**（Templars 尖刺/Pit Toss、Mammoth White Cell Teleport/紫星、Shuffling Echoing/Undulations 完整召唤）；本切片只保证三张任务都能被抽到并完成最暗建局。
- **严格存档未覆盖**：`QuestStart` 仍只有 seed/quest/mode/party，III→最暗不能单独 `createQuestSave`；抽签的确定性由「种子 + 命令日志」回放保证，尚未纳入整链存档验收。
- **浏览器冒烟未加**：本机 Playwright 浏览器版本不匹配（详见上一刀切片文档）；网页路径由组件测覆盖。
