# Mammoth Cyst 正式部署入口审核（R-184）

日期：2026-11-04。基线：main @ R-164 几何已合、Mammoth Cyst Acc 最小运行时已合。**R-184 待 Kyries 确认**（本 PR）。

## 范围

- **本刀**：quest:p018 · `prepareDungeonBattle`（`prepareDarkestObjectiveBossRoom`）→ **`deployMammothCystI`** → 显式 **`startBattle`** → **`finishDungeonBattle`** 最小胜负回地图；对标 Shuffling Horror（R-182）/ Templars（R-180）/ Fanatic I（R-178）专用 deploy，不用 `prepareDungeonMonsters` + `deployDarkestMidBoss` 占位几何。
- **不做**：White Cell 开战预置、紫星 d10 落区、Speed·stance 目录页、`combatReady: true`、`usable: true`、扩 `createCoreDungeonQuest` 白名单、Ancestor、自然任务严格存档 Playwright、II/III、Phase 6。

## 证据

| 项                                                                    | 来源                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 十二区与部署落点                                                      | R-164、`packages/data/src/normalize/mammoth-cyst-room.ts`                |
| 专用 deploy 与 finish                                                 | **R-184**、[rulings.md](rulings.md#r-184)                                |
| Boss 进攻 / 目录卡                                                    | `darkest_boss_content.json` quest:p018 · `monster_large:p016` aggressive |
| 先攻 6（4 英雄 + 1 Boss 实体 + 目录 2 张 printed 补 1 张 monster 侧） | `expandDarkestMidBossInitiativeDeckSides` · `initiativeCards: 2`         |
| 命令与存档 schema                                                     | `deployMammothCystI`、`quest-save.ts`                                    |
| 绑房文案                                                              | `darkest-mid-boss-runtime.ts` · `deployMammothCystI`                     |
| 胜负交接                                                              | `darkest-finish-battle.ts` · `mammothCystProductionCombatActive`         |
| 沙盒按钮                                                              | `darkest-boss-room-actions.tsx`                                          |

## 实现要点

1. **`deployMammothCystI`**（`mammoth-cyst-i-deploy.ts`）：准入与已绑 `room:p024`、`bossEncounterPlan`、四姿态英雄、RNG 游标；`monster_large:p016` 进攻/**H**；四英雄均 **K**；`room_tile:p014:front` 十二区；**不**写入 `bossDeployment`。
2. **`prepareDarkestMidBossDeployment`** / **`deployDarkestMidBoss`**：quest:p018 **拒绝**，提示走 `deployMammothCystI`。
3. **`startBattle` / `finishDungeonBattle`**：复用最暗中途 Boss 既有路径；`combatReady` 保持 false；开战不预置目录 support 召唤物（White Cell 运行时 hold）。

## 测试

```bash
pnpm exec vitest run \
  packages/engine/src/boss/mammoth-cyst-i-deploy.test.ts \
  packages/engine/src/boss/mammoth-cyst-i-finish.test.ts \
  packages/engine/src/boss/darkest-mid-boss-runtime.test.ts \
  packages/engine/src/boss/darkest-mid-boss-initiative.test.ts \
  packages/engine/src/darkest-finish-battle.test.ts \
  packages/engine/src/darkest-ordinary-monster-deploy.test.ts
pnpm typecheck
```

## 已知限制

- Acc / 召唤测试在 R-164 真实区域上运行；White Cell Teleport 与紫星运行时仍 hold。
- 无 quest:p018 自然任务 Playwright（任务池/UI 未启用 basic-quests p018）。
