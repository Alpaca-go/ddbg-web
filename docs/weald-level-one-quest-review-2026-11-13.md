# Weald I 级普通（非 Boss）任务证据审阅稿

状态：**步骤 5 证据盘点 + Kyries 2026-11-13 审阅（口头 +「Weald 任务规则」群）。I 级五张普通任务玩法已登记 **R-240**–**R-249**；**已**写入 `normalized/extension/weald/quest_cards.json` 与 `basicQuests`（数据刀，出征仍关）；**未**接线、不声称可玩。**
依据：Weald W-02（任务牌堆与等级）、核心 R15 / 任务卡结构；R-001、R-048；权威印刷为单包 `MG_DD_06_EN_WEALD`，不使用 The Darkest Heroes 合并册，不使用电子游戏数据。

## 证据来源与仓库现状

| 项目       | 状态                                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| Raw 转录   | `packages/data/extract/extension/weald/raw/quest.json`（15 张，schema `ddbg-raw-v1`，extractor `1.0.4`）             |
| Parsed     | **无** `extract/extension/weald/parsed/quest.json`                                                                   |
| Normalized | **有** `normalized/extension/weald/quest_cards.json`（I 级五张）与 `basicQuests` `quest:weald:p001`–`p005`；出征仍关 |
| 印刷 PDF   | 路径仅见于 raw `sources`（仓库不提交 PDF）；本机未声称打开不可用的 PDF                                               |
| 私有审阅图 | 可按 [导入记录](weald-location-intake-2026-11-11.md) `--review` 重建；本刀未新增缓存                                 |

任务正面 PDF：`DD_EN_WEALD_CARDS_70_120_quests_FRONT.pdf` p1–15。
背面 PDF：`DD_EN_WEALD_CARDS_70_120_quests_BACK.pdf` p1–15（背面仅见 `Quest` + 等级罗马数字，无房间分布行）。

等级判据：**背面** `Quest {icon:0c9e989b70} I|II|III`（`0c9e989b70` 为核心词典已确认等级徽章）。
正面首行 `{icon:56ea9289ab} I|II|III`：**R-249** = I 级任务卡**正面等级徽**（表示 1 级任务卡）；**不**与背面 `0c9e989b70` 合并，**不是**地点旗帜。出征地点仍由单包 Weald 任务 PDF 与 W-02 包属绑定。

本刀范围：**仅 I 级（背面 Quest I）五张**，均为普通任务文案（无 Hag／Brigand Pounder／Shrieker Boss 出征卡）。**不含** II／III（p006–p015）、Stygian、Boss 房与 Boss 牌堆。

## Kyries 2026-11-13 已确认（R-240–R-249）

下列为已登记内容；**更正**（d3a3e38ee9 非报酬图标、重叠检出、p003 Provisions→Potion 等）仅为事实订正。

### 任务卡底分布图标（口头点名 hash）

| Hash         | Kind（房间代币） | 机制摘要（Kyries 2026-11-13）                                                                                               |
| ------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `d3a3e38ee9` | **Objective**    | 紫框方块、悬挂灯笼与珠链；任务目标所在，房内内容看任务卡 SPECIAL；总有怪物守卫（R15；对齐 **R-108** kind，Weald 独立 hash） |
| `6f701b5f5f` | **Empty**        | 深色方块、砖石地面与根须；进房无事发生，立刻清理并拿走代币                                                                  |
| `af3ce426ec` | **Dark**         | 火把／灯台；光照 −1；永不清理，每次经过再结算；火把不能抵消本次 −1（**R-045**，任务卡另有规定除外）                         |
| `67dc216fc3` | **Curio**        | 高脚碗／有机滴落；d10：1–5 有守卫开战，6–10 无守卫；清理后抽 1 Curio、1 名英雄互动（仍可用火把忽略负面）                    |
| `e7b30e2005` | **Trap**         | 红橙玫瑰纹；每名英雄受到总计 **地牢等级**点伤口和／或压力，自行分配；永不清理，每次经过再结算；Tool 不能抵消（**R-045**）   |
| `a488fd5ff1` | **Treasure**     | 木箱与发光金币；立刻开战；胜利后 **20 金**；清理并拿走代币                                                                  |
| `1154a8a4d4` | **Lair（巢穴）** | **R-249**；不与核心巢穴 `5281dfacce` 合并                                                                                   |

