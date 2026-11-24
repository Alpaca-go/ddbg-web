# Phase 4 · 卡图接入切片：英雄技能 / 手牌 Face 展示

状态：**英雄技能 Face 已切印刷 PNG**（见 [phase4-print-hero-skill-art-map-2026-10-19.md](./phase4-print-hero-skill-art-map-2026-10-19.md)）。**2026-11-23 起 TTS 路线整体移除**：本地印刷 PDF 是美术资产的唯一真实来源；`hero-skill-face-map.json`、`build-tts-*.mjs`、`cache-tts-card-art.mjs` 已删除，`pnpm dev` 不再挂载 `/tts-card-art/`。

## 当前权威来源（英雄技能 Face）

- Kyries 审阅的印刷导出 + `hero-skill-print-art-map.json`。
- 本机 `.cache/print-card-art/` + Vite `/print-card-art/png/…`。
- 无缓存 →「无本地卡图」占位；技能名文字仍在。

## 历史：TTS Workshop 映射（已移除，仅存档）

- 早期曾用 Steam Workshop TTS 存档（Workshop id `3657612854`）的 `CustomDeck.FaceURL` 10×7 atlas 映射正式八英雄 168 张战斗技能。
- 该映射（`apps/web/src/card-art/hero-skill-face-map.json`）及生成 / 缓存脚本已于 2026-11-23 删除；TTS 不再作为美术核对参照，需要重新建图时只走印刷 PDF 的 `build-print-*.mjs`。

## UI 接入面

- `/?phase=3&play=1` 编队：每个起始技能旁缩略卡面（印刷 PNG）。
- 战斗行动面板「使用技能」：手牌式技能卡行（点选）+ 当前技能大图；下方英文卡面文字保留（R-048 图标词典不变）。

## 范围外

探索：房间牌 + QuestMap + 房间代币印刷见 [phase4-print-exploration-art-map-2026-10-19.md](./phase4-print-exploration-art-map-2026-10-19.md)、[phase4-print-room-token-art-2026-10-19.md](./phase4-print-room-token-art-2026-10-19.md)；总览 [phase4-exploration-art-2026-10-19.md](./phase4-exploration-art-2026-10-19.md)。战斗 Room Tile 板块、走廊段、Boss 全量、Stygian、R-048 效果图标切图仍在本文件范围外。
