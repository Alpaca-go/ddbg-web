# 印刷卡图批处理（print-card-art）

本机批跑：裁出血 → 按页 PNG → `manifest.csv` + 品类 map JSON。

**完整说明**：[docs/phase4-print-art-pipeline-2026-10-19.md](../../../docs/phase4-print-art-pipeline-2026-10-19.md)

## 单元测试

先安装 Python 依赖（含 PyMuPDF）：

```bash
pip install -r tools/pipeline/print-card-art/requirements.txt
```

在**仓库根目录**运行（无需设置 `PYTHONPATH`，也无需 `pip install -e`）：

```bash
# Linux / macOS
python3 -m unittest discover -s tools/pipeline/print-card-art/tests

# Windows（Python Launcher）
py -3 -m unittest discover -s tools/pipeline/print-card-art/tests
```

等价 pnpm 脚本（同样从仓库根目录执行）：

```bash
pnpm --filter @ddbg/pipeline test:print-card-art
```

`unittest discover` 会把 `tests/` 加入 `sys.path`，因此测试目录里带有 `tests/ddbg_print_art/` 重定向包，把 `import ddbg_print_art` 指向上级真正的包目录。

## 导出

```bash
pip install -r requirements.txt
node ../../scripts/export-print-card-art.mjs --input /path/to/EN_FILES --out .cache/print-card-art
node ../../scripts/build-print-monster-art-map.mjs
node ../../scripts/build-print-hero-skill-art-map.mjs
node ../../scripts/export-print-room-tokens.mjs --input /path/to/EN_FILES --out .cache/print-card-art
node ../../scripts/build-print-room-token-art-map.mjs
node ../../scripts/build-print-monster-stance-art-map.mjs \
  --manifest .cache/print-card-art/manifest.csv
node ../../scripts/export-print-hero-standees.mjs --input /path/to/EN_FILES --out .cache/print-card-art
node ../../scripts/build-print-hero-standee-art-map.mjs
node ../../scripts/export-print-hamlet-board.mjs --input /path/to/EN_FILES --out .cache/print-card-art
node ../../scripts/build-print-hamlet-board-art-map.mjs
```

村庄版图与建筑手裁说明：[docs/phase4-print-hamlet-art-2026-10-20.md](../../../docs/phase4-print-hamlet-art-2026-10-20.md)。

建筑升级板 **II/III**（Kyries 手裁，无自动导出）：将 PNG 放入

`.cache/print-card-art/manual/hamlet-building-tiles/{buildingId}-{ii|iii}.png`

（`buildingId` 为 `abbey`、`tavern`、`sanitarium`、`survivalist`、`stagecoach`、`blacksmith`、`nomadWagon`；正向朝上，透明背景可选。）

房间代币刀线说明：[docs/phase4-print-room-token-art-2026-10-19.md](../../../docs/phase4-print-room-token-art-2026-10-19.md)。

审阅 CSV 与 Web 映射说明：[怪物](docs/phase4-print-monster-art-map-2026-10-19.md)、[英雄技能](docs/phase4-print-hero-skill-art-map-2026-10-19.md)、[Monster Stance 站位板](../../../docs/phase4-print-monster-stance-art-2026-10-19.md)、[英雄立牌](../../../docs/phase4-print-hero-standee-art-2026-10-20.md)（相对仓库根 `docs/`）。
