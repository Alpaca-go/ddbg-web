# Phase 4 · 印刷怪物卡图映射与战斗 UI

状态：**已入库 JSON 映射** + 战斗试玩优先展示印刷 PNG；二进制仍在本机 `.cache/print-card-art/`。

## CSV 来源

| 项       | 值                                                                              |
| -------- | ------------------------------------------------------------------------------- |
| 审阅文件 | `tools/pipeline/print-card-art/fixtures/print-monster-review-ok-fixed-p021.csv` |
| 行数     | 72 条 `verdict=ok`（表头除外共 73 行）                                          |
| 生成脚本 | `node tools/pipeline/scripts/build-print-monster-art-map.mjs`                   |
| 入库产物 | `apps/web/src/card-art/monster-print-art-map.json`                              |

Kyries 在印刷导出 manifest 上人工核对；本批仅包含核心盒 **monster_medium**（52）+ **monster_large**（20）。

### p021 修正

`monsters_medium` FRONT **第 21 页**在自动匹配阶段曾与其它 Cultist 行混淆；审阅 CSV 将 `monster_medium:p021`（Cultist Acolyte I）固定为 `…_p021.png`，与 normalized `pages` 21–23 一致。

## 本机缓存依赖

1. 安装 Python 依赖并导出（见 [phase4-print-art-pipeline-2026-10-19.md](phase4-print-art-pipeline-2026-10-19.md)）：

   ```bash
   node tools/pipeline/scripts/export-print-card-art.mjs \
     --input "/path/to/DARKEST DUNGEON EN_FILES" \
     --out .cache/print-card-art
   ```

2. 开发服务器通过 Vite 插件提供 `GET /print-card-art/png/…`（目录默认 `<repo>/.cache/print-card-art`，可用 `DDBG_PRINT_CARD_ART_CACHE` 覆盖）。

未导出时 UI 显示「无卡图」占位，**不影响**规则与战斗逻辑。

## UI 回退策略

| 顺序 | 来源           | 条件                                                                                            |
| ---- | -------------- | ----------------------------------------------------------------------------------------------- |
| 1    | 印刷 PNG       | `monster-print-art-map.json` 含 `engineId`，且本地缓存存在对应 `pngRel`                         |
| 2    | TTS 怪物 atlas | PR #252 `monster-face-art-map.json` 有行且 `.cache/tts-card-art` 有图集；印刷加载失败时也会尝试 |
| 3    | 占位           | 以上皆无                                                                                        |

组件：`MonsterCardFace`（`BattleStanceTrack` 怪物 chip、`BattleView` 怪物回合侧栏）。

与 [phase4-card-art-faces-2026-10-18.md](phase4-card-art-faces-2026-10-18.md) 英雄技能 TTS 图并列；**不得**用 TTS 覆盖印刷页序或引擎 id 绑定（同印刷管线文档）。

## R-048

整页 raster 的 TrimBox / 3 mm bleed 由 `tools/pipeline/print-card-art` 导出阶段处理；Web 只引用已导出的 PNG，不在 UI 层发明裁切。

## 试玩路径

1. `pnpm install` → `pnpm dev`
2. 打开战斗沙盒（或地牢战斗入口），布置含骨兵/骨贵族等怪物
3. 站位轨道上怪物 chip 与怪物行动侧栏应出现印刷卡面（需本机已导出 PNG）

## 未覆盖引擎 id

normalized 中存在但本 CSV **未纳入**审阅的 id（扩展包页，非本批 72 张）：

- `monster_medium:ADD_014:p001`
- `monster_medium:ADD_014:p003`

`monster_large` 20/20 均在 CSV 内。

## 范围外

- 不改规则数值与引擎行为；不进 Phase 5。
- 怪物 BACK 面、技能条内图标切格仍不在本刀。
