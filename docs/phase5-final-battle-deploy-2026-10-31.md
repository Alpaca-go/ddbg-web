# 最终战部署 → fighting（占位几何）

相对 #426/#428：只接通 `awaitingDeployment` → `fighting` 的生产命令，不声称最终战完整可玩。

## 已接

- 公开命令 `deployFinalBattleForm`：要求 `finalBattleProvisions === "ready"`、形态进度为 `awaitingDeployment`、无待选/死者饰品；首形态创建 BattleState 并登记当前形态 Boss（及 Ancestor 1 的 Reflections 支援卡），后续形态在同一 BattleState 上移除上一形态怪物、保留英雄伤压/姿态/资源/RNG 游标，状态改为 `fighting`、`dungeon.phase === inBattle`。
- `command.ts`：最终战 `fighting` 期间放行常规战斗命令；`finalBattleProvisions` 存在且已建立形态流程时，冻结普通村庄/探索，仅允许部署、战斗与 `finishDungeonBattle` 形态续接。
- 怪物 admission：`combatReady` 仍为 false 时不跑完整技能探针，只要求目录 Life 与印刷 Dodge；不修改 `darkest_boss_content.json` 的 `combatReady`。
- 网页：`awaitingDeployment` 时提供「部署当前形态（占位几何）」按钮。
- 存档：`deployFinalBattleForm` 加入命令白名单。

## hold / 未接

- **Ancestor Room（room:p025）** 无 `room_tile_geometry` 获批条目；生产路径使用占位 stance 区域（无 `ancestorGlory`、非印刷邻接）。若将来入库 verified 部署，自动改用 `roomTileBattleAreas`。
- 各形态 Boss 技能 AI、特殊能力、`startBattle` 后的完整回合验收仍 hold；未审核能力目录不打开。
- 形态间先攻重洗、Stygian、自然战役全程存档验收、扩展 Boss：未接。

## 待确认

- 占位区域与正式 Ancestor Room 印刷 stance/区域映射对齐方式（Q：最终战几何批核准后是否仍允许占位 fallback）。

## 验证

- `pnpm typecheck`
- `pnpm exec vitest run packages/engine/src/boss/final-battle-deploy.test.ts packages/engine/src/boss/final-form-sequence.test.ts`
