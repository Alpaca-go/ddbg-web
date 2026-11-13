# Weald I 级普通（非 Boss）任务证据审阅稿

状态：**步骤 5 证据盘点；文字与结构化转录来自仓库 raw，未经 Kyries 逐项核准；不写入 normalized、不接线、不开放出征。**
依据：Weald W-02（任务牌堆与等级）、核心 R15 / 任务卡结构；R-001、R-048；权威印刷为单包 `MG_DD_06_EN_WEALD`，不使用 The Darkest Heroes 合并册，不使用电子游戏数据。

## 证据来源与仓库现状

| 项目       | 状态                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| Raw 转录   | `packages/data/extract/extension/weald/raw/quest.json`（15 张，schema `ddbg-raw-v1`，extractor `1.0.4`） |
| Parsed     | **无** `extract/extension/weald/parsed/quest.json`                                                       |
| Normalized | **无** Weald `quest_cards.json` 或 `basicQuests` 扩展条目                                                |
| 印刷 PDF   | 路径仅见于 raw `sources`（仓库不提交 PDF）；本机未声称打开不可用的 PDF                                   |
| 私有审阅图 | 可按 [导入记录](weald-location-intake-2026-11-11.md) `--review` 重建；本刀未新增缓存                     |

任务正面 PDF：`DD_EN_WEALD_CARDS_70_120_quests_FRONT.pdf` p1–15。
背面 PDF：`DD_EN_WEALD_CARDS_70_120_quests_BACK.pdf` p1–15（背面仅见 `Quest` + 等级罗马数字，无房间分布行）。

等级判据：**背面** `Quest {icon:0c9e989b70} I|II|III`（`0c9e989b70` 为核心词典已确认等级徽章）。
正面首行 `{icon:56ea9289ab} I|II|III` 与本地 Weald 怪物卡上的地点旗帜 `icon:56ea9289ab` 一致（见 `normalized/extension/weald/monster_medium.json`），**未**进入全局图标词典，按 R-048 仅作地点绑定线索，不单独发明语义。

本刀范围：**仅 I 级（背面 Quest I）五张**，均为普通任务文案（无 Hag／Brigand Pounder／Shrieker Boss 出征卡）。**不含** II／III（p006–p015）、Stygian、Boss 房与 Boss 牌堆。

## 全部 15 张印刷索引（便于核对 scope）

| 卡 ID              | FRONT 页 | 背面等级 | 名称（正面转录）      | 休息点（正面首行数字） | 本刀纳入 |
| ------------------ | -------: | -------- | --------------------- | ---------------------: | -------- |
| `quest:weald:p001` |        1 | I        | Fungal Research       |                      8 | 是       |
| `quest:weald:p002` |        2 | I        | Circle of Witches     |                     12 | 是       |
| `quest:weald:p003` |        3 | I        | Disinfection          |                      8 | 是       |
| `quest:weald:p004` |        4 | I        | Purge the Woods       |                      4 | 是       |
| `quest:weald:p005` |        5 | I        | Patrol the Woods      |                      8 | 是       |
| `quest:weald:p006` |        6 | II       | Spreaders of Miasma   |                     12 | 否       |
| `quest:weald:p007` |        7 | II       | Lost Treasures        |                     12 | 否       |
| `quest:weald:p008` |        8 | II       | Searching in the Dark |                     12 | 否       |
| `quest:weald:p009` |        9 | II       | Hounds of the Woods   |                      8 | 否       |
| `quest:weald:p010` |       10 | II       | Lost Supplies         |                     12 | 否       |
| `quest:weald:p011` |       11 | III      | No Other Way          |                      8 | 否       |
| `quest:weald:p012` |       12 | III      | Great Unclean Ones    |                     12 | 否       |
| `quest:weald:p013` |       13 | III      | Final Swipe           |                     12 | 否       |
| `quest:weald:p014` |       14 | III      | The Infected          |                      8 | 否       |
| `quest:weald:p015` |       15 | III      | Whispering Woods      |                      8 | 否       |

