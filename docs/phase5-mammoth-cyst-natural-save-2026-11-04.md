# Mammoth Cyst I 自然任务与严格存档

基线：main @ R-184（[#592](https://github.com/Alpaca-go/ddbg-web/pull/592)）、R-185（[#593](https://github.com/Alpaca-go/ddbg-web/pull/593)）。依据 R-184、R-185、R-164、R-122、R-048 与核心 R36/R39、规格书 §14.x。生产入口见 [phase5-mammoth-cyst-production-entry-review-2026-11-04.md](phase5-mammoth-cyst-production-entry-review-2026-11-04.md)。

`naturalQuest` 在 `room:p024` 且 `bossEncounterPlan` 为 `boss:darkest:mammoth-cyst` 时选择公开 `deployMammothCystI`，与 Shuffling Horror / Templars / Ruins I 级 Boss 专用分支一致，仅 test-helpers 驱动。Boss 定额任务（含 quest:p018）在 `bossQuestVictory` 后不再进入 `room()` 内循环，避免替补停点阻塞离开摘要。R-185 姿态骰表 slot 3（Revivify）在 `prepareMonsterAction` 经既有 `applyMammothCystRevivify` 接入选招路径，不另改 deploy 几何。最暗回村 R32 房间牌池按出征区域校验子集守恒（含 Boss 房入弃牌堆），与遗迹九房全量守恒区分。

种子 3279、Radiant、四核心英雄，从 p018 任务起点领取补给、探索与普通遭遇、真实部署/开战（Mammoth 进攻/H、6 张 monster 先攻），自然 AI 战斗并获胜，约 378 条公开命令后退出；再经 `beginReturnToHamlet` / `finishReturnToHamlet` 一次支付 3 XP。不注入伤口、牌序、骰点或胜利终态。种子扫描 1–8000 内存在多条完整路径（如 3279、6082）。

部署与开战检查点、回村存档经 JSON 命令日志严格回放；篡改 Mammoth 伤口或金币拒绝。`preMammothCystTaskSources` 旧目录空档须完整重放后才升级正式 Mammoth 大卡目录，篡改 gold/cursor 拒绝。

浏览器冒烟：用正式 `taskSources` 生成同路径的部署存档，页面读取 → 开始战斗 → 保存 → 刷新 → 读取后仍为 `awaitingInitiative`，不注入页面 game 快照。

验证：

```bash
pnpm exec vitest run packages/engine/src/boss/mammoth-cyst-i-natural-save.test.ts
pnpm exec vitest run packages/engine/src/boss/shuffling-horror-i-natural-save.test.ts
pnpm exec vitest run packages/engine/src/boss/templars-i-natural-save.test.ts
pnpm exec vitest run apps/web/e2e/mammoth-cyst-i-save.spec.ts
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

范围：单任务 p018 自然入口到胜利回村；不含 White Cell Teleport / 紫星深化 / II·III / Ancestor / final battle、`combatReady` / 任务白名单 / 普通 `selectRoomTile` 改动。
