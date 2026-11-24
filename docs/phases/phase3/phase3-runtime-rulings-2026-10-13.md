# Phase 3：本轮运行时裁定与实施步骤

2026-10-13（UTC+8），Kyries本对话批准，记录R-066–070。此前“保持待定”与candidate属于历史记录；当前按这些条目实现。#147两项CI成功，合并main `dc7f201`。

| 批准  | 范围                                                                                                                                 | 实施块                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| R-066 | Spiked十五通路、两blocked、无角点                                                                                                    | 独立板块与完整伤害/Bleed/Shuffle钩子     |
| R-067 | 三hash词典confirmed；Torture本面Unholy Aura confirmed                                                                                | 本块词典/数据；后续禁疗运行时验证后开放  |
| R-068 | mutualWipeout停场、起点不侦察、Curio抽空不洗回、每边返回+1、Fundraiser提前离开摘要                                                   | 导航/退出与各自关键边界                  |
| R-069 | Curio印刷行序、新被动后续生效、死亡取消剩余；Trap先压力后伤口；Soft/Worries伤口先于意志；同次暴击压力合并；Old Abbey先压力存活再治疗 | 有序Curio续接、压力/Trap/暴击、Old Abbey |
| R-070 | 同英雄休息Life/压力各一事件                                                                                                          | 移除原Q-69守卫，按总量各修正一次         |

本块只提交批准记录、三词典hash与Torture的print confirmed，仍usable=false/runtimeReady=false；不提前删除尚未实现的运行时守卫。词典仍v1.8，三条保留iconId、空value、原始分组/出现次数，JSON/CSV及计数同步；词典source新增真实批准日期。不会仅凭新词典把未完成板块开放。

后续按单主题逐步验证、提交、CI通过并合并：Beacon → Torture禁疗 → 返回/提前离开/休息 → 压力与复合顺序 → Curio完整有序续接 → 其余板块完整特殊逻辑 → 真实三任务开局、探索/战斗/返回/退出摘要贯通 → 既有三条Phase3冒烟和试玩交接。每步可能因实际模块依赖进一步细分，不把接口夹具或注入金币说成真实任务完成。

本块验证：Node24.21.0/pnpm12.9.1，typecheck、lint、90文件/866项测试、规范化再生、build、diff通过。三hash回归锁住空value和真实批准来源，词典JSON/CSV及覆盖率一致；Torture仍拒绝usable/runtimeReady提前开放。无流程/UI改变，不增加阶段冒烟；PR CI继续六条。