## Kyries 待核准：I 级五张候选表

说明：**任务分布**指正面卡底若干 `{icon:…} 数字` 行（与核心 `quest_cards` 同版面位置）；图标机制名未审前只保留 hash 与数字，不构造 `roomDistribution`。**房间编号** `{icon:497092fe1f} N` 与已核准普通房间 `room:weald:p00N` 的 `number` 字段一致（见 `normalized/extension/weald/room.json`），N 与房间名对应如下供交叉核对，不反向推规则。

|   # | 卡 ID / 页              | 名称 / Rest                | 目标与 SPECIAL（raw 正文，图标保留）                                                                                                                                                                           | XP（印刷）                         | 任务分布行（原文）                                                                                                                               | 地点绑定                                    |
| --: | ----------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
|   1 | `quest:weald:p001` / p1 | Fungal Research / **8**    | Objective Rooms 为房间 **3、6、8**（`497092fe1f`）；进入后随机选一间，保障后弃掉该张房间。在该处**赢得战斗**且至少保留 **1 个未摧毁的 Necrotic Fungus** 才算完成目标。                                         | 1 Xp / 每带回 1 个 Necrotic Fungus | `{icon:d3a3e38ee9} 3 {icon:6f701b5f5f} 1`<br>`{icon:af3ce426ec} 1 {icon:67dc216fc3} 1 {icon:e7b30e2005} 2`                                       | `{icon:56ea9289ab} I` + 单包 Weald 任务 PDF |
|   2 | `quest:weald:p002` / p2 | Circle of Witches / **12** | Objective Room **恒为房间 9**（The Clearing，见 `room:weald:p009`）。在该处开战时生成 **Crone (LvL 2)**。                                                                                                      | 1 Xp / Crone killed                | `{icon:d3a3e38ee9} 3 {icon:6f701b5f5f} 1 {icon:adcdfc394a} {icon:a2e7f1dd7b} 1`<br>`{icon:67dc216fc3} 1 {icon:a488fd5ff1} 1 {icon:e7b30e2005} 1` | 同上                                        |
|   3 | `quest:weald:p003` / p3 | Disinfection / **8**       | Objective Room **恒为房间 5**（Infected Oak）。开局额外 **3** 个 `{icon:008373e459} Provisions`（文本如此印刷）。英雄须在 Objective Room 的 `{icon:401040514c}` 区域消耗 **1 行动 + 1 Provision** 给橡树消毒。 | 1 Xp / Oak disinfected             | `{icon:d3a3e38ee9} 3 {icon:6f701b5f5f} 1`<br>`{icon:af3ce426ec} 2 {icon:67dc216fc3} 1 {icon:1154a8a4d4} 1`                                       | 同上                                        |
|   4 | `quest:weald:p004` / p4 | Purge the Woods / **4**    | SPECIAL：**仅在 Lair 中生成** `{icon:e933aa63f0} Monsters`。                                                                                                                                                   | 1 Xp / Lair cleared                | `{icon:af3ce426ec} 3`<br>`{icon:1154a8a4d4} 3 {icon:e7b30e2005} 2`                                                                               | 同上                                        |
|   5 | `quest:weald:p005` / p5 | Patrol the Woods / **8**   | 开战时掷 `{icon:bc73e13882}`：若结果 **大于** 英雄 `{icon:806b25ecac} Level`，则首轮将所有怪物先攻卡置于牌堆**顶**。                                                                                           | 1 Xp / 2 Rooms cleared             | `{icon:6f701b5f5f} 1 {icon:509c4a958c} {icon:a2e7f1dd7b} 2`<br>`{icon:a488fd5ff1} 1 {icon:1154a8a4d4} 2 {icon:e7b30e2005} 2`                     | 同上                                        |

### 待确认项（不擅自结案）

