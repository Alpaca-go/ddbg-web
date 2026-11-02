# Hall of Ascension 几何核对与入库

状态：Kyries 已逐项确认，L 容量修正为3；Q-134 已解决，记为 R-153。几何与卡文来源入库，usable=false。基线 main `24bb6467`（#547）。

来源：当前版 `DD_COREBOX_TILES_BACK.pdf` p9，印刷最暗编号2；配套 `DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf` p15，`room:p015`。已目视查看完整板块与房间卡的本机印刷缓存。依据核心规则 R16–18、R25，R-021、R-048；印刷图只提供布局和卡文，不补规则。

标字预览：`D:\ddbg-web\.cache\hall-of-ascension-labelled-review.png`。字母仅定位，不遮容量或姿态图标；图片不提交。

## 获批区域与部署

| 区域 | 位置           | 容量 | 地形   | 部署 / 标记              |
| ---- | -------------- | ---: | ------ | ------------------------ |
| A    | 左上           |    2 | normal | 宝箱1                    |
| B    | 上中           |    2 | normal | 绿色星标，配套卡升级效果 |
| C    | 右上           |    2 | normal | 宝箱2                    |
| D    | 左侧中段长区   |    4 | normal | 无                       |
| E    | 中央上方白框区 |    2 | high   | 怪物 Ranged              |
| F    | 右侧第二格     |    2 | normal | 无                       |
| G    | 中央横带左半   |    2 | normal | 怪物 Defensive           |
| H    | 中央横带右半   |    2 | normal | 怪物 Aggressive          |
| I    | 右侧第三格     |    2 | normal | 无                       |
| J    | 左下           |    3 | normal | 英雄 Defensive / Support |
| K    | 下中白框区     |    2 | high   | 怪物 Support             |
| L    | 右下           |    3 | normal | 英雄 Aggressive / Ranged |

获批通行边（无向13条）：A-D、B-E、C-F、D-G、D-J、E-G、E-H、F-I、G-H、G-K、H-I、H-K、I-L。

获批仅角点（3组，不通行）：F-H、G-J、H-L。其余未列对不推定相邻。

黑色空区不作区域：A-B、B-C、D-E、E-F、J-K、K-L均不补通路。D-G、H-I是横带连接；E和K各自跨G/H两区，分别记录两条边。宝箱共3个（A一个、C两个）。

## 特殊效果来源与边界

ROOMS FRONT p15 的绿色星标卡文：英雄可在此花费2行动并承受压力+3，立即升级自身或一项技能。已按截图绑定到B区；不因红色地面推断低地或伤害。

本轮已确认并入库几何、部署、宝箱及B区与该段卡文的对应。升级适用等级、费用/限制、压力触发意志或死亡后的顺序、使用次数等运行时问题，后续按官方规则与既有裁定核对；本次不自行给答案。usable=false，区域runtimeReady=false；怪物准入与房间运行时不变。

Q-134 → R-153：Kyries确认除L容量改为3外其余正确，并提供绿色星标截图作为效果对应。仅批准本面，不外推其它房间。

验证：完整原图、配套卡与标字图均已目视检查。新增独立schema锁定本面，规范化核验BACK p9及ROOMS FRONT p15来源与效果行；测试覆盖L容量修正、宝箱数量、来源漂移拒绝与未开放参战。规范化相关54文件180测通过。当前目录11张获批几何、10张usable，25张具名房间尚缺几何14张。

最终检查：typecheck、全仓lint、build通过。首次默认并发全量出现存档场景失败后中止；限制maxWorkers=2完整复跑389文件/3003测全部通过（827秒），不把首次运行记为通过。无UI或可战入口变更，不新增Playwright路径。
