# C-013：Prophet I 房间 d10 绑定校验（2026-10-29）

基线：`da4204b`（#368 合入后的 main）。本刀接通显式逻辑区绑定的验证、Calamitous 拒绝路径与木长椅数量显示。**C-013 总项保持未勾选：Prophet Room 正式几何 / 生产绑定仍 hold。**

## 依据与边界

- R-001：官方核心规则书 R38–R39、规格书 §14.5；Prophet 每轮第 1 行动掷 4d10，按房间数字标记布置四个 Wooden Pew。木长椅不占用区域空间。
- `room:p011` 的八组印刷标记按数据顺序为 `4 / 3 / 1-2 / 6 / 5 / 7-8 / 10 / 9`。对照本地卡面图像；`096ea91bb9` 已由图标词典 v1.8、Q-47 第二批确认是 `area_d10_marker`。确认数字范围不等于确认几何落点。
- R-048：`room_tile_geometry.json` 目前只有九个普通遗迹板块面；`selectRoomTile` 拒绝 Boss 房间。未找到已获批 Prophet Room 几何，故不填写坐标、邻接、容量或生产映射。

## 本刀交付

- `readProphetIRoomD10Binding` 只读验证现有 `prophetRoomD10AreaTable`：八组标记必须完整、各出现一次，引用的区域必须已存在；如有当前房间身份，则须为 `room:p011`。不要求不同标记必须对应不同区域，不增加未经核实的空间约束。
- `startBattle` 在启动副作用与推进 RNG 前验证绑定。Calamitous 结算入口复用验证；遇到不完整、重复、未知引用或房间冲突时保留原状态并返回 `commandRefused`。
- 修复第 1 行动缺表时退回普通选招的漏洞：仍识别为必做 Calamitous，再明确拒绝。纯 d10 查找遇到同一标记的多个落点也不再取首项。
- 完整绑定沿用现有种子 RNG 布置四张木长椅；UI 在已有逻辑区域显示数量，不生成图片、图标或地图几何。

## 验证

- 新增八项场景：印刷键与十面映射；五种无效绑定；当前房间冲突 / 重复落点；完整绑定从开战到 4d10 布置的确定性、输入不变与重复行动拒绝。
- Prophet、Collector 房间、Necromancer、Fanatic、遭遇与 Boss 注册相关八个测试文件共 **79 项通过**；typecheck、build 通过。
- 变更代码 ESLint / Prettier 与 `git diff --check` 通过；排除本地 `.cache` 后全仓 ESLint 仍有七个既有错误（Collector 一项、Flesh 四项、Swine 一项、Hamlet 一项）。全量测试的基线失败沿用 #366 的干净基线复核，不把相关测试通过称作全仓测试全绿。

## 剩余停点

测试中的八个 `pew-area-*` 是抽象逻辑区，不代表 Prophet Room 的形状或标记所在位置。正式几何获批后，仍需生产路径提供 `prophetRoomD10AreaTable` 并验收实际入场，才能勾选 C-013。

C-014 的 Rubble 同区多目标 / 多怪伴战先攻、R-121 任务卡与边缘房、英雄 II/III、Phase 6 均未开启。
