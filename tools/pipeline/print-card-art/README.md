# 印刷卡图批处理（print-card-art）

本机批跑：裁出血 → 按页 PNG → `manifest.csv` + 品类 map JSON。

**完整说明**：[docs/phase4-print-art-pipeline-2026-10-19.md](../../../docs/phase4-print-art-pipeline-2026-10-19.md)

```bash
pip install -r requirements.txt
node ../../scripts/export-print-card-art.mjs --input /path/to/EN_FILES --out .cache/print-card-art
```
