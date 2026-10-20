# Phase 4 · 村庄版图与建筑升级板印刷素材

状态：**首刀**——Hamlet 版图整页 TrimBox + BLD 十四块 II/III 升级板 Form 模切框导出；Web 侧仅接 `*-print-art-map.json` 与 resolve 函数（本切片不接村庄 UI 贴图）。

## 几何依据（R-048）

| 部件                       | PDF                                          | 页  | 几何                                                                                                                                                |
| -------------------------- | -------------------------------------------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HB** 村庄版图正面        | `DD_EN_COREBOX_BOARD_Hamlet_FRONT.pdf`       | 1   | TrimBox **841.89×476.22 pt**，原点 **(56.69, 56.69)**                                                                                               |
| **BLD** 建筑 II/III 升级板 | `DD_EN_COREBOX_PUNCHBOARD_300x300_FRONT.pdf` | 1   | Form 放置框 **长≈130.1 pt**、**短≈77.4 pt**（Blacksmith / Stagecoach III 等为 **≈75.9 pt**）；共 **14** 块，与 `upgradableBuildings` 各 II/III 一致 |

说明：BLD p1 在 Kyries EN 导出中 **未检出** 可解析的 PANTONE Rubine 矢量刀线（与 200×300 房间代币页不同）；裁切使用 PDF **Form XObject 放置边界**。十四块与印刷服务文案的对应及 `diecutPt` 数值见 `tools/pipeline/print-card-art/fixtures/hamlet-building-tile-bld-p1-hints.json`。

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

- BLD p1 无 Rubine 矢量刀线时的 Form 框是否等同生产模切（见 map `pendingConfirmation`）。
- Guild / Graveyard 隐藏文字层：导出时对裁切区内 `Guild`/`Graveyard` 做 **文本 redaction**（非 Separation OCG）；需 Kyries 本机 PNG 目视确认。
- Hamlet 版图 **背面** 出血不同，本 PR 不导出。
