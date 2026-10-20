# Phase 4 · 村庄版图与建筑升级板印刷素材

状态：**村庄版图**自动 TrimBox 导出；**建筑 II/III 升级板**由 Kyries **手裁 PNG**（无自动裁切 pipeline）。

## 几何依据（R-048）

| 部件                       | 来源                                                       | 说明                                                                     |
| -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| **HB** 村庄版图正面        | `DD_EN_COREBOX_BOARD_Hamlet_FRONT.pdf`                     | TrimBox **841.89×476.22 pt**，原点 **(56.69, 56.69)**                    |
| **BLD** 建筑 II/III 升级板 | `.cache/print-card-art/manual/hamlet-building-tiles/*.png` | Kyries 手裁；`buildingId` 对齐 engine `upgradableBuildings`（camelCase） |

### 手裁文件命名与位置

目录（gitignore，相对印刷缓存根）：

`.cache/print-card-art/manual/hamlet-building-tiles/`

文件名：`{buildingId}-{ii|iii}.png`

| buildingId  | 等级 II              | 等级 III              |
| ----------- | -------------------- | --------------------- |
| abbey       | `abbey-ii.png`       | `abbey-iii.png`       |
| tavern      | `tavern-ii.png`      | `tavern-iii.png`      |
| sanitarium  | `sanitarium-ii.png`  | `sanitarium-iii.png`  |
| survivalist | `survivalist-ii.png` | `survivalist-iii.png` |
| stagecoach  | `stagecoach-ii.png`  | `stagecoach-iii.png`  |
| blacksmith  | `blacksmith-ii.png`  | `blacksmith-iii.png`  |
| nomadWagon  | `nomadWagon-ii.png`  | `nomadWagon-iii.png`  |

- PNG **正向朝上**（文字可读方向）。
- **透明背景可选**。
- Web 经 `/print-card-art/manual/...` 读取；缺文件时 UI 回退文字/占位（见 `resolveHamletBuildingTileArt`）。

## 本机导出（仅村庄版图）

```bash
pip install -r tools/pipeline/print-card-art/requirements.txt

node tools/pipeline/scripts/export-print-hamlet-board.mjs \
  --input "/path/to/DARKEST DUNGEON EN_FILES" \
  --out .cache/print-card-art \
  --dpi 200

node tools/pipeline/scripts/build-print-hamlet-board-art-map.mjs
```

输出（gitignore）：`.cache/print-card-art/png/hamlet-board-front.png`、`hamlet-board-export.json`。

已入库映射：

- `apps/web/src/card-art/hamlet-board-print-art-map.json`
- `apps/web/src/card-art/hamlet-building-tile-print-art-map.json`（仅路径约定，不含 PNG）

## 测试

- Python：`python3 -m unittest discover -s tools/pipeline/print-card-art/tests`
- Web：`resolve-print-hamlet-board-art.test.ts`、`resolve-print-hamlet-building-tile-art.test.ts`

## 待确认

- Hamlet 版图 **背面** 出血不同，本切片不导出。
