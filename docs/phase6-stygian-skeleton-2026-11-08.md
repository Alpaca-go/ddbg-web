# Phase 6：Stygian 模式骨架（2026-11-08）

状态：新开 Stygian 战役已按 R-036、R-227～R-229 启用全部 17 张房间卡。

## 已接

1. **模式枚举**：`DungeonState["mode"]` 现在为 `"standard" | "radiant" | "stygian"`；`createCoreDungeonQuest` / `createDungeonSandbox` / 存档 schema（`packages/data/src/quest-save.ts`）都接受 Stygian。
2. **起始金币**：`startingGoldForMode` Stygian = **0**（Standard 10 / Radiant 20，规格书 §16.1）。
3. **Boss +1 Crit**（R-036 / R37）：新增 `boss/stygian-boss-crit.ts`，列出全部正式 Boss 卡（Ruins 四 Boss I–III、Templar Impaler/Warlord、Mammoth Cyst、White Cell Stalk、Shuffling Horror、Ancestor 1/2、Gestating Heart、Heart of Darkness）；不含 Reflections / Pyre / Collected / 召唤物。
   - `battle-monster.ts`、`battle-monster-targets.ts`、`prophet-i-combat-runtime.ts`、`swine-prince-i-combat-runtime.ts` 的怪物战斗上下文都带 `stygianBossCrit`；
   - `resolveSkill` 的暴击阈值在 Stygian Boss 上 +1。
4. **入口与补给**：Ruins Boss 部署守卫、`dungeon-starting-provisions` 都接受 Stygian。补给和探索骰沿用标准模式数量（探索每英雄 2 颗，侦察后 1 颗）。
5. **房间效果**：遗迹 9 张与最暗地牢 8 张按 R-036 替换同名卡，Boss 房按对应专用流程部署。效果及结算顺序见[逐卡审核表](phase6-stygian-rooms-review-2026-11-08.md)。
6. **存档**：新战役在起点记录 `stygianRoomRules: "full"`。`r229` 回放三张房间，`r227` 回放首批两张房间，缺省值回放标准房间。

## 测试

- `boss/stygian-boss-crit.test.ts`：Boss 卡集合（含排除项）、+1 Crit 把同一骰面从命中推成暴击。
- `dungeon-quest-entry.test.ts`：Stygian 起始 0 金。
- `necromancer-i-deploy` / `prophet-i-deploy`：不再拒绝 Stygian。
- `dungeon` / `dungeon-starting-provisions` / `dungeon-provision-integration` / `quest-save` 全过。

- `stygian-room-effects.test.ts` 核对 17 张卡均覆盖正式板块区域，回归数值、目标条件、状态和结算顺序。`darkest-ordinary-initiative.test.ts` 覆盖最暗房间正式入口，`quest-save.test.ts` 覆盖四个存档口径。
