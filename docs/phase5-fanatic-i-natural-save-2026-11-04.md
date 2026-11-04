# Fanatic I 自然任务与严格存档

基线：main @ R-178（#583）、R-179（#584）。依据 R-178、R-169、R-122、R-044 与核心 R39、规格书 §14.5。生产入口见 [phase5-fanatic-i-production-entry-review-2026-11-04.md](phase5-fanatic-i-production-entry-review-2026-11-04.md)。

`naturalQuest` 在 `room:p013` 且威胁为 `boss:ruins:fanatic:1` 时选择公开 `deployFanaticI`，与 Necromancer / Prophet / Collector 专用分支一致，仅 test-helpers 驱动。

种子 23、Radiant、四核心英雄，从 p019 任务起点自然抽到 Fanatic，领取补给、探索与普通遭遇、真实部署/开战（R39 Pyre 落 E）、自然 AI 战斗并获胜，再经 `leaveDungeon` / `summarizeDungeonQuest` 退出；最后 `beginReturnToHamlet` / `finishReturnToHamlet` 一次支付 3 XP。不注入伤口、牌序、骰点或胜利终态。

部署与开战检查点、回村存档经 JSON 命令日志严格回放；篡改 Boss 伤口或金币拒绝。旧占位出征计划在 `establishImminentThreat` 后按既有 p019 路径升级，组合旧 DL3 / 缺 `campaignLevel` 入口仍完整重放后拒绝篡改。

验证：引擎自然路径 2 测；与 #583 / #584 既有部署/页面/目录测一并交由 PR CI。

范围：单任务 p019 自然入口到胜利回村；不含从三次普通任务取得 Boss 任务、Fanatic II/III、`combatReady` / 任务白名单 / `room:p013` 与 `room_tile:p007:front` 的 `usable=false` / 普通 `selectRoomTile` 改动。
