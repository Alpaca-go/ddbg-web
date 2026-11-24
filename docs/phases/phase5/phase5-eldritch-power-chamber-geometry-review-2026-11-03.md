# Eldritch Power Chamber 几何审核稿

状态：Kyries 已明确回复“审核结果通过”，Q-140 解决为 R-158；几何与效果来源入库，特殊效果运行时未接通，保持 `usable=false`、`runtimeReady=false`。依据 R-001、R-048、R-021，核心规则 R16–18、R25。基线 main `16e3685d`（#551）。

来源：本机私有印刷缓存 `DD_COREBOX_TILES_FRONT.pdf` p11，最暗地牢编号5；配套 `02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf` p18，`room:p018`。已目视完整板块与房间卡，不混用 BACK p11。

标字图：`D:\ddbg-web\.cache\eldritch-power-chamber-labelled-review.png`。图片只留本机私有缓存，不提交。

## 区域、部署和宝箱候选

| 区域 | 位置         | 容量 | 地形   | 部署 / 标记                 | 宝箱数量 |
| ---- | ------------ | ---: | ------ | --------------------------- | -------: |
| A    | 左上         |    2 | normal | 怪物 Ranged                 |        2 |
| B    | 上方中央横区 |    3 | normal | 无                          |        0 |
| C    | 右上圆盘大区 |    4 | normal | 英雄 Support / Ranged；橙星 |        0 |
| D    | 左侧长竖区   |    3 | normal | 无                          |        0 |
| E    | 中央折角横区 |    3 | normal | 怪物 Aggressive / Defensive |        0 |
| F    | 右侧长竖区   |    4 | normal | 怪物 Support                |        0 |
| G    | 左下折角区   |    4 | normal | 英雄 Defensive / Aggressive |        0 |
| H    | 右下横区     |    3 | normal | 无                          |        0 |

共8区；容量序列2、3、4、3、3、4、4、3。未见高地白框或低地图示，圆盘插画不另拆区域；红色背景不据此命名为低地。两个独立宝箱均在A。

## 连接候选

- 可通行无向边11条：A-B、A-D、B-C、B-E、C-E、C-F、D-E、D-G、E-F、F-H、G-H。
- 仅角点接触2组（不通行）：A-E、B-D。
- 接壤但有墙 / 阻挡：候选为无。
- 中央黑色方形空区不是区域；E不直接接G/H，D不直接接F/H。C与E共享竖边，C与F共享横边，E与F共享竖边，均不是仅角点接触。

## 特殊区域与卡文来源

ROOMS FRONT p18卡文分为两句：怪物需要移动至射程距离时，总是朝橙星区域移动；若一名怪物在橙星区域结束其回合，每名英雄受到5点伤害。卡面伤害图标 `8d4bbe5e11` 已在词典确认，不能误读成压力。

候选橙星区域为C。原文中的移动限制为“need to move into range distance”，不外推为所有移动或强制位移均朝C；结束回合条件以单个怪物为主体，不擅自改成整轮触发一次。伤害范围、减免和路径选择等运行时边界另按获批规则处理，本稿仅确认图面和卡文对应。

## 确认与入库

- Q-140 已解决：Kyries 已确认A–H容量、普通地形、双方四姿态部署、11条通路、两组仅角点、A的两个宝箱及C橙星与room卡文对应。
- 已录入独立schema、规范化JSON与来源/几何漂移校验；完整特殊效果运行时未接通前不开放参战。

验证：已目视完整tile、配套room卡及标字图；本次录入生产几何与卡文来源，不改引擎或UI。规范化57文件192测通过，覆盖确定性再生及来源、部署、连接、宝箱与星标漂移拒绝；全仓typecheck、lint、build通过。本地全量3024测中3022项通过、两条既有引擎场景超过5000ms；两文件以单worker、20000ms上限单独复查，9项全部通过。当前25张具名房间中14张几何获批、11张可参战。非阶段收尾，不新增Playwright路径。

最终验证：[PR #552](https://github.com/Alpaca-go/ddbg-web/pull/552) 固定代码 `48fbe446aee8d0e59beabd57cf40a7feb2327173` 的 [CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/41574035806) 全部通过：typecheck、lint、全量单元/场景测试、build、印刷管线Python测试与Playwright smoke均成功。后续提交仅补文档验证记录。
