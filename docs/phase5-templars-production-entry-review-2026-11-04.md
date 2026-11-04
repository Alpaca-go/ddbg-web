# Templars 正式部署入口审核（R-180）

日期：2026-11-04。基线：main @ R-162 几何已合、Templars Acc 最小运行时已合。**R-180 待 Kyries 确认**（本 PR）。

## 范围

- **本刀**：quest:p017 · `prepareDungeonBattle`（`prepareDarkestObjectiveBossRoom`）→ **`deployTemplarsI`** → 显式 **`startBattle`** → **`finishDungeonBattle`** 最小胜负回地图；对标 Fanatic I（R-178）/ Collector I（R-175）专用 deploy，不用 `prepareDungeonMonsters` + `deployDarkestMidBoss` 占位几何。
- **不做**：Pit Toss、Spikes 结束回合/Shuffle、`combatReady: true`、`usable: true`、扩 `createCoreDungeonQuest` 白名单、Shuffling Horror / Mammoth 生产 deploy、自然任务严格存档 Playwright、II/III、Phase 6。

## 证据

| 项                          | 来源                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| 十四区与部署落点            | R-162、`packages/data/src/normalize/templars-room.ts`                                        |
| 专用 deploy 与 finish       | **R-180**、[rulings.md](rulings.md#r-180)                                                    |
| Impaler 进攻 / Warlord 远程 | `darkest_boss_content.json` quest:p017、`docs/spec` R39                                      |
| 先攻 8（各 Templar 2×2）    | `darkest-mid-boss-deploy.ts` · `expandDarkestMidBossInitiativeDeckSides`                     |
| 命令与存档 schema           | `deployTemplarsI`、`quest-save.ts`                                                           |
| 绑房文案                    | `darkest-mid-boss-runtime.ts` · `deployTemplarsI`                                            |
| 胜负交接                    | `darkest-finish-battle.ts` · `darkestMidBossCombatActive` / `templarsProductionCombatActive` |
| 沙盒按钮                    | `darkest-boss-room-actions.tsx`（仅 Templars）                                               |

## 实现要点

1. **`deployTemplarsI`**（`templars-i-deploy.ts`）：准入与已绑 `room:p022`、`bossEncounterPlan`、四姿态英雄、RNG 游标；Impaler `monster_large:p015` → **M**，Warlord `monster_large:p014` → **C**；英雄 I/F/G/F；`room_tile:p013:front` 十四区；**不**写入 `bossDeployment`。
2. **`prepareDarkestMidBossDeployment`**：quest:p017 **拒绝**，提示走 `deployTemplarsI`。
3. **`deployDarkestMidBoss`**：quest:p017 **拒绝**，避免占位区域回流。
4. **`startBattle` / `finishDungeonBattle`**：复用最暗中途 Boss 既有路径；`combatReady` 保持 false。

## 测试

```bash
pnpm exec vitest run \
  packages/engine/src/boss/templars-i-deploy.test.ts \
  packages/engine/src/boss/templars-i-finish.test.ts \
  packages/engine/src/boss/darkest-mid-boss-runtime.test.ts \
  packages/engine/src/boss/darkest-mid-boss-initiative.test.ts \
  packages/engine/src/darkest-finish-battle.test.ts \
  packages/engine/src/darkest-ordinary-monster-deploy.test.ts
pnpm typecheck
```

- `templars-i-deploy.test.ts`：准入拒绝、十四区、双 Templar 落点、拒绝占位路径、JSON 续接。
- `templars-i-finish.test.ts`：生产路径胜利 `bossQuestVictory` 与全灭停点。
- 既有 p016/p018 仍走 `prepareDungeonMonsters` + `deployDarkestMidBoss`；p017 测试已改接 `deployTemplarsI`。

## 已知限制

- Acc / AI 测试仍可在 R-162 真实区域上运行；Pit Toss 与尖刺区运行时仍 hold。
- 无 quest:p017 自然任务 Playwright（任务池/UI 未启用 basic-quests p017）。
