# Cove II/III 级普通任务印刷目录审阅稿

状态：**2026-11-28 资料刀**——II/III 十张印刷目录与 FRONT-only raw；**未**写入 `basicQuests`、**未**接出征或 Cove 地点战役。堆叠于 #832（I 级目录）；本刀自 `quest_cards.json` 移除 `excludedQuestIds`，改入独立 `quest_cards_higher.json`。

依据：`DD_EN_COVE_CARDS_70_120_quests_FRONT.pdf` p6–p15；R-001、R-048。`source.back` 均为 `null`。

## 架构

| 文件                      | schema                            | scope                              |
| ------------------------- | --------------------------------- | ---------------------------------- |
| `quest_cards.json`        | `ddbg-cove-quest-cards-v1`        | `level_one_normal`（p1–p5，不变）  |
| `quest_cards_higher.json` | `ddbg-cove-quest-cards-higher-v1` | `level_two_three_normal`（p6–p15） |

生成器：`buildCoveHigherQuestCards`；共享底栏解析：`quest-cards.parse.ts`（与 I 级共用 `COVE_QUEST_TOKEN_HASH`）。校验：`packages/data/tests/cove/quests/quest-cards-higher.build.test.ts`。

等级判据：正面 `{icon:e1c34ea8a2} II|III`（与 I 级同级图标；**待 Kyries 单独裁定**正面等级语义，未编 ruling）。

## 录入清单（p6–p15）

| ID                |  页 | 级  | 名称             |                                            休息点 | 已裁定底栏 counts   |
| ----------------- | --: | --- | ---------------- | ------------------------------------------------: | ------------------- |
| `quest:cove:p006` |   6 | II  | Deep Waters 2    |                                                 8 | dark×1、treasure×1  |
| `quest:cove:p007` |   7 | II  | Unclean Waters 2 |                                                12 | dark×1、treasure×1  |
| `quest:cove:p008` |   8 | II  | Deep Horrors 2   |                                                12 | dark×1              |
| `quest:cove:p009` |   9 | II  | The Deep Ones    |                                                 8 | dark×2              |
| `quest:cove:p010` |  10 | II  | Eldritch Purging |                                                12 | dark×1、treasure×2  |
| `quest:cove:p011` |  11 | III | Deep Waters 3    |                                                 8 | dark×1、treasure×1  |
| `quest:cove:p012` |  12 | III | Unclean Waters 3 |                                                12 | dark×1、treasure×1  |
| `quest:cove:p013` |  13 | III | The Deep Ones 2  |                                                 8 | dark×2              |
| `quest:cove:p014` |  14 | III | The Shipwrecks   |                                                 4 | curio×2、treasure×1 |
| `quest:cove:p015` |  15 | III | Tainted Trinkets | **待确认**（`null`；印刷为 `- Tainted Trinkets`） | dark×2、curio×1     |

与 #832 排除表对照：**一致**（名称、页码、休息点除 p015 外均可从印刷数字前缀读取）。

### 与印刷 / raw 的差异

- **p015 休息点**：标题行为 `- Tainted Trinkets`，正面无休息点数字；目录 `restPoints: null`，待 Kyries 确认是否另有印刷来源或规则默认值。
- **p007 / p012 SPECIAL**：印刷 `{icon:6a5aaf626a}`（II）与 `{icon:c491fb0b8e}`（III）腐蚀图标不同；仅保留 `specialRuleLines` 原文，未发明数值。
- **p008**：SPECIAL 写明 Uca Major / Squiffy Ghast 优先生成；**本刀不**录入怪物卡。
- **p013**：III 版 Deep Ones 含 Squiffy Ghast；仅文字登记。
- **p014**：搜捞 Areas 与 idol 机制；仅 `specialRuleLines` 存印刷原文。

## 底栏 hash

### 已写入 `distribution.counts`（与 Weald 同 hash）

| Hash         | Kind     |
| ------------ | -------- |
| `af3ce426ec` | dark     |
| `67dc216fc3` | curio    |
| `a488fd5ff1` | treasure |

### 待确认（R-048，未写入 counts）

按卡 `distribution.source` 登记；**不按图形相似度自动合并**：

| Hash                       | 典型出现                  | 备注                                      |
| -------------------------- | ------------------------- | ----------------------------------------- |
| `2efab15a07`               | p008–p009、p011–p015      | 疑 objective（对照 Weald `d3a3e38ee9`）   |
| `37173ff105`               | p015                      | 疑 empty（对照 `6f701b5f5f`）             |
| `2140042d06`               | 多张                      | 疑 trap（对照 `e7b30e2005`）              |
| `7608a63135`               | p006–p007、p010–p012      | 疑 lair（对照 `1154a8a4d4`）              |
| `be78e95113`               | p006–p007、p010–p012      | kind 待确认                               |
| `04e53fa5cc`、`3ee6243549` | p008–p009、p014           | kind 待确认                               |
| `afe6664db9`               | p013                      | kind 待确认                               |
| `e473d2b695`               | p010                      | kind 待确认                               |
| `a2e7f1dd7b`               | p006–p007、p011–p012 底栏 | Weald 同款灰色数量角标，**不是**分布 kind |

## 明确未做

- 未修改 `basicQuests` / `questDefinitions`、`questsForCampaignLevel`、`sandboxEmbarkQuests`、Cove 地点战役。
- 未批新图标 hash、未改 `icon-dictionary-v1.8` / `print-icon-additions`。
- 未新增 `verifiedRules` / 出征专用字段（`setAsideRoomCardIds`、`monsterDrawScope` 等）。
- Stygian、Boss、英雄 II/III、零容量运行时：范围外。

## 验证

- `pnpm typecheck`、`pnpm lint`
- `packages/data/tests/cove/quests/`、`packages/data/tests/shared/extract/cove.test.ts`、`core-catalog-identities`（含 `quest_cards_higher.json`）
