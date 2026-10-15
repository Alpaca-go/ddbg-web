# Phase 4：下一任务出征循环、临时技能与奖励补给骰

本主题从 main（#191 防御运行时 + #192 Guild 英雄等级升级，`b1c225c`）继续。依据规格书 §4.1 / §4.5 / §5.2（官方 R12 / R32–R34）、R-037、R-041、R-079、R-080。

## 改动

- 新增 `offerNextQuest`：村庄 `preparationComplete` 后从剩余已接通 I 级任务中洗牌，抽至多 2 张供选；仅剩 1 张时只提供确认项（R-037 牌堆耗尽后果，不新开 Q）。
- `resolveChoice`（`hamlet-next-quest:*`）选定后出征：保留金币、建筑等级、驿站、条件/饰品/房间/怪物/Curio 池与游标；上一任务与未选任务写入 `discardedQuests`；游商陈列洗回；村庄事件牌堆写入 `hamletMemory` 供下轮续抽。
- 出征时 `applyTemporarySkillUpgrades`：把铁匠计划中的临时卡装入 `skillIds`，计划保留。
- `rollDungeonProvisions` 按 R-041：常规每人 2 颗之后，按姿态顺序逐颗掷奖励骰（含 Wild）；公共池满 16 即停，多余作废；Radiant 自选不影响奖励骰；掷后清除 `nextQuestProvisionDice`。
- `beginReturnToHamlet` 调用 `restoreTemporarySkillUpgrades`：按当前计划归还原卡（R-080 可为 Guild 永久卡），并清除计划字段。
- `drawHamletEvent`：有 `hamletMemory` 时从记忆牌堆续抽，不再整副重洗；首轮回村仍洗满 16 张。
- 沙盒在准备结束后提供「抽取下一任务」按钮；存档 schema 纳入 `offerNextQuest`。

## 测试与限制

- 新增场景：临时技能应用/归还（含 R-080 II→III）、奖励骰满 16 截断、真实铁匠 III + Survivalist 记录后出征/补给/提前离开归还与同种子回放、拒绝边界。
- **不**声称自然两任务攒满 4XP 战役验收：单任务最高仍 3XP；本切片为出征接口铺路，连续 Scout/Wipe 自然 4XP 留下一主题。
- 正式地牢仍只接受 I 级英雄出征；高等级英雄出征未开放。
- Q-79 / Q-80 pending，不自行裁定；未进入 Phase 5；不代签人工试玩。
- 非阶段收尾，不新增 Playwright。

## 下一主题

连续两任务自然命令路径攒满 4XP → Guild 英雄升级验收；或剩余 9 张村庄事件 / 驿站死亡补人。

## 最终验证

本机 Node 24.21.0 / pnpm 12.9.1：`pnpm typecheck`、`pnpm lint`、122 文件 / 1099 项单元与场景测试（`pnpm test --maxWorkers=4`）、`pnpm build`、`git diff --check` 全部通过。未检查远端 Actions。用户 8080 配置、临时资料/截图与美术不提交。
