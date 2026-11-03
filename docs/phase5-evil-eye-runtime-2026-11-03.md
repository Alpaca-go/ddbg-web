# Evil Eye运行时

依据R-160、R-170、核心R26与ROOMS FRONT p20，开放room:p020：E区结束回合抽负面怪癖；A/D/H/I结束回合压力+2。E区可支付两行动摧毁眼睛，获得正面怪癖后全体存活英雄压力−5。本场不可重复，毁眼后E区停用，其他凝视区保留。

复用完整实体怪癖池、种子RNG、第四张替换与发疯死亡流程。替换通过PendingChoice续接，结束回合不重复抽牌；无效选择及后续预检失败原子回滚。网页提供毁眼按钮，公开命令纳入存档schema。未改变任务白名单、Boss准入或combatReady。

本面usable/runtimeReady开放，当前25面几何获批、16面可用。同步已有数量断言，补齐主线roomTileBattleAreas缺失的withTeleporterAdjacency导入。未提交任何美术。

验证：Node24.21.0/pnpm12.9.1下，Evil Eye数据/引擎12测及真实最暗部署6测通过；与神殿联合专项共28测通过，网页毁眼冒烟1/1通过。typecheck、干净检出lint、build通过。固定代码提交527e9830的CI另核验完整单测与全部浏览器冒烟。

旧部署场景曾要求固定种子抽到Evil Eye后仍无tileId；现改为验证room:p020绑定room_tile:p012、怪物C/英雄G真实部署与26张守恒，仍拒绝绕过既有最暗部署入口。原工作区lint受未跟踪交接稿格式和UTF-16核图JSON阻塞，干净检出通过，未修改或提交用户稿件。浏览器使用明示整面交互夹具，不宣称自然战役已走通。

本机早期全量运行混入两个文件的旧版本，记录为3096通过、4失败，不记作整轮全绿；这两个文件的最终固定版本已在上述28测中复核通过，完整结果以固定代码CI为准。

固定代码提交`527e9830`的[GitHub Actions检查](https://github.com/Alpaca-go/ddbg-web/actions/runs/41625915876)已全部通过：typecheck/lint/test/build和完整Playwright smoke全绿。其后仅补本文验证记录，不修改代码。
