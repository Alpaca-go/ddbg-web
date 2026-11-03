# Toxic Chamber 几何审核稿

状态：Kyries已修正D/F怪物部署并确认其余正确，Q-139解决为R-157。几何与效果来源已入库；Toxic Vapors完整运行时未接通，保持`usable=false`、`runtimeReady=false`。依据R-001、R-048及核心规则R16–18、R25。基线main `abea6745`（#550）。

来源：本机私有印刷缓存 `DD_COREBOX_TILES_BACK.pdf` p10，最暗地牢编号4；配套 `02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf` p17，`room:p017`。已目视对照完整板块与房间卡布局。FRONT p10是Eldritch Vault，本面独立记录BACK，不混用。

标字图：`D:\ddbg-web\.cache\toxic-chamber-labelled-review.png`。字母只定位，不遮容量、地形、星标、宝箱或姿态图标。图像仅留本机私有缓存，不提交。

## 区域、部署和宝箱候选

| 区域 | 位置           | 容量 | 地形   | 部署 / 标记             | 宝箱数量 |
| ---- | -------------- | ---: | ------ | ----------------------- | -------: |
| A    | 左上           |    2 | normal | 橙色星标                |        0 |
| B    | 上方长横区     |    4 | normal | 橙色星标                |        2 |
| C    | 右上           |    2 | normal | 橙色星标                |        0 |
| D    | 左侧长竖区     |    4 | normal | 怪物Aggressive          |        0 |
| E    | 中央上半区     |    2 | normal | 橙色星标                |        2 |
| F    | 中央下半白框区 |    2 | high   | 怪物Ranged / Support    |        0 |
| G    | 右侧长竖区     |    4 | normal | 怪物Defensive           |        0 |
| H    | 左下           |    2 | normal | 英雄Support / Defensive |        0 |
| I    | 下方长横区     |    3 | normal | 无                      |        0 |
| J    | 右下           |    2 | normal | 英雄Ranged / Aggressive |        0 |

共10区；容量序列2、4、2、4、2、2、4、2、3、2。仅F高地；红色背景不据此视为低地。宝箱共4个，B与E各两个，保留独立数量。

## 连接候选

- 可通行无向边10条：A-B、A-D、B-C、C-G、D-H、E-F、F-I、G-J、H-I、I-J。
- 仅角点接触4组（不通行）：B-D、B-G、D-I、G-I。
- 接壤但被墙阻断：候选为无。F白框按高地边界记录，不附加墙。
- 中央黑色环形空带不是区域。B-E、D-E、D-F、E-G、F-G均不补通路。中央E仅接F；F向下接I，形成中央进出路线。

## 特殊区域与卡文来源

ROOMS FRONT p17的橙色星标卡文：

> Toxic Vapors: Heroes standing here suffer -3 Acc.

候选绑定A/B/C/E四区：站在这些区域的英雄Acc −3。卡文是“standing here”，不改写为回合结束扣属性、压力或伤害，不外推到没有星标的F。效果是否进入攻击数值、移动后即时恢复及其它边界，运行时另按获批规则实现；本次只确认图面和卡文对应。

## 确认与入库

- Q-139已解决：Kyries确认D为怪物Aggressive、F为怪物Ranged/Support，其余正确。上表已采用修正版。
- 已录入独立schema与规范化JSON，并补来源/容量/部署/连接/宝箱/星标漂移拒绝测试。

验证：已目视完整原图、配套room卡和标字图。Node24.21.0/pnpm12.9.1下规范化56文件188测通过，覆盖确定性再生、来源不变、修正后的D/F部署、独立四宝箱、四个橙星和不可提前开放参战；全仓typecheck、lint、build通过。生产数据只增加本面，不改引擎或UI；当前25张具名房间中13张几何获批、11张可参战，尚缺12张几何。非阶段收尾，不新增Playwright路径。全量单元/场景与smoke等待CI结果。
