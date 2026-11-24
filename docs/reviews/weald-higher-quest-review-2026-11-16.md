# Weald II／III 级普通任务审阅表

状态：**Kyries 已修改并核准未改字段，登记 R-264**。p008、p010、p014 采用表内明确更正；p011 时序已补答。任务数据已独立规范化，正式运行资格仍待接线。怪物属性沿用 R-253／R-263；I 级任务的专属裁定不自动扩展至其它卡。

2026-11-16 对照当前官方单包 FRONT p6–15、BACK 等级及已有裁定复核后，更正 p008 房间分布，并更正 raw 名称差异的表述。

## 来源与范围

- 官方单包 `MG_DD_06_EN_WEALD/DD_EN_WEALD_CARDS_70_120_quests_FRONT.pdf`、对应 BACK，第 6–15 页。实际文件名以本机 PDF 为准；本表使用当前单包，不使用合并册、FAQ 或电子游戏数据。
- 本机原 PDF FRONT p6–15 已重新渲染并逐图核对；p11、p14 放大核对图标。BACK p6–10 的提取文字均为 Quest II，p11–15 均为 Quest III；背面等级本批仅作文字检查，不声称已逐图核对背面。
- raw 对位：`packages/data/extract/extension/weald/raw/quest.json`；图片／PDF 仅在私有忽略缓存，不提交。
- **当前 main 的 raw 名称与现 PDF 一致**：p009 为 **Hounds of the Woods**，p010 为 **Lost Supplies**，背景文案也与现 PDF 对得上，不是 Searching in the Dark／Lost Treasures。接线前仍须逐卡核对图标与完整转录，不以过期本地 raw 覆盖当前图像，也不把「p009／p010 名称错位」写成当前仓库事实。

## 基础字段与房间分布

下表为本批核准后的转录。沿用 R-240／R-249 已有房间 kind 名称；相同图标语义不再当未知图标，本卡具体数量已按本次回复确认。Objective＝目标，Empty＝空，Dark＝黑暗，Curio＝奇物，Treasure＝宝藏，Lair＝巢穴，Trap＝陷阱。

| 页／ID 尾码 | 等级 | 名称                  | Rest | 卡底分布                                              | XP 印刷转录／候选                                 |
| ----------- | ---- | --------------------- | ---: | ----------------------------------------------------- | ------------------------------------------------- |
| p006        | II   | Spreaders of Miasma   |   12 | Objective×3、Empty×1、Dark×1、Curio×1、Lair×1、Trap×1 | 每击杀 1 只 Hateful Virago 得 1 XP                |
| p007        | II   | Lost Treasures        |   12 | Dark×2、Treasure×3、Lair×1、Trap×2                    | 每清理 1 间 Treasure 得 1 XP                      |
| p008        | II   | Searching in the Dark |   12 | Lair×3；Empty／Dark／Curio／Treasure／Trap 均印问号   | 每清理 1 间 Lair 得 1 XP                          |
| p009        | II   | Hounds of the Woods   |    8 | Objective×3、Empty×1、Dark×2、Curio×1、Lair×1         | 每清理 1 间 Objective 得 1 XP                     |
| p010        | II   | Lost Supplies         |   12 | Empty×1、Dark×1、Treasure×2、Lair×2、Trap×2           | 每带回 2 枚补给得 1 XP；补给图标仍待本卡核准      |
| p011        | III  | No Other Way          |    8 | Objective×3、Dark×2、Lair×2、Trap×1                   | 每烧毁 1 棵 Infected Oak 得 1 XP，卡面明写 max. 3 |
| p012        | III  | Great Unclean Ones    |   12 | Objective×3、Empty×2、Curio×1、Treasure×1、Lair×1     | 每清理 1 间 Objective 得 1 XP                     |
| p013        | III  | Final Swipe           |   12 | Dark×1、Curio×2、Treasure×2、Lair×2、Trap×1           | 每清理 2 间房得 1 XP                              |
| p014        | III  | The Infected          |    8 | Dark×2、Curio×1、Lair×3、Trap×2                       | 每清理 1 间 Lair 得 1 XP                          |
| p015        | III  | Whispering Woods      |    8 | Empty×1、Dark×1、Curio×1、Treasure×1、Lair×3、Trap×1  | 每清理 1 间 Lair 得 1 XP                          |

除 p008 问号分布外，每张卡数量均合计 8。p008 为固定巢穴×3，另 5 格为问号，槽位仍是 8。XP 沿用核心 R29／R-038 的全局结算上限；不因 p011 明写 max. 3 就推定其它任务无上限。

## SPECIAL RULES 逐卡候选

### p006 Spreaders of Miasma

目标房生成一只 **Hateful Virago（LvL 3）**。本任务等级 II，其余来源仍须遵循任务／地点规则；Virago 属性使用本次 R-263 的 III 级卡。卡面没有指定目标房编号。

