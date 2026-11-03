# Necromancer I 全灭交接（2026-11-03）

R-044（核心规则书 R9/R25/R30–31/R35）规定：Boss任务英雄全灭即战役失败，即使驿站仍有四人也不能按普通任务逃跑或补员；Boss战不能逃跑。R-068规定双方同时全灭仍保留停点。

沿用R-172真实房间部署识别及胜利交接的任务、等级、房间、Boss、英雄身份与RNG检查。finishDungeonBattle现在接受四名英雄全部死亡、至少一怪物存活的heroesDefeated终态，记录bossQuestHeroesDefeated。保留终态战场及地牢，不消耗替补，不清目标房、不清威胁、不发金币或XP、不洗普通牌池。已失败战役由现有命令守卫拒绝后续行动，页面显示R-044失败原因。

双方全灭、撤退、仍有英雄存活、错级/错Boss、英雄身份漂移、倒退RNG或未结位移均原子拒绝。死亡持牌释放与死亡记录先沿用既有接口，测试明确准备已完成该处理的终态，不宣称从自然任务起点打到全灭。

验证：胜利/全灭交接9测通过（含驿站0/4人两种情况）；普通战后交接和单场死亡检测原有56测通过。typecheck和build通过，ESLint全仓通过。完整lint受原有未跟踪交接稿格式及UTF-16几何导出JSON阻塞，未修改这些本地文件；版本控制内文件另行检查格式。

范围仅Necromancer I真实Boss战全灭交接；不扩展其它Boss或等级、不改combatReady/任务白名单/room:p010 usable、不实现双方全灭裁定。非阶段末，未新增Playwright路径。

## 完整验证补记

Node 24.21.0 / pnpm 12.9.1：`pnpm test --maxWorkers=2 --testTimeout=30000`完整通过，412个测试文件、3116项测试全绿。固定代码7c6d84be的[CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/41642938353)中typecheck、完整lint及Playwright smoke已通过；其余步骤以该检查最终状态为准。
