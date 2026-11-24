# Phase 4 · 战斗站位板印刷整板（Monster Stance）

状态：**已接线**——战斗界面英雄/怪物四格站位轨道以印刷 `DD_COREBOX_BOARD_Monster_Stance_FRONT.pdf`（及 BACK 映射）TrimBox 整页 PNG 为底图；四姿态列用 UI 叠层高亮与实体芯片，**不**裁切色条、**不**回退 TTS `stance-color-tile-*`。八英雄立牌走印刷 DH 冲压板（见 [phase4-print-hero-standee-art-2026-10-20.md](phase4-print-hero-standee-art-2026-10-20.md)）。

## 为何整板（R-048）

印刷 Monster Stance 页为单张位图 + 整板品红 TrimBox；**没有**独立色条刀线或可分 Image XObject。从整板等分裁四条色条属于自创几何，违反 R-048。Kyries 2026-10-19 拍板采用「整板展示 + CSS 列叠层」方案。

## 数据与脚本

| 产物                                                                       | 说明                                                                                                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/card-art/monster-stance-print-art-map.json`                  | schema `ddbg.print-monster-stance-art-map.v1`；`boards[]` 正/反 `pngRel`；`stanceSlots[]` 仅中文标签与 rank（无裁切坐标） |
| `tools/pipeline/scripts/build-print-monster-stance-art-map.mjs`            | 从 manifest CSV 筛选 `Monster_Stance` + `crop_method=trimbox`                                                             |
| `tools/pipeline/print-card-art/fixtures/print-monster-stance-manifest.csv` | CI/无 PDF 环境用片段；本机可用导出后的 `.cache/print-card-art/manifest.csv`                                               |

重建 map（仓库根目录）：

```bash
# _fixture（无真实导出时）
node tools/pipeline/scripts/build-print-monster-stance-art-map.mjs

# 本机已 export 后
node tools/pipeline/scripts/build-print-monster-stance-art-map.mjs \
  --manifest .cache/print-card-art/manifest.csv
```

印刷 PNG 不入库；Vite 从 `DDBG_PRINT_CARD_ART_CACHE` 或 `.cache/print-card-art` 提供 `/print-card-art/png/…`。

## 去 TTS 范围

- **移除**：运行时 `stance-color-tile-*`、`battle-position-art-map.json` 内 `colorTiles` / `stanceSlots` 色条绑定；`cache-tts-card-art.mjs` 不再下载 Color Room Tiles。
- **英雄立牌**：`hero-standee-print-art-map.json`（印刷 DH Rubine bbox）；已移除 TTS `battle-position-art-map.json`。

## UI

- `BattleStanceTrack` → `MonsterStanceBoard`：整板 `<img>` + 四列网格；有实体时列边框高亮。
- 无本地 PNG：占位文案「无本地站位板图」，**不**回退 TTS 色条。

## 待确认

见 `monster-stance-print-art-map.json` 的 `pendingConfirmation`（英雄列暂共用 Monster Stance 底图、大型怪占格无印刷条等）。

## 范围外

Hero Dashboard 印刷板、战斗 Room Tile 板块、引擎规则与存档语义。
