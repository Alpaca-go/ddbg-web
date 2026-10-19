# Phase 4 · 卡图接入切片：英雄技能 / 手牌 Face 展示

状态：**首刀**——正式八英雄战斗技能卡面可从 TTS Workshop Face atlas 映射并在本地缓存存在时显示；无缓存时占位并保留文字。美术二进制不入库。

## 权威美术来源

- Steam Workshop TTS 存档 JSON（本机示例：`3657612854.json` / Workshop id `3657612854`）。
- Kyries 裁定：只用该 JSON 内的 **image 链接**（`CustomDeck.FaceURL` / `BackURL`），**不用**印刷 PDF 出图。
- AGENTS.md：卡图不进 git；本机私有缓存或占位。

## 映射做法

1. 解析 TTS `ObjectStates` → `The Darkest Heroes/{Hero}/Deck` 下正式八英雄的 **10×7** `CustomDeck` 与 `CardID`。
2. 每个英雄袋中的 7 张 L1 `CardID`（按 `deckId, cell` 排序）与印刷页序 I 级技能一一对应（已对 Smite / Wicked Hack / Collect Bounty / Come Hither / Noxious Blast / Wicked Slice / Mace Bash / Pick to the Face / Toxin Trickery / Sacrificial Stab 等 atlas 切格目视核对）。
3. 同技能 II / III 级 = 同一 atlas 上 `cell + (level − 1)`（Smite I/II = cell 21/22 已目视确认交错排法）。
4. 稳定键：引擎 `hero_skill:pNNN` → `{ faceUrl, backUrl?, numWidth, numHeight, deckId, cell, ttsCardId, cellSource }`。
5. 已提交映射：`apps/web/src/card-art/hero-skill-face-map.json`（仅 URL 与格索引，无图像）。

重生成（本机放好 TTS JSON 后）：

```bash
node tools/pipeline/scripts/build-tts-hero-skill-face-map.mjs \
  --tts /path/to/3657612854.json
```

## 本地缓存

```bash
# 默认写入 <repo>/.cache/tts-card-art/（已 gitignore）
node tools/pipeline/scripts/cache-tts-card-art.mjs

# 或自定义目录
DDBG_TTS_CARD_ART_CACHE=/abs/path/to/cache \
  node tools/pipeline/scripts/cache-tts-card-art.mjs
```

文件名：`face-<deckId>.png`（及可选 `back-<deckId>.*`）。

`pnpm dev` 时 Vite 插件把该目录挂到 `/tts-card-art/*`。未缓存 → UI 显示「无本地卡图」占位，技能名文字仍在。

## UI 接入面

- `/?phase=3&play=1` 编队：每个起始技能旁缩略卡面。
- 战斗行动面板「使用技能」：手牌式技能卡行（点选）+ 当前技能大图；下方英文卡面文字保留（R-048 图标词典不变）。

## 待确认

见映射 JSON 的 `pendingConfirmation`，摘要：

- Deck 419（英雄属性 / 营地技能板，如 Crusader 上的 Zealous Speech）本刀未映射。
- 1×1 英雄肖像 CustomDeck 未映射。
- 非正式英雄（Jester / Arbalest 等）未映射。
- Grave Robber「Toxin Trickery」II/III 在 deck 514 的 cell 1–2 由 level stride 推断（L1 cell 0 有 TTS Card 对象）。

## 范围外

探索 QuestMap / 房间代币 / 遗迹房间牌见 [phase4-exploration-art-2026-10-19.md](phase4-exploration-art-2026-10-19.md)。战斗 Room Tile 板块、走廊段、怪物 atlas、印刷 PDF 管线、Boss 全量、Stygian、R-048 效果图标切图仍在本文件首刀范围外。
