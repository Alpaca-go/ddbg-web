# A-4 续：最暗中途 Boss 支持怪身份部署（2026-10-31）

基线 main `b078698`（#433 最暗普通房 26 牌堆）。在 #432 中途 Boss 最小运行时上，把 `darkest_boss_content.json` 的 `supportCardIds` 接到 `bossDeployment` 身份记录；**仍 `combatReady: false`**，不进入半场战斗。

依据：`darkest_boss_content.json`（p016/p017/p018）、战斗目录 `type_position_tags`、R-048 / R36 / R39–41。

## 已接

| 任务 | Boss 主体（actors） | supportCardIds（目录） |
| ---- | ------------------- | ---------------------- |
| quest:p016 | Shuffling Horror | Cultist Priest、Malignant Growth |
| quest:p017 | Templar Impaler + Warlord | （无） |
| quest:p018 | Mammoth Cyst | White Cell Stalk |

- **`prepareDarkestMidBossDeployment`**：除 Boss 棋子外，按目录追加 `supportMonsters: SpawnPlacement[]`。
  - 前后排 / 占格来自 `battleCatalog.monsters[].type_position_tags`；缺字段 → R-048 拒绝。
  - `verified: false`；`areaId` 沿用 `darkest-mid-boss-*` 占位，非获批 Room Tile 几何。
  - stance：在 actors 已占 stance 之外按 defensive → ranged → support → aggressive 分配（与最终战 support 占位策略一致，非印刷部署）。
- **Boss 遭遇 / 胜利边界不变**：`readDarkestMidBossRequiredCombatCardIds`、`readDarkestMidBossDeployedCardIds`、`darkestBossVictoryAfterEncounter` 仍仅看 **actors**；support 不计入 `isBossEncounter` 所需卡集合（Templars 仍须两只 Boss 本体）。
- **文案**：部署后 hold 改为「支持怪 … 已记录身份（verified: false；技能召唤执行 hold）」；房间绑定前仍为「目录召唤物 … 未部署」。

## hold（本刀不猜）

- 全部 `combatReady: false`；不能 `startDungeonBattle` 进入 `BattleState`。
- Echoing Disassembly / Pit Toss / White Cell 传送 / Undulations 等技能与召唤**执行**。
- 支持怪先攻洗牌、印刷 stance 与 Room Tile 板块几何。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/boss/darkest-mid-boss-runtime.test.ts \
  packages/engine/src/boss/darkest-content.test.ts \
  packages/engine/src/boss/encounter-rules.test.ts \
  packages/engine/src/darkest-setup.test.ts
```
