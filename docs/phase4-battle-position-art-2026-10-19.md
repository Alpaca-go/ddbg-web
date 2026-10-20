# Phase 4 · 战斗站位美术

状态：**站位轨道已切印刷 Monster Stance 整板**（见 [phase4-print-monster-stance-art-2026-10-19.md](phase4-print-monster-stance-art-2026-10-19.md)）。八英雄立牌已切 **DH 冲压板印刷 PNG**（见 [phase4-print-hero-standee-art-2026-10-20.md](phase4-print-hero-standee-art-2026-10-20.md)）；美术二进制不入库。

## 站位轨道（印刷）

- 源：`DD_COREBOX_BOARD_Monster_Stance_FRONT.pdf` / `BACK.pdf`，TrimBox PNG。
- 映射：`monster-stance-print-art-map.json`；解析 `resolve-print-monster-stance-art.ts`。
- UI：`BattleStanceTrack` + `MonsterStanceBoard`；无 PNG 时占位，不回退 TTS 色条。

## 英雄立牌（印刷）

- 源：`DD_EN_THE_DARKEST_HEROES_PUNCHBOARD_FRONT.pdf` p1–p2，Rubine 刀线 bbox 177.83×237.09 pt。
- 映射：`hero-standee-print-art-map.json`；解析 `resolve-print-hero-standee-art.ts`。
- UI：`BattlePositionRaster` → `/print-card-art/png/{hero}-front.png`；无 PNG 时占位，不回退 TTS。

本机导出与建图见 [phase4-print-hero-standee-art-2026-10-20.md](phase4-print-hero-standee-art-2026-10-20.md)。

`cache-tts-card-art.mjs` 仅服务英雄技能卡面 atlas，**不再**下载 hero token。

## 历史说明

2026-10-19 前曾用 TTS「Color Room Tiles」色条（`stance-color-tile-*`）；已由印刷整板方案替代（Kyries 拍板，R-048）。