| 编号          | 内容                                                                                                                                                            | 证据缺口                                                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-186（延续） | 任务卡底分布图标：`d3a3e38ee9`、`af3ce426ec`、`67dc216fc3`、`e7b30e2005`、`adcdfc394a`、`509c4a958c`、`1154a8a4d4`、`a488fd5ff1`、`a2e7f1dd7b`、`6f701b5f5f` 等 | 词典未覆盖或仍为 decor／unreviewed；不能从核心遗迹图标表直接类推 Weald 行                                                                     |
| 待确认        | `p001` 三间 Objective 与房间 **3 Thick Woods / 6 Chase in the Woods / 8 Fungal Overgrowth** 的战术含义（与 W-04 真菌目标叠加）                                  | 仅有编号与 SPECIAL 文字；无 Kyries 核准的运行时目标状态机                                                                                     |
| 待确认        | `p002` 在 **I 级任务**中生成 **LvL 2 Crone** 的部署来源与牌堆/UI 资格                                                                                           | Crone 在 `raw/monster_medium.json` 有转录，**不在**当前核准 I 级 14 实体池（[怪物审阅](weald-level-one-monster-review-2026-11-11.md) 已排除） |
| 待确认        | `p003` 中 `401040514c` 与房间 5 板块上星标/效果区的几何绑定                                                                                                     | 房间效果 R-234 已核准，任务侧「Area」落点尚未任务专题核准                                                                                     |
| 待确认        | `p004` Rest **4** 与分布 `{icon:af3ce426ec} 3` 的 token 总数是否与核心 `roomDistributionSchema` 一致                                                            | 无既有 Weald quest 规范化校验；未手算核准                                                                                                     |
| 待确认        | `p005` 先攻洗顶的 `{icon:bc73e13882}`、`{icon:806b25ecac}` 机制图标命名                                                                                         | 未进 confirmed 词典条目                                                                                                                       |

奖励行中的 `{icon:d3a3e38ee9}` 等**\_campaign 报酬图标**本刀不解释数值含义，待与核心任务奖励审阅同一流程处理。

## 与 W-02 的包属及任务地点绑定（仅文档结论）

- **牌堆归属**：15 张均属 `MG_DD_06_EN_WEALD` 任务 PDF；战役混洗时按 W-02 应进入 **Weald 对应等级任务牌堆**，与核心遗迹任务牌堆分离（见 [内容包隔离](content-pack-isolation-2026-11-11.md)）。
- **出征地点**：正面 `{icon:56ea9289ab}` 与 Weald 怪物/房间 `location: "weald"` 一致；接线后 `expeditionRegion`（或等价字段）应指向 **weald**，不能从扩展勾选或怪物池反推任务（步骤 2 第五批已记录：任务地点取自**已登记任务**）。
- **内容包**：未选 Weald 包时，上述五张不得进入村庄任务池或存档重建来源（与 `sourcesForContentPacks` 行为一致）。
- **房间牌堆**：W-02 §6 要求使用 Weald 自有房间牌堆；九张普通房间已在 normalized，**`usable: false`**，出征未开。

## 实现缺口盘点（相对「村庄选任务 → 出征 → 探索/战斗 → 回村 → 存档回放」）

不抢占通用任务系统大修；仅列与 Weald I 普通任务相关的已有工作与缺口。

