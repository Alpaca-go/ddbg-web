# Teleporters 几何审核稿

状态：Kyries 已明确回复“核对通过”，Q-142 解决为 R-159；已录入几何与房间卡文来源，传送运行时未接通，保持 `usable=false`、`runtimeReady=false`。依据 R-001、R-048、R-021，核心规则 R16–18、R25。基线 main `3cb4e40a`（#552）。

来源：本机私有印刷缓存 `DD_COREBOX_TILES_BACK.pdf` p11，最暗地牢编号6；配套 `02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf` p19，`room:p019`。已目视完整板块与房间卡，不混用 FRONT p11。

标字图：`D:\ddbg-web\.cache\teleporters-labelled-review.png`。字母不遮容量、姿态、宝箱或星标；图片只留本机私有缓存，不提交。

## 区域、部署和宝箱候选

| 区域 | 位置           | 容量 | 地形   | 部署 / 标记           | 宝箱数量 |
| ---- | -------------- | ---: | ------ | --------------------- | -------: |
| A    | 左上漩涡区     |    3 | normal | 怪物 Aggressive；橙星 |        0 |
| B    | 上方中央窄竖区 |    2 | normal | 英雄 Ranged           |        0 |
| C    | 右上漩涡区     |    3 | normal | 怪物 Support；橙星    |        1 |
| D    | 左侧中部区     |    2 | normal | 英雄 Defensive        |        0 |
| E    | 右侧中部区     |    2 | normal | 英雄 Support          |        0 |
| F    | 左下漩涡区     |    3 | normal | 怪物 Defensive；橙星  |        1 |
| G    | 下方中央窄竖区 |    2 | normal | 英雄 Aggressive       |        0 |
| H    | 右下漩涡区     |    3 | normal | 怪物 Ranged；橙星     |        0 |

共8区；容量序列3、2、3、2、2、3、2、3。均候选普通地形，未见高地白框或低地图示；红色背景不据此视为低地。两个宝箱分别在C、F。

## 实体连接候选

- 可通行无向边4条：A-D、B-C、E-H、F-G。
- 仅角点接触：无。
- 接壤但有墙 / 阻挡：候选为无。
- 黑色空白不是区域，也不补实体连接。实体布局分为A/D、B/C、E/H、F/G四组；A-B、D-F、G-H及C-E之间均隔黑色空带。

## 橙星区域与room卡文对应

四个橙星候选为A、C、F、H。ROOMS FRONT p19卡文分为两句：角色可在橙星区域之间移动和攻击；英雄穿过橙星区域承受压力+1。压力图标 `df38279161`，原始文本保留在 `room:p019.printedLines` 最后三行。

卡文对应的橙星区域对为A-C、A-F、A-H、C-F、C-H、F-H。这里仅列特殊效果的区域集合与对应关系，不将它们混成板块印刷的实体通路，也不据此补普通视线、距离或射程数值。

“moving through”保留为“穿过”；进入、离开、连续传送的压力触发次数及移动消耗等运行时细节，不由这次几何核图另行裁定。攻击传送与移动传送均保留卡文来源，完整运行时未接通前不开放参战。

## 确认与入库

- Q-142 已解决：Kyries 已确认A–H容量、普通地形、双方四姿态部署、4条实体通路、无仅角点/额外阻挡、C/F宝箱及A/C/F/H橙星与room卡文对应。
- 已录入独立schema、规范化JSON与来源/几何漂移校验。

验证：已目视完整tile、配套room卡及标字图；本次录入几何与卡文来源，不改引擎或UI。规范化58文件196测通过，build通过，本次变动文件ESLint通过。全仓typecheck（含数据包对引擎的依赖检查）、lint被基线main `90f9dcc5`（#553）既有错误阻断：`battle-eldritch-vault.ts`、`battle-eldritch-vault.test.ts`、`battle-trinket.ts`类型错误；后者和`trinket-acquisition.ts`有prefer-const错误，另有3个引擎文件格式问题。这些文件本次未改动。全量与smoke交CI验证；质量闸门未全通过，PR保持草稿。当前15面几何获批、13面可参战，非阶段收尾，不新增Playwright路径。

编号说明：main 的 Q-141 已用于 Eldritch Vault 饰品运行时问题，本面的临时 Q-141 顺延为 Q-142，不改原问题。
