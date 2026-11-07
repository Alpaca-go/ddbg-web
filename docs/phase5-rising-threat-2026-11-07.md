# Rising Threat：Curio 房强制守卫（R-197）

**基线**：`6642721e`（Q-160 关闭后）
**授权 / 依据**：Kyries 2026-11-07 确认（R-197）：Curio 房战斗等价现有 Curio 守卫战路径；守卫战**包含 1 只 II 级怪**；**先抽怪开战，再结算 Curio**。
**范围**：只接 Rising Threat（`quest:p005`）的 Curio 房守卫；不改普通 Curio 房 50% 守卫骰、不动 `usable` / `combatReady`。

## 改动

| 层   | 改动                                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 数据 | `basic-quests.ts` 的 `quest:p005` 增加 `curioRoomsAlwaysGuarded: true`、`curioRoomGuardMonsterLevel: 2`                                             |
| 房间 | `dungeon-curio-room.ts`：该任务进入 Curio 房**不掷守卫骰、不消耗游标**，直接 `stage: "guarded"`；事件注明 Rising Threat（R-197）                     |
| 部署 | `curio-room-guard.ts`：先抽 **1 只 II 级怪**，其余位按本层怪物池补满四姿态；II 级怪不在本层 catalog 时记 `curioRoom.guardInstanceId`，按池外实例处理 |
| 战斗 | `dungeon-battle.ts`：守卫实例允许高于本地牢等级（仅该实例）；池外实例在战前守恒与战后回池中排除；胜利后走既有 `reward → Curio`（先战后 Curio）     |

## 验证

```bash
pnpm exec vitest run packages/engine/src/curio-room-guard.test.ts
pnpm exec vitest run packages/engine/src/natural-quest-paths.test.ts \
  packages/engine/src/b09-curio-natural-paths.test.ts
pnpm typecheck
```

- `curio-room-guard.test.ts`：只有 p005 强制守卫；进入不掷骰；守卫战含 1 只 II 级怪且四姿态填满、牌堆守恒；非 p005 仍按 d10 守卫骰。
- `natural-quest-paths.test.ts`：quest:p005 seed1 真实自然路径通过（战斗交接、牌池守恒、回放）。
- `b09-curio-natural-paths.test.ts`：p005 seeds 1–100 除已知 **Q-19** 停点外无拒绝；p001 全绿。

## 边界（诚实）

- 守卫战会引入 **II 级大怪**；自然路径在个别 seed 会触达 **Q-19**（位移终点切入大型怪两格之间）这一既有待裁定停点。b09 冒烟按已知 hold 容忍 Q-19，其余拒绝仍失败；Q-19 本身未在本切片裁定。
- 守卫战仍可能因**技能效果未接**在 `startDungeonBattle` 拒战（II 级怪技能），本切片不解除该停点。
- 不实现「Curio 房结算顺序」新机制：复用既有「守卫胜利 → reward → 抽 Curio」路径。
