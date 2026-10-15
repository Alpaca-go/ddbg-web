# Phase 4：无未审图标村庄事件（Guild Training / Unsettling Darkness / Traveling Merchants）

本主题从 main（#195 高等级出征，tip `f75cac8`）继续。按 #195 建议优先核实三张事件的数据与图标审阅状态后接通。

## 图标与数据核实

| 卡                  | 页  | 效果图标           | 词典状态           | 结论 |
| ------------------- | --- | ------------------ | ------------------ | ---- |
| Unsettling Darkness | p4  | `d13c8b76af` Light | confirmed（R-048） | 可接 |
| Traveling Merchants | p8  | 无                 | —                  | 可接 |
| Guild Training      | p15 | 无                 | —                  | 可接 |

仍跳过含未审图标的 Supply Run / Lost Shipment（`d712688f15`）、Gypsy Trail（`08a25c05cf`）、The Feast（`d9009c6f91`）等。Q-79 / Q-80 不裁定。

## 改动

依据规格书 §4.2（官方 R32–R33）、R-001、R-048、R-077；印刷卡面 p4 / p8 / p15。

- **Unsettling Darkness**：结算后洗回、准备 3 天；标记 `nextQuestStartingLight=4`；出征时 `explorationSetup.light=4`；开局补给接受起始光照 4 或 5。
- **Traveling Merchants**：结算后洗回、准备 2 天；标记 `nextQuestProvisionFaceChoice`；开局补给与 Wild/Radiant 选面完成后，按姿态顺序每名英雄可改一颗己方骰面或放弃，完成后清除标记。
- **Guild Training**：逐英雄 PendingChoice 免费永久升一项已核实技能（可不装备拥有技能），可放弃；不扣 XP/金币；事件永久移出；铁匠临时卡原卡按既有 R-080 同步。

完整 16 张入池与抽牌概率不变。事件已实现 10/16。

## 测试

- 图标确认与真实 seed12 / 17 / 8 自然抽牌路径。
- Unsettling Darkness：标记→出征光照4→补给可掷。
- Traveling Merchants：改骰与全体放弃后清除标记。
- Guild Training：免费升级、永久移出、存档回放。

## 限制

- Militia Training（天数 `?`）、In Good Spirits 及含未审图标事件仍停点。
- Q-79 / Q-80 pending；不代签人工试玩；未进 Phase 5。
- 非阶段收尾，不新增 Playwright。

## 下一主题

剩余 6 张事件（无未审图标者优先，如 In Good Spirits）、驿站死亡补人（需扩展英雄池），或 II 级任务/战役等级切换。

## 最终验证

本机 Node 24.21.0 / pnpm 12.9.1：`pnpm typecheck`、`pnpm lint`、125 文件 / 1107 项单元与场景测试（`pnpm test --maxWorkers=4`）、`pnpm build`、`git diff --check` 全部通过。未检查远端 Actions。用户 8080 配置、临时资料与美术不提交。