| 链路环节                          | 已实现 / 已准备                                                                                                 | 未接线 / 待核实                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 任务数据                          | 核心 `normalized/corebox/quest_cards.json` + `basicQuests`（19 张遗迹）                                         | Weald raw 完整；**无** parsed／normalized／`buildQuestCards` 扩展                       |
| 村庄任务登记与抽选                | `campaign-quest-pool`、`hamlet-embark` 等仅核心任务 ID                                                          | **无** `quest:weald:p001–p005` 池；W-02「按地点等级抽两张」未接 Weald                   |
| 出征创建                          | `createCampaignQuest` + 内容包过滤；`rebuildLocationQuestDecks` 可重建 **I 级怪物+奇物**（须 `packs` 含 weald） | **无** Weald 任务定义 → 无法合法 `questId`；`createCoreDungeonQuest` 仍找 `basicQuests` |
| 任务元数据（Rest、分布、SPECIAL） | 核心 `quest_cards` schema、`roomDistributionSchema`                                                             | Weald 分布图标未核准，**不能**写入 `basicQuests.distribution`                           |
| 探索地图与房间分布                | 核心 quest-map、任务指定房间逻辑                                                                                | Weald 房间目录只读；**未**按任务卡 SPECIAL 挂接 p001 三选一等                           |
| 怪物池 / 奇物                     | I 级 Weald+通用池状态与校验（步骤 2）                                                                           | 依赖任务登记的 `expeditionRegion`；任务 SPECIAL（Lair-only、额外生成 Crone）未实现      |
| 战斗                              | 步骤 4：`startDungeonBattle` 在 Weald 出征上下文可开 `wealdMechanics` + 真菌                                    | 无正式 Weald 出征入口；沙盒未默认 Weald 任务                                            |
| 任务目标 / XP                     | 核心任务目标与定额 XP 测试                                                                                      | Fungal Research、Disinfection、Patrol 等特殊胜负条件 **无** 引擎模块                    |
| 回村与牌堆守恒                    | 步骤 2 回村边界校验（按任务地点）                                                                               | 无 Weald 任务端到端；怪物/奇物守恒未在任务语境验收                                      |
| 存档回放                          | `quest-save` 从 `createCoreDungeonQuest(start, sources)` 重建；`CoreQuestSources.weald` 已备介质/奇物           | start 中 **无** Weald `questId` 分支；步骤 2 正式 Weald 日志闭环仍标注待任务登记        |
| 选包隔离                          | `content-packs`、`task-sources.ts` 加载 Weald normalized 怪物/奇物                                              | 任务来源未纳入 `CoreQuestSources`                                                       |
| UI                                | 内容包勾选冒烟；「地点战役尚未开放」                                                                            | **无** Weald 任务卡面、出征按钮                                                         |
| `usable` / 出征闸门               | 房间 `usable: false`；扩展未伪造任务路线                                                                        | **保持关闭**；本刀不修改                                                                |

## 缺少的原始资料或决定（汇总）

1. **Kyries 核准**：上表五张的名称、Rest、SPECIAL、XP、分布行是否正确（可复制修改审阅稿表格）。
2. **图标词典**：任务分布与 SPECIAL 内图标 batch 审阅（R-048），至少覆盖五张卡底行与 p003／p005 机制图标。
3. **规范化管线**：是否新增 `buildWealdQuestCards`（或扩展 `buildQuestCards`）及 `normalized/extension/weald/quest_cards.json`；需与 `basicQuests`／`expeditionRegion: "weald"` 对齐策略（单独 PR，非本刀）。
4. **Crone 任务生成**（p002）：高等级怪物在 I 级任务中的部署裁定或数据引用，**不能** silent 使用未核准 II 级池。
5. **私有卡图复核**：仓库无提交图像时，建议 Kyries 用本地 `--review` 对照 SPECIAL 中房间编号与卡底 `?`（II 级 p008 raw 存在 `?`，I 级五张当前转录无 `?`）。

## 推荐下一小刀（核准后）

1. **文档核准回合**：Kyries 改表 + 登记裁定（若需要新 R-xxx，由 Kyries 起草，代理不发明规则）。
2. **数据刀**：Weald `quest_cards` 规范化（仅 I 级五张）+ `basicQuests`／`expeditionRegion` 登记 + 分布 schema 校验（图标仍占位）。
3. **接线刀**（仍不问鼎全战役）：任务池过滤 → 单个 I 级任务沙盒出征 → 回村守恒 + 1 条 Playwright（依赖 `usable` 与 Kyries 明示开放出征）。

## 验证（本刀）

- 仅 Markdown：`pnpm exec prettier --check` 涉及文件、`git diff --check`。
- 未改运行时代码、normalized 核准字段或 `usable`；未声称全量 typecheck／test／任务可玩闭环完成。
