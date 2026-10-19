# Phase 4 · 卡图接入切片：英雄技能 / 手牌 Face 展示

状态：**英雄技能 Face 已切印刷 PNG**（见 [phase4-print-hero-skill-art-map-2026-10-19.md](phase4-print-hero-skill-art-map-2026-10-19.md)）。下文 TTS 段落保留作历史与 `hero-skill-face-map.json` 生成说明；**运行时 UI 不再使用 TTS atlas 显示技能正面**。

## 当前权威来源（英雄技能 Face）

- Kyries 审阅的印刷导出 + `hero-skill-print-art-map.json`。
- 本机 `.cache/print-card-art/` + Vite `/print-card-art/png/…`。
- 无缓存 →「无本地卡图」占位；技能名文字仍在。

## 历史：TTS Workshop 映射（不入运行时 UI）

- Steam Workshop TTS 存档 JSON（本机示例：`3657612854.json` / Workshop id `3657612854`）。
- 曾用 `CustomDeck.FaceURL` 10×7 atlas 映射正式八英雄 168 张战斗技能。
- 已提交遗留映射：`apps/web/src/card-art/hero-skill-face-map.json`（仅 URL 与格索引，无图像）。

重生成（对照用，本机放好 TTS JSON 后）：

```bash
node tools/pipeline/scripts/build-tts-hero-skill-face-map.mjs \
  --tts /path/to/3657612854.json
```

## 本地 TTS 缓存（探索 / 站位仍用）

```bash
# 默认写入 <repo>/.cache/tts-card-art/（已 gitignore）
node tools/pipeline/scripts/cache-tts-card-art.mjs
```

`pnpm dev` 时 Vite 插件把该目录挂到 `/tts-card-art/*`。

## UI 接入面

- `/?phase=3&play=1` 编队：每个起始技能旁缩略卡面（印刷 PNG）。
- 战斗行动面板「使用技能」：手牌式技能卡行（点选）+ 当前技能大图；下方英文卡面文字保留（R-048 图标词典不变）。

## 待确认（TTS 映射 JSON，历史）

见 `hero-skill-face-map.json` 的 `pendingConfirmation`，摘要：

- Deck 419（英雄属性 / 营地技能板）未映射。
- 1×1 英雄肖像 CustomDeck 未映射。
- 非正式英雄（Jester / Arbalest 等）未映射。

## 范围外

探索：房间牌 + QuestMap + 房间代币印刷见 [phase4-print-exploration-art-map-2026-10-19.md](phase4-print-exploration-art-map-2026-10-19.md)、[phase4-print-room-token-art-2026-10-19.md](phase4-print-room-token-art-2026-10-19.md)；总览 [phase4-exploration-art-2026-10-19.md](phase4-exploration-art-2026-10-19.md)。战斗 Room Tile 板块、走廊段、Boss 全量、Stygian、R-048 效果图标切图仍在本文件范围外。
