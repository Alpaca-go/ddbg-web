# 核心盒怪物 Speed 核对：首批六条

> **Kyries 已于 2026-10-10 确认六条 Speed。** 仅 §2–3 的六个 id / 数值获批；生成管线从独立人工映射读取，不加载本文。姿态分组审批与本次 Speed 审批分别记录，见 §6。
> 开始时本地 tip：`0d18f2c`，工作区干净；范围为上批六个 I 级 id。

## 1. 规则与资料

只用官方规则书和项目裁定（R-001、R-048），印刷卡面只核文字、数字与布局，不用来补规则。

- 官方核心规则书：`C:\Users\kyrie\Desktop\DDBG\DD_EN_COREBOX_RULES.pdf`。已查看完整页面图像 R10、R18、R23、R24；R24 的「Anatomy of a Monster Card」箭头明确指出 Speed 栏，R24「Check Range」规定 Speed 是可移动的最大区域数。R23 的 Defender 示例明确使用 1 Speed 移动到射程内。
- 当前版印刷卡面（下文 M + 页码）：`C:\Users\kyrie\Desktop\新建文件夹\DARKEST DUNGEON EN_FILES\DARKEST_DUNGEON_PRINT_EN_WAVE 1\MG_DD_01_EN_COREBOX_Print\02_DD_CARDS_COREBOX\DD_EN_COREBOX_CARDS_70_120_monsters_medium_FRONT.pdf`；没有用 `Old_Version`。
- 词典 v1.8：`4648c9e5ec`（rank 4），`key=speed`、`status=confirmed`、`value=null`、`value_in_glyph=false`，来源为 `kyries_review_2026-10-06`。这里沿用已经确认的图标名称，不给单个图标的 null 填默认 1。
- 仓库原始记录：`packages/data/extract/corebox/raw/monster_medium.json` 的 `faces.front.icons`（保留每次出现及 bbox）；parsed 的同 id / 页码；规范化层的 `front_icons`（重复图标未去重）。parsed 和规范化层目前没有命名 Speed 数字。
- 说明书 §6.10、图例 I-18 只作索引；数值读法与官方页面对照。R-023 的移动规则留待之后使用，本块不实现。

本次获批值按 **R24 已标注的头部 Speed 栏内图标数量**读取（R23 的 Defender 1 作交叉核对），不是图标内部数值。照片 / 渲染图、17 面颜色副本的 Speed 区域已逐面查看，数量一致。卡上心形、颜色标记、姿态图标、技能区域的其他图标不计入 Speed。

计数解释已随本表获 Kyries 批准：官方 R24 正文描述用途，解剖图指出该栏；不能仅凭已命名的图标或卡牌 `unverified=false` 就宣布数值已经获批。缺图标 / 提取缺漏也不能推成 Speed 0。

原始资料只读。页面渲染与局部对照留在忽略的 `node_modules/.cache/stance-review/`，不提交 PDF、卡图、切图或其他资产。未使用 FAQ、TTS 或旧仓库。

## 2. 可审对照表

页码从 1 起算。每条都对应规范化 id，不按同名扩散到其他等级。

| 卡 id                 | 卡名            | M 页码 / 副本 | 卡面 Speed 栏原文 / 图示           | 获批 `speed` | 依据                                       | 不确定项 / 状态                                                 |
| --------------------- | --------------- | ------------- | ---------------------------------- | ------------ | ------------------------------------------ | --------------------------------------------------------------- |
| `monster_medium:p001` | Bone Soldier    | 1、2、3       | 1 个蓝框靴印图标；没有数字文字     | 1            | M1–3 头部右侧；R24 Speed 箭头              | 图示清楚，三副本一致；Kyries 已确认（2026-10-10）               |
| `monster_medium:p004` | Bone Courtier   | 4、5、6       | 3 个蓝框靴印图标纵排；没有数字文字 | 3            | M4–6 头部右侧；R24                         | 图示清楚，三副本一致；Kyries 已确认（2026-10-10）               |
| `monster_medium:p007` | Bone Arbalist   | 7、8、9       | 2 个蓝框靴印图标纵排；没有数字文字 | 2            | M7–9 头部右侧；R24                         | 图示清楚，三副本一致；Kyries 已确认（2026-10-10）               |
| `monster_medium:p010` | Bone Defender   | 10、11        | 1 个蓝框靴印图标；没有数字文字     | 1            | M10–11 头部右侧；R22–23 同卡移动示例、R24  | 与 R23 的 1 Speed 一致，两副本一致；Kyries 已确认（2026-10-10） |
| `monster_medium:p040` | Bone Rabble     | 40、41、42    | 1 个蓝框靴印图标；没有数字文字     | 1            | M40–42 头部右侧；R24                       | 图示清楚，三副本一致；Kyries 已确认（2026-10-10）               |
| `monster_medium:p021` | Cultist Acolyte | 21、22、23    | 3 个蓝框靴印图标纵排；没有数字文字 | 3            | M21–23 头部右侧；R24 解剖图的同卡 Speed 栏 | 图示清楚，三副本一致；Kyries 已确认（2026-10-10）               |

