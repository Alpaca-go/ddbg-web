# Phase 3：本轮逐项批准与入库顺序

2026-10-13（UTC+8），来源为Kyries/Grok本对话目视确认，记录为R-065。Curio房间#145两项CI成功，合并main `6da84fd` 后继续。

| 项目                     | 获批数据与修正                                                                                                                                                     | 入库与可用边界                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| QuestMap FRONT p1        | 八房A–H + S；S-G,G-F,F-C,G-H,G-D,D-E,D-A,A-B；无X/Y                                                                                                                | 本块升级confirmed；其他13页pending                                      |
| VQ-06 Healing Fountain   | FRONT p2/遗迹3；容量2,4,2,3,3,3,3,3,2,2；A/C高地；审核稿十通路、四角点与黑墙；英雄I Agg/Sup、J Def/Rang，怪A Sup/C Rang/D Agg/E Def；G Healing Waters结束回合heal3 | 独立入库后接完整英雄结束回合治疗；无宝箱                                |
| VQ-13 Spiked Pit         | BACK p3/遗迹4；容量2,4,3,3,3,2,2,4,2,3,3,3；S1高地；部署/宝箱按稿；S5 Circle of Power怪物结束回合heal4，S8/S9伤3、Bleed1·3t                                        | “S1–S2等黑墙”未唯一说明17候选对分类，已请求明确；触发图标仍未知，不开放 |
| VQ-14 Beacon of Light    | FRONT p3/遗迹5；容量4,4,3,2,3,2,2,2,2；八通路；部署与L9宝箱按稿；L1/L3/L6/L7/L9结束回合stress+1，L2recover1stress                                                  | 独立入库、完整正负压力钩子后才开放                                      |
| VQ-15 Treasure Chamber   | BACK p4/遗迹6；容量2,4,3,2,4,2,2,3,3；T4–T5为blocked，其余稿内通路；部署、T4宝箱；T5 Loot the Chest、T6 Hide and Heal                                              | 移除图标未知，特殊动作未齐仍不可用                                      |
| VQ-16 Tomb of Ancestor   | FRONT p4/遗迹7；容量2,2,4,3,4,2,3,2,3；审核稿几何/部署；A4 Ancestor's Glory，宝箱A1/A9                                                                             | ①⑥图标未命名，完整免疫/移除未齐仍不可用                                 |
| VQ-17 Invocation Chamber | BACK p5/遗迹8；容量4,2,3,4,2,3,2,3,4,3；审核稿几何/部署；I4红星，The Invokers + Invoking Abyss压力+2                                                               | 怪物行动替换和轮末触发完整实现前不可用                                  |
| VQ-18 Old Abbey          | FRONT p5/遗迹9；容量4,3,2,3,4,3,2,4,2；O1上中；审核稿几何/部署；O1/O5 Feeling the Presence，英雄全O8                                                               | 复合压力/治疗及其边界明确、完整实现前不可用                             |

上述批准只属于列明面与审核表，不批准其他地图/板块、全局图标或未决规则。Torture已获批几何无需重问；Unholy Aura候选与运行时开放仍分别处理。

本块只提交批准记录、p1的两份生产布局及对应数据回归。后续逐面入库和运行时各自提交合并；每步记录验证，不将“入库”说成“可战”。

本块验证：Node24.21.0/pnpm12.9.1，typecheck、lint、89文件/861项完整测试、build与diff通过。已有p1“pending”断言改为本轮批准的confirmed，其他13页仍锁定pending；全量测试曾有怪物池采样场景5秒超时，单独重跑和maxWorkers4完整重跑均通过。无UI/连接/规则改动，未增加冒烟，PR CI继续现有六条。
