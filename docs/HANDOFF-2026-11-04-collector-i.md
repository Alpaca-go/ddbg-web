# Collector I 交接 · 2026-11-04

主干基线 [`2522450`](https://github.com/Alpaca-go/ddbg-web/commit/2522450833b1e9aa111e1adb4968fed906b4059b) 已合入 [#577 Collector I 正式页面与自然存档（R-176）](https://github.com/Alpaca-go/ddbg-web/pull/577) 与 [#578 Collector Room 宝箱交互（R-177）](https://github.com/Alpaca-go/ddbg-web/pull/578)。更早的 [#575 真实部署（R-175）](https://github.com/Alpaca-go/ddbg-web/pull/575)、[#576 胜负与回村](https://github.com/Alpaca-go/ddbg-web/pull/576) 见 `b9461330` 链。

## 已接通

- R-168 / R-175：`room:p012` / `room_tile:p007:back` 图面绑定；I 级 Face the Threat 的实际威胁与出征计划须一致。专用 **`deployCollectorI`**（[`ruins-i-deploy.ts`](../packages/engine/src/boss/ruins-i-deploy.ts)）按获批八区落点部署，保留英雄和 RNG 状态；显式 `startBattle` 在 F 摆三个独立宝箱。Collect All 的防御、远程、辅助召唤物分别落 G、E、A，并洗入当前轮三张先攻。
- **R-177**：F 区三宝箱已接通 `interactLoot` 与 R-047 / R-059 翻开奖励；白色叹号仅图面外观（R-168）。详见 [phase5-collector-i-loot-interaction-2026-11-04.md](phase5-collector-i-loot-interaction-2026-11-04.md)。
- `finishDungeonBattle` 使用遗迹 I 级共用交接。存活敌人阻止胜利回传。胜利归还未拾取宝箱、清除威胁、记录 Collector 击败，按 R-122 回村支付一次 3 XP。英雄全灭走 R-044。
- **R-176**（#577）：印刷第 92 页的 Speed 2 和四姿态共用选招表写入正式目录。1–5 为 Show Collection，6–10 为 Life Steal。三个 Collected 原已在正式目录。
- 正式目标房可 **`deployCollectorI` 部署**并开始战斗，战后可返回地图；战斗中可在 F 区同区翻开拾取宝箱（与引擎一致）。加入 Collector I 前的 `preCollectorTaskSources` 只用于旧档完整重放，验证成功后才升级目录。更早的 Prophet、Necromancer 和 Darkest 目录继续按各自基线重放。
- 自然任务：种子 467、p019、Radiant，从任务起点经 `establishImminentThreat` 抽到 Collector，公开命令探索至部署/开战/胜利回村；部署与开战检查点及回村存档严格回放。详见 [phase5-collector-i-natural-save-2026-11-04.md](phase5-collector-i-natural-save-2026-11-04.md)。

## 仍 hold（文档刀不改运行时准入）

以下项**保持现状**，不在文档同步 PR 中改数据或引擎准入：

1. **`combatReady`**：Collector 与最暗 Boss 相关 encounter 仍 `combatReady: false`（R-048）。
2. **任务白名单**：不扩 `createCoreDungeonQuest`；Collector I 仍经获批任务源 / 威胁脚本与专用部署进入。
3. **`room:p012` 与 `room_tile:p007:back` 的 `usable=false`**：数据闸门不变；不靠改 usable 开放普通参战。
4. **普通 `selectRoomTile` 进 Collector Room**：`room:p012` 因 **`boss:true`** 在 `selectRoomTile` 首层拒绝（「Boss房间留对应阶段，不开放普通战斗入口」）；若仅看板块，`room_tile:p007:back` 仍 **`usable=false`**。Boss 战须走 `deployCollectorI` 等专用路径，不能当普通房间 tile 选入。
5. **Collector II/III、Fanatic** 与其余 Boss 分切片。
6. **从普通任务链自然解锁 Boss 任务**的完整战役（当前自然存档用获批 p019 + 威胁脚本，不冒充全链解锁）。

R-168 白色叹号**不推定额外规则语义**；F 区交互与有限堆奖励已由 R-177 接通，与叹号图面含义无关。

## 接手入口

- [R-168、R-175、R-176、R-177](rulings.md) 和[卡面核对](phase5-collector-i-page-entry-review-2026-11-04.md)。
- [专用部署](../packages/engine/src/boss/ruins-i-deploy.ts)、[胜负交接](../packages/engine/src/boss/ruins-i-finish.ts)、[Collector 场景](../packages/engine/src/boss/collector-i-deploy.test.ts)、[宝箱运行时](../packages/engine/src/boss/collector-i-room-runtime.test.ts)。
- [正式目录及兼容来源](../apps/web/src/dungeon-sandbox/task-sources.ts)、[目录和迁移测试](../apps/web/src/dungeon-sandbox/task-sources.test.ts)、[页面冒烟](../apps/web/e2e/collector-i.spec.ts)。

## 验证

规范化重生 8 测通过，生成差异仅有 `monster_medium.json` 的 Collector I 字段。正式目录、旧档、Collector 部署与交接、遗迹高等级存档、Collector I 自然任务与严格存档、R-177 宝箱交互相关测在单 worker 下通过。Collector I 页面冒烟 2 条（目标房 + 自然存档）通过，typecheck、build 和变动文件 ESLint / Prettier 通过。全量检查交由 PR CI。

私有卡图缓存和工作区已有未跟踪的交接副本、板块记录不随分支提交。
