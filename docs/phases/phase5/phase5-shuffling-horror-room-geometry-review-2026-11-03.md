# Shuffling Horror Room 几何审核稿

状态：Kyries 已回复“核对通过”，Q-146 解决为 R-163；已录入获批几何，Boss运行时准入尚未核实，保持不可参战。依据 R-001、R-048，核心规则 R16–18、R25。基线 main `2c2defa6`（#557）。

来源：本机私有印刷缓存 `DD_COREBOX_TILES_BACK.pdf` p13，最暗地牢编号10；配套 `02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf` p23，`room:p023`。已目视完整板块与房间卡，不混用 FRONT p13 的 Templars Room。美术只留本机缓存。

## 获批区域、部署

按从左到右、从上到下分为三排，A/B/C为上排，D/E/F为中排，G/H/I为下排。中央E下方黑色横带不编区域。

| 区域 | 位置         | 容量 | 地形   | 部署 / 标记               |
| ---- | ------------ | ---: | ------ | ------------------------- |
| A    | 左上白框纵区 |    2 | high   | 无                        |
| B    | 上方中央纵区 |    3 | normal | 英雄Support               |
| C    | 右上白框纵区 |    2 | high   | 怪物Support               |
| D    | 中部左侧区   |    3 | normal | 怪物Ranged                |
| E    | 中部中央横区 |    3 | normal | 无                        |
| F    | 中部右侧区   |    3 | normal | 无                        |
| G    | 左下区       |    3 | normal | 英雄Aggressive            |
| H    | 下方中央区   |    3 | normal | 怪物Aggressive、Defensive |
| I    | 右下区       |    3 | normal | 英雄Ranged、Defensive     |

共9区，容量序列2、3、2、3、3、3、3、3、3；仅A/C高地，均有白框及山形标记。无宝箱、无橙星或其它特殊交互标记，不按插画拆区。

## 获批连接

- 可通行无向边9条：A-D、B-E、C-F、D-E、D-G、E-F、F-I、G-H、H-I。未列出的区域对不补边。
- 仅角点4组：B-D、B-F、D-H、F-H。
- 接壤但有墙 / 阻挡：无；A/C白框只表示高地，不另判为墙。
- A与B、B与C之间各有黑色纵带，均不相连，也不记仅角点。中央E与下方H之间隔着黑色横带，不补E-H通路或仅角点。
- D-E及E-F的共享边只覆盖E所在高度；E下方黑色横带不属于E。D-H、F-H仅在下排顶角接触。

## 配套房间卡

ROOMS FRONT p23为 Shuffling Horror Room（BOSS）。目视房间卡未见额外效果文字；本次只记录图面，不据此宣告Boss技能、召唤或完整运行时已经接通。

## 确认与入库

Q-146 已解决：Kyries 已确认本稿全部图面事实；按R-163录入独立schema及规范化数据。Boss运行时准入单独核实。

验证：已目视完整板块及配套room卡。本次仅录入几何数据，不改引擎或UI；验证结果见PR。当前19面几何获批、13面可参战。
