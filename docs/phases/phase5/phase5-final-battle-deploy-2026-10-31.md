# 最终战部署 → fighting（R-165 生产几何）

相对 #426/#428：接通 `awaitingDeployment` → `fighting` 的生产命令；**#594 后续** 占位 `final-*-*` 已升级为 R-165 印刷区（R-186）。

## 已接

- 公开命令 `deployFinalBattleForm`：要求 `finalBattleProvisions === "ready"`、形态进度为 `awaitingDeployment`、无待选/死者饰品；首形态创建 BattleState 并登记当前形态 Boss（及 Ancestor 1 的 Reflections 支援卡），后续形态在同一 BattleState 上移除上一形态怪物、保留英雄伤压/姿态/资源/RNG 游标，状态改为 `fighting`、`dungeon.phase === inBattle`。
- **R-186**：`room:p025` / `room_tile:p014:back` 十一区；英雄 K/I/K/C、怪物 E/B/A/J；`monsterStanceAreas` 与 Gestating Summon / Absolute Nothingness 等共用。
- `command.ts`：最终战 `fighting` 期间放行常规战斗命令；`finalBattleProvisions` 存在且已建立形态流程时，冻结普通村庄/探索，仅允许部署、战斗与 `finishDungeonBattle` 形态续接。
- 怪物 admission：`combatReady` 仍为 false 时不跑完整技能探针，只要求目录 Life 与印刷 Dodge；不修改 `darkest_boss_content.json` 的 `combatReady`。
- 网页：`awaitingDeployment` 时提供「部署并开始当前形态」按钮（R-165 文案）。
- 存档：`deployFinalBattleForm` 加入命令白名单。

## hold / 未接

- **`usable: false`**：`ancestorGlory` 等特殊区运行时仍不激活（见 R-165 / R-186 边界）。
- 各形态 Boss 技能 AI、特殊能力、`startBattle` 后的完整回合验收仍 hold；未审核能力目录不打开。
- 形态间先攻重洗、Stygian、自然战役全程存档验收、扩展 Boss：未接（先攻 / 第 1 轮见 [initiative 切片](phase5-final-battle-initiative-2026-10-31.md)）。

## 验证

- `pnpm typecheck`
- `pnpm exec vitest run packages/engine/src/boss/final-battle-deploy.test.ts packages/engine/src/boss/final-form-sequence.test.ts`
- 生产入口审核：[phase5-final-battle-production-entry-review-2026-11-04.md](phase5-final-battle-production-entry-review-2026-11-04.md)
