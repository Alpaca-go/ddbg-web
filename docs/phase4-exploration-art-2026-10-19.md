# Phase 4 · 探索卡图（TTS 暂代 → 印刷）

状态：**大部分 supersede**——房间牌、QuestMap、房间代币均已切印刷 PNG。站位色条等仍 TTS。美术二进制不入库。

| 内容                        | 来源                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quest_map:p001`–`p014`     | 印刷 QuestMap → `exploration-print-art-map.json`                                                                                                  |
| `room:p001`–`p025`（Ruins） | 同上                                                                                                                                              |
| 房间代币 7 kind             | 冲压板 Rubine 刀线 → `room-token-print-art-map.json`（见 [phase4-print-room-token-art-2026-10-19.md](phase4-print-room-token-art-2026-10-19.md)） |
| 战斗站位 hero 立牌          | 印刷 DH 冲压板 → `hero-standee-print-art-map.json`（见 phase4-print-hero-standee-art-2026-10-20.md）                                              |

已入库映射：

- `apps/web/src/card-art/exploration-print-art-map.json`
- `apps/web/src/card-art/room-token-print-art-map.json`

本机缓存：

```bash
node tools/pipeline/scripts/export-print-card-art.mjs --input "<EN_FILES>" --out .cache/print-card-art
node tools/pipeline/scripts/export-print-room-tokens.mjs --input "<EN_FILES>" --out .cache/print-card-art
```
