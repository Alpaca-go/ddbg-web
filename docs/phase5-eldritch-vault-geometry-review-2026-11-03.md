# Eldritch Vault 几何审核稿

状态：Kyries已回复“通过”，Q-138解决为R-156。以下图面候选已获批，独立schema与规范化JSON已入库，`geometryVerified=true`；饰品交互未接通，保持`usable=false`、`runtimeReady=false`。依据 R-001、R-048 与核心规则 R16–18、R25；不外推其它面。

来源：本机私有印刷缓存 `DD_COREBOX_TILES_FRONT.pdf` p10（最暗地牢3）；配套 `02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf` p16，`room:p016`。已目视对照完整板块与房间卡，两者布局匹配。旧流程中查看的 FRONT p9 是最暗地牢1，不是本面；不采用其布局。

标字图：`D:\ddbg-web\.cache\eldritch-vault-labelled-review.png`。字母仅作区域定位，不遮原容量、地形与姿态图标。图像只留本地，不提交。

## 区域、容量、地形与部署候选

| 区域 | 位置 / 轮廓      | 容量 | 地形   | 部署 / 标记     |
| ---- | ---------------- | ---: | ------ | --------------- |
| A    | 左上外侧L形区    |    4 | normal | 英雄 Support    |
| B    | 左上内侧白框长区 |    2 | high   | 怪物 Defensive  |
| C    | 右上外侧L形区    |    4 | normal | 英雄 Aggressive |
| D    | 右上内侧白框长区 |    2 | high   | 怪物 Ranged     |
| E    | 中央白框方区     |    2 | high   | 绿色星标        |
| F    | 左下外侧L形区    |    4 | normal | 英雄 Defensive  |
| G    | 左下内侧白框长区 |    2 | high   | 怪物 Support    |
| H    | 右下内侧白框长区 |    2 | high   | 怪物 Aggressive |
| I    | 右下外侧L形区    |    4 | normal | 英雄 Ranged     |

宝箱：候选为无。中央箱体是背景画，未见独立宝箱部署图标；需确认不把画面箱体当宝箱。

## 连接候选

- 可通行无向边8条：A-B、B-E、C-D、D-E、E-G、E-H、F-G、H-I。
- 仅角点接触：候选为无。
- 接壤但被墙阻断：候选为无；白色边框按高地区边界解读，不额外推定墙。
- 顶部、底部中央竖向黑区及左右中段横向黑区均不是区域；不补 A-C、F-I、A-F、C-I 等捷径。中央E只接四个内侧高地区。

## 绿色星标对应卡文

ROOMS FRONT p16：

> A Hero can spend 2 actions here and draw one Level 3 Trinket per Hero in play. Equipping one of those Trinkets causes {icon:df38279161} +2.

词典 `df38279161` 已确认为 Stress（压力）。候选对应：E区英雄可花费2行动，按在场英雄人数各抽一张III级饰品；装备其中一张导致压力+2。本次仅绑定来源和图面，不自行补充共享、分配、重复使用、装备时机或清场后的使用流程。

## 待确认

- Q-138已解决：A–I 的容量、地形、英雄/怪物姿态部署、8条通路、无角点/阻挡/宝箱，以及E区绿色星标与上述卡文对应均获批准。
- 已入库独立schema、规范化JSON和针对性校验；特殊效果运行时未完整实现前保持 `usable=false`、`runtimeReady=false`。

验证：原图、配套卡、字母标注已目视检查；规范化55文件184测通过，覆盖确定性再生、不修改来源、容量/部署/边/效果来源漂移拒绝，以及不可提前开放参战。当前25张具名房间中12张几何获批、11张可用，尚缺13张几何。未修改引擎或UI入口，非阶段收尾，不新增Playwright路径。全仓检查结果另补。
