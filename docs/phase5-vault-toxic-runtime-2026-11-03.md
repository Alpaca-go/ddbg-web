# Eldritch Vault / Toxic Chamber 运行时（2026-11-03）

## 切片

- **数据**：`eldritch-vault.ts`、`toxic-chamber.ts` 与 `room_tile_geometry.json` 将两面 `usable:true`、全部 specialRegions `runtimeReady:true`；不改几何拓扑（相对本分支 tip 已含 #551 Toxic 几何）。
- **参战闸门**：`selectRoomTile` / `readRoomTile` 对 `room:p016`、`room:p017` 返回 `matched`（R-048）。
- **Toxic Vapors（R-157）**：`battle-monster-movement` 投影 `toxicVapors`；英雄在 A/B/C/E 站立时 `standingAccuracyPenalty: -3`（`hero-skill.ts` 命中阈值）。
- **Eldritch Vault（R-156）**：E 区命令 `eldritchVault`；花 2 行动后按在场英雄数逐张从 III 级牌堆抽饰品（`drawTrinketAtLevel` + `withTrinketLevelPartition`）；装备选项结算压力 +2；逐张处理以保持牌堆守恒（R26/R32/R35）。

## 裁定

- **R-156**：E 区 2 行动、每人抽 1 张 L3 饰品、装备承受压力 +2（卡文 `df38279161` +2）。
- **R-157**：A/B/C/E 站立 Acc −3。
- **Q-141（待确认）**：多张抽牌是否必须全部处置、重复交互次数、压力目标是否仅限装备者——当前实现为逐张标准饰品获得流 + 仅 `equip` 选项对装备者 +2 压力。

## 测试

```bash
pnpm exec vitest run \
  packages/data/src/normalize/eldritch-vault.test.ts \
  packages/data/src/normalize/toxic-chamber.test.ts \
  packages/data/src/normalize/room-tile-selection.test.ts \
  packages/engine/src/battle-toxic-vapors.test.ts \
  packages/engine/src/battle-eldritch-vault.test.ts
```

与 #551 / #552 关系：几何已在 `main`（Toxic #551、Power Chamber #552）；本 PR 仅补 Vault/Toxic 运行时与 `usable` 闸门。
