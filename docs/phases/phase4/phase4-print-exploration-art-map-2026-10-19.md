# Phase 4 · 探索 Face 印刷 PNG 映射（房间牌 + QuestMap）

状态：**本刀**——地牢探索 UI 的房间牌与 QuestMap 底图仅认 Kyries 拍板的印刷页序 PNG。房间代币见 [phase4-print-room-token-art-2026-10-19.md](phase4-print-room-token-art-2026-10-19.md)。美术二进制不入库。

## 拍板（2026-10-19）

- 不做人工核对页；COREBOX 印刷 PDF 按页导出的整页 PNG 为权威源。
- 核对 CSV：`tools/pipeline/print-card-art/fixtures/print-exploration-review-ok-auto.csv`（106 行 `verdict=ok`：room 25 / curio 24 / trinket 38 / quest_map 14 / quest 5；**不含** room_token）。
- UI 本刀接入子集 39 张（25 房间 + 14 QuestMap）；其余品类 JSON 已入库供后续 UI，当前仍为文字面板。

## 已提交映射

| 文件                                                   | 用途                                 |
| ------------------------------------------------------ | ------------------------------------ |
| `apps/web/src/card-art/exploration-print-art-map.json` | 印刷 `pngRel` → 引擎 id（106 行）    |
| `apps/web/src/card-art/room-token-print-art-map.json`  | 7 种揭示面 + 未揭示 door 的 `pngRel` |

解析：`apps/web/src/card-art/resolve-exploration-art.ts`（房间牌 / QuestMap / 房间代币均 → 印刷 `pngRel`）。

## 本地缓存

印刷 PNG（与怪物卡面共用目录与 Vite 前缀 `/print-card-art/*`）：

```bash
node tools/pipeline/scripts/export-print-card-art.mjs
node tools/pipeline/scripts/export-print-room-tokens.mjs --input "<EN_FILES>"
# 默认 <repo>/.cache/print-card-art/
```

重生成 map：

```bash
node tools/pipeline/scripts/build-print-exploration-art-map.mjs \
  --csv tools/pipeline/print-card-art/fixtures/print-exploration-review-ok-auto.csv
node tools/pipeline/scripts/build-print-room-token-art-map.mjs
```

## UI 接入面

- `RoomCardFace`：整页印刷 PNG，`data-card-art="print"`；无缓存占位，**无** deck 447 atlas 回退。
- `ExplorationArtImage`：QuestMap、房间代币均用 `pngRel`；无本地文件时占位，**无** TTS 回退。

## 范围外

战斗 Room Tile 板块、走廊段、curio/trinket/quest 卡面 UI、Phase 5。见 [phase4-exploration-art-2026-10-19.md](phase4-exploration-art-2026-10-19.md)。
