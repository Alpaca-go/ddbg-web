# Cove 普通房间首批审阅（2026-11-22）

状态：**印刷已导入 12 面；九张普通房间与三张 Boss 房分类已按卡面证据登记。效果全文保留 `printedLines`，全部 **Q-186** 停点。未开放 Cove 地点出征或房间牌堆。**

依据：Cove 规则书（`DD_EN_COVE_RULES`）+ `docs/rulings.md`（R-001）；不自发明几何或未核实图标（R-048）。印刷 PDF 不提交。

## 来源与范围

- 房间：`MG_DD_05_EN_COVE/DD_EN_COVE_CARDS_63x88_rooms_FRONT.pdf` p1–12，BACK 同页。
- 原始数据：`packages/data/extract/extension/cove/raw/room.json`（12 页 / 12 张）。
- 普通房间目录：`packages/data/normalized/extension/cove/room.json`（`ddbg-cove-room-v0`，p1–p9）。
- Boss 来源登记：`packages/data/normalized/extension/cove/boss_room_sources.json`（`ddbg-cove-boss-room-sources-v0`，p10–p12，`poolEligible: false`）。

重跑提取（本地 EN_FILES 根目录指向 Kyries 印刷包）：

```bash
python3 tools/pipeline/extract-print/scripts/extract_cove_location.py \
  --input "<EN_FILES 根>" --categories room
WRITE_NORMALIZED=1 pnpm --filter @ddbg/data test src/normalize/cove-rooms.test.ts
```

## 普通 / Boss 分类依据

| 页码 | 解析名称               | 分类     | 依据                      |
| ---- | ---------------------- | -------- | ------------------------- |
| 1    | Eldritch Augmentation  | 普通     | 无 `BOSS` 行；编号 1—标题 |
| 2    | Flooded Room           | 普通     | 同上                      |
| 3    | The Hoarders           | 普通     | 同上                      |
| 4    | Buried Treasures       | 普通     | 同上                      |
| 5    | Twin Idols             | 普通     | 同上                      |
| 6    | Lairs in Tunnels       | 普通     | 同上                      |
| 7    | Shipwreck              | 普通     | 同上                      |
| 8    | Sea Rites              | 普通     | 同上                      |
| 9    | Temple of the Deep One | 普通     | 同上                      |
| 10   | Siren’s Room           | **Boss** | 独立一行 `BOSS` + 10—标题 |
| 11   | Shambler’s Room        | **Boss** | 独立一行 `BOSS` + 11—标题 |
| 12   | Drowned Crew Room      | **Boss** | 独立一行 `BOSS` + 12—标题 |

Boss 房仅写入 `boss_room_sources.json`，**不**进入 `room.json` 九张普通目录，不接 Boss 机制或普通牌堆。

## 效果转录与停点

- 全部正文与 `{icon:…}` 占位保留在 `printedLines`；未将任何 Cove 专有图标 hash 写入全局词典。
- 下列 hash 在多处重复出现，**仅作聚类定位**（如 `432714b571` 地点带、`15276792e1` 区域指代），不授予运行时语义：
  - 共享点缀：`432714b571`、`427c35ebd8`、`42fd3c115f`、`6fb6fe3130` 等。
  - 效果相关候选（待核）：`919bf24e2f`（p5 Acc）、`765d55822b`/`742ba183d6`（p3/p7 金币）、`3d72d38b38`（p7 Trap）、`2847746df8`/`388026d6e1`（p8 push／伤害）、`f53dfff5f0`（p10 Boss 压力）等。
- 所有普通房间 `pendingReview` = **Q-186：Cove 普通房间效果待 Kyries 逐卡核准**；Boss 来源 `pendingReview` = Boss 专属刀待核准。

## 内容包隔离

- ID 命名：`room:cove:p001`–`p009`（普通）、`room:cove:p010`–`p012`（Boss 来源）。
- `cardContentPack` → `cove`；`core` / `core+weald` 战役来源不含 `sources.cove`。
- 勾选 `core+cove` 时 `CoveQuestSources` 可携带 `rooms`（9）与 `bossRoomSources`（3），**不**改变 `coreQuestSources.rooms` 核心九房，也不接线出征。

## 明确未做

- Stygian 房间、Tiles／板块几何、零容量接线、usable 翻转、任务堆／地点战役、怪物战斗与 Boss 部署、存档 schema 变更。
