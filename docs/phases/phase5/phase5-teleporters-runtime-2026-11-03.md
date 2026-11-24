# Teleporters 运行时（2026-11-03）

## 切片

- **数据**：`teleporters.ts` 与 `room_tile_geometry.json` 将 `room:p019` 设为 `usable:true`、四区橙星 `teleporters` 均 `runtimeReady:true`；实体边仍仅 A-D、B-C、E-H、F-G（R-159 边界）。
- **参战闸门**：`selectRoomTile` / `readRoomTile` 对 `room:p019` 返回 `matched`（R-048）；核心盒 `usable` 面数 14→15（仅本面）。
- **移动与攻击（R-159）**：`roomTileBattleAreas` 投影 `teleporter` 后，`withTeleporterAdjacency` 在 A/C/F/H 间追加虚拟邻接（不写入 `tile.edges`）；`distance` / `moveHero` / `moveMonsterToRange` / 技能射程沿用既有邻接图。
- **压力（R-159）**：英雄 `moveHero` 路径上每个橙星区步数各触发压力 +1（`df38279161`，走 `triggerBattlePassive`）；怪物移动不触发。

## 裁定

- **R-159**：橙星间可移动与攻击；英雄穿过橙星区压力 +1；橙星链接与实体通路分离建模。
- **Q-145（已确认，R-203）**：
  - 仅统计 `moveHero.path` 中的橙星区，不含起点，含落点；路径上每区各 +1。
  - Shuffle / Pull / 怪物位移等未走 `moveHero` 的路径不计「穿过」。
  - 同一移动内多次经过同一橙星区逐次计压，不去重。

## 测试

```bash
pnpm exec vitest run \
  packages/data/src/normalize/teleporters.test.ts \
  packages/data/src/normalize/room-tile-selection.test.ts \
  packages/engine/src/battle-teleporters.test.ts
```
