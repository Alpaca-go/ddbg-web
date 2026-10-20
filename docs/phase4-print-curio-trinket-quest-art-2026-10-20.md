# Phase 4 · Curio / Trinket / Quest 印刷卡面

状态：**首刀**——核心盒三类探索/战役卡按每页整页 TrimBox 导出 PNG；Web UI 优先显示印刷图，无本地缓存时保留原有文字与占位。

## 几何依据（R-048）

| 类别    | PDF（`02_DD_CARDS_COREBOX/`）                                       | 页数  | TrimBox（pt）               |
| ------- | ------------------------------------------------------------------- | ----- | --------------------------- |
| Curio   | `DD_EN_COREBOX_CARDS_63x88_CURIO_FRONT_V2.pdf` / `…_CURIO_BACK.pdf` | 24+24 | 178.58×249.45，原点 (21,21) |
| Trinket | `DD_EN_COREBOX_CARDS_44x68_TRINKETS_FRONT.pdf` / `…_BACK.pdf`       | 38+38 | 192.76×124.72（横版整卡）   |
| Quest   | `DD_EN_COREBOX_CARDS_70_120_quests_FRONT.pdf` / `…_BACK.pdf`        | 19+19 | 198.43×340.16               |

第 **n** 页对应引擎 id `curio:p0nn` / `trinket:p0nn` / `quest:p0nn`（quest 仅 `basic-quests.ts` 已启用的五张接入 UI）。

饰品背面：`back_level` I → BACK 第 1–14 页，II → 15–26，III → 27–38（与正面同页码）。

## 本机导出

```bash
pip install -r tools/pipeline/print-card-art/requirements.txt

node tools/pipeline/scripts/export-print-corebox-trim-decks.mjs \
  --input "/path/to/DARKEST DUNGEON EN_FILES" \
  --out .cache/print-card-art \
  --dpi 200

node tools/pipeline/scripts/build-print-curio-art-map.mjs
node tools/pipeline/scripts/build-print-trinket-art-map.mjs
node tools/pipeline/scripts/build-print-quest-art-map.mjs
```

输出（gitignore）：`.cache/print-card-art/png/*` 与 `corebox-trim-deck-export.json`。

已入库映射：

- `apps/web/src/card-art/curio-print-art-map.json`
- `apps/web/src/card-art/trinket-print-art-map.json`
- `apps/web/src/card-art/quest-print-art-map.json`

## UI 接线

- `CoreboxPrintCardFace` + `resolve-print-{curio,trinket,quest}-art.ts`
- 地牢 Curio 面板、携带饰品、游商陈列、任务开局选卡
- 仅 `/print-card-art/…`；缺失 PNG →「无本地卡图」+ 原有中文/英文说明

## 测试

- Python：`python3 -m unittest discover -s tools/pipeline/print-card-art/tests`
- Web：`resolve-print-curio-art.test.ts`、`resolve-print-trinket-art.test.ts`、`resolve-print-quest-art.test.ts`

## 待确认

- Quest FRONT/BACK 其余 14 页（`quest:p004`–`p006`、`p009`–`p019`）未接入 `basic-quests.ts`，map 中列为 `pendingConfirmation`。
- Curio / Trinket 卡面效果图标语义仍按 R-048 与既有数据停点；本切片只接美术 raster。
