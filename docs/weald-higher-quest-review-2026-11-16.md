# Weald II／III 级普通任务审阅表

状态：**Q-186 待 Kyries 核准**。本批逐张核实任务卡文字与图标，不登记新任务运行资格。怪物属性沿用 R-253／R-263；I 级任务的专属裁定不自动扩展至其它卡。

## 来源与范围

- 官方单包 `MG_DD_06_EN_WEALD/DD_EN_WEALD_CARDS_70_120_quests_FRONT.pdf`、对应 BACK，第 6–15 页。实际文件名以本机 PDF 为准；本表使用当前单包，不使用合并册、FAQ 或电子游戏数据。
- 本机原 PDF FRONT p6–15 已重新渲染并逐图核对；p11、p14 放大核对图标。BACK p6–10 的提取文字均为 Quest II，p11–15 均为 Quest III；背面等级本批仅作文字检查，不声称已逐图核对背面。
- raw 对位：`packages/data/extract/extension/weald/raw/quest.json`；图片／PDF 仅在私有忽略缓存，不提交。
- **raw 与当前 PDF 有版本差异**：p009 raw 名称为 Searching in the Dark，当前 PDF 为 **Hounds of the Woods**；p010 raw 为 Lost Treasures，当前 PDF 为 **Lost Supplies**。这两张背景文案也不同。运行前须重提对应卡并核对，不以旧 raw 覆盖当前图像。

## 基础字段与房间分布

下表全部为本批待核准的转录。沿用 R-240／R-249 已有房间 kind 名称；相同图标语义不再当未知图标，但本卡具体数量仍需确认。Objective＝目标，Empty＝空，Dark＝黑暗，Curio＝奇物，Treasure＝宝藏，Lair＝巢穴，Trap＝陷阱。

| 页／ID 尾码 | 等级 | 名称                  | Rest | 卡底分布                                              | XP 印刷转录／候选                                 |
| ----------- | ---- | --------------------- | ---: | ----------------------------------------------------- | ------------------------------------------------- |
| p006        | II   | Spreaders of Miasma   |   12 | Objective×3、Empty×1、Dark×1、Curio×1、Lair×1、Trap×1 | 每击杀 1 只 Hateful Virago 得 1 XP                |
| p007        | II   | Lost Treasures        |   12 | Dark×2、Treasure×3、Lair×1、Trap×2                    | 每清理 1 间 Treasure 得 1 XP                      |
| p008        | II   | Searching in the Dark |   12 | Trap×3；Empty／Dark／Curio／Treasure／Lair 均印问号   | 每清理 1 间 Lair 得 1 XP                          |
| p009        | II   | Hounds of the Woods   |    8 | Objective×3、Empty×1、Dark×2、Curio×1、Lair×1         | 每清理 1 间 Objective 得 1 XP                     |
| p010        | II   | Lost Supplies         |   12 | Empty×1、Dark×1、Treasure×2、Lair×2、Trap×2           | 每带回 2 枚补给得 1 XP；补给图标仍待本卡核准      |
| p011        | III  | No Other Way          |    8 | Objective×3、Dark×2、Lair×2、Trap×1                   | 每烧毁 1 棵 Infected Oak 得 1 XP，卡面明写 max. 3 |
| p012        | III  | Great Unclean Ones    |   12 | Objective×3、Empty×2、Curio×1、Treasure×1、Lair×1     | 每清理 1 间 Objective 得 1 XP                     |
| p013        | III  | Final Swipe           |   12 | Dark×1、Curio×2、Treasure×2、Lair×2、Trap×1           | 每清理 2 间房得 1 XP                              |
| p014        | III  | The Infected          |    8 | Dark×2、Curio×1、Lair×3、Trap×2                       | 每清理 1 间 Lair 得 1 XP                          |
| p015        | III  | Whispering Woods      |    8 | Empty×1、Dark×1、Curio×1、Treasure×1、Lair×3、Trap×1  | 每清理 1 间 Lair 得 1 XP                          |

除 p008 问号分布外，每张卡数量均合计 8。XP 沿用核心 R29／R-038 的全局结算上限；不因 p011 明写 max. 3 就推定其它任务无上限。

## SPECIAL RULES 逐卡候选

### p006 Spreaders of Miasma

目标房生成一只 **Hateful Virago（LvL 3）**。本任务等级 II，其余来源仍须遵循任务／地点规则；Virago 属性使用本次 R-263 的 III 级卡。卡面没有指定目标房编号。

待确认：是否沿用 R-247 的“先放指定怪，再补普通怪；满栏随机替换；战后复用指定组件”流程？本卡有三间目标房，实体仅两张，不能因组件数量减少目标房。XP 按击杀 Virago，不按目标房清理。

### p007 Lost Treasures

**Treasure 房只生成 II 级怪物**。卡面没有写只用 Weald 当地怪物，不能套用 Purge 的 R-248 当地限定池。其它房间仍按正常等级来源处理；实施前须对照 W3 与核心高等级累加池规则，明确本任务为何单独指定 II 级，不能把这句当无效果文字。

### p008 Searching in the Dark

“Fill the rest of the Room slots with random Rooms.” 巢穴只生成带黄色蘑菇地点标记的怪物，候选为 **Weald 当地**；卡底固定 Trap×3，其余五种图标数量为问号。

