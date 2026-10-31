# A-4 续：最暗中途 Boss 部署后 startBattle / 先攻（2026-10-31）

基线 main `1513cb53`（#434 支持怪身份部署）。在已 `prepareDarkestMidBossDeployment` 之后，接通与最终战 #429/#430 同构的最小生产路径：**显式 `deployDarkestMidBoss` → 显式 `startBattle`**，不自动开战、不宣称技能可玩。

依据：`darkest_boss_content.json`、`darkest-mid-boss-scripts` 的 `combatEntry.printedInitiativeCards`、R36 / R-048 / R39–41；不重做最终形态链。

## 已接

| 步骤 | 命令 | 效果 |
| ---- | ---- | ---- |
| 1 | `prepareDungeonBattle` / `prepareDungeonMonsters` | 不变：绑定专属房间 + 记录 actors / support 身份（#432/#434） |
| 2 | **`deployDarkestMidBoss`** | `awaitingRoom` → `inBattle`；创建占位 `BattleState`（`darkest-mid-boss-*` / `darkest-mid-boss-hero-*` 区域）；写入 actors + support 怪物实体骨架（Life/Dodge 来自目录）；**不**改 `combatReady` |
| 3 | **`startBattle`** | 与普通遭遇战相同洗先攻；`expandDarkestMidBossInitiativeDeckSides` 按脚本 **actors 先攻合计**补额外套 `monster` 侧；第 1 轮 `awaitingInitiative` |

- **Boss 边界不变**：`isBossEncounter` / `resolveEncounterBossScriptId` / `readDarkestMidBossRequiredCombatCardIds` / 胜利谓词仍只认 **actors**；support 仅占实体位、不参与额外套牌计数。
- **hold 文案**：`darkestMidBossDeploymentHold` / 部署 `blockedReason` 改为提示 `deployDarkestMidBoss` + `startBattle`；仍拒绝 `startDungeonBattle` 与普通 26 牌堆路径。
- **命令路由**：`deployDarkestMidBoss` 顶层 dispatch + 存档白名单；`inBattle` 下 `startBattle` / `drawInitiative` 等遭遇战命令与最终战 fighting 一致放行。
- **重复部署**：已 `inBattle` 或已有 `battle` 时拒绝第二次 `deployDarkestMidBoss`。

## hold（B 类 / 本刀不猜）

- 全部 `combatReady: false`；Boss 技能 / 召唤执行 / Room Tile 正式几何 / Speed 选招 AI。
- Echoing Disassembly、Pit Toss d10、White Cell 传送、Undulations 等。
- `finishDungeonBattle` 与最暗牌堆守恒的战后回传（仍依赖 `monsterPool.active`；本刀只验证先攻链）。

## 待确认

- 无新增 Q-xx；support 实体参与基础先攻（每实体 1 侧），额外套牌仅 actors 合计（与 Fanatic/Prophet 扩展模式一致）。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/boss/darkest-mid-boss-initiative.test.ts \
  packages/engine/src/boss/darkest-mid-boss-runtime.test.ts \
  packages/engine/src/boss/final-battle-initiative.test.ts \
  packages/engine/src/darkest-ordinary-monster-deploy.test.ts
```
