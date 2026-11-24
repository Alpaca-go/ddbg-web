# Phase 4：The Feast完全恢复选择

#209按本轮“合并，然后继续”指令复核合并，head为`7922c41`，main同步到`b9c0af4`。该head的typecheck、ESLint、格式、137文件/1184项Vitest和build已通过；未重复检查远端Actions。保留本地8080及未跟踪资料。

## 来源与裁定

已目视核对当前版Hamlet Event FRONT p10完整卡面及官方R27完整页面；Infirm/生命规则沿规格书§8–9（R26/R29）。卡面为“Each Hero can choose to fully restore either [Stress] or [Wounds]”，两图标沿R-085、一天准备沿R-077，不重新请求图标批准。

R-085明确没有自动批准fully restore的事件类型，R-073只限Treasure Chamber，因此先向Kyries列出7伤口＋Infirm最终为0/1的两种差异。Kyries本轮明确选A：直接伤口清零，不套Infirm/Fast Healer。已记录Q-89 confirmed / R-086，不外推其他卡。

## 实际接线

The Feast启用`feast`，生成器锁住卡id/页码/标题/天数和完整效果行；规范化仅改变该卡runtime，不改原始提取和全局词典。抽到后按姿态逐英雄呈现完全恢复压力、移除全部伤口或放弃，使用现有公开resolveChoice和通用待选UI。每人只能恢复一轨；伤口分支直接置0，压力分支置0，战斗投影同步；不改怪癖、疾病、意志卡、金币或另一轨。

待选期间不启用看守人/准备天数、不消耗效果骰；非法/过期选择和无关命令原子拒绝。全部四人选择后才洗回完整事件牌池一次、开始一天准备；不复活死亡者，缺获批Life/异常压力/缺牌池则抽牌整体拒绝。完成事件清除剩余英雄列表；不另建存档协议。

新增五项测试：卡面漂移守门；完整池自然抽牌、逐人恢复/放弃、最后一次洗回、一天真实准备及待选/中途/完成正式存档；明确伤口/怪癖夹具验证Infirm 7→0、Fast Healer/Resilient不越轨、死门移除伤口无额外骰与战斗投影；待选冻结和非法/过期拒绝；死亡/假Life/异常压力/缺牌池原子拒绝。怪癖/伤口夹具不称自然任务获得，真实任务路径为提前退出，不称通关或人工试玩。

## 进度与后续

本分支事件15/16，唯一未实现为Lost Shipment，仍待Q-88明确队伍减2如何分摊及Radiant自选颗数。Q-79/Q-80保持pending；死亡补人需扩展英雄池，高等级正式存档、Boss自然升幕和人工验收仍未完成，Phase4未验收，未进入Phase5。

最终验证：typecheck、ESLint、Prettier、138文件/1189项Vitest（`--maxWorkers=1 --isolate=false`）、build与`git diff --check`均通过。完整测试176秒，无失败或超时；保留既有Vite包体积提示。格式检查排除原有未跟踪交接/上传/搜索资料、tmp-verify及.vite临时配置。非阶段收尾、无UI布局改动，不新增Playwright条数。Node24.20.0低于声明24.21.0、pnpm12.9.1；不提交卡图/PDF/截图/临时日志或证据JSON。
