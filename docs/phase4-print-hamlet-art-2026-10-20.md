# Phase 4 · 村庄版图与建筑升级板印刷素材

状态：**首刀**——Hamlet 版图整页 TrimBox + BLD 十四块 II/III 升级板 Form 模切框导出；Web 侧仅接 `*-print-art-map.json` 与 resolve 函数（本切片不接村庄 UI 贴图）。

## 几何依据（R-048）

| 部件                       | PDF                                          | 页  | 几何                                                                                                                                                                       |
| -------------------------- | -------------------------------------------- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HB** 村庄版图正面        | `DD_EN_COREBOX_BOARD_Hamlet_FRONT.pdf`       | 1   | TrimBox **841.89×476.22 pt**，原点 **(56.69, 56.69)**                                                                                                                      |
| **BLD** 建筑 II/III 升级板 | `DD_EN_COREBOX_PUNCHBOARD_300x300_FRONT.pdf` | 1   | **TrimBox** 原点 **(21, 21) pt**；裁切为 `page.get_drawings()` 上模切路径 bbox（约 **122×71.6** / **124×74** / **139×82** pt 等），内缩 **0.65 pt** 后栅格化；共 **14** 块 |

说明：Form XObject 放置框与可见印刷面 **不对齐**（会裁到刀线/沟槽碎片），故 **不用 Form bbox**。十四块 `diecutPt` 与 `verifyPhrases` 见 `tools/pipeline/print-card-art/fixtures/hamlet-building-tile-bld-p1-hints.json`；匹配为签名打分 + `scipy` 线性分配 + 导出前栅格/短语断言（`tile_raster_quality.py`）。

本地预览拼图：

```bash
python3 tools/pipeline/print-card-art/render_hamlet_building_previews.py
```

输出：`/opt/cursor/artifacts/hamlet-building-tiles-preview.png`、`hamlet-building-guild-redaction-compare.png`。

## 本机导出

```bash
pip install -r tools/pipeline/print-card-art/requirements.txt

node tools/pipeline/scripts/export-print-hamlet-board.mjs \
  --input "/path/to/DARKEST DUNGEON EN_FILES" \
  --out .cache/print-card-art \
  --dpi 200

node tools/pipeline/scripts/export-print-hamlet-building-tiles.mjs \
  --input "/path/to/DARKEST DUNGEON EN_FILES" \
  --out .cache/print-card-art \
  --dpi 200

node tools/pipeline/scripts/build-print-hamlet-board-art-map.mjs
node tools/pipeline/scripts/build-print-hamlet-building-tile-art-map.mjs
```

输出（gitignore）：`.cache/print-card-art/png/hamlet-board-front.png`、`hamlet-building-{id}_L{2|3}.png`、`hamlet-board-export.json`、`hamlet-building-tile-export.json`。

已入库映射：

- `apps/web/src/card-art/hamlet-board-print-art-map.json`
- `apps/web/src/card-art/hamlet-building-tile-print-art-map.json`

## 测试

- Python：`python3 -m unittest discover -s tools/pipeline/print-card-art/tests`
- Web：`resolve-print-hamlet-board-art.test.ts`、`resolve-print-hamlet-building-tile-art.test.ts`

## 待确认

- 模切几何取自 **矢量 path 外接框**，非 PANTONE Rubine 描边解析（见 map `pendingConfirmation`）。
- Guild / Graveyard：导出时对裁切区内 `Guild`/`Graveyard` 做 **文本 redaction**（非 Separation OCG）；对比图见 `hamlet-building-guild-redaction-compare.png`。
- Hamlet 版图 **背面** 出血不同，本 PR 不导出。