**提取器重叠（非 Kyries 独立批准）**：`adcdfc394a` 与 `af3ce426ec`、`509c4a958c` 与 `67dc216fc3` 若同行并存，仅记重叠检出（**R-249** 沿用，非新 kind）。
**数量角标**：`a2e7f1dd7b` 灰色数字角标，不是分布 kind（**R-249** 沿用）。
**装饰**：左上 Rest 行囊、右下蜡封无规则效果（**R-249**）；raw 未提取 hash，不发明 hash。

### `quest:weald:p004` Purge the Woods（FRONT 第 4 页）— R-241

- 黄底蘑菇（与右上角黄条**同一图形**）= **Weald 地点图标**，**不是**坏死真菌。Kyries **未**口头报 hash；逐图对位右上角黄条可为 raw `{icon:c5334974cf}`，SPECIAL 行 raw 为 `{icon:e933aa63f0}`——语义按 Kyries 对黄底蘑菇的确认，**不**写成 Kyries 本人报了 hash。
- SPECIAL「Spawn only [蘑菇] Monsters in Lairs」：巢穴开战时只生成带该**地点图标**的 Weald 怪物（**R-241**）。**R-248**：本任务抽怪只用 Weald **当地**牌堆，不含通用怪；沙盒已接线 `monsterDrawScope: wealdLocalOnly`。**R-251**：仅巢穴开战（核心规则书第 15 页 + 分布），非 SPECIAL 另加闸门。
- 地块**圆形**蘑菇 = 坏死真菌标记（W-04／Weald 规则书第 3 页）：放真菌代币；场上仍有真菌时英雄不能被治疗。与黄底地点图标**不是**同一图形；本任务未改 W-04。
- 分布（印刷转录，kind 对 R-240）：Dark×3；巢穴×3、Trap×2（巢穴格 hash 见上表「仍待确认」）。Rest **4**。

### `quest:weald:p005` Patrol the Woods（FRONT 第 5 页）— R-242

- SPECIAL 灰骰 = **十面骰**（面印 10，与辅助卡 Roll 同枚）；火焰 = **光照**。Kyries **未**报 hash；逐图对位可为 `bc73e13882`／`806b25ecac` 等，**不**写成 Kyries 报了 hash。
- 每场战斗开始时掷 1d10：点数**严格大于**当前光照 → 所有怪物先攻卡放到先攻牌堆**顶**，**仅第一轮**；之后怪物先手，同阵营内仍按姿态优先级；第二轮起重按规则书第 25 页洗混重组，本条不再适用；**打平不触发**。光照开局 5 时需 6–10；光照 0 时 1–10 均触发。
- XP：**每清理 2 间房 1 XP**。构成 Empty×1、Curio×2、Treasure×1、巢穴×2、Trap×2；可清理前四类共 6 间，**最多 3 XP**；Trap 永不清理。Rest **8**（左上柴火旁印刷）。右上黄条蘑菇 = Weald 地点图标（同 p004），**本卡不改**巢穴生成规则。

### 本组任务 PDF 黄底蘑菇与 SPECIAL 编号（第二批）— R-243

- 黄底蘑菇图形（与 **R-241** Weald 地点图标同形）：在本组任务 PDF（`MG_DD_06_EN_WEALD` 任务 FRONT）卡面上表示该 quest **属于 Weald 拓展包**；本 PDF 右上角黄条均为此意。逐图对位可为 `{icon:c5334974cf}`，**不**写成 Kyries 报了 hash。
- SPECIAL RULES 中「蘑菇图标 + 数字 **N**」= 从 Weald 拓展包选择**编号为 N 的 tile**（例：p002 的 9 号 → `room:weald:p009` The Clearing；p003 的 5 号 → `room:weald:p005` Infected Oak）。是**地点房间编号**，**不是**地块圆形坏死真菌标记（**W-04**）。
- 图标编号语义见上；p001 brought back／objective 见 **R-246**。

### `quest:weald:p001` Fungal Research（FRONT 第 1 页）— R-246

