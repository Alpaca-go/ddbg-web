# Phase 4：高等级英雄出征与地牢战斗交接

本主题从 main（#194 自然两任务 4XP→Guild 升 II，tip `6b99c11`）继续。

## 为何改切（调查结论）

优先目标是驿站死亡补人（§4.6 / §9.4、R31/R33、R-039）。核实结果：

- #182 仅接通等待英雄代币余额与驿站升级；**消费代币、英雄池、补人 PendingChoice 仍未实现**，回村/地牢 `awaitingReplacement` 仍为停点。
- 当前已核实英雄仅四名核心（Crusader / Hellion / Highwayman / Vestal），正式入口始终四人各占一类。任一死亡后可用池为空，无法验收「选新英雄 −1 代币」的完整成功路径，除非先逐面核实更多核心英雄（R-008 共 11 名，Musketeer 除外）或新开 Q。
- 故本切片改做文档标明的下一优先缺口：**高等级出征前置**（接 #194 升 II 后继续任务）。

## 改动

依据规格书 §4.1 / §4.5 / §5.1 / §13.2（官方 R12 / R29 / R32–R34）、R-051、R-048、R-081。

- `offerNextQuest` / `chooseNextQuest`：出征门从「仅 I 级 + 3 技能」放宽为 **I–III、技能槽=2+HL**，并核验 `heroStatId`/Life/`heroLevel` 与已核实属性卡一致。
- `startDungeonBattle`：同样接受 I–III 与 2+HL 装备技能；槽数不足原子拒绝。沿用 #191 高等级防御运行时。
- 沙盒文案同步；非阶段收尾，不新增 Playwright。

## 测试

- 真实 Scout 回村后明示 4XP 夹具（自然 4XP 已由 #194 覆盖）→ Guild 升 II → `setEquippedSkills` 装满 4 槽 → 出征剩余 I 级任务，保留 II 属性；未装满拒绝；同种子回放。
- II 级 Crusader + 4 技能在真实 Treasure 守卫部署下完成 `prepareDungeonBattle` → `prepareDungeonMonsters` → `startDungeonBattle`；3 技能拒绝。

## 限制

- 仍无 II/III 级任务卡与战役等级切换；本切片是在已接通 I 级任务上携带高等级英雄。
- 驿站死亡补人未做；需更多已核实英雄类或 Q 后再接。
- 事件仍 7/16；Q-79 / Q-80 pending；不代签人工试玩；未进 Phase 5。

## 下一主题

驿站死亡补人（待英雄池扩展）、剩余村庄事件（无未审图标者优先，如 Guild Training / Unsettling Darkness / Traveling Merchants），或 II 级任务/战役等级切换。

## 最终验证

本机 Node 24.21.0 / pnpm 12.9.1：`pnpm typecheck`、`pnpm lint`、124 文件 / 1103 项单元与场景测试（`pnpm test --maxWorkers=4`）、`pnpm build`、`git diff --check` 全部通过。未检查远端 Actions。用户 8080 配置、临时资料与美术不提交。
