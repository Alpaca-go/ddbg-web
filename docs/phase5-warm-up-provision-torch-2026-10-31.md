# A-7 Warm Up the Halls 开局改 Torch

相对 #427 / [暗房点亮切片](phase5-warm-up-dark-room-2026-10-31.md)，本刀只接 QUEST FRONT **p11** SPECIAL 前半句：「After rolling for Provisions, each Hero may turn one of them into a [Torch]」。暗房点亮 / 清理 / 待发 XP 仍由 #427 交付，不重复。

## 已接

- 出征 **quest:p011** 时写入 `warmUpStartingProvisionTorchChoice`（`hamlet-embark.ts`），与普通 Lost Shipment / Supply Run / Merchants 标记正交。
- 常规 8 骰、Radiant/Wild 自选面、R-041 奖励骰与 Supply Run 队伍骰仍走 `dungeon-starting-provisions.ts` 原 RNG 与停点；全部选面结束后：
  - 若有 Traveling Merchants 标记 → 先 Merchants 改骰；
  - 再按姿态顺序（Aggressive→Support）逐英雄 **可选** 将一颗 **己方** 常规姿态骰或 **该英雄** 奖励骰改为 Torch，或跳过；
  - 不含 `dungeon-party-provision:*` 队伍骰。
- 改 Torch 完成后清除标记，复用 `finishStartingProvisionsToExploration` 进入 Scout Ahead / 入地牢威胁被动，与无 SPECIAL 任务一致。
- 引擎单测：`warm-up-starting-provisions.test.ts`（含 Merchants→Warm Up 链接、无标记回归）。

## 未接 / 仍属 A-7

- 从首次出征到 II/III 幕末的 **完整自然 Boss 战役命令日志** 写入 `quest:p019` 正式存档（#413 升幕段仍以回村边界夹具 + 命令重放验收；见 [A-08 切片](phase5-a08-warm-up-natural-iii-replay-2026-11-01.md)）。
- 网页专用 UI（沿用通用 `pendingChoice` 即可操作）。

## 待确认（未自行裁定）

| 编号 | 问题 | 当前实现 |
| --- | --- | --- |
| Q-WARM-01 | 同趟 Merchants + Warm Up 的先后顺序 | Merchants 完成后 Warm Up（与既有 Merchants 测试兼容） |
| Q-WARM-02 | R-041 奖励骰是否可改为 Torch | **纳入**该英雄 `dungeon-bonus-provision:*` |
| Q-WARM-03 | Radiant 第二颗自选面是否算「them」 | **纳入**已入池的常规姿态骰 |
| Q-WARM-04 | 逐英雄顺序 | 姿态轨 Aggressive→Support（对齐 Merchants） |
| Q-WARM-05 | 是否必须改一颗 | **可选**；每英雄均有「不改为 Torch」 |

依据：已入库 `quest_cards.json` `quest:p011` 卡文、R-045（Dark 房 Torch 例外语境）、R12/R-041 补给流程。不新增 FAQ；不发明数值。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run packages/engine/src/warm-up-starting-provisions.test.ts packages/engine/src/dungeon-starting-provisions.test.ts packages/engine/src/hamlet-events-batch.test.ts packages/engine/src/warm-up-dark-room.test.ts
```

本刀跑通上述 vitest；不声称全库 CI 全绿。
