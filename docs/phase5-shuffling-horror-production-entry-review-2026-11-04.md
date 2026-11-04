# Shuffling Horror 正式部署入口审核（R-182）

日期：2026-11-04。基线：main @ R-163 几何已合、Shuffling Horror Acc 最小运行时已合。**R-182 待 Kyries 确认**（本 PR）。

## 范围

- **本刀**：quest:p016 · `prepareDungeonBattle`（`prepareDarkestObjectiveBossRoom`）→ **`deployShufflingHorrorI`** → 显式 **`startBattle`** → **`finishDungeonBattle`** 最小胜负回地图；对标 Templars（R-180）/ Fanatic I（R-178）/ Collector I（R-175）专用 deploy，不用 `prepareDungeonMonsters` + `deployDarkestMidBoss` 占位几何。
- **不做**：Echoing Disassembly / Undulations 技能深化、召唤物完整生产、`combatReady: true`、`usable: true`、扩 `createCoreDungeonQuest` 白名单、Mammoth / Ancestor、II/III、Phase 6、自然任务严格存档 Playwright。

## 证据

| 项                                                                    | 来源                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 九区与部署落点                                                        | R-163、`packages/data/src/normalize/shuffling-horror-room.ts`            |
| 专用 deploy 与 finish                                                 | **R-182**、[rulings.md](rulings.md#r-182)                                |
| Boss 进攻 / 目录卡                                                    | `darkest_boss_content.json` quest:p016 · `monster_large:p017` aggressive |
| 先攻 6（4 英雄 + 1 Boss 实体 + 目录 2 张 printed 补 1 张 monster 侧） | `expandDarkestMidBossInitiativeDeckSides` · `initiativeCards: 2`         |
| 命令与存档 schema                                                     | `deployShufflingHorrorI`、`quest-save.ts`                                |
| 绑房文案                                                              | `darkest-mid-boss-runtime.ts` · `deployShufflingHorrorI`                 |
| 胜负交接                                                              | `darkest-finish-battle.ts` · `shufflingHorrorProductionCombatActive`     |
| 沙盒按钮                                                              | `darkest-boss-room-actions.tsx`                                          |

## 实现要点

1. **`deployShufflingHorrorI`**（`shuffling-horror-i-deploy.ts`）：准入与已绑 `room:p023`、`bossEncounterPlan`、四姿态英雄、RNG 游标；`monster_large:p017` 进攻/**H**；英雄 G/I/I/B；`room_tile:p013:back` 九区；**不**写入 `bossDeployment`。
2. **`prepareDarkestMidBossDeployment`** / **`deployDarkestMidBoss`**：quest:p016 **拒绝**，提示走 `deployShufflingHorrorI`。
3. **`startBattle` / `finishDungeonBattle`**：复用最暗中途 Boss 既有路径；`combatReady` 保持 false；开战不预置目录 support 召唤物（Echoing 运行时 hold）。

## 测试

```bash
pnpm exec vitest run \
  packages/engine/src/boss/shuffling-horror-i-deploy.test.ts \
  packages/engine/src/boss/shuffling-horror-i-finish.test.ts \
  packages/engine/src/boss/darkest-mid-boss-runtime.test.ts \
  packages/engine/src/boss/darkest-mid-boss-initiative.test.ts \
  packages/engine/src/darkest-finish-battle.test.ts \
  packages/engine/src/darkest-ordinary-monster-deploy.test.ts
pnpm typecheck
```

## 已知限制

- Acc / 召唤测试仍可在占位或真实区域夹具上运行；Echoing 完整召唤链与 AI 仍 hold。
- 无 quest:p016 自然任务 Playwright（任务池/UI 未启用 basic-quests p016）。