- 不用电子游戏背包／object item；不新做物品 token。用出征进度计数 **brought back**，回村按此数给 XP（核心 Leaving the Dungeon／p29 Gaining XP）。
- 清房时：每砸毁 1 个坏死真菌 → brought back **+1**。
- Objective：至少 1 个**未砸毁**真菌赢下战斗才算 gain objective；须留至少 1 个未砸毁再清房才获得目标；全砸再清房可计 brought back 但**不能**获 objective。
- 进房仍为卡面（目标房 3／6／8，随机抽一张、secured 后弃掉）。**W-04** 不改。

### `quest:weald:p002` Circle of Witches（FRONT 第 2 页）— R-244 / R-247

- **Crone (LvL 2)** = Weald **中型怪物** FRONT 第 15、16 页（两页内容相同）那张 **II 级 Crone**，**不是** Boss。组件表：2× Crone，列在 The Weald Monsters，不在 Bosses。卡面：Human、**Back**、速度 3、生命 12。本任务是 **I 级**「Circle of Witches」（FRONT p2）；其它战斗仍用 **I 级**牌堆（Weald 规则书：当地 I 级 + 通用 I 级），她是卡面写明的**例外**，开战时从 **II 级**卡里取出并放进场。
- 目标房始终为蘑菇 **9** 号 = 官方房间卡「**9—The Clearing**」（FRONT 第 9 页，`room:weald:p009`）。按规则书第 15 页：目标房在任务开始时单独放好，不会在随机战斗牌堆中抽到；目标房始终有守卫，进房即开战。蘑菇 +9 = 地点房间编号，不是坏死真菌标记。
- 她是 Back：按规则书第 16 页从后方（Support 往 Aggressive）放进第一个空位，并洗入一张怪物先攻卡。
- **XP**：每击杀 1 只 Crone 得 1 XP。
- **分布**（R-240 kind）：目标房×3、空房×1、黑暗×1、Curio×1、宝藏×1、陷阱×1。Rest **12**。
- **R-247**（群拍板）：先放 1 只 Crone，再用 I 级牌堆补满；栏满则随机替换一只。三间目标房均打 9 号房，每场开战 1 只 II Crone；按规则书 p25 Battle End **复用**组件（「三进 9 号房」）。
- **不**暗默将 II 级 Crone 核准进当前 I 级 14 实体池；只登记本卡例外取用。

### `quest:weald:p003` Disinfection（FRONT 第 3 页）— R-245

- **I 级**「Disinfection」（FRONT p3）。目标房始终蘑菇 **5** 号 = 官方房间卡「**5—Infected Oak**」（`room:weald:p005`）。蘑菇 +5 = 地点房间编号。按规则书第 15 页：目标房单独放好、始终有守卫，进房即开战。
- 开局在正常掷补给之外，往公共补给池再加入 **3 枚 Potion**（细颈塞瓶 = 补给辅助卡／补给骰上的 Potion，**不是**火把或其他补给）。审阅 raw 曾写 `{icon:008373e459} Provisions`：**更正为 Potion**；hash 仅作逐图／转录对位，**不**写成 Kyries 报了 hash。
- Potion 平常可作免费行动：压力 −1 或移除腐蚀；本任务另需指定消耗：英雄须站在目标房内带**红橙四角星**的区域，花费 **1 个行动并消耗 1 枚 Potion** 消毒。该星与 5 号房间卡 Poisonous Roots 为**同一标记**；官方房间卡上此类星有 4 处（中央树冠四周），卡面未写只准一格，**站在任一处带星区域即可**（与 **R-234** 5 号星 B／D／E／G 交叉引用，不改几何）。SPECIAL raw 可为 `{icon:401040514c}`，逐图／转录对位该红橙四角星。
- 英雄在这些区域**结束回合**时受到**腐蚀 2、2 回合**（房间卡原文）。
- 规则书第 18 页：交互只能在**战斗中**进行；最后一只怪物被消灭的瞬间交互机会结束，须在击杀最后一只**之前**完成消毒。
- **XP**：每消毒一棵橡树得 1 XP（不按清房计）。
- **分布**：目标房×3、空房×1、黑暗×2、Curio×1、巢穴×1。Rest **8**。
- **已确认**（Kyries 本批）：SPECIAL 写单数 always room 5，但卡底 **3** 间目标房均使用 5 号板块 Infected Oak；进入任一间均按该 tile 开战，并在带星区域花 1 行动 + 1 Potion 消毒；XP 仍按每消毒一棵计。**不**将 p002「3 房 vs 2 模型／卡复用」待确认套用到本卡。

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

