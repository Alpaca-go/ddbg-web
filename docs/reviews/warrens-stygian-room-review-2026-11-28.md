# Warrens Stygian 九张房间审阅（2026-11-28）

| 项         | 值                                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------- |
| 印刷正面   | `MG_DD_04_EN_WARRENS/DD_EN_WARRENS_CARDS_63x88_rooms_Stygian_FRONT.pdf`（9 页）                    |
| 印刷背面   | `…/DD_EN_WARRENS_CARDS_63x88_rooms_Stygian_BACK.pdf`（9 页）                                       |
| Raw        | `packages/data/extract/extension/warrens/raw/stygian_room.json`                                    |
| 规范化输出 | `packages/data/normalized/extension/warrens/stygian_rooms.json`（`ddbg-warrens-stygian-rooms-v1`） |

## 范围

- 九张 Stygian 房间各 1 份，canonical ID `stygian_room:warrens:01`–`09`，`replacesCardId` 指向 `room:warrens:01`–`09`（普通房数据待 #838，本刀仅登记替换关系）。
- `reviewedEffect` 全部为 `null`；`pendingReview` 自 **Q-WARRENS-34** 起。
- 不接入 `packages/engine` 运行时；不登记板块几何。

## 印刷要点

- **p001 Putrid Cellar**：Infectious Mucus 含「discard a Provision **and suffer +1**」（区别于规则书普通房短句）。
- **p004 Experiment Deposit**：效果段**无印刷效果名**，仅为星标图标 + 「: First wounded Monster…」；不得补造标题。
- **p005 Dumped Shinies**：双效果段 Putrid Sewerage + Shinies。
- **p009 Foul Throne**：Sneak Attack! + Corrupting Aura；印刷「endind」按原样转录。

## 待确认

见各卡 `pendingReview`（Q-WARRENS-34–45）。