待确认：剩余五格如何随机生成（候选种类、是否放回、是否允许额外 Trap）？当地限定是否只作用于 Lair，Curio／Treasure 守卫仍用正常混池？不把 R-248 针对 p004 的整趟当地限定自动套过来。

### p009 Hounds of the Woods

目标房从 Weald **1／3／6 号**房中随机选择，进入时选，secured 后弃掉该房；在那里生成 **3 只 Rabid Gnasher**。候选使用已核准 I 级 Gnasher，因为印刷没有其它等级 Gnasher 卡；此跨等级取用仍须本卡确认。

待确认：三只指定 Gnasher 是否取代普通补满部署，且三次目标房战后复用全部三张组件？本卡与 p006 不同，是三只指定怪，不能默认“先放三只后继续填栏”。目标房 1／3／6 不进入该任务随机房间堆，沿用核心目标房隔离原则。

### p010 Lost Supplies

本任务不掷通常的补给骰，Survivalist 或其它技能获得者除外。只使用带 **Loot Chest** 的房间。每次摸箱子，改为掷两份随机补给，替代箱子的正常 Loot。带回村庄的补给用于 XP，同时仍按正常规则每枚换 **1 金币**。

待确认：Loot Chest 是板块箱子，是否排除房间卡其它清场奖励？替代的是箱子本身的奖励还是整个房间奖励？起始骰例外与村庄供给／游商流程的顺序，按官方规则及既有裁定逐项核对，不自行取消其它获得来源。补给的两次随机掷骰、Wild 待选、满池处理应复用现有规则。

### p011 No Other Way

目标房总是 Weald **5 号 Infected Oak**。英雄在红橙星区花 **1 行动＋1 枚 Torch** 点燃橡树；等待至**下一轮结束**才烧毁，因此不能在第 4 轮点火。点火当轮结束时，用新怪物填满所有空姿态格。若橡树已烧毁，即使第 4 轮结束仍有怪物，也算目标已清理。

星区候选沿用 R-234／R-245 的同一 5 号房 B／D／E／G 四区；这只是同一板块标记对位，不自动核准新交互。待确认：怪物提前全灭是否仍继续等待烧毁？点火当轮是否无条件补怪？焚毁后是否立即清房或仍走四轮终局？目标清理后英雄状态／战斗结束如何交接？这些不是由“即使第 4 轮仍有怪物”一句自动确定。

### p012 Great Unclean Ones

目标房生成 **1 只 Unclean Giant**。这些 elder giants 每轮 **2 行动**，为其多洗入 **1 张怪物先攻卡**。使用 R-263 的 II 级 Giant，不能凭任务 III 级生成不存在的 III 级 Giant。

待确认：指定怪的补满／满栏／组件复用流程是否同 p006？两行动仅作用于本任务目标房指定 Giant，不升级普通来源或永久修改 Giant 卡。卡面没有指定目标房编号。

### p013 Final Swipe

战斗中每当生成带黄色蘑菇地点标记的怪物，**全体英雄各承受腐蚀 1／2t**（绿色液滴候选，沿用 R-231 中文名称）。印刷没有写“每场一次”。待确认：部署多只当地怪时是否逐只触发；后续召唤当地怪是否也触发？不能擅自压成每场一次。

### p014 The Infected

巢穴中每当一只怪物被击杀，全体英雄承受印刷 **`2 [绿色液滴] 2t, 2 [绿色液滴] 2t`**。已放大原 PDF：两处都是相同绿色液滴，不能将第二处擅改流血、疾病或其它状态。

**待 Kyries 裁定**：这是两份腐蚀 2／2t，还是印刷重复应只应用一份？若两份，按两次状态效果分别处理还是合并为一份 4／2t？最终一只怪物死亡时的触发与清场顺序也需明确。raw 两个不同 hash `7edb8f71f4`／`49485b465b` 不能证明它们是不同状态。

### p015 Whispering Woods

每个战斗轮开始时，英雄各承受 **压力 +1**。压力图标候选沿用已有语义；首轮也按“each Battle round”包含，待本卡核准。实现应使用统一轮开始钩子及现有崩溃／心脏病流程，不按每张先攻卡触发。

## 待确认与实施顺序

1. 核准基础表及 SPECIAL 转录；对 p006／p009／p012 指定怪部署与复用、p008 随机分布、p010 奖励范围、p011 终局时序、p013 逐只触发、p014 重复状态分别补答。
2. 先修正并重提当前 PDF 与旧 raw 不同的 p009／p010，核对其它卡完整转录；再按核准字段写独立高等级任务 normalized，不以本审阅稿直接开出征。
3. 高等级正式来源仍须单独解决 W3 与核心累加等级牌堆的对应、指定怪例外、任务限制池、房间过滤和版本化存档；目前 R-263 的独立同级组池不能直接替代完整高等级出征来源。
4. 核准后按小 PR 接线：任务数据／分布 → 地点来源和日志版本 → 特殊任务效果／页面与阶段冒烟，再核实高等级 Boss、Stygian。I 级自然养成／人工实机继续后置。

本批仅文档，不新增裁定、任务数据或游戏行为；不新增 Playwright。卡图不入库。
