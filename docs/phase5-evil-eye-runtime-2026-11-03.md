# Evil Eye运行时

依据R-160、R-170、核心R26与ROOMS FRONT p20，开放room:p020：E区结束回合抽负面怪癖；A/D/H/I结束回合压力+2。E区可支付两行动摧毁眼睛，获得正面怪癖后全体存活英雄压力−5。本场不可重复，毁眼后E区停用，其他凝视区保留。

复用完整实体怪癖池、种子RNG、第四张替换与发疯死亡流程。替换通过PendingChoice续接，结束回合不重复抽牌；无效选择及后续预检失败原子回滚。网页提供毁眼按钮，公开命令纳入存档schema。未改变任务白名单、Boss准入或combatReady。

本面usable/runtimeReady开放，当前25面几何获批、16面可用。同步已有数量断言，补齐主线roomTileBattleAreas缺失的withTeleporterAdjacency导入。未提交任何美术。

验证：专项11测与网页毁眼冒烟1/1通过；build通过。全仓类型检查、干净检出lint与完整单测继续核验。原工作区lint受未跟踪交接稿格式和UTF-16核图JSON阻塞，保留原文件，不将其混入本PR。浏览器使用明示整面交互夹具，不宣称自然战役已走通。
