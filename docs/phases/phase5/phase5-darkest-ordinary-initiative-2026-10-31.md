# A 续：最暗普通房部署后 startBattle / 先攻（2026-10-31）

基线 main `f8188567`（#435 中途 Boss deploy→startBattle/先攻）。在 #433 **26 牌堆** `ordinaryDeployment` 之后，接通与 #435 同构的最小生产路径：**显式 `deployDarkestOrdinaryEncounter` → 显式 `startBattle`**，不自动开战、不宣称技能可玩。

依据：`darkest_monster_pool.json`、R36 / R-048 / R-001；不消费 mid-boss 部署、不用 26 堆替代 Boss。

## 已接

| 步骤 | 命令                                              | 效果                                                                                                                                                                                                |
| ---- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `prepareDungeonBattle` / `prepareDungeonMonsters` | 不变：非目标房从 26 张牌堆抽身份（#433）                                                                                                                                                            |
| 2    | **`deployDarkestOrdinaryEncounter`**              | `awaitingRoom` → `inBattle`；占位 `BattleState`（`darkest-ordinary-*` / `darkest-ordinary-hero-*`）；四姿态实体来自已抽 `ordinaryDeployment`（Life/Dodge 来自目录，缺则拒）；**不**改 `battleReady` |
| 3    | **`startBattle`**                                 | 与普通遭遇相同洗先攻（每实体 1 侧，**不**用 mid-boss actors 额外套牌）；第 1 轮 `awaitingInitiative`                                                                                                |

- **隔离**：目标房仍 `prepareDarkestMidBossDeployment` / `deployDarkestMidBoss`；`deployDarkestOrdinaryEncounter` 拒绝 objective 房与 Boss 部署房。
- **hold 文案**：`darkestOrdinaryDeploymentHold` / 部署 `blockedReason` 提示 `deployDarkestOrdinaryEncounter` + `startBattle`；仍拒绝 `startDungeonBattle`。
- **命令路由**：顶层 dispatch + 存档白名单；`inBattle` 下遭遇战命令与 mid-boss / 最终战一致。
- **牌堆守恒**：部署阶段已定；本刀不重抽 `monsterDeckRemaining` / `discarded`。

## hold（B 类 / 本刀不猜）

- 全部 `battleReady: false`；Speed / 姿态选招 / 怪物技能 AI / Room Tile 正式几何。
- `finishDungeonBattle` 与最暗 26 堆战后回传（仍 hold）。

## 待确认

- 无新增 Q-xx。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/darkest-ordinary-initiative.test.ts \
  packages/engine/src/darkest-ordinary-monster-deploy.test.ts \
  packages/engine/src/boss/darkest-mid-boss-initiative.test.ts
```
