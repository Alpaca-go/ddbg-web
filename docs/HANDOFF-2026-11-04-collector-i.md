# Collector I 交接 · 2026-11-04

主干基线 `b9461330` 已合入 [#575 真实部署](https://github.com/Alpaca-go/ddbg-web/pull/575) 和 [#576 胜负与回村](https://github.com/Alpaca-go/ddbg-web/pull/576)。正式页面和本交接位于 `codex/collector-i-page-entry-review`。

## 已接通

- R-168 / R-175 将 Collector I 绑定到 `room:p012` / `room_tile:p007:back`。I 级 Face the Threat 的实际威胁和出征计划须一致。部署按获批八区落点，保留英雄和 RNG 状态。开战在 F 摆三个宝箱。Collect All 的防御、远程、辅助召唤物分别落 G、E、A，并洗入当前轮三张先攻。
- `finishDungeonBattle` 使用遗迹 I 级共用交接。存活敌人阻止胜利回传。胜利归还未拾取宝箱、清除威胁、记录 Collector 击败，按 R-122 回村支付一次 3 XP。英雄全灭走 R-044。
- R-176 将印刷第 92 页的 Speed 2 和四姿态共用选招表写入正式目录。1–5 为 Show Collection，6–10 为 Life Steal。三个 Collected 原已在正式目录。
- 正式目标房可部署并开始战斗，战后可返回地图。战利品提示显示拾取待确认，拾取入口与引擎拒绝一致。加入 Collector I 前的 `preCollectorTaskSources` 只用于旧档完整重放，验证成功后才升级目录。更早的 Prophet、Necromancer 和 Darkest 目录继续按各自基线重放。
- 自然任务：种子 467、p019、Radiant，从任务起点经 `establishImminentThreat` 抽到 Collector，公开命令探索至部署/开战/胜利回村；部署与开战检查点及回村存档严格回放。详见 [phase5-collector-i-natural-save-2026-11-04.md](phase5-collector-i-natural-save-2026-11-04.md)。

## 仍 hold（不属本 PR 收口）

1. R-168 白色叹号宝箱交互与奖励裁定；引擎 `interactLoot` 在 Collector Room 仍拒绝，仅 R-047 布置与胜利归还。
2. Collector II/III、Fanatic、任务白名单、`combatReady:true` 全局、`room:p012 usable=false`、从普通任务链解锁 Boss 任务的自然战役。

## 接手入口

- [R-168、R-175、R-176](rulings.md) 和[卡面核对](phase5-collector-i-page-entry-review-2026-11-04.md)。
- [专用部署](../packages/engine/src/boss/ruins-i-deploy.ts)、[胜负交接](../packages/engine/src/boss/ruins-i-finish.ts)、[Collector 场景](../packages/engine/src/boss/collector-i-deploy.test.ts)。
- [正式目录及兼容来源](../apps/web/src/dungeon-sandbox/task-sources.ts)、[目录和迁移测试](../apps/web/src/dungeon-sandbox/task-sources.test.ts)、[页面冒烟](../apps/web/e2e/collector-i.spec.ts)。

## 验证

规范化重生 8 测通过，生成差异仅有 `monster_medium.json` 的 Collector I 字段。正式目录、旧档、Collector 部署与交接、遗迹高等级存档、Collector I 自然任务与严格存档共 15 测在单 worker 下通过。Collector I 页面冒烟 2 条（目标房 + 自然存档）通过，typecheck、build 和变动文件 ESLint / Prettier 通过。全量检查交由 PR CI。

私有卡图缓存和工作区已有未跟踪的交接副本、板块记录不随分支提交。
