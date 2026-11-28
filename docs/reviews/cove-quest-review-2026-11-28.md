# Cove I 级普通任务印刷目录审阅稿

状态：**2026-11-28 资料刀**——仅 I 级五张印刷目录与 FRONT-only raw；**未**写入 `basicQuests`、**未**接出征或 Cove 地点战役。

依据：单包 `MG_DD_05_EN_COVE`、`DD_EN_COVE_CARDS_70_120_quests_FRONT.pdf`（15 页）；R-001、R-048。不使用 The Darkest Heroes 合并册。

## 背面 PDF（BACK）

| 项目                                      | 状态                                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `DD_EN_COVE_CARDS_70_120_quests_BACK.pdf` | **盒内与本仓库均未收录**；`extract/extension/cove/raw/quest.json` 的 `sources[0].back` 为 `null`，卡牌无 `faces.back`   |
| 等级判据（本刀）                          | 正面首行 `{icon:e1c34ea8a2} I\|II\|III`（与 Weald 正面等级徽同类，**待 Kyries 单独裁定**，未编 ruling）                 |
| Weald 对照                                | Weald 等级以背面 `Quest` + 核心等级徽为准；Cove 本批无 BACK，II/III 排除仅登记 raw 与 `excludedQuestIds`，不进 I 级目录 |

重新生成 FRONT-only 提取：

```bash
python3 tools/pipeline/extract-print/scripts/extract_cove_location.py \
  --input <EN_FILES 根> --categories quest
```

（若 BACK 不存在，脚本自动 `back: null`。）

## 本刀纳入（I 级，FRONT p1–p5）

| ID                |  页 | 名称                      | 休息点 | 已裁定底栏 counts   |
| ----------------- | --: | ------------------------- | -----: | ------------------- |
| `quest:cove:p001` |   1 | Test the Waters           |     12 | curio×1、treasure×1 |
| `quest:cove:p002` |   2 | Deep Waters               |      8 | dark×1、treasure×1  |
| `quest:cove:p003` |   3 | Deep Horrors              |     12 | dark×1              |
| `quest:cove:p004` |   4 | Unclean Waters            |     12 | dark×1、treasure×1  |
| `quest:cove:p005` |   5 | Purify the Eldritch Signs |     12 | dark×2、treasure×1  |

规范化：`packages/data/normalized/extension/cove/quest_cards.json`（`ddbg-cove-quest-cards-v1`）。  
生成器：`buildCoveLevelOneQuestCards`；校验：`packages/data/tests/cove/quests/quest-cards.build.test.ts`。

### 印刷底栏 hash → kind（已写入 `distribution.counts`）

仅 **与 Weald `WEALD_QUEST_TOKEN_HASH` 完全相同 hash** 的品种：

| Hash         | Kind     |
| ------------ | -------- |
| `af3ce426ec` | dark     |
| `67dc216fc3` | curio    |
| `a488fd5ff1` | treasure |

### 底栏 hash 待确认（R-048，未写入 counts、未改词典）

下列 hash 出现在对应卡 **XP 行之后** 的底栏；**不**按与 Weald/Core 图形相似度自动合并：

| Hash                       | 出现任务（FRONT 页）   | 备注                                      |
| -------------------------- | ---------------------- | ----------------------------------------- |
| `2efab15a07`               | p001、p003、p005       | 疑 objective（对照 Weald `d3a3e38ee9`）   |
| `37173ff105`               | p001、p002、p004、p005 | 疑 empty（对照 `6f701b5f5f`）             |
| `2140042d06`               | p001–p005 多张         | 疑 trap（对照 `e7b30e2005`）              |
| `7608a63135`               | p002、p004             | 疑 lair（对照 `1154a8a4d4`）              |
| `be78e95113`               | p002、p004             | kind 待确认                               |
| `584507e207`               | p001                   | 重叠检出候选；未裁 kind                   |
| `04e53fa5cc`、`3ee6243549` | p003                   | kind 待确认                               |
| `a2e7f1dd7b`               | 多张                   | Weald 同款灰色数量角标，**不是**分布 kind |

SPECIAL 内图标（如房间编号 `0db3807e84`、区域 `9120cba1df`、伤口 `4d5b975539`、腐蚀 `c491fb0b8e`、补给 `dfb88662b8`）**不**当作底栏房间代币。

### SPECIAL 原文（运行时未登记）

- **p001**：预留房间 2/5/8、目标房内取样、任务卡伤口上限 6 等——仅 `specialRuleLines` 存印刷原文。
- **p002**：Curio 房一律开战。
- **p003**：印刷写明 **Uca Major** 优先生成——仅保留文字，**本 PR 不**录入该怪物卡。
- **p004**：击杀 Cove 怪物承受腐蚀（图标 `c491fb0b8e`）。
- **p005**：预留房间 1/9、补给转化等——待后续刀。

未新增 `verifiedRules` / `verifiedRuleRulings`，未发明 `setAsideRoomCardIds`、`monsterDrawScope` 等出征字段。

## 排除清单（II/III，FRONT p6–p15）

| ID                |  页 | 正面等级 | 名称（raw 标题行） |                                休息点（若有） |
| ----------------- | --: | -------- | ------------------ | --------------------------------------------: |
| `quest:cove:p006` |   6 | II       | Deep Waters 2      |                                             8 |
| `quest:cove:p007` |   7 | II       | Unclean Waters 2   |                                            12 |
| `quest:cove:p008` |   8 | II       | Deep Horrors 2     |                                            12 |
| `quest:cove:p009` |   9 | II       | The Deep Ones      |                                             8 |
| `quest:cove:p010` |  10 | II       | Eldritch Purging   |                                            12 |
| `quest:cove:p011` |  11 | III      | Deep Waters 3      |                                             8 |
| `quest:cove:p012` |  12 | III      | Unclean Waters 3   |                                            12 |
| `quest:cove:p013` |  13 | III      | The Deep Ones 2    |                                             8 |
| `quest:cove:p014` |  14 | III      | The Shipwrecks     |                                             4 |
| `quest:cove:p015` |  15 | III      | Tainted Trinkets   | 正面无数字前缀（raw 为 `- Tainted Trinkets`） |

登记于 `quest_cards.json` → `excludedQuestIds`；不进 `cards[]`。

## 明确未做

- 未修改 `packages/data/src/core/quests/basic-quests.ts`（`questDefinitions` / `basicQuests`）。
- 未改 `questsForCampaignLevel`、`sandboxEmbarkQuests` 或 Cove 地点战役。
- 未批 hash、未改 `icon-dictionary-v1.8` / `print-icon-additions`。
- Stygian、Boss、PvP、英雄 II/III、板块几何、零容量运行时、大型怪物：本刀范围外。

## 内容包隔离

- 目录 ID 均为 `quest:cove:p00x`，`cardContentPack` → `cove`。
- 仅选 `core` 时，`questsForContentPacks` **不**含 Cove 任务（Cove 未进 basicQuests，与 Weald 已登记任务的差异见测试说明）。
