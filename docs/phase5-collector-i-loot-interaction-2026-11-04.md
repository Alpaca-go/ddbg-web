# Collector Room 宝箱交互与翻开奖励（R-176）

日期：2026-11-04。基线：main @ R-175 部署合入后。Kyries 令接通 R-168 F 区三宝箱交互，裁定见 **R-176**。

## 范围

- 移除 `interactLoot` 对 `room_tile:p007:back` 的 hold；英雄在同区、当前行动中按既有 R-047 / R-059 翻开并结算。
- `printedLoot.runtimeReady: true`（数据与 `room_tile_geometry.json`）；白色叹号不赋予额外规则（R-168）。
- 开战布置仍走 `readCollectorRoomLootPlacement` + `collectorRoomLootAreaId`（R-175）；有限堆、战后 `closeBattleLoot` 归还未拾取、已拾取 `claimedIds` 守恒不变。

## 不在本刀

- `combatReady`、任务白名单、`room:p012 usable=false`、Collector II/III、Fanatic、正式页面 / 自然存档（#577 切片）。

## 验证

- `packages/engine/src/boss/collector-i-deploy.test.ts`：真实部署 + F 区拾取一枚 + `closeBattleLoot` 九枚回池。
- `packages/engine/src/boss/collector-i-room-runtime.test.ts`：机制夹具三箱逐枚拾取与有限堆。
- `packages/data/src/normalize/collector-room.test.ts`：`runtimeReady` 与几何漂移闸门。

```bash
pnpm test --filter @ddbg/engine collector-i
pnpm test --filter @ddbg/data collector-room
```

## 仍 hold

- Boss 正式准入 / `combatReady`、普通 `selectRoomTile` 进入 Collector Room。
- Collector / Collected 卡字段逐项审批（非本刀）。
- 叹号图面语义（R-168 已明确不推定奖励）。
