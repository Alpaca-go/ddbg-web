# Collector I 自然任务与严格存档

基线：`codex/collector-i-page-entry-review`（#577）。依据 R-175/R-176、R-168、R-122、R-044 与核心 R39、规格书 §14.5。

`naturalQuest` 在 `room:p012` 且威胁为 `boss:ruins:collector:1` 时选择公开 `deployCollectorI`，与 Prophet / Necromancer 专用分支一致，仅 test-helpers 驱动。

种子 467、Radiant、四核心英雄，从 p019 任务起点自然抽到 Collector，领取补给、探索与普通遭遇、真实部署/开战（F 区三箱）、自然 AI 战斗并获胜，约 191 条公开命令后退出；再经 `beginReturnToHamlet` / `finishReturnToHamlet` 一次支付 3 XP。不注入伤口、牌序、骰点或胜利终态。

部署与开战检查点、回村存档经 JSON 命令日志严格回放；篡改 Boss 伤口或金币拒绝。旧占位出征计划在 `establishImminentThreat` 后按既有 p019 路径升级，组合旧 DL3 / 缺 `campaignLevel` 入口仍完整重放后拒绝篡改。

浏览器冒烟：用正式 `taskSources` 生成同路径的部署存档，页面读取 → 开始战斗 → 保存 → 刷新 → 读取后仍为 `awaitingInitiative`，不注入页面 game 快照。

验证：引擎自然路径 2 测、自然存档浏览器 1 条；与 #577 既有部署/页面/目录测一并交由 PR CI。

范围：单任务 p019 自然入口到胜利回村；不含从三次普通任务取得 Boss 任务、II/III、宝箱翻开奖励、`combatReady` / 任务白名单 / `room:p012 usable` 改动。
