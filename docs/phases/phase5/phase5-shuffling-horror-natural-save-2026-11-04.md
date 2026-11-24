# Shuffling Horror I 自然任务与严格存档

基线：main @ R-182（[#589](https://github.com/Alpaca-go/ddbg-web/pull/589)）、R-183（[#590](https://github.com/Alpaca-go/ddbg-web/pull/590)）。依据 R-182、R-183、R-163、R-122、R-044 与核心 R36/R39、规格书 §14.x。生产入口见 [phase5-shuffling-horror-production-entry-review-2026-11-04.md](phase5-shuffling-horror-production-entry-review-2026-11-04.md)。

`naturalQuest` 在 `room:p023` 且 `bossEncounterPlan` 为 `boss:darkest:shuffling-horror` 时选择公开 `deployShufflingHorrorI`，与 Templars / Ruins I 级 Boss 专用分支一致，仅 test-helpers 驱动。Boss 定额任务（含 quest:p016）在 `bossQuestVictory` 后不再进入 `room()` 内循环，避免替补停点阻塞离开摘要。最暗回村 R32 房间牌池按出征区域校验子集守恒（含 Boss 房入弃牌堆），与遗迹九房全量守恒区分。

种子 269、Radiant、四核心英雄，从 p016 任务起点领取补给、探索与普通遭遇、真实部署/开战（Horror 进攻/H、6 张 monster 先攻），自然 AI 战斗并获胜，约 322 条公开命令后退出；再经 `beginReturnToHamlet` / `finishReturnToHamlet` 一次支付 3 XP。不注入伤口、牌序、骰点或胜利终态。种子扫描 1–15000 内存在多条完整路径（如 269、1029、1847）。

部署与开战检查点、回村存档经 JSON 命令日志严格回放；篡改 Horror 伤口或金币拒绝。`preShufflingHorrorTaskSources` 旧目录空档须完整重放后才升级正式 Horror 大卡目录，篡改 gold/cursor 拒绝。

浏览器冒烟：用正式 `taskSources` 生成同路径的部署存档，页面读取 → 开始战斗 → 保存 → 刷新 → 读取后仍为 `awaitingInitiative`，不注入页面 game 快照。

验证：

```bash
pnpm exec vitest run packages/engine/src/boss/shuffling-horror-i-natural-save.test.ts
pnpm exec vitest run apps/web/e2e/shuffling-horror-i-save.spec.ts
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

范围：单任务 p016 自然入口到胜利回村；不含 Mammoth / Templars II、Shuffling II/III、Echoing/Undulations 深化、Pit Toss 类 hold、`combatReady` / 任务白名单 / 普通 `selectRoomTile` 改动。
