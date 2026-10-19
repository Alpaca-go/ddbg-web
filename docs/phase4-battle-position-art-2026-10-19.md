# Phase 4 · 战斗站位美术

状态：**站位轨道已切印刷 Monster Stance 整板**（见 [phase4-print-monster-stance-art-2026-10-19.md](phase4-print-monster-stance-art-2026-10-19.md)）。八英雄 standee 仍 TTS 本地缓存；美术二进制不入库。

## 站位轨道（印刷）

- 源：`DD_COREBOX_BOARD_Monster_Stance_FRONT.pdf` / `BACK.pdf`，TrimBox PNG。
- 映射：`monster-stance-print-art-map.json`；解析 `resolve-print-monster-stance-art.ts`。
- UI：`BattleStanceTrack` + `MonsterStanceBoard`；无 PNG 时占位，不回退 TTS 色条。

## 英雄肖像（TTS）

| 用途           | TTS 来源                                     | 缓存文件名              |
| -------------- | -------------------------------------------- | ----------------------- |
| 正式八英雄肖像 | `The Darkest Heroes` · 各英雄 `Custom_Token` | `hero-token-<slug>.png` |

已提交映射：`apps/web/src/card-art/battle-position-art-map.json`（`ddbg.tts-hero-token-art-map.v1`）。

重生成：

```bash
node tools/pipeline/scripts/build-tts-battle-position-art-map.mjs \
  --tts /path/to/3657612854.json
```

## 本地缓存

```bash
node tools/pipeline/scripts/cache-tts-card-art.mjs
```

仅下载 `battle-position-art-map.json` 中的 hero token（以及可选的历史 `hero-skill-face-map.json`）。**不**再下载 Color Room Tiles。房间代币已改印刷，见 [phase4-print-room-token-art-2026-10-19.md](phase4-print-room-token-art-2026-10-19.md)。

## 历史说明

2026-10-19 前曾用 TTS「Color Room Tiles」色条（`stance-color-tile-*`）；已由印刷整板方案替代（Kyries 拍板，R-048）。
