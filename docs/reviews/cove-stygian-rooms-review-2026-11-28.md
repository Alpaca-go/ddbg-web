# Cove Stygian 普通房间印刷目录审阅（2026-11-28）

状态：**九张 Stygian 房间 FRONT 已提取并写入 `packages/data/normalized/extension/cove/stygian_rooms.json`（`ddbg-cove-stygian-rooms-v1`）。效果全文保留 `printedLines`，全部 **Q-186** 停点。未接 Stygian 运行时、未开放 Cove 地点出征或房间牌堆。**

依据：官方 Cove 印刷包 `MG_DD_05_EN_COVE`；核心规则书 p.36 Stygian mode（Stygian Room Cards 替换 standard Room Cards；Boss 技能 Crit +1）；R-001、R-048。Cove 规则书组件表列「9 Stygian Room Cards」——本批按 **Weald 已确认程序**类推：**九张 Stygian 替换同名、同编号的九张 Cove 普通房间**（`stygian_room:cove:NN` → `room:cove:NN`，`NN` 为 `01`–`09`），不替换 Boss 房（10–12）、不触碰核心 17 张 Stygian。

## 来源与范围

| 项目       | 内容                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| 印刷 FRONT | `MG_DD_05_EN_COVE/DD_EN_COVE_CARDS_63x88_rooms_Stygian_FRONT.pdf`（9 页）                            |
| 印刷 BACK  | **无**（盒内无 Stygian BACK、亦无普通房间 BACK 可类推）；`source.back` = `null`                      |
| Raw        | `packages/data/extract/extension/cove/raw/stygian_room.json`（`n_unique=9`，`sources[0].back=null`） |
| 普通对照   | [Cove 普通房间审阅（2026-11-22）](./cove-room-review-2026-11-22.md) `room:cove:01`–`09`              |
| 规范化输出 | `packages/data/normalized/extension/cove/stygian_rooms.json`                                         |
| 抽取脚本   | `tools/pipeline/extract-print/scripts/extract_cove_location.py`（`stygian_room` 类别；BACK 可选）    |

## ID 方案（已采用）

| 印刷页 | Canonical ID           | 替换目标       | 名称（与普通过同名）   |
| ------ | ---------------------- | -------------- | ---------------------- |
| p1     | `stygian_room:cove:01` | `room:cove:01` | Eldritch Augmentation  |
| p2     | `stygian_room:cove:02` | `room:cove:02` | Flooded Room           |
| p3     | `stygian_room:cove:03` | `room:cove:03` | The Hoarders           |
| p4     | `stygian_room:cove:04` | `room:cove:04` | Buried Treasures       |
| p5     | `stygian_room:cove:05` | `room:cove:05` | Twin Idols             |
| p6     | `stygian_room:cove:06` | `room:cove:06` | Lairs in Tunnels       |
| p7     | `stygian_room:cove:07` | `room:cove:07` | Shipwreck              |
| p8     | `stygian_room:cove:08` | `room:cove:08` | Sea Rites              |
| p9     | `stygian_room:cove:09` | `room:cove:09` | Temple of the Deep One |

- Raw 提取 ID 仍为页码形 `stygian_room:cove:pNNN`；构建器映射为房间族 v2（见 [id-naming-rules.md](../id-naming-rules.md) §2）。
- 每张卡 `expeditionRoomPoolEligible: false`：明示 **不得** 进入 I 级普通远征房间牌堆；仅在启用 `cove` 内容包且未来 Stygian 出征流程接线后参与替换。

### 待确认（无新增裁定号）

| 编号   | 内容                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Q-186  | 九张卡面效果与图标语义须 Kyries 逐卡对照普通房核准差异（持续时间加长、数值变更等），本批**不**写入 `reviewedEffect` 或运行时。 |
| 待确认 | Cove Stygian 出征与 Boss +1 Crit 是否完全类推 Weald（R-036 / R-272 路径）；本 PR **不** 声明已开放 Cove Stygian 战役。         |

## 印刷肉眼差异（资料备注，未核准）

以下仅作导入备注，**不构成规则核准**；正式差异以 Kyries 对照 FRONT 图像为准。

| 编号 | 普通房已知效果段（Q-186 停点）   | Stygian 印刷备注（待 Q-186）                      |
| ---- | -------------------------------- | ------------------------------------------------- |
| 01   | Circle of Protection: Support    | 正文含独立效果段，需对照是否与普通仅时长/数值不同 |
| 02   | Deep Pool（跳过首行动）          | 需对照 Stygian 是否加长 debuff/限制               |
| 03   | Stash（2 行动搜刮）              | 需对照行动/奖励是否加码                           |
| 04   | Unearth（抽饰品）                | 需对照消耗与后果                                  |
| 05   | Running Water / Cursed / Blessed | 多区域效果，需逐段对照                            |
| 06   | Sharp Stones / Hideout           | 需对照伤害与持续时间                              |
| 07   | Old Storage（骰子表）            | 需对照骰面与伤害                                  |
| 08   | Sea Waters / Rite of the Deep    | 需对照 push/stress 数值                           |
| 09   | Echo of the Deep                 | 需对照是否与普通相同或加强                        |

## 本 PR 未做

- Stygian 房间效果运行时、`runtimeReady`、战役 `stygianRoomRules` 接线。
- Cove 地点出征、房间牌堆、Stygian 模式村庄入口。
- 板块几何、`room_tile_geometry` 变更（卡面地图似复用普通板块，未写入新几何）。
- 全局图标词典或 R-048 新 hash 命名。
- Boss 房（10–12）Stygian 印刷（不存在）。

## 验证

- `packages/data/tests/cove/rooms/stygian-rooms.build.test.ts`：九张可再生、FRONT-only 来源、`source.back=null`、替换关系、包隔离、`Q-186` 停点。
- `packages/data/tests/shared/extract/cove.test.ts`：Stygian raw 正反面页码与命名空间。
- 质量闸门：`pnpm typecheck`、`pnpm lint`、`pnpm test`（含 `@ddbg/data` 相关用例）。
