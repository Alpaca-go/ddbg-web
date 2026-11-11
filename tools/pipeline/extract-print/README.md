# 核心盒印刷 PDF 提取器

从核心盒印刷 PDF 抽出逐卡文字和图标位置。脚本是提取器 1.0.4 的原样复制，逻辑没有改。英文说明和提取报告在同目录的 `UPSTREAM.md`、`REPORT.md`。

这个工具**不进 CI**。它要读本机的印刷 PDF，仓库里没有这些 PDF，也不要提交。

## 运行

在本目录执行（不要在没有 PDF 的环境里跑）：

```bash
python3 scripts/run_all.py
python3 scripts/run_all.py --force
```

`scripts/ddbg_extract/config.py` 里的 `PRINT_ROOT` 仍指向提取时的本机路径。换机器要自己改这个路径，再准备 PyMuPDF、Pillow、imagehash、numpy。输出写到本目录下的 `raw/`、`parsed/`、`reports/`，会覆盖本地结果。

已入库的那一份提取结果在 `packages/data/extract/corebox/`，用 `reports/summary.json` 的 sha1 对过字节。图标裁切图没有入库。

## Weald 地点组件

`scripts/extract_weald_location.py --input <EN_FILES根目录>` 复用同一提取器，输出到 `packages/data/extract/extension/weald/`，保留既有英雄文件。加 `--review` 可生成私有本地正反面审阅页。数据范围、解析停点及后续规范化顺序见 [Weald 导入记录](../../../docs/weald-location-intake-2026-11-11.md)。
