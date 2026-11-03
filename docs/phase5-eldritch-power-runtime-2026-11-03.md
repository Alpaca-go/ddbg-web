# Eldritch Power Chamber 运行时（2026-11-03）

## 切片

- **数据**：`eldritch-power-chamber.ts` 与 `room_tile_geometry.json` 将 `room:p018` 设为 `usable:true`、橙星 `eldritchPower` 区域 `runtimeReady:true`；几何与部署不变。
- **参战闸门**：`selectRoomTile` / `readRoomTile` 对 `room:p018` 返回 `matched`（R-048）。
- **移动（R-158）**：`moveMonsterToRange` 在怪物需要进射程时，于合法落点中优先靠近区域 C（`eldritchPower`）；已在射程内原地定位、英雄移动与其它强制位移不受影响。
- **回合结束（R-158）**：怪物在 C 结束回合时，每名存活英雄受到 5 点伤害（`icon:8d4bbe5e11`，走环境伤害而非压力）；按单只怪物分别触发。

## 裁定

- **R-158**：卡文两段效果与橙星区域 C 对应；不外推为所有移动或整轮一次伤害。
- **待确认**：路径平手时的玩家选择顺序、伤害减免与 Protection 叠算若与官方流程有差异，需另开 Q 项；当前沿用引擎 `resolveAttackDamage` 与 `applySkillHealth` 既有路径。

## 测试

```bash
pnpm exec vitest run \
  packages/data/src/normalize/eldritch-power-chamber.test.ts \
  packages/data/src/normalize/room-tile-selection.test.ts \
  packages/engine/src/battle-eldritch-power.test.ts
```
