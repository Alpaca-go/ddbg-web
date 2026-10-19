# Phase 4 · 房间代币印刷导出（冲压板 Rubine 刀线）

状态：**首刀**——按可证刀线从核心盒冲压板 p3 导出单枚 PNG；Web UI 仅认印刷缓存，不再回退 TTS `token-*`。

## 几何依据（R-048）

- PDF：`DD_EN_COREBOX_PUNCHBOARD_200x300_BACK_V2.pdf` / `FRONT_V2.pdf` 第 **3** 页（`Old_version` 同签名，优先 V2）。
- 刀线：专色 **PANTONE Rubine Red C** 描边的圆角方形，边长约 **61.37 pt**；正/反各 **21** 条（7 种图案 ×3）。
- 出血垫底：页面路径中的填充圆盘约 **82.2 pt**（可选 `--crop bleed`），非等分网格。
- 同页下方 **76.54 pt**、无 Rubine 刀线的筹码格**不是**房间代币，导出逻辑按边长过滤排除。

实现：`tools/pipeline/print-card-art/ddbg_print_art/diecut.py`、`room_tokens.py`。

## kind ↔ 印刷图案

| kind      | 揭示面 Image XObject (V2) | 说明                                                      |
| --------- | ------------------------- | --------------------------------------------------------- |
| treasure  | xref 163                  | 开盖宝箱                                                  |
| objective | xref 165                  | 绳绑卷轴                                                  |
| empty     | xref 167                  | 空房                                                      |
| dark      | xref 169                  | 火把                                                      |
| curio     | xref 171                  | 圣杯                                                      |
| trap      | xref 173                  | 橙蛛网                                                    |
| lair      | xref 175                  | 红战士剪影                                                |
| door      | xref 192（正面共用）      | 未揭示石门（map 保留，当前 QuestMap UI 未揭示格仍用文字） |

引擎 kind 键：`curio` / `dark` / `empty` / `lair` / `objective` / `trap` / `treasure`。

## 本机导出

```bash
pip install -r tools/pipeline/print-card-art/requirements.txt

node tools/pipeline/scripts/export-print-room-tokens.mjs \
  --input "/path/to/DARKEST DUNGEON EN_FILES" \
  --out .cache/print-card-art \
  --dpi 300

node tools/pipeline/scripts/build-print-room-token-art-map.mjs \
  --export .cache/print-card-art/room-token-export.json
```

等价 Python：

```bash
python3 tools/pipeline/print-card-art/export_room_tokens.py \
  --input "/path/to/DARKEST DUNGEON EN_FILES" \
  --out .cache/print-card-art \
  --dpi 300
```

输出（gitignore）：

- `.cache/print-card-art/png/room-token-{kind}_revealed.png`（7 张）
- `.cache/print-card-art/png/room-token-door_unrevealed.png`
- `.cache/print-card-art/room-token-export.json`（导出清单）

已入库映射：`apps/web/src/card-art/room-token-print-art-map.json`（`pngRel` 与上表文件名一致）。

栅格化时应省略 Separation 印版，避免品红刀线入 PNG；当前实现用 **内缩刀线 bbox** 裁切，与试裁 `preview.png` 一致。

## UI 接线

- `lookupRoomTokenArt` → `room-token-print-art-map.json`（`pngRel`）。
- `ExplorationArtImage` 仅 `/print-card-art/…`；无本地缓存时占位「无本地卡图」，**不**再请求 `/tts-card-art/token-*`。
- 已删除 `exploration-art-map.json`；`cache-tts-card-art.mjs` 不再下载房间代币。

## 测试

- Python：`python3 -m unittest discover -s tools/pipeline/print-card-art/tests`
- Web：`apps/web/src/card-art/resolve-exploration-art.test.ts`
