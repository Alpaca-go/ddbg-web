# Cove 印刷图标补充映射（2026-11-28）

依据 Kyries 2026-11-28 确认的 [`docs/handoffs/cove-icon-decisions-confirmed-2026-11-28.json`](../../docs/handoffs/cove-icon-decisions-confirmed-2026-11-28.json)。

## 入库统计

| 类型                                          | 条数   |
| --------------------------------------------- | ------ |
| 并入已有语义 key（`merge_into_existing_key`） | 85     |
| 姿态轨改标后并入（`remap_then_merge`）        | 10     |
| 新建语义 key（`new_keys`）                    | 3      |
| 忽略（非图标，`b27479506b`）                  | 1      |
| **合计写入 `print-icon-additions.json`**      | **98** |

rank 984–1081；`source` 均为 `kyries_approved_proposal_2026-11-28`。

## 新语义 key

| key                                               | iconId       | 说明                                                              |
| ------------------------------------------------- | ------------ | ----------------------------------------------------------------- |
| `room_number`                                     | `be4f829eb7` | 房间编号牌，对齐 `skill_number`；不得占用 `room_type`（宝藏房间） |
| `occupancy_pips_with_high_ground`                 | `0b3b996f9c` | 白点容量 + 向上三角高地（组合命名 A_with_B）                      |
| `occupancy_pips_with_high_ground_and_area_marker` | `4d23d01af2` | 容量 + 高地 + area marker                                         |

## 「红」释义放宽（v1.8 rank 未改）

`area_marker` / `occupancy_pips_with_area_marker` 等 v1.8 条目的 `meaning_*` 文本保持不动（旧 rank 固定）。

本批起语义范围放宽：绿/橙星爆与 A/B 字母变体同样归入上述 key，不限于卡面文案中的「红色」。后续若统一改写 canonical 释义，另开 PR 处理 v1.8 文本。

## `low_ground`（仅记释义）

单独向下三角应对语义 key `low_ground`。本批无对应 hash，**不建空 key**；待后续有核准指纹时再登记。
