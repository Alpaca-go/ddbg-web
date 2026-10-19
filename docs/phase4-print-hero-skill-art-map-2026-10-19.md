# Phase 4 · 印刷英雄技能卡图映射与战斗 UI

状态：**已入库 JSON 映射** + 编队/战斗 UI 优先展示印刷 PNG；二进制仍在本机 `.cache/print-card-art/`。

## CSV 来源

| 项       | 值                                                                                |
| -------- | --------------------------------------------------------------------------------- |
| 审阅文件 | `tools/pipeline/print-card-art/fixtures/print-hero-skill-review-ok-all.csv`       |
| 行数     | 231 条 `verdict=ok`（与 `packages/data/normalized/corebox/hero_skill.json` 一致） |
| 生成脚本 | `node tools/pipeline/scripts/build-print-hero-skill-art-map.mjs`                  |
| 入库产物 | `apps/web/src/card-art/hero-skill-print-art-map.json`                             |

Kyries 在印刷导出 manifest 上人工核对 **SKILLS_FRONT** 页序；引擎 id 形态 `hero_skill:pNNN` 与 normalized `pages` 对齐。

## 本机缓存依赖

1. 安装 Python 依赖并导出（见 [phase4-print-art-pipeline-2026-10-19.md](phase4-print-art-pipeline-2026-10-19.md)）：

   ```bash
   node tools/pipeline/scripts/export-print-card-art.mjs \
     --input "/path/to/DARKEST DUNGEON EN_FILES" \
     --out .cache/print-card-art
   ```

2. 开发服务器通过 Vite 插件提供 `GET /print-card-art/png/…`（目录默认 `<repo>/.cache/print-card-art`，可用 `DDBG_PRINT_CARD_ART_CACHE` 覆盖）。

未导出时 UI 显示「无本地卡图」占位，**不影响**规则与战斗逻辑。

## UI 展示策略

| 顺序 | 来源     | 条件                                                                                        |
| ---- | -------- | ------------------------------------------------------------------------------------------- |
| 1    | 印刷 PNG | `hero-skill-print-art-map.json` 含 `engineId`，且本地缓存存在对应 `pngRel`                  |
| 2    | 占位     | 无映射行、未导出 PNG，或运行时加载失败（**不**回退 TTS Workshop atlas；与怪物卡面策略一致） |

组件：`CardFace`（编队起始技能、`BattleView` / 地牢沙盒技能行）。

解析：`resolve-print-hero-skill-art.ts`（lookup + `/print-card-art/…` URL）。

## R-048

整页 raster 的 TrimBox / 3 mm bleed 由 `tools/pipeline/print-card-art` 导出阶段处理；Web 只引用已导出的 PNG，不在 UI 层发明裁切。

## 试玩路径

1. `pnpm install` → `pnpm dev`
2. `/?phase=3&play=1` 编队或进入战斗沙盒
3. 技能缩略图 / 手牌行应出现印刷卡面（需本机已导出 PNG）

## 未覆盖引擎 id

本批 CSV 覆盖 normalized **全部 231** 张核心盒 `hero_skill`；`uncoveredEngineIds` 为空。

## 范围外

- 不改规则数值与引擎行为；不进 Phase 5。
- 英雄技能 BACK 面、效果图标切格仍不在本刀。
- 探索 / 站位色条仍用 TTS（见 [phase4-exploration-art-2026-10-19.md](phase4-exploration-art-2026-10-19.md)）。

## 历史 TTS 映射

`hero-skill-face-map.json` 与 `build-tts-hero-skill-face-map.mjs` 仍保留供 `cache-tts-card-art.mjs` 与文档对照；**运行时 UI 不再读取**。
