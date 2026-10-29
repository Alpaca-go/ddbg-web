# C-015 第一刀：Collector Room 三宝箱布置

基线：`df7127a`（#367 已合入，本机已 `git pull --ff-only`）。只接核心 Ruins Collector I 的战斗开场战利品布置。

## 依据与几何边界

- 规格书 §14.5 / 官方规则书 R39：Collector 房间的指定区域放 **3** 个宝箱。已对照 R39 页面图像与当前版 `room:p012`（Collector Room）卡图，三个宝箱在同一印刷区域。
- `docs/rulings.md` R-047：十枚有限代币，已拾取的本次地牢不再出现；抽空不再放。R-059：战后未拾取回可用池；拾取与补给上限沿用原规则。
- `boss_ability:p016` 的 R-034 / Collect All 是召唤布置依据；本刀三宝箱数量与有限池依据分别为 R39、R-047，不改召唤落区。
- 当前 `room_tile_geometry.json` 仍是九个普通遗迹面，**没有 Collector Room 获批几何**；普通入口也明确拒绝 Boss 房间（`selectRoomTile`）。卡图上的三箱区域尚未绑定生产逻辑区 ID，保持 R-048 hold。

## 运行时

- `BattleSetup.collectorRoomLootAreaId` 是待获批几何提供的逻辑区绑定；测试夹具使用抽象 a/b 区，不提供生产坐标、邻接或审批标记。未填 / 未知区域时 `startBattle` 原子拒绝，不推进 RNG 或部署宝箱。
- 对应已注册 Collector I 遭遇、存活 Boss 与房间身份通过校验后，复用 `placeBattleLoot` 在同一区域放三枚独立随机代币；可用不足三枚按 R-047 抽空即止。房间 / 既有标记冲突、已布置或损坏有限堆都拒绝。
- `placeBattleLoot` 新增可重复区域的布置参数；普通 `lootAreas` 的唯一标记约定保留。每枚代币仍有独立 id / revealed / claimed 状态，经 `interactLoot` 每次花一行动拾取一枚，战后由既有 `closeBattleLoot` 回收未拾取代币。
- 战斗区域 UI 显示实际剩余宝箱数量，不泄露未翻面的奖励种类。

## 验证与保留项

新增 10 条场景覆盖：同区三枚 / 牌池守恒、确定性与输入不变、缺失 / 未知绑定、冲突拒绝、剩余 0/1/2 枚、逐枚拾取与回池、坏池拒绝、普通遭遇不套用三箱规则。现有 Collector 测试补上明确的机制夹具绑定。

相关 9 个测试文件共 72 条通过；typecheck、build、改动代码 ESLint / Prettier 与 `git diff --check` 通过。排除本地 `.cache` 后全仓 ESLint 仍为 8 个原有错误。

C-015 总框保持未勾选：正式落区必须等待 Kyries 批 Collector Room 几何后再绑定；当前正式 Boss 入场 / 存档闭环不因此宣称完成。任务卡、R-121 room token、C-016、II/III、Phase 6 和扩展均保持原边界。

全量 test / lint 的基线失败沿用 #366 的干净基线复核，本刀不夹带其它 Boss 或自然流程清理。