待确认：是否沿用 R-247 的“先放指定怪，再补普通怪；满栏随机替换；战后复用指定组件”流程？本卡有三间目标房，实体仅两张，不能因组件数量减少目标房。XP 按击杀 Virago，不按目标房清理。

### p007 Lost Treasures

**Treasure 房只生成 II 级怪物**。卡面没有写只用 Weald 当地怪物，不能套用 Purge 的 R-248 当地限定池。其它房间仍按正常等级来源处理；实施前须对照 W3 与核心高等级累加池规则，明确本任务为何单独指定 II 级，不能把这句当无效果文字。

### p008 Searching in the Dark

“Fill the rest of the Room slots with random Rooms.” 巢穴只生成带黄色蘑菇地点标记的怪物，候选为 **Weald 当地**；卡底固定 Lair×3，其余五种图标（Empty／Dark／Curio／Treasure／Trap）数量为问号。本卡没有 Objective 图标。

待确认：其余 5 格如何在这五种问号类型中随机生成（候选是否仅限这五种、是否放回、随机结果能否再出额外巢穴，或未印出的 Objective）？当地限定是否只作用于 Lair，Curio／Treasure 守卫仍用正常混池？不把 R-248 针对 p004 的整趟当地限定自动套过来。

核准为Lair×3，其他房间类型随机，可以是0；通用curio和通用怪物也可以加入到weald的场合里，这点你需要再确认下

### p009 Hounds of the Woods

目标房从 Weald **1／3／6 号**房中随机选择，进入时选，secured 后弃掉该房；在那里生成 **3 只 Rabid Gnasher**。候选使用已核准 I 级 Gnasher，因为印刷没有其它等级 Gnasher 卡；此跨等级取用仍须本卡确认。

待确认：三只指定 Gnasher 是否取代普通补满部署，且三次目标房战后复用全部三张组件？本卡与 p006 不同，是三只指定怪，不能默认“先放三只后继续填栏”。目标房 1／3／6 不进入该任务随机房间堆，沿用核心目标房隔离原则。

### p010 Lost Supplies

本任务不掷通常的补给骰，Survivalist 或其它技能获得者除外。只使用带 **Loot Chest** 的房间。每次摸箱子，改为掷两份随机补给，替代箱子的正常 Loot。带回村庄的补给用于 XP，同时仍按正常规则每枚换 **1 金币**。

待确认：Loot Chest 是板块箱子，是否排除房间卡其它清场奖励？替代的是箱子本身的奖励还是整个房间奖励？起始骰例外与村庄供给／游商流程的顺序，按官方规则及既有裁定逐项核对，不自行取消其它获得来源。补给的两次随机掷骰、Wild 待选、满池处理应复用现有规则。XP 行的补给图标为白底补给骰，外观与常规补给骰一致，仍按 R-048 待本卡核准，不把未点名 hash 写成已批准词条。

「确认：Weald 任务卡 p010 Lost Supplies 的 XP 行白底补给骰图标，按常规补给骰处理，表示带回的补给；本卡按 R-048 核准。计 XP 为每带回 2 枚补给得 1 XP，仍受核心规则书第 29 页及 R-038／R-252 的全局上限 3。本条只核准本卡该图标，不把未在本条点名的 hash 写成全局已批准词条。」

「确认：Weald 任务卡 p010 Lost Supplies 中，Loot Chest 指板块上的战利品箱子代币（核心规则书第 17–18 页）。『When looting a Chest, roll for two random Provisions instead of their normal Loot』只替代翻开该箱子代币后的正常战利品（掷补给、自选补给、金或补给、双金或自选补给），改为掷两份随机补给；不替代该房间的其它奖励，包括 Treasure 清场的 20 金及房间卡上的其它效果。『Use only Rooms with Loot Chests for this Quest』是布置限制：只用带箱子放置点的房间板块，不因此取消其它清场奖励。『Do not roll for Provisions for this Quest other than those gained by the Survivalist or other Skills』只取消核心规则书第 12 页出征时『每名英雄掷两颗补给骰』；Survivalist 或其它技能给予的补给仍获得，也不取消村庄事件、游商等其它已有来源。两次随机掷骰、Wild 待选、满池 16，复用第 12 页及既有裁定（R-041／R-059 等）。回村时按带回补给计 XP，同时仍按第 32 页将未用补给每枚换 1 金。本条只解释本卡 SPECIAL 与 XP 行，不改其它任务，也不改补给池上限与满池选择的既有规则。」

### p011 No Other Way

目标房总是 Weald **5 号 Infected Oak**。英雄在红橙星区花 **1 行动＋1 枚 Torch** 点燃橡树；等待至**下一轮结束**才烧毁，因此不能在第 4 轮点火。点火当轮结束时，用新怪物填满所有空姿态格。若橡树已烧毁，即使第 4 轮结束仍有怪物，也算目标已清理。

