# 战斗站位：八英雄印刷哥特拱门立牌

状态：**已接线**——站位轨道实体芯片显示 `DD_EN_THE_DARKEST_HEROES_PUNCHBOARD` FRONT p1–p2 按 Rubine 刀线 bbox（177.83×237.09 pt，R-048）导出的 PNG；**不回退** TTS `hero-token-*` / `/tts-card-art/`。

## 形状与来源

- 印刷件为**拱门立牌面板**（刀线路径 bbox 为竖长矩形），不是 TTS `Custom_Token` 常见圆形裁切。
- **主源**：`DD_EN_THE_DARKEST_HEROES_PUNCHBOARD_{FRONT,BACK}.pdf`；formal8 在 FRONT p1（六人）+ p2（Occultist、Plague Doctor）。
- **次源**：`DD_EN_COREBOX_PUNCHBOARD_300x300` p3 仅对照；Hellion Rubine 子路径不完整，**不用于正式导出**。
- DH 每页另有 UNLABELED 刀线槽（疑似扩展英雄）——本次不映射，见 map `pendingConfirmation`。

## 本机导出

```bash
pip install -r tools/pipeline/print-card-art/requirements.txt

node tools/pipeline/scripts/export-print-hero-standees.mjs \
  --input "/path/to/DARKEST DUNGEON EN_FILES" \
  --out .cache/print-card-art

# 可选：同时导出 BACK 面
node tools/pipeline/scripts/export-print-hero-standees.mjs \
  --input "/path/to/DARKEST DUNGEON EN_FILES" \
  --out .cache/print-card-art \
  --faces front,back

node tools/pipeline/scripts/build-print-hero-standee-art-map.mjs \
  --export .cache/print-card-art/hero-standee-export.json
```

导出默认对页面内容流做 `/CS0 CS 1 SCN` → `0 SCN` 补丁以隐藏品红刀线（`--keep-separation` 可保留）。几何：检测 path bbox 宽 177.83、高 237.09 pt 的 Rubine 描边，clip 使用 `inset_diecut_clip`（与房间代币同类思路、不同常量）。

产物：

- `.cache/print-card-art/png/{hero}-front.png`（及可选 `-back.png`）
- `.cache/print-card-art/hero-standee-export.json`

Web 映射（已提交或由上一步再生）：`apps/web/src/card-art/hero-standee-print-art-map.json`（`ddbg.print-hero-standee-art-map.v1`）。

Vite 经 `DDBG_PRINT_CARD_ART_CACHE` 或默认 `.cache/print-card-art` 提供 `/print-card-art/png/…`。

## 待确认

- FRONT / BACK 栅格是否同图（试导出 SHA 不同，需目视）。
- 刀线 bbox inset 与实物拱顶 bleed 差异。
- TTS 圆形 token 是否仅为同一立绘的圆裁（不影响本 UI：全 bbox、不圆裁）。

## 相关

- 站位板底图：[phase4-print-monster-stance-art-2026-10-19.md](phase4-print-monster-stance-art-2026-10-19.md)
- 房间代币 Rubine 小圆牌：[phase4-print-room-token-art-2026-10-19.md](phase4-print-room-token-art-2026-10-19.md)
