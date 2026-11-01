# Phase 5 · A-07 Purify the Fountains II · 旁置与净化行动门控

基线：`main` tip `505d17c605335e0fda931944a2929744f00aa323`（#484 已合）。

## 卡面 SPECIAL（quest:p010）

来源：`packages/data/normalized/corebox/quest_cards.json` → `quest:p010`：

- Objective Rooms are `{icon:700c7def3e}` **3** → 旁置 **room:p003**（Healing Fountain；先例 Dem Bones 旁置 room:p007）。
- 目标房内 Healing Fountain 不生效，除非英雄花费 **2 actions** 且 **1×** `{icon:dd2d2467ec}` 净化；Objective Rooms 仅在净化后才算清理。
- Set aside room 3 at start；不进入其它遭遇牌堆。

## 已接

| 条目     | 实现                                                                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 旁置     | `basicQuests` → `setAsideRoomCardId: "room:p003"`；`embarkSetAsideRoomCardId` / 八张遭遇堆守恒（同 p004）                                                 |
| 目标房   | `prepareObjectiveRoomBattle` 使用旁置 Healing Fountain                                                                                                    |
| 清理门控 | `objectiveRecoveryActions: 2`；守卫战胜后 `objectiveRoomClearsOnVictory === false`，须 `resolveDungeonRoom` + 两次 `chooseObjectiveRecovery` 才 `cleared` |
| 文案     | `objectiveRecoveryStepLabel: "净化喷泉"`（Dem Bones 仍为「拾取骨骸」）                                                                                    |

依据：官方 QUEST 卡 SPECIAL、R15 / 规格书 §5.1、Dem Bones 既有旁置 + 拾取行动路径（R-108 Objective 图标）。

## Hold（R-048 / 未审图标）

| 条目                                                  | 原因                                                                                                                   |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 开局 Add 3 `{icon:dd2d2467ec}` to starting Provisions | 词典 `dd2d2467ec`：`status=unreviewed`，`meaning` 空，仅 `group:"potion"`；仓内无 Kyries 已确认 → `ProvisionFace` 映射 |
| 净化时消耗 1× `{icon:dd2d2467ec}`                     | 同上；本刀只接 **2 行动** 门控，不扣公共池补给面                                                                       |
| Healing Fountain 房内「不生效」常规效果               | 依赖房间效果与净化流程完整裁定，本 PR 不接                                                                             |

R-041「if possible」与 16 颗上限：待图标确认后再与开局补给接线。

## 未接 / 范围外

- `createCoreDungeonQuest` 白名单：未扩大（II 级仍非沙盒默认出征）。
- `combatReady`：仍为 false。
- Rising Threat、Stygian、Phase 6、B 几何、任务卡 hold 切片、前端桌游 UI。
- Dem Bones / Disruption 旁置语义：未改逻辑，仅复用模式。

## 验证

```bash
pnpm exec vitest run packages/engine/src/dungeon-objective.test.ts packages/engine/src/disruption-objective.test.ts
```
