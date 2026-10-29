# C-019 首切片：Necromancer II 显式战斗

基线 `9f91609`（#374）。本刀接死灵法师 II 的已核实战斗数据与公开命令，C-019 总项保持未完成。

## 依据

- 官方核心规则书 R31、R38；规格书 §6、§14.4–14.5；R-001、R-020、R-034、R-048。
- 已对照本地当前版印刷 PNG：`monster_medium:p090`、`boss_ability:p005` 正反面，以及官方 R38 页面图像。印刷图仅核对卡牌文字与数值；召唤、先攻及死亡清场规则以规则书为准。
- II 卡独立核实：Life 103、Dodge 1、Speed 3；四姿态 d10 为 1–3 / 4–6 / 7–10。三招 Acc 11；前两招普通 / 暴击伤害分别 8 / 12、6 / 9；第三招无 Crit / 无伤害、压力 +2；自身 Push 1 后在目标区域召唤 Bone Soldier。

## 已接

- `boss:ruins:necromancer:2` 脚本及显式注册入口；描述 / 能力 / 战斗卡引用分别为 p002 / p005 / p090，每轮一次行动与一张先攻。
- 三招选招、Crowded 多目标共骰、Speed 移动、自身位移抗性、纯压力与统一生命收尾。p090 第二招的已确认 `self_plate` 背景图标仅在匹配整行后剔除，不放宽未知效果入口。
- R38：II 召唤 Bone Soldier（p001），沿用首空姿态、Target Area、满轨无效、满区 PendingChoice、当前牌堆洗先攻与当轮行动；本体死亡时移除伴战怪物。I 仍使用 Bone Rabble；III 不推断。
- 将两套已有公开命令场景同时用于 I / II，覆盖三招、确定性、输入不变、满轨 / 满区、过期选择、当前轮召唤物行动、攻击 / Blight 击杀与缺数据拒绝。

## 未开放

II 的威胁背面与 I 不同，不能继承 I 的永久移除非 Unholy / 封锁墓地：

- Army of the Dead：本次地牢首次战斗首位生成 Bone Captain，运行时未接。
- Haunted Graveyard：准备首日全体掷 d10，最低者首日去墓地守卫并可照常用建筑，运行时未接。

这两项钩子明确返回 `stub`。II 不加入 `ensureCoreBossScriptsRegistered`，正常升幕抽到 p002 仍停点；只有显式战斗场景注册后才可运行本刀。未增加 II 默认映射、II/III 幕末 offer、正式 Boss 入场或存档字段；映射方案仍待 Kyries 确认。R-121、其它 Boss、任务卡与 Phase 6 保持原范围。

## 验证

相关 11 文件 131 项通过；同步 II 级卡白名单后的单文件 8 项通过。typecheck、build、修改代码 ESLint / Prettier、`git diff --check` 通过。

全量初跑（maxWorkers=4）：219 文件通过 / 45 失败；1767 用例通过 / 30 失败 / 118 跳过。与 #374 日志比，新增一项旧 II 级白名单断言失败，已修正并复跑该文件 8 项通过；上一版的 `hamlet-stances` 超时未再出现，其余 29 项失败标题均已有。未再次跑全量，不把分项复跑合成为全仓全绿结果。`pnpm lint` 仍失败；排除本地缓存后为六项既有错误（Flesh 4 / Swine 1 / Hamlet 1）。本刀不是阶段末尾，不增加 Playwright 用例。