### 2.1 原始提取位置

以下仅抄录各 id 代表页中 `iconId=4648c9e5ec` 的位置，bbox 顺序为原 raw 的 `[x0,y0,x1,y1]`，单位沿原提取数据。本批这些位置都在头部 Speed 栏，卡面数量与 raw / `front_icons` 数量一致。

| 卡 id                 | raw 代表页 | 位置（保持原序）                                                                      |
| --------------------- | ---------- | ------------------------------------------------------------------------------------- |
| `monster_medium:p001` | 1          | `[60.35,25.36,64.62,29.63]`                                                           |
| `monster_medium:p004` | 4          | `[60.04,14.81,64.3,19.07]`；`[60.04,20.08,64.3,24.35]`；`[60.04,25.36,64.3,29.63]`    |
| `monster_medium:p007` | 7          | `[62.03,20.08,66.3,24.35]`；`[62.03,25.36,66.3,29.63]`                                |
| `monster_medium:p010` | 10         | `[60.04,25.36,64.3,29.63]`                                                            |
| `monster_medium:p040` | 40         | `[60.04,25.36,64.3,29.63]`                                                            |
| `monster_medium:p021` | 21         | `[60.18,14.81,64.45,19.07]`；`[60.18,20.08,64.45,24.35]`；`[60.18,25.36,64.45,29.63]` |

不能把这个局部核对推广为“统计整张卡所有 speed key 即获批”。效果区域也可能出现相同图标；未来任何卡的自动提取都必须先确定头部区域并完成核图审批。重复 iconId 代表不同出现位置，不能按 Set 去重后当速度。

## 3. 获批映射

```json
{
  "monster_medium:p001": 1,
  "monster_medium:p004": 3,
  "monster_medium:p007": 2,
  "monster_medium:p010": 1,
  "monster_medium:p040": 1,
  "monster_medium:p021": 3
}
```

## 4. 接入准备与入库路径

本块仅在普通怪物 schema 增加可选 `speed`，类型为显式非负整数，无 default / coercion。零是结构上可表达的整数，**不表示任何缺字段卡已核实为 0**。null、负数、小数、字符串、NaN、Infinity 均拒绝；未提供则字段继续缺省。

准备阶段的 `monster-speed.test.ts` 锁住缺省与脏值拒绝；批准后更新为独立六条预期、无映射仍缺省、其他卡不补值、生成一致、字段保留、映射身份 / 冲突拒绝测试。带 `speed=0` 的 schema 测试仍只是合成结构夹具，不写入卡池，不代表卡面获批为零。

本次确认后的 Speed 入库路径如下，实施记录见 §6：

1. 记录获批 id 和日期，建立独立 `verified-monster-speeds.ts` 人工映射（id、卡名、等级、页码、Speed 和本文依据）。只装入获批行，保持与原始图标、姿态批准分离。
2. 在现有 `buildMonsterMedium` 生成路径附加 `speed`，校验未知 / 重复 id、卡名 / 等级 / 页码以及普通技能怪物卡身份。不从 `value=null` 补 1，不从缺图标补 0，不把效果图标计入头部 Speed。
3. 沿 `writeNormalizedCorebox` 重生成；只允许获批卡增加 `speed`，其余原字段完全不变，其他 id 缺省。补生成一致、字段保留与映射拒绝测试。
4. 引擎需要消费 Speed 时再增加相应只读视图和缺数据拒绝逻辑；当前并没有自动移动实现，不能把准备命令的选招 / 选目标当作已经移动。
5. 跑 typecheck、lint、test、build，更新交接。Speed 入库与房间区域核实分开，不同块叠加寻路、多目标或 UI。

## 5. 本块边界与下一块

本块仅为六个获批 id 增加真实 `speed`，建立人工映射；其他规范化字段、raw / parsed / 词典不变。未增加移动命令、寻路、房间标注、Boss、扩展、死门或 UI。

本批 Speed 已获确认并入库；随后单独核一张遗迹房间板块的邻接、容量和高低地，再考虑普通怪物单目标移动流程。质量检查结果记录在交接笔记的“六条获批 Speed 入库块”。

## 6. Kyries 批准与实施记录（2026-10-10）

Kyries 在本对话中回复：**“speed核对表六条全部确认”**。批准 §2–3 六个 I 级 id 的 Speed：1、3、2、1、1、3，不扩散到同名其他等级或任何其他字段。

`verified-monster-speeds.ts` 按获批 id / 卡名 / 等级 / 印刷页码附加数值，`buildMonsterMedium` 在姿态组之后接入，最终仍经过规范化 schema。不从图标计数、未标注数字或 null 推值；未知 / 重复 id、非技能参考卡、身份漂移、脏数值、既有 Speed 冲突均拒绝。审批不改变 `verification` 或 `stanceGroups`。

沿 `writeNormalizedCorebox` 重生成，只允许 `monster_medium.json` 六条增加 `speed`，其他内容保持不变。独立正反例与生成一致测试锁住范围；尚无消费 Speed 的自动移动命令，因此不代表完整怪物 AI 已可玩。
