# Phase 4：In Good Spirits 村庄事件

本主题从最新 main（#196 事件批次，tip `c47b1d1`）继续。按 #196 建议优先接通 **In Good Spirits**（d10 图标已确认）。

## 图标与数据核实

| 卡               | 页  | 效果图标             | 词典状态                       | 结论     |
| ---------------- | --- | -------------------- | ------------------------------ | -------- |
| In Good Spirits  | p14 | `94bfa4dde4` d10     | confirmed（词典 v1.8 / R-048） | 可接     |
| Militia Training | p16 | 无效果图标；天数 `?` | 天数条件依赖卡文 0/3（R-077）  | 继续停点 |
| Supply Run 等    | —   | `d712688f15` 等未审  | unreviewed                     | 继续停点 |
| The Feast        | p10 | `d9009c6f91` 未审    | stress 已确认，伤口图标未审    | 继续停点 |

本主题只接 In Good Spirits；其余 5 张仍保留真实抽牌停点。Q-79 / Q-80 不裁定。

## 改动

依据规格书 §4.2 / §8.1–8.2（官方 R28、R32–R33）、R-001、R-048、R-077；印刷卡面 p14。

- **In Good Spirits**：抽到后按姿态顺序每人掷 1 颗 d10；最高点数的英雄（含平手多人）各抽 1 张美德，并将压力指示物翻到红面（`resolveTested`）；不归零压力（卡面未写归零，与墓地获美德同边界）。
- 结算后洗回牌堆，准备 **3** 天，等待首日看守人。
- 复用墓地 `grantGraveyardVirtue` 抽美德；若任一名英雄已持意志卡，拒绝结算且不消费 RNG（沿 Q-79 边界，不自行允许重复获得）。

完整 16 张入池与抽牌概率不变。事件已实现 **11/16**。

## 测试

- d10 图标 confirmed 与 runtime 字段。
- 真实 seed6 自然抽牌：掷点 7/10/10/10，三人平手获美德翻红、洗回 3 天、存档回放一致。
- 已有意志卡拒绝且游标/牌堆不变。

## 限制

- Militia Training（天数 `?`）及含未审图标事件（Supply Run / Lost Shipment / Gypsy Trail / The Feast）仍停点。
- Q-79 / Q-80 pending；不代签人工试玩；未进 Phase 5。
- 非阶段收尾，不新增 Playwright。

## 下一主题

剩余 5 张事件（待图标/天数批准后再接）、驿站死亡补人（需扩展英雄池），或 II 级任务/战役等级切换。

## 最终验证

本机 Node 24.21.0 / pnpm 12.9.1：`pnpm typecheck`、`pnpm lint`、126 文件 / 1110 项单元与场景测试（`pnpm test --maxWorkers=4`）、`pnpm build`、`git diff --check` 全部通过。未检查远端 Actions。用户 8080 配置、临时资料与美术不提交。
