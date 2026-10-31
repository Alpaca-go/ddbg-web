# A-7 任务指定怪物生成执行器

#422 已按 Kyries「合入，然后继续」合入 main；本刀在 #421 数据计划与 #422 入口保护之上接通 **指定生成执行器**，仍不声称 Break Them / They Are Back 可完整游玩。

## 行为

- `prepareDungeonMonsters` 在 QUEST p9/p13 目标房读取 `readQuestMonsterPlan`，调用 `prepareQuestMonsterDeployment`：按计划放入 Bone Bearer（印刷 III 级）或 Bone Captain（Life +20、Dodge +2），They Are Back 的 `printedMonsterLevel` 仍为 null。
- 不洗牌、不消耗 RNG、不填满四姿态、不推断额外生成或牌堆去向（R-048、计划边界与 #421 一致）。
- III 级 Bone Bearer 在 II 级任务中从 L3 牌池取真实实例；该实例不计入当前 DL remaining，由 `questMonsterOutsidePoolInstanceIds` 与 `partitionsValid` 扩展守恒。
- `questMonsterDeploymentHold`：未按计划部署时仍拒绝普通随机遭遇（#422）；已按计划部署时改为 **combatReady: false** 停点，不进入半场战斗。
- `startDungeonBattle` 在将来批准战斗字段前仍拒绝；已预留任务加成与印刷等级例外（`readQuestMonsterStatBonuses`、`allowPrintedLevel`），默认不改动 `combatReady`。

## 不做

- 不发明 Speed / 选招 / 几何；Bone Bearer 目录仍标 `missingBattleFields`。
- 不开放完整任务 SPECIAL 或跨幕自然验收。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/quest-monster-spawn.test.ts \
  packages/engine/src/quest-monster-deployment.test.ts \
  packages/data/src/quest-monster-plan.test.ts
```

相对 #421/#422 只接生成执行器；不修改网页与存档 schema。
