# A-4 切片：最暗中途 Boss 运行时接线（2026-10-31）

基线 main `3df930d`（#431 指定怪物生成）。Kyries：**B 类 hold；优先核心包已有目录的运行时接通**；不声称最暗 Boss 完整可玩。

依据：`darkest_boss_content.json` / `darkest_boss_abilities.json`、规格书 §14.5–14.7（R39–41）、R-120/R-048/R-36；不重做 #423–#430 最终形态链。

## 已接

| 任务 | 脚本 id | 专属房间 | 目录主体 |
| ---- | ------- | -------- | -------- |
| quest:p016 | `boss:darkest:shuffling-horror` | room:p023 | Shuffling Horror + 支持卡引用 Cultist Priest / Malignant Growth |
| quest:p017 | `boss:darkest:templars` | room:p022 | Templar Impaler + Templar Warlord |
| quest:p018 | `boss:darkest:mammoth-cyst` | room:p024 | Mammoth Cyst + White Cell Stalk 能力引用 |

- **身份注册**：`ensureDarkestMidBossScriptsRegistered` + `bossQuestScriptId` 静态映射；`combatEntry` 来自内容目录（先攻合计、主战斗卡/能力卡 id）。
- **目标房 `prepareDungeonBattle`**：`prepareDarkestObjectiveBossRoom` 绑定专属房间牌，写入 `darkest.bossEncounterPlan` 与 `roomCards.active` 停点。
- **部署 `prepareDungeonMonsters`**：`prepareDarkestMidBossDeployment` 按目录记录 Boss 棋子身份（占位区域，不消费 26 张最暗怪物牌堆）；Templars 要求两只均已部署后 `resolveEncounterBossScriptId` / `isBossEncounter` 生效（第 4 轮撤退豁免链与 #332 一致）。
- **胜利边界**：沿用 #405 `darkestBossVictoryAfterEncounter`（未改语义）。

## hold（B 类 / 未审，本刀不猜）

- 全部 `combatReady: false`（内容 JSON 与脚本 notes）。
- Room Tile 几何、印刷部署、Speed/选招/图标、技能与特殊能力执行（Echoing Disassembly、Pit Toss d10、White Cell Stalk 传送、Undulations 等）。
- 支持召唤物实际生成与先攻洗牌；占位 `areaId` 非获批板块。
- 普通最暗非目标房怪物部署；从停点进入 `BattleState` 的生产路径。

## 待确认

- 无新增 Q-xx；Templar Warlord 空能力卡面仍仅目录占位，脚本 `combatEntry` 以 Impaler 为主引用（与 Ruins 双体 Boss 未接前一致）。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/boss/darkest-mid-boss-runtime.test.ts \
  packages/engine/src/boss/darkest-content.test.ts \
  packages/engine/src/boss/quest-bridge.test.ts \
  packages/engine/src/boss/encounter-rules.test.ts \
  packages/engine/src/darkest-setup.test.ts
```

They Are Back Life+20/Dodge+2：#431 已在 `readQuestMonsterStatBonuses` / 部署文案接通，本刀未改。
