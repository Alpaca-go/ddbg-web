# A 续：最暗遭遇 finishDungeonBattle / 牌堆回传（2026-10-31）

基线 main `01bb6534`（#436 最暗普通 deploy→startBattle/先攻）。在 #435/#436 先攻链之上接通 **`finishDungeonBattle` 战后回传**，使普通 26 堆与中途 Boss 半场在胜利/撤退后能离开 `inBattle`；**不**改 `battleReady` / `combatReady`，不实现技能 AI。

依据：R25 / R36 / R-048 / R-001；`darkestBossVictoryAfterEncounter` 语义不变（#405）。

## 已接

| 路径           | 识别                          | 战后                                                                                                                                                                       |
| -------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **普通最暗房** | `darkestOrdinaryCombatActive` | 清 `ordinaryDeployment`；**胜利**时遭遇实例 id 并入 `monsterDeckDiscarded`；**撤退**时遭遇 id 回到 `monsterDeckRemaining`；26 张守恒                                       |
| **中途 Boss**  | `darkestMidBossCombatActive`  | 清 `bossDeployment`；**不**读写 `monsterDeckRemaining` / `discarded` / `monsterDeck`；actors 全灭且 victory 时仍走 `bossQuestVictory` / `darkestBossVictoryAfterEncounter` |

- **入口**：`finishDungeonBattle` 在检测到最暗半场时转 `finishDarkestDungeonBattle`，**不**再要求 `monsterPool.active` 或 Ruins `partitionsValid`。
- **共用**：英雄/补给/RNG/房间牌弃置、宝藏 +20、撤退 `mustLeaveRoomId`、Curio 续接与 Ruins 同构；不含 Ruins 威胁洗回 `monsterPool`。
- **拒绝**：最暗英雄全灭停点（`heroesDefeated`）暂不接回传，保持停点。

## hold / 待确认

- **B 类**：Room Tile 正式几何、Speed/选招、怪物与 Boss 技能 AI、`battleReady`/`combatReady` 批准。
- **待确认**：最暗任务四名英雄全灭是否沿用 Ruins 替补交接（本刀整支拒绝，不猜 R-044 边界）。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/darkest-finish-battle.test.ts \
  packages/engine/src/darkest-ordinary-initiative.test.ts \
  packages/engine/src/boss/darkest-mid-boss-initiative.test.ts
```
