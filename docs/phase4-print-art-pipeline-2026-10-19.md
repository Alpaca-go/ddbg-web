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

## 与 TTS 暂代的关系

- **怪物、英雄技能 Face**：已切到印刷 PNG + print map；未缓存或加载失败时显示占位，不回退 Workshop atlas。
- **探索、站位色条等**：仍见 [phase4-exploration-art-2026-10-19.md](phase4-exploration-art-2026-10-19.md) 等，使用 `FaceURL` + `.cache/tts-card-art/`。
- `cache-tts-card-art.mjs` 仍下载探索/站位（及可选的历史 hero TTS map）；`build-tts-*-map.mjs` 保留供对照。

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

## 自测（无真实印刷 PDF）

```bash
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