## I 级五张候选表（含 2026-11-13 批注）

说明：**任务分布**指正面卡底若干 `{icon:…} 数字` 行。R-240 已批六项 hash 的 kind；未构造 `roomDistribution`。房间编号 `{icon:497092fe1f} N` 与已核准普通房间 `room:weald:p00N` 的 `number` 字段一致。

|   # | 卡 ID / 页              | 名称 / Rest                | 目标与 SPECIAL（raw 正文，图标保留）                                                                                                                                                                   | XP（印刷）                         | 任务分布行（原文）                                                                                                                               | 2026-11-13 批注                                         |
| --: | ----------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
|   1 | `quest:weald:p001` / p1 | Fungal Research / **8**    | Objective Rooms 为房间 **3、6、8**（`497092fe1f`）；进入后随机选一间，保障后弃掉该张房间。在该处**赢得战斗**且至少保留 **1 个未摧毁的 Necrotic Fungus** 才算完成目标。                                 | 1 Xp / 每带回 1 个 Necrotic Fungus | `{icon:d3a3e38ee9} 3 {icon:6f701b5f5f} 1`<br>`{icon:af3ce426ec} 1 {icon:67dc216fc3} 1 {icon:e7b30e2005} 2`                                       | **R-246** brought back／objective；**R-240**、**R-243** |
|   2 | `quest:weald:p002` / p2 | Circle of Witches / **12** | Objective Room **恒为房间 9**（The Clearing，`room:weald:p009`，**R-243**／**R-244**／**R-247**）。在该处开战时生成 **Crone (LvL 2)**（II 级中型卡例外，非 I 级 14 实体池）。                          | 1 Xp / Crone killed                | `{icon:d3a3e38ee9} 3 {icon:6f701b5f5f} 1 {icon:adcdfc394a} {icon:a2e7f1dd7b} 1`<br>`{icon:67dc216fc3} 1 {icon:a488fd5ff1} 1 {icon:e7b30e2005} 1` | **R-244**、**R-247** 已登记                             |
|   3 | `quest:weald:p003` / p3 | Disinfection / **8**       | Objective Room **恒为房间 5**（Infected Oak，**R-243**／**R-245**）。开局额外 **3** 枚 **Potion**（转录曾写 Provision，已更正）。带星区域 **1 行动 + 1 Potion** 消毒（`{icon:401040514c}` 逐图对位）。 | 1 Xp / Oak disinfected             | `{icon:d3a3e38ee9} 3 {icon:6f701b5f5f} 1`<br>`{icon:af3ce426ec} 2 {icon:67dc216fc3} 1 {icon:1154a8a4d4} 1`                                       | **R-245**；巢穴 **R-249** `1154a8a4d4`                  |
|   4 | `quest:weald:p004` / p4 | Purge the Woods / **4**    | SPECIAL：**仅在 Lair 中生成** `{icon:e933aa63f0} Monsters`（**R-241**／**R-248** 仅 Weald 当地牌堆）。                                                                                                 | 1 Xp / Lair cleared                | `{icon:af3ce426ec} 3`<br>`{icon:1154a8a4d4} 3 {icon:e7b30e2005} 2`                                                                               | **R-248**、**R-251**；巢穴 **R-249**；沙盒 R-248 已接线 |
|   5 | `quest:weald:p005` / p5 | Patrol the Woods / **8**   | 开战时掷 `{icon:bc73e13882}`：若结果 **大于** 英雄 `{icon:806b25ecac} Level`，则首轮将所有怪物先攻卡置于牌堆**顶**（**R-242**）。                                                                      | 1 Xp / 2 Rooms cleared             | `{icon:6f701b5f5f} 1 {icon:509c4a958c} {icon:a2e7f1dd7b} 2`<br>`{icon:a488fd5ff1} 1 {icon:1154a8a4d4} 2 {icon:e7b30e2005} 2`                     | **R-242**；巢穴 **R-249**；灰骰／光照 hash **逐图对位** |

### 仍待确认（I 级五张普通任务玩法）

