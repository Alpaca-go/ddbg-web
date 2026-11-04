# Collector I 正式部署待确认方案

日期：2026-11-04。基线：main `df994058`（#574）。Kyries 已确认部署方案，见 R-175。

Prophet I 已完成真实部署、胜负回村、正式页面与单任务自然存档闭环。下一个建议切片为 Collector I 真实部署，先保持与此前相同的小 PR 边界。

## 首刀建议范围

仅战役 I 级 Face the Threat、实际威胁为 `boss:ruins:collector:1`、描述卡 `boss_ability:p013`、战斗卡 `monster_medium:p092`、目标房 `room:p012` 时开放专用部署。保留战役英雄状态、装备、共享牌池与 RNG 游标；部署不掷骰，之后显式 `startBattle`。

使用 R-168 获批八区与七条共享边。英雄按姿态放置，进攻和辅助在 H，防御和远程在 B。Collector 初始为进攻姿态，棋子放 C。

将既有 Collect All 运行时的召唤区域绑定为：Collected Man-at-Arms 防御/G、Highwayman 远程/E、Vestal 辅助/A。召唤顺序、区域挤占、当前轮洗入三张先攻沿用规格书 §14.4–14.5（核心 R31/R39）、R-034 与既有实现，不改数值。

开战时将三个独立宝箱放到 F，对接既有 `collectorRoomLootAreaId` 与三宝箱布置入口。R-168 仅批准标记数量与位置；本刀只布置，不开放宝箱交互和奖励，不从白色叹号推定效果。

## 准入与验证

部署应拒绝错误等级、威胁/描述卡/战斗卡错配、非目标房、未获批图面、重复部署或已有待选。验证八区容量及邻接、四英雄状态继承、无额外 RNG、显式开战、三个 F 区宝箱，以及首轮 Collect All 的真实落区和先攻洗入。

命令纳入存档 schema，验证 JSON 命令续接；不将机制夹具称为自然任务回放。按仓库质量闸门运行 typecheck、lint、单元/场景与 build。

## 后续切片与保留边界

胜负/回村、正式页面、自然任务严格存档另分 PR。正式目录还须逐项核对 Collector 和三种 Collected 的字段审批，缺少确认的字段不猜测补齐。

本切片沿用 `combatReady`、任务白名单及 `room:p012 usable=false`。部署命令仅用于 Collector I 的专属目标房。
