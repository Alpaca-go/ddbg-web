# 印刷卡图批处理（print-card-art）

本机批跑：裁出血 → 按页 PNG → `manifest.csv` + 品类 map JSON。

**完整说明**：[docs/phase4-print-art-pipeline-2026-10-19.md](../../../docs/phase4-print-art-pipeline-2026-10-19.md)

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
node ../../scripts/export-print-hamlet-building-tiles.mjs --input /path/to/EN_FILES --out .cache/print-card-art
node ../../scripts/build-print-hamlet-board-art-map.mjs
node ../../scripts/build-print-hamlet-building-tile-art-map.mjs
```

村庄版图 / 建筑升级板说明：[docs/phase4-print-hamlet-art-2026-10-20.md](../../../docs/phase4-print-hamlet-art-2026-10-20.md)。本机 14 块拼图与 Guild 剔除对比：`python3 render_hamlet_building_previews.py`（需已导出 `.cache/print-card-art/png/`）。

房间代币刀线说明：[docs/phase4-print-room-token-art-2026-10-19.md](../../../docs/phase4-print-room-token-art-2026-10-19.md)。

审阅 CSV 与 Web 映射说明：[怪物](docs/phase4-print-monster-art-map-2026-10-19.md)、[英雄技能](docs/phase4-print-hero-skill-art-map-2026-10-19.md)、[Monster Stance 站位板](../../../docs/phase4-print-monster-stance-art-2026-10-19.md)、[英雄立牌](../../../docs/phase4-print-hero-standee-art-2026-10-20.md)（相对仓库根 `docs/`）。
