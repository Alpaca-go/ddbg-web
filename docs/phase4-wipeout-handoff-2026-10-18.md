# Phase 4：普通任务全灭与驿站战后交接

## 基线与来源

Kyries要求“合并，然后继续”。#235精确head `2f2298a`与上轮1384测试、浏览器和本机闸门通过版本一致，无审查留言，按本轮授权合并为main `924c60d`，本地ff-only同步。GitHub检查注释仍明确账户付款/额度限制、作业未启动，不冒称远端通过。

本轮用PDF技能只读检查官方核心规则书完整R9/R25/R31/R33页面图像及文字：R9无法凑满四英雄即战役失败；R25普通任务全灭且驿站仍可补四人时按逃跑结束；R31死者立即选替补、移除等待代币，新英雄战斗结束后加入；R33初始两枚、II/III升级各加一枚。引用规格书§6.12/§9.4（R25、R31/R33/R9）、R-001/R-044/R-048/R-068/R-091。渲染只在忽略目录node_modules/.cache/wipeout-review，不提交PDF/图像；不使用FAQ。没有新规则或数值裁定。

## 实现

原finishDungeonBattle只接受finished，普通heroesDefeated一直停在战斗层。现在对匹配当前战役等级的已接通普通任务、四名真实死亡英雄及仍存活怪物，先验证完整房间/怪物牌池、RNG、驿站与已准备替补。未知/Boss任务不进入本分支，Boss全灭另留Phase5/R-044；双方同次全灭仍按R-068停场，不自动胜利、逃跑或战役失败。

可补人数=剩余等待代币+已完成准备的合法替补。R31已选替补已经付过代币，不能在R25人数检查时丢掉或重复扣；也不能超过当前驿站等级提供的总人数。替补须对应真实死者，身份唯一、获批属性/技能及空白入队状态有效。旧I级省略余额仍由原驿站函数读取2，不填造字段。

不足四人时，finishDungeonBattle仅记录内部campaignFailure=insufficientWaitingHeroes，并冻结后续命令；不发战后/房间奖励、不扣代币、不洗怪、不移交RNG，保留战斗终态。原noWaitingHeroes含义保留。余额足够则复用逃跑交接：同步死者/共享牌池，弃房牌、怪物按种子洗回，房间不清理、不发宝藏/巢穴/Curio奖励，记录必须先离房，转awaitingReplacement，全部替补齐备后才可能入队。

保留原准备替补命令行为，避免旧全灭停点已接受的准备日志因新增前置条件失效。网页引导先处置死者饰品，再点“结算英雄全灭”；在该普通全灭停点暂禁准备按钮。显示新的失败原因，不能用“第四轮撤退”描述全灭。单场沙盒仍只记录停场，未伪装成正式战役。

命令名与存档schema/版本保持原样。新内部失败原因由已存在的finishDungeonBattle日志回放产生，快照仍严格比较；未增加任意状态写入或放宽来源校验。

## 验收与限制

新增8项机制场景（含0–3余额参数化），连同原交接/替补专项两文件49项通过。覆盖余额不足原子失败/冻结、余额4逃跑交接/宝藏无奖/牌池与RNG守恒、旧I级余额、全灭停点原已准备替补、战中先准备后全灭、不重复扣代币、超建筑容量、重复交接、双方全灭无自动失败、假胜利/假全灭/坏牌池/坏替补/Boss未知任务拒绝，以及JSON状态恢复后同命令一致。

场景使用真实房间/怪物部署之后的明示死亡边界夹具，死亡事实交给既有endAfterCasualties分类，再执行公开交接/替补命令；**夹具不冒称自然击杀**。机制夹具 `wipeoutBoundary` / `prepareVerifiedWipeoutReplacements` 仅用于边界/机制验收。

## 续：自然全灭正式存档（#239 之后）

基线：#239 合并 main `438f7da`（R-095，四名已核实额外在池）。本主题分支 `cursor/phase4-natural-wipeout-save-3a36` tip `a6bf6bb`。

新增自然公开命令路径 `naturalWipeoutReplacementPath`：

1. Fundraiser seed2 不捐献攒金 → 付费驿站 I→II→III（余额4）
2. 村庄结束准备 → 下一任务 Scout Ahead
3. `naturalQuest({ preferWipeout: true })`：英雄浪费换姿态、不求胜；补给/探索待选固定首项以免 RNG 偏到第4轮撤退；`heroesDefeated` 后公开 `finishDungeonBattle`
4. 按序准备 VERIFIED_EXTRA_IDS（BH/PD/GR/Occ）→ 可 `joinPreparedReplacements`
5. 全程 `createQuestSave` / `loadQuestSave` 往返一致

未改存档 schema / 命令名。GR/Occ 技能效果、Pilfer、Dark Ritual 仍未接线（R-001/R-048）。Q-79/Q-80、Boss 全灭、人工试玩保留；不进 Phase 5。

下一主题优先 GR/Occ I 级技能与 Pilfer / Dark Ritual 接线。
