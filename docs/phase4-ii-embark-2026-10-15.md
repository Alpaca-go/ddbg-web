# Phase 4：II 级任务出征与战役等级切换

本主题从最新 main（#197 In Good Spirits，tip `7b66eeb`）继续。按 #197 / 高等级出征文档建议，优先做 **II 级任务 / 战役等级切换** 出征切片。剩余 5 张村庄事件与驿站死亡补人（需扩展英雄池）本主题不做。

## 规格核对

依据规格书 §2.1–2.2 / §4.1 / §5.1 / §13.1（官方 R9、R15、R29、R32–R35）、R-037、R-038、R-048。

- Act II 使用 II 级任务堆；击败 Boss 后战役等级 +1，旧级任务堆移出，怪物累加，地牢饰品改抽新级（R-037）。
- 本切片**不含 Boss 战与新迫近威胁抽取**；提供 `advanceCampaignLevel` 作为 I→II 牌堆切换命令，仅供沙盒准备结束后预览，不能作为正式升幕。
- II 级任务卡共 5 张（QUEST p6–p10）。仅接通无特殊规则、且房间代币图标可完全落到 I 级已印刷核对映射上的 **Reduce to Rubble II**（p8）：Dark×1、Curio×2、Lair×3、Trap×2；XP = 1 / Lair（同 Wipe 系）。Clear the Path II（p7）含 `c736bcb48e` 独立房间代币，未做印刷点核，**不接线**（见限制）。

## 改动

- 数据：`reduce_to_rubble_distribution.json`；`basicQuests` 增加 `level` 与 `quest:p008`；`questsForCampaignLevel`；`ruinsMonsterPoolThrough`。
- `advanceCampaignLevel`：村庄 `preparationComplete` 后 I→II；弃置剩余已接通 I 级任务；怪物牌堆累加 II 级并洗混；地牢饰品切 II（已装备 I 级饰品保留在英雄身上，不进新牌堆）。
- `offerNextQuest` / `chooseNextQuest`：按 `campaignLevel` 抽选已接通任务；出征 `dungeonLevel = campaignLevel`，校验饰品等级一致。
- `prepareDungeonMonsters` / 战斗分区守恒：按 1..DL 累加牌堆长度，不再写死 42。
- 沙盒准备结束页增加「推进战役等级 I→II」；正式页面隐藏预览按钮，存档 schema 拒绝 `advanceCampaignLevel`。
- 正式开局入口仍只接受 I 级任务。

## 测试

- Reduce to Rubble 房间构成与 8 槽守恒。
- 真实 Fundraiser 回村夹具 → 推进 I→II → 确认出征 p008（DL2、饰品 II、巢穴×3）→ 同种子回放。
- 未推进时抽不到 II 级；已在 II 级拒绝再次推进。

## 限制

- 仅 1 张 II 级任务接通；Clear the Path 等其余 II/III 级与特殊规则任务未接。
- 无 Boss 战；`advanceCampaignLevel` 不抽新威胁。
- II 级怪物可进累加牌堆，但完整战斗入场仍受既有 L1 核实边界约束（本切片不声称 II 级怪可战）。
- 游商仍为 I 级陈列/买卖；卸下跨级饰品后的牌堆归还未单独验收。
- 事件 11/16；Q-79 / Q-80 pending；不代签人工试玩；未进 Phase 5。
- 非阶段收尾，不新增 Playwright。

## 下一主题

剩余 5 张村庄事件（待图标/天数批准）、驿站死亡补人（需扩展英雄池）、Clear the Path II 印刷点核、或 II 级怪物战斗入场。

## 最终验证

本机 Node 24.21.0 / pnpm 12.9.1：`pnpm typecheck`、`pnpm lint`、127 文件 / 1114 项单元与场景测试（`pnpm test --maxWorkers=4`）、`pnpm build`、`git diff --check` 全部通过。未检查远端 Actions。用户 8080 配置、临时资料与美术不提交。

## #198本轮审查修正

正式升幕必须满足R35的Boss胜利与新威胁流程；本切片尚未接通，不能仅凭村庄准备结束宣称合法升幕。推进按钮只在非正式沙盒显示，并标明开发预览；预览命令不纳入正式存档。I级正式任务和存档路径保持。

跨级旧饰品仍可保留和转交；弃置旧级饰品需要独立归还池，当前不提供该腾位选项，过期选项拒绝，避免混入II级弃牌破坏守恒。不声称跨级弃牌已经实现。另补原饰品池、完整怪物目录及重复/非I级实例预检，不能借升幕洗掉坏状态；移除原先恒真的牌数检查。新增负向场景与旧饰品转交后装备新卡的守恒验证。

本轮审查验证：本机typecheck、ESLint、构建通过；127文件/1115项单元及场景测试以2 workers完整重跑通过。首次4 workers与编译并发时两条既有墓地测试触及原5秒时限，未改时限。根pnpm lint仅被本机未跟踪的docs/HANDOFF-BOT-2026-10-15.md格式阻挡；保留该文件，排除它后Prettier全仓检查通过。当前Node24.20.0；未检查远端Actions。另已目视核对QUEST完整p8及其12点/1XP每巢穴/八房分布。