星区候选沿用 R-234／R-245 的同一 5 号房 B／D／E／G 四区；这只是同一板块标记对位，不自动核准新交互。R-245 中「须在击杀最后一只之前完成消毒」不能直接套到本卡「等待至下一轮结束才烧毁」。待确认：怪物提前全灭是否仍继续等待烧毁？点火当轮是否无条件补怪？焚毁后是否立即清房或仍走四轮终局？目标清理后英雄状态／战斗结束如何交接？这些不是由“即使第 4 轮仍有怪物”一句自动确定。

### p012 Great Unclean Ones

目标房生成 **1 只 Unclean Giant**。这些 elder giants 每轮 **2 行动**，为其多洗入 **1 张怪物先攻卡**。卡面只写 Unclean Giant、没有等级；建议使用 R-263 的 II 级 Giant，因为没有 III 级印刷件，不能凭任务 III 级生成不存在的卡。此映射仍须本卡确认。

待确认：指定怪的补满／满栏／组件复用流程是否同 p006？两行动仅作用于本任务目标房指定 Giant，不升级普通来源或永久修改 Giant 卡。卡面没有指定目标房编号。

### p013 Final Swipe

战斗中每当生成带黄色蘑菇地点标记的怪物，**全体英雄各承受腐蚀 1／2t**（绿色液滴候选，沿用 R-231 中文名称）。印刷没有写“每场一次”。待确认：部署多只当地怪时是否逐只触发；后续召唤当地怪是否也触发？不能擅自压成每场一次。

### p014 The Infected

巢穴中每当一只怪物被击杀，全体英雄承受印刷 **`2 [绿色液滴] 2t, 2 [绿色液滴] 2t`**。已放大原 PDF：两处都是相同绿色液滴，不能将第二处擅改流血、疾病或其它状态。

**已确认（R-265／R-269）**：保留两份独立的腐蚀 **2／2t**，不去重，不合并面值或持续时间。每堆各自结算、各自减少持续时间；无其它修正时两次结算后都到期。旧合并说明已更正。最后一只怪物死亡也先施加这两堆，再处理清场。raw两个不同hash `7edb8f71f4`／`49485b465b`仍仅作转录来源，不据此重命名图标。

### p015 Whispering Woods

每个战斗轮开始时，英雄各承受 **压力 +1**。压力图标候选沿用已有语义；“each Battle round” 按字面包含首轮，待本卡核准点头。实现应使用统一轮开始钩子及现有崩溃／心脏病流程，不按每张先攻卡触发。

## 待确认与实施顺序

1. 核准基础表及 SPECIAL 转录（含更正后的 p008 分布）；对 p006／p009／p012 指定怪部署与复用、p008 随机分布、p010 奖励范围、p011 终局时序、p013 逐只触发、p014 重复状态分别补答。
2. 逐卡核对其它完整转录与图标后，再按核准字段写独立高等级任务 normalized，不以本审阅稿直接开出征。
3. 高等级正式来源仍须单独解决 W3 与核心累加等级牌堆的对应、指定怪例外、任务限制池、房间过滤和版本化存档；目前 R-263 的独立同级组池不能直接替代完整高等级出征来源。
4. 核准后按小 PR 接线：任务数据／分布 → 地点来源和日志版本 → 特殊任务效果／页面与阶段冒烟，再核实高等级 Boss、Stygian。I 级自然养成／人工实机继续后置。

以上保留初始审阅记录；核准后的数据交付见下节。本批未新增游戏运行行为或 Playwright，卡图不入库。

## 本次核准后的接线状态

- R-264 已登记基础十卡、p008 分布更正、p010 补给／箱子奖励范围、p014 两份独立腐蚀（R-265／R-269更正）及 p011 补答。上文候选／问句保留审阅历史，以该裁定为准。
- p011 明确：提前全灭仍等待下一轮末烧毁；点火当轮末无条件补怪。烧毁只清理目标，不立即结束有怪物的战斗；后续胜利／被迫逃跑按核心 R25，烧毁目标保留，实际战斗结束才交接。
- 已建立独立 higher_quests 数据与 Zod／生成校验，不加入 basicQuests 或正式出征；原始 SPECIAL 与裁定覆盖分开，p014 保留印刷原文并附两份独立腐蚀2／2t覆盖，p011 附独立时序标记。
- Weald W3 页面图像已再次核对：相应等级通用怪物、通用奇物均加入地点来源。p008 巢穴 SPECIAL 不扩为整趟或所有 Weald 当地限定。
- 尚须在运行批核实：指定怪部署补满／复用、p008 具体随机抽法、p013 每只生成的触发边界、p014 最后一只死亡与清场顺序。未回答的开放问句不自动当成具体实现值。
