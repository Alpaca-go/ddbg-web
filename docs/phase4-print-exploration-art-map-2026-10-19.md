# Phase 4 · 探索 Face 印刷 PNG 映射（房间牌 + QuestMap）

状态：**本刀**——地牢探索 UI 的房间牌与 QuestMap 底图仅认 Kyries 拍板的印刷页序 PNG；房间代币仍用 TTS 缓存。美术二进制不入库。

## 拍板（2026-10-19）

- 不做人工核对页；COREBOX 印刷 PDF 按页导出的整页 PNG 为权威源。
- 核对 CSV：`tools/pipeline/print-card-art/fixtures/print-exploration-review-ok-auto.csv`（106 行 `verdict=ok`：room 25 / curio 24 / trinket 38 / quest_map 14 / quest 5；**不含** room_token）。
- UI 本刀接入子集 39 张（25 房间 + 14 QuestMap）；其余品类 JSON 已入库供后续 UI，当前仍为文字面板。

## 已提交映射

| 文件                                                   | 用途                                             |
| ------------------------------------------------------ | ------------------------------------------------ |
| `apps/web/src/card-art/exploration-print-art-map.json` | 印刷 `pngRel` → 引擎 id（106 行）                |
| `apps/web/src/card-art/exploration-art-map.json`       | **仅** 7 种房间代币 TTS `ImageURL` / `cacheName` |

解析：`apps/web/src/card-art/resolve-exploration-art.ts`（`lookupRoomCardArt` / `lookupQuestMapArt` → 印刷；`lookupRoomTokenArt` → TTS）。

## 本地缓存

印刷 PNG（与怪物卡面共用目录与 Vite 前缀 `/print-card-art/*`）：

```bash
node tools/pipeline/scripts/export-print-card-art.mjs
# 默认 <repo>/.cache/print-card-art/
```

房间代币仍走 TTS 缓存：

```bash
node tools/pipeline/scripts/cache-tts-card-art.mjs
# 仅下载 exploration-art-map.json 中的 roomTokens
```

重生成印刷 map：

```bash
node tools/pipeline/scripts/build-print-exploration-art-map.mjs \
  --csv tools/pipeline/print-card-art/fixtures/print-exploration-review-ok-auto.csv
```

## UI 接入面

- `RoomCardFace`：整页印刷 PNG，`data-card-art="print"`；无缓存占位，**无** deck 447 atlas 回退。
- `ExplorationArtImage`：QuestMap 用 `pngRel`；已揭示房间代币仍用 `cacheName` → `/tts-card-art/token-*.png`。

## room_token 仍 TTS 的原因（R-048）

印刷导出仅有冲压板整页，没有单枚代币 PNG；规则裁定禁止在 UI 自裁切。需另行导出单枚图或继续 TTS，见 `exploration-art-map.json` 的 `pendingConfirmation`。

## 范围外

战斗 Room Tile 板块、走廊段、curio/trinket/quest 卡面 UI、Phase 5。见 [phase4-exploration-art-2026-10-19.md](phase4-exploration-art-2026-10-19.md) 历史 TTS 首刀说明（已部分 supersede）。
