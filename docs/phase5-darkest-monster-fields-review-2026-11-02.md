# 最暗普通怪 Speed / 姿态选招核图候选

基线：main `95eb6dbb`（#539）。Kyries 已明确回复“确认以上九张字段”，记为 R-143。九种字段已写入生产获批映射并再生数据；不解除 `battleReady:false`，不批准生产几何。

依据：官方核心规则书 R24 的 Speed 栏、R-015 的姿态/选招表读法、R-001 / R-048。卡面只提供字段数据，不补规则。只使用当前版 `02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_70_120_monsters_medium_FRONT.pdf` 的本地 PNG，不使用 Old_Version。

A=aggressive，D=defensive，R=ranged，S=support；箭头右侧为技能编号。Speed 按右上蓝框脚印计数，黄色数字是 Dodge，不计作 Speed。先查看九种身份的完整首张卡，再对照M63–88全部26张的Speed栏和页脚选招表；同身份颜色副本的这两项字段一致。

| 卡 id               | 名称              | Speed候选 | 姿态/选招候选                       |
| ------------------- | ----------------- | --------- | ----------------------------------- |
| monster_medium:p063 | Ascended Brawler  | 2         | A/D→1；R不可选；S→2                 |
| monster_medium:p066 | Ascended Witch    | 2         | A/D/R/S均为d10 1–3→1、4–7→2、8–10→3 |
| monster_medium:p069 | Rapturous Cultist | 3         | A/D/R/S均为d10 1–6→1、7–10→2        |
| monster_medium:p072 | Cultist Priest    | 2         | A/D/R/S均为d10 1–6→1、7–10→2        |
| monster_medium:p075 | Malignant Growth  | 1         | A/D/R/S均为d10 1–5→1、6–10→2        |
| monster_medium:p078 | Flesh Hound       | 3         | A/D/R均为d10 1–5→1、6–10→3；S→2     |
| monster_medium:p080 | Polyp             | 3         | A→2；D/R/S均为d10 1–5→1、6–10→3     |
| monster_medium:p083 | Antibody          | 2         | A/D/R/S→1                           |
| monster_medium:p086 | Defensive Growth  | 2         | A/D/R/S均为d10 1–3→1、4–6→2、7–10→3 |

原图均位于忽略的 `.cache/print-card-art/png/`，文件前缀为 `DARKEST_DUNGEON_PRINT_EN_WAVE_1_MG_DD_01_EN_COREBOX_Print_02_DD_CARDS_COREBOX_DD_EN_COREBOX_CARDS_70_120_monsters_medium_FRONT.pdf_`，后缀为对应 `p063.png` 等页码。未提交卡图或PDF。

## 本轮已实施

姿态入库与Speed入库采用相同的冲突保护：已有 `stanceGroups` 与获批映射不一致时拒绝，不再静默覆盖；相同映射重复附加仍保持幂等。回归采用两种均真实存在的技能构造有效但冲突的分组，验证拒绝及输入未变。

## 接线与剩余边界

1. 已按具体id/名称/等级/页组写入Speed、姿态获批映射（26份的Speed栏及页脚已复核）。
2. 已再生规范化怪物与最暗牌池；九种怪物missingBattleFields归零。新增四姿态×十骰面的360次选招核对，以及Speed/页组漂移拒绝；26条专项测试通过。
3. 保留正式几何停点；字段补齐不直接令最暗随机遭遇或占位区域成为生产战斗。
4. 在生产几何确认后接入完整AI、部署/移动与自然任务回放。

## 验证

- Node 24.21.0、pnpm 12.9.1；typecheck、lint、build通过。
- 规范化再生8测、字段/映射/牌池专项26测通过。未改raw/parsed、词典或私有卡图。
- 全量运行380文件、2947测：377文件/2944测通过，三条失败均为旧审批状态断言（dungeon-ii-monster、battle-monster-support、monster-stance-data）。按R-143更新明确的获批id和字段预期后，三文件连同新增黄金表共4文件/41测复核全部通过；其余未批准卡的拒绝断言保留。没有再次重复15分钟的全量运行，不声称单次全量运行全绿。
- 本轮无UI改动，不新增Playwright路径；全战役自然验收仍未完成。
