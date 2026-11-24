# A 切片：最暗普通房 26 牌堆部署接线（2026-10-31）

基线 main `bb659454`（#432 最暗中途 Boss 已合）。Kyries：**B 类 hold；优先核心包已有目录的运行时接通**；不声称最暗普通遭遇可玩。

依据：`darkest_monster_pool.json` / `dungeon.darkest.monsterDeck`（#404）、规格书 R35–36 / §14.7、R-048 / R-001。

## 已接

- **入口**：非目标 guarded 房须先 `prepareDarkestRoom` 绑定 `roomCards.active`（无 `tileId`），再 `prepareDungeonMonsters`。
- **抽牌**：从任务入口洗牌后的 `monsterDeck`（26 实例）按牌堆顺序真实抽满四姿态；写入 `darkest.monsterDeckRemaining` / `monsterDeckDiscarded` 与 `darkest.ordinaryDeployment`（`verified: false`、占位 `darkest-ordinary-*` areaId）。
- **停点**：`battleReady: false`、缺 Speed/选招、Room Tile 几何未获批 → `blockedReason` + `darkestOrdinaryDeploymentHold`；`startDungeonBattle` 显式拒绝。
- **隔离**：目标房仍走 #432 `prepareDarkestMidBossDeployment`，不消费 26 张牌堆。

## hold（B 类 / 未审，本刀不猜）

- 获批 Room Tile 板块与印刷部署几何。
- Speed / stanceGroups / 技能执行与 `battleReady: true`。
- 占位 areaId 不可当作可战板块。
- Rising Threat、Stygian、扩展 Boss、最终战链（沿用既有 hold）。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/darkest-ordinary-monster-deploy.test.ts \
  packages/engine/src/darkest-setup.test.ts \
  packages/engine/src/boss/darkest-mid-boss-runtime.test.ts
```
