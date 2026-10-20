# Phase 4 · 印刷 PDF 卡图批处理管线

状态：**首刀**——本机可跑的导出脚本 + 文档；真实约 1.22 GB / 205 个 PDF 在 Kyries 桌面批跑，**美术 PNG 不入库**。

## 为何本机跑

云端 Agent 无法挂载 `C:\Users\kyrie\Desktop\DARKEST DUNGEON EN_FILES`，也无私人 worker。仓库交付脚本、映射 schema 与极小自测 fixture；整批导出在 Kyries 本机执行。

## 出血与裁切（R-048）

依据 [docs/plan.md](plan.md) §印刷 PDF：

- **优先**使用 PDF **TrimBox**（裁切框 = 卡面）。
- 若仅有 MediaBox（Trim 与 Media 重合、无有效裁切框），从 MediaBox **四边内缩 3 mm**（PDF 用户空间：1 pt = 1/72 in，3 mm ≈ 8.504 pt）。
- **不发明**其它印刷几何。

实现：`tools/pipeline/print-card-art/ddbg_print_art/bleed.py`。

## Old 路径后缀

路径段（不区分大小写，`-` / 空格归一为 `_`）为 `old`、`old_version`、`oldversion` 时，导出 PNG 基名加 **`_old`**（与 [en-files inventory](https://github.com/Alpaca-go/ddbg-web) 中 12 个 old PDF 一致）。

## 依赖安装（一次性）

```bash
pip install -r tools/pipeline/print-card-art/requirements.txt
```

需要 **Python 3.10+** 与 **PyMuPDF**（`pip` 包名 `PyMuPDF`）。

## 一条命令跑通

在仓库根目录：

```bash
node tools/pipeline/scripts/export-print-card-art.mjs \
  --input "C:\Users\kyrie\Desktop\DARKEST DUNGEON EN_FILES" \
  --out .cache/print-card-art
```

等价的 Python 入口：

```bash
python3 tools/pipeline/print-card-art/run.py \
  --input "C:\Users\kyrie\Desktop\DARKEST DUNGEON EN_FILES" \
  --out .cache/print-card-art \
  --dpi 200
```

可选：`--dpi 150`～`300`（默认 200）、`--limit 5` 冒烟、`--dry-run` 只分类不写 PNG。

### 输出布局（均在 `--out` 下，已 gitignore）

| 路径                                     | 说明                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `manifest.csv`                           | 每页：PDF 相对路径、页码、品类、正反面、裁切方式、`png_rel`、文字摘要、`engine_id` |
| `png/*.png`                              | 按页导出的卡面图                                                                   |
| `maps/monster-medium-print-art-map.json` | 怪物中卡：页码 ↔ `packages/data` 引擎 id                                           |
| `maps/monster-large-print-art-map.json`  | 怪物大卡                                                                           |
| `maps/*-print-art-map.json`              | 其它品类 **scaffold**（已导出页列表，`engineId` 待补）                             |
| `run-meta.json`                          | 本次运行摘要                                                                       |

怪物与英雄技能 **Kyries 审阅 CSV** 已提升为 `apps/web/src/card-art/monster-print-art-map.json`、`hero-skill-print-art-map.json`（见 [phase4-print-monster-art-map-2026-10-19.md](phase4-print-monster-art-map-2026-10-19.md)、[phase4-print-hero-skill-art-map-2026-10-19.md](phase4-print-hero-skill-art-map-2026-10-19.md)）；亦可从 `maps/*-print-art-map.json` 手工对照。战斗 UI 怪物与英雄技能 Face 仅 `/print-card-art/png/…`（无 TTS 回退）。

## 运行时 UI 与 TTS 对照工具

- **运行时**：怪物、英雄技能、探索（房间牌 / QuestMap / 房间代币）、Monster Stance 整板、八英雄立牌等均仅印刷 PNG + `*-print-art-map.json`；失败 → 占位，**不回退** Workshop atlas。
- **对照用（不喂 UI）**：
  - `apps/web/src/card-art/hero-skill-face-map.json` + `build-tts-hero-skill-face-map.mjs`
  - `build-tts-battle-position-art-map.mjs`（历史 hero token URL；站位已切印刷）
  - `cache-tts-card-art.mjs`（仅下载英雄技能 atlas 到 `.cache/tts-card-art/`；可选）
  - `build-tts-exploration-art-map.mjs`：**已废弃**（执行即报错并提示印刷管线）
- `pnpm dev` 的 Vite 插件仍挂载 `/tts-card-art/` 与 `/print-card-art/`；前者仅供本机对照已缓存 atlas，**无运行时请求**。

## 对照源

| 用途                  | 路径                                                             |
| --------------------- | ---------------------------------------------------------------- |
| 引擎卡牌 id           | `packages/data/normalized/corebox/*.json`                        |
| 页码 / 卡名（提取侧） | `packages/data/extract/corebox/parsed/`（与 extract-print 同源） |
| TTS 辅助              | `apps/web/src/card-art/hero-skill-face-map.json` 等              |

怪物映射逻辑：印刷 FRONT/BACK **页码**与 normalized `pages` 对齐；页内文字与 `name` 不一致时写入 map `pending`。

## 与 extract-print 的分工

| 工具                             | 目的                                                                  |
| -------------------------------- | --------------------------------------------------------------------- |
| `tools/pipeline/extract-print/`  | 卡面**文字 / 图标位置** → `packages/data/extract`（已入库结构化数据） |
| `tools/pipeline/print-card-art/` | **整页 raster** + 卡图路径映射（不进 CI，依赖本机 PDF）               |

## 本机一键导出

依赖：`pip install -r tools/pipeline/print-card-art/requirements.txt`。Windows 建议设置 `DDBG_PYTHON` 或确保 `py -3` 可用（脚本会跳过 Microsoft Store 的 `python3` 占位别名）。

在仓库根目录，将 `--input` 换成本机 `DARKEST DUNGEON EN_FILES` 路径（须含 `DARKEST_DUNGEON_PRINT_EN_WAVE *` / `MASTER_WEBBER_EN`；默认跳过 `中文版`、`tmp` 与 zip）：

```bash
# 串联：整批 PDF → 房间代币 → 英雄立牌 → Curio/Trinket/Quest TrimBox → Monster Stance map → map 引用检查
node tools/pipeline/scripts/export-print-all.mjs \
  --input "C:\Users\kyrie\Desktop\DARKEST DUNGEON EN_FILES" \
  --out .cache/print-card-art
```

分步（与 `export-print-all.mjs` 相同顺序）：

```bash
node tools/pipeline/scripts/export-print-card-art.mjs --input "<EN_FILES>" --out .cache/print-card-art --dpi 200
node tools/pipeline/scripts/export-print-room-tokens.mjs --input "<EN_FILES>" --out .cache/print-card-art --dpi 300
node tools/pipeline/scripts/export-print-hero-standees.mjs --input "<EN_FILES>" --out .cache/print-card-art --dpi 300
node tools/pipeline/scripts/export-print-corebox-trim-decks.mjs --input "<EN_FILES>" --out .cache/print-card-art --dpi 200
node tools/pipeline/scripts/build-print-monster-stance-art-map.mjs --manifest .cache/print-card-art/manifest.csv
node tools/pipeline/scripts/check-print-art-map-refs.mjs --cache .cache/print-card-art
```

审阅 CSV / 提升 Web map（怪物、英雄技能、探索等）仍用既有 `build-print-*-art-map.mjs`；见各 `docs/phase4-print-*` 文档。

## 自测（无真实印刷 PDF）

```bash
PYTHONPATH=tools/pipeline/print-card-art \
  python3 -m unittest discover -s tools/pipeline/print-card-art/tests -p 'test_*.py'
```

## 待确认 / pending

- 扩展包 PDF（Warrens / Cove / Weald 等）品类规则与引擎 id 表尚未全接。
- 其它品类（房间牌 BACK 等）需按 FRONT 页序与引擎 id 对齐的专用匹配器（部分仍为 scaffold）。
- Boss / Stygian / 板块 / 骰子网等是否纳入卡图 UI 另开主题。
- 确认后由 Kyries 批跑并 PR 提交 `apps/web/src/card-art/*-print-art-map.json`（仍无 PNG 二进制）。

## 范围外

- 不改规则引擎玩法；不进 Phase 5。
- R-048 效果图标切图、单卡内多区域切格（非整页）不在本刀。
