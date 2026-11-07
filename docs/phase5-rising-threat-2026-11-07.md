# Rising Threat：Curio 房强制守卫（R-197）

**基线**：`6642721e`（Q-160 关闭后）
**授权 / 依据**：Kyries 2026-11-07 确认（R-197）：Curio 房战斗等价现有 Curio 守卫战路径；**抽 1 只 II 级怪**；**先抽怪开战，再结算 Curio**。
**范围**：只接 Rising Threat（`quest:p005`）的 Curio 房守卫；不改普通 Curio 房 50% 守卫骰、不动 `usable` / `combatReady`。

## 改动

| 层   | 改动                                                                                                                                                                  |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 数据 | `basic-quests.ts` 的 `quest:p005` 增加 `curioRoomsAlwaysGuarded: true`、`curioRoomGuardMonsterLevel: 2`                                                               |
| 房间 | `dungeon-curio-room.ts`：该任务进入 Curio 房**不掷守卫骰、不消耗游标**，直接 `stage: "guarded"`；事件注明 Rising Threat（R-197）                                      |
| 部署 | 新增 `curio-room-guard.ts`：守卫战从 II 级池抽 **1 只** II 级怪（种子化下标，游标 +1），按该怪姿态放入部署区；`dungeon-monsters.ts` 在普通四姿态部署前分流            |
| 战斗 | 沿用既有 Curio 守卫战路径：`prepareDungeonBattle` → `prepareDungeonMonsters` → `startDungeonBattle`；胜利后 `curioRoom.stage = "reward"` → 结算 Curio（先战后 Curio） |

## 验证

```bash
pnpm exec vitest run packages/engine/src/curio-room-guard.test.ts
pnpm exec vitest run packages/engine/src/dungeon-curio-room.test.ts \
  packages/engine/src/dungeon-monsters.test.ts \
  packages/engine/src/dungeon-quest-entry.test.ts \
  packages/engine/src/dungeon-battle-l2-admission.test.ts
pnpm typecheck
```

- 新增 3 测：只有 p005 强制守卫；进入不掷骰且守卫战只出 1 只 II 级怪（游标 +1、牌堆守恒、事件含卡 id）；非 p005 仍按 d10 守卫骰。
- 既有 Curio 房 / 怪物部署 / 任务入口 / 准入回归通过；数据侧 300 测通过。

## 边界

- 守卫战只抽 1 只怪（不再填满四姿态）；`startDungeonBattle` 仍会因**技能效果未接**拒战（如 II 级怪的未核实技能），本切片不解除该停点。
- 不实现「Curio 房结算顺序」的新机制：复用既有「守卫胜利 → reward → 抽 Curio」路径。
- 不补 Rising Threat 的额外数值/图标；其它任务不受影响。
