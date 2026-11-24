# Phase 6：中途 Boss 生产区域与自动回合分派（2026-11-08）

## 背景

中途 Boss 的生产部署（`deployShufflingHorrorI` / `deployMammothCystI` / `deployTemplarsI`）已经使用 `roomTileBattleAreas(tile.data)` 的真实 room tile 区域，但两个专用运行时仍把角色写到占位区域：

- `applyShufflingHorrorUndulations` 把英雄放到 `darkest-mid-boss-hero-*`；
- `applyShufflingHorrorEchoingDisassembly` / `applyMammothCystSummonWhiteCell` 把召唤物放到 `darkest-mid-boss-monster-*`。

生产战斗里这些占位区域不存在，会写入无几何的 areaId。此外 `autoMonsterTurn` / `prepareMonsterAction` 没有把 Shuffling Horror 的 Undulations 分派到专用运行时，自动回合会按普通技能结算（只掉血/压力、不洗姿态）。

## 本次改动

1. **Undulations 只洗姿态，不移动区域**（卡文：shuffle all Hero Stance Cards，starting from the front）。`applyShufflingHorrorUndulations` 现在只改 `stance`，保留原 `areaId`；不再写 `darkest-mid-boss-hero-*`。
2. **召唤物使用生产姿态区域**：`Echoing Disassembly` 与 `Summon White Cell Stalk` 改为 `battle.monsterStanceAreas?.[stance] ?? 占位区域`；生产部署已传入 `monsterStanceAreas: deployment.monsters`。
3. **自动回合分派**：`prepareMonsterAction` 在 Shuffling Horror 选招命中 slot 2（Undulations）时直接调用 `applyShufflingHorrorUndulations`（消耗选招骰），与 Mammoth Revivify 的分派同构；`autoMonsterTurn` 因此能正确执行 Undulations。
4. **自然链帮手**：`naturalQuest` 的 `room()` 在 Boss 胜利但 `phase === "awaitingReplacement"` 时继续处理替补，而不是提前返回；Shuffling Horror 自然存档测试启用 `handleDeaths: true`，覆盖“Boss 战有阵亡但仍胜利”的合法流程。
5. 更新 `darkest-mid-boss-runtime` 的 `wiringHold` 文案（不再写“完整 AI 仍 hold”）。

## 测试

- `darkest-shuffling-horror-combat-runtime.test.ts`：Undulations 断言姿态按 `h2→h1→h3→h0` 重排、英雄区域不变。
- `shuffling-horror-i-deploy.test.ts`：生产几何下 Undulations 不写占位区域；Echoing 召唤物落在 `monsterStanceAreas[stance]`。
- `mammoth-cyst-i-deploy.test.ts`：Summon White Cell Stalk 落在 `monsterStanceAreas[stance]`。
- `shuffling-horror-i-natural-save.test.ts`：自然链（含 Boss 战阵亡 + 替补）严格存档回放通过。
- 相关：Templars / Mammoth 自然链、最终战自然链、player-strategy-act-i、monster-auto-turn 全部通过。

## 边界

- 只改中途 Boss 的生产区域与自动分派；不改房间几何、不改 `usable`/`combatReady`、不改其他 Boss。
- Echoing Disassembly 仍是显式能力命令（不进入姿态骰表）；White Cell Stalk 的召唤仍是“代替技能”的显式能力命令。
- 不改自然策略/种子（R-190）；本次只修正效果执行与死亡后替补流程。