**本 PR 范围内，五张 I 级普通任务卡面玩法裁定已全部登记（R-240–R-251）。** 仍不属于「玩法待确认」、但步骤 5 未完成的工作：

| 项            | 说明                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------- |
| 规范化／接线  | 已写 `quest_cards`／`basicQuests`；**R-248** Purge 沙盒出征已接线；p002–p003／Hamlet 出征仍关 |
| Q-186（其它） | 本批未点名的其它扩展卡面／SPECIAL 机制图标（若有）仍按 R-048 待审；非本五张 I 级普通任务范围  |

任务奖励行中的金币／战利品图标本稿不解释数值；**`d3a3e38ee9` 是 Objective 分布图标（R-240），不是报酬图标。**

## 与 W-02 的包属及任务地点绑定（仅文档结论）

- **牌堆归属**：15 张均属 `MG_DD_06_EN_WEALD` 任务 PDF；战役混洗时按 W-02 应进入 **Weald 对应等级任务牌堆**，与核心遗迹任务牌堆分离（见 [内容包隔离](content-pack-isolation-2026-11-11.md)）。
- **出征地点**：印刷包属与任务登记字段应指向 **weald**；`{icon:56ea9289ab}` 为正面 I 级等级徽（**R-249**），不能当作地点旗帜反推。
- **内容包**：未选 Weald 包时，上述五张不得进入村庄任务池或存档重建来源（与 `sourcesForContentPacks` 行为一致）。
- **房间牌堆**：W-02 §6 要求使用 Weald 自有房间牌堆；九张普通房间已在 normalized，**`usable: false`**，出征未开。

## 实现缺口盘点（相对「村庄选任务 → 出征 → 探索/战斗 → 回村 → 存档回放」）

不抢占通用任务系统大修；仅列与 Weald I 普通任务相关的已有工作与缺口。

| 链路环节                          | 已实现 / 已准备                                                                                                 | 未接线 / 待核实                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 任务数据                          | 核心 `normalized/corebox/quest_cards.json` + `basicQuests`（19 张遗迹）                                         | Weald raw 完整；**无** parsed／normalized／`buildQuestCards` 扩展                       |
| 村庄任务登记与抽选                | `campaign-quest-pool`、`hamlet-embark` 等仅核心任务 ID                                                          | **无** `quest:weald:p001–p005` 池；W-02「按地点等级抽两张」未接 Weald                   |
| 出征创建                          | `createCampaignQuest` + 内容包过滤；`rebuildLocationQuestDecks` 可重建 **I 级怪物+奇物**（须 `packs` 含 weald） | **无** Weald 任务定义 → 无法合法 `questId`；`createCoreDungeonQuest` 仍找 `basicQuests` |
| 任务元数据（Rest、分布、SPECIAL） | 核心 `quest_cards` schema、`roomDistributionSchema`                                                             | R-240–249 仅为裁定；**未**写入 `basicQuests.distribution`                               |
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

1. **Kyries 继续核准**：p001–p003 目标／SPECIAL、未点名分布 hash、Crone 部署等（上表「仍待确认」）。
2. **规范化管线**：待步骤 5 其余项审完后，`quest_cards` 规范化 + `basicQuests`（单独 PR，非本刀）。
3. **私有卡图复核**：仓库无提交图像时，建议 Kyries 用本地 `--review` 对照 SPECIAL 中房间编号与卡底 `?`（II 级 p008 raw 存在 `?`，I 级五张当前转录无 `?`）。

## 推荐下一小刀（本批之后）

1. **文档**：Kyries 审完剩余 I 级项后改表；新裁定按体例追加 `R-xxx`。
2. **数据刀**（核准后）：Weald `quest_cards` 规范化（仅 I 级五张）+ `basicQuests`／`expeditionRegion` 登记 + 分布 schema 校验。
3. **接线刀**（仍不问鼎全战役）：任务池过滤 → 单个 I 级任务沙盒出征 → 回村守恒 + 1 条 Playwright（依赖 `usable` 与 Kyries 明示开放出征）。

## 验证（本刀）

- 仅 Markdown：`pnpm exec prettier --check` 涉及文件、`git diff --check`。
- 未改运行时代码、normalized 核准字段或 `usable`；未声称全量 typecheck／test／任务可玩闭环完成。
