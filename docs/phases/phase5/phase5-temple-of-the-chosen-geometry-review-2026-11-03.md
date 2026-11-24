# Temple of the Chosen 几何审核稿

状态：Kyries 已明确回复“核对通过”，Q-144 解决为 R-161；已录入几何与卡文来源，特殊效果运行时未接通，保持 `usable=false`、`runtimeReady=false`。依据 R-001、R-048、R-021，核心规则 R16–18、R25。基线 main `a19b5c56`（#555）。

来源：本机私有印刷缓存 `DD_COREBOX_TILES_BACK.pdf` p12，最暗地牢编号8；配套 `02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf` p21，`room:p021`。已目视完整板块与房间卡，不混用 FRONT p12。

标字图：`D:\ddbg-web\.cache\temple-of-the-chosen-labelled-review.png`。蓝底白字A–H只作区域定位，不遮容量、姿态、宝箱、地形或橙星。图片只留本机私有缓存，不提交。

## 区域、部署和宝箱候选

| 区域 | 位置         | 容量 | 地形   | 部署 / 标记        | 宝箱数量 |
| ---- | ------------ | ---: | ------ | ------------------ | -------: |
| A    | 顶部白框大区 |    4 | high   | 怪物 Support；橙星 |        0 |
| B    | 左侧折角长区 |    4 | normal | 无                 |        0 |
| C    | 中央上部横区 |    3 | normal | 怪物 Ranged        |        0 |
| D    | 右侧折角长区 |    4 | normal | 无                 |        0 |
| E    | 中央下部区   |    3 | normal | 怪物 Aggressive    |        2 |
| F    | 左下横区     |    4 | normal | 英雄全部四姿态     |        0 |
| G    | 下方中央横区 |    4 | normal | 怪物 Defensive     |        0 |
| H    | 右下横区     |    3 | normal | 无                 |        0 |

共8区；容量序列4、4、3、4、3、4、4、3。仅A高地，白框与山形图标相互对应；A内插画不另拆区域。两个独立宝箱均在E。其余不据红色背景或石砖底图推定高低地。

## 连接候选

- 可通行无向边11条：A-B、A-C、A-D、B-C、B-F、C-D、C-E、D-H、E-G、F-G、G-H。
- 仅角点接触4组（不通行）：B-E、D-E、E-F、E-H。
- 接壤但有墙 / 阻挡：候选为无。A白框按高地边界，不额外记墙。
- E左右两条黑色空带不是区域，B-E与D-E均不补通路。B下部内侧在黑带左方，D下部内侧在黑带右方，因此B-G、D-G既不共享边，也不补仅角点。
- A横跨B/C/D上方，分别与三者共享边；A-B、A-D不是仅角点。E经C或G进出。

## 橙星区域与room卡文对应

候选橙星区域为A。ROOMS FRONT p21的Rite of the Chosen卡文：一名怪物在此结束其回合时，所有怪物治疗5；英雄承受压力+1，另按负面怪癖追加压力+1 / Negative Quirk。

卡文来源保存在 `room:p021.printedLines` 最后四行；治疗图标 `731f6665d0`、压力图标 `df38279161` / `9b00e692ba` 已在词典确认。负面怪癖在此是追加压力的计数条件，不是要求英雄获得新负面怪癖。

本稿确认A区与整段卡文对应；按每名英雄自身负面怪癖计数还是其它范围、治疗上限、回合结束触发顺序等运行时细节不在这次几何核图中另行裁定。完整特殊效果运行时未接通前不开放参战。

## 确认与入库

- Q-144 已解决：Kyries 已确认8区容量、仅A高地、英雄四姿态F、怪物Support A/Ranged C/Aggressive E/Defensive G、11条通路、4组仅角点、无额外阻挡、E两个宝箱及A橙星卡文对应。
- 已录入独立schema、规范化JSON与来源/几何漂移校验。

验证：已目视完整tile、配套room卡及标字图；本次录入几何与卡文来源，不改引擎或UI。规范化60文件205测通过，build及本次变动文件ESLint/Prettier和diff检查通过。全仓typecheck（含数据包对引擎依赖检查）及lint仍被main的#553既有Vault/饰品类型与prefer-const错误阻断，本次未修改这些引擎文件。质量闸门未全通过，PR保持草稿；全量单元/场景及既有smoke交CI验证。当前17面几何获批、13面可参战；非阶段收尾，不新增Playwright路径。
