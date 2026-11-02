# Ancestor 2 · Absolute Nothingness 支援数据（待确认：无独立战斗卡）

依据 `boss_ability:p035`（Boss Abilities 第 35 页）与核心盒规则书 R40 / 最终战布置原文：Absolute Nothingness **不可被选为目标**，但仍占据各自区域一格；布置为怪物防御 / 远程 / 支援区域各 1 枚。R-048：未在印刷 Monster 卡上核实的 HP/Dodge/技能不入库。

## 调查结论（待确认 Q-AN-001）

在仓库现有 **raw / parsed / normalized** 怪物管线中**未找到**名为 `Absolute Nothingness` 的 Monster & Boss **战斗卡**条目：

| 检索范围                                                  | 结果                                                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `extract/corebox/raw/monster_medium.json`（PDF 页 1–111） | 末页为 `Imperfect Reflection`（p109–111 为副本页）；无 Absolute Nothingness                    |
| `extract/corebox/raw/monster_large.json`（页 1–20）       | 含 Ancestor 2（p018），无 Absolute Nothingness                                                 |
| `extract/corebox/raw/boss_ability.json`                   | 仅 p035 能力文提及 Absolute Nothingness                                                        |
| `extract/corebox/raw/punchboard_*.json`                   | 无文本命中（组件为棋子，非卡面转录）                                                           |
| 规则书 `DD_EN_COREBOX_RULES.pdf` 组件表                   | **「3x Absolute Nothingness」棋子**；布置步骤写 “Find the Absolute Nothingness **miniatures**” |

对照 Reflections：`monster_medium:p106` / `p109` 有完整战斗卡并挂到 Ancestor 1 `supportCardIds`。Absolute Nothingness 与 R-396 一致：**不拥有独立 Boss Abilities 卡**，亦**不在** 168 张 Monster & Boss Cards reconciliation 内。

**因此本刀不伪造** `monster_medium:*` / `monster_large:*` 卡面；`supportCardIds` 保持 `[]`，待 Kyries 确认是否存在未入库的印刷卡或仅棋子建模方式后再接卡 id。

## 本刀数据产出

| 产物                                                   | 说明                                                                                                                                                                             |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `normalized/corebox/absolute_nothingness_support.json` | 目录：`status: pending_monster_card`，`miniatureCount: 3`，`abilityCardId: boss_ability:p035`，`bossActorCardId: monster_large:p018`，`supportCardIds: []`，`combatReady: false` |
| `packages/data/src/absolute-nothingness-support.ts`    | Zod schema、`buildAbsoluteNothingnessSupport`、`findAbsoluteNothingnessMonsterCards`、`readAbsoluteNothingnessSupport`                                                           |
| `darkest_boss_content` ancestor2                       | `supportCardIds` 与上述目录同步（当前为空数组）                                                                                                                                  |

## 与 p035 关系

- 规则文本在 `boss_ability:p035` / `darkest_boss_abilities.json`，不在怪物战斗卡。
- 目录 `placements` 固定为 `monster_defense` / `monster_ranged` / `monster_support` 各一，与规格书 §14.7 第 2 形态一致。

## 明确未接运行时

- Absolute Nothingness **不可选中 / untargetable** 战斗规则
- 三枚棋子在 Room Tile 上的**占位执行器**与几何
- Ancestor 2 除 Swift Teleportation 外的技能、Impending Doom、Pit Toss 等
- `combatReady: true`、先攻洗入/移除、形态切换部署

## 验证

- `absolute-nothingness-support.test.ts`：探测无卡、ancestor2 引用一致、缺能力卡/错页码/重复 identity 拒绝
- `pnpm --filter @ddbg/data test` 相关用例；typecheck / lint
