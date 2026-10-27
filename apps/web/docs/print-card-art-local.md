# 本机印刷卡图（`.cache/print-card-art`）

正式桌面 UI 通过 `apps/web/src/card-art/*-print-art-map.json` 将引擎 id 映射到 PNG 相对路径，浏览器从 **`/print-card-art/`** 加载（Vite 将仓库根目录 `.cache/print-card-art` 挂到该前缀，目录 **gitignore，不入库**）。

## 准备步骤

1. 按 `tools/pipeline/scripts/export-print-card-art.mjs` 与各 `build-print-*-art-map.mjs` 从印刷 PDF 导出 PNG 到 `.cache/print-card-art/`（Kyries 本机已有流程，见 `docs/phase4-print-art-pipeline-2026-10-19.md` 等）。
2. 在仓库根执行 `pnpm install` 后 `pnpm dev`，确认 `http://localhost:5173/print-card-art/...` 能打开样例 PNG。
3. 无缓存时 UI 显示「无本地卡图」占位，不回退 TTS 卡面（R-048）。

## 本 PR 已接线的卡类（有 map 即尝试显示）

| 卡类                | 组件 / 入口                                                |
| ------------------- | ---------------------------------------------------------- |
| 英雄 STAT           | `HeroStatCardFace` · 左栏队伍、建队、详情、战斗站位/区域格 |
| 英雄技能            | `CardFace` · 建队选技能、战斗底栏手牌                      |
| 怪物                | `MonsterCardFace` · 战斗站位、探索部署、详情               |
| 任务 / Curio / 饰品 | `CoreboxPrintCardFace`                                     |
| 房间 / QuestMap     | `RoomCardFace` / `ExplorationArtImage`                     |
| 村庄版图 / 建筑板块 | `TabletopRasterImage` + hamlet map                         |
| 英雄立牌（冲压）    | `StandeeToken` / `BattlePositionRaster`（STAT 缺图时回退） |
| Monster Stance 整板 | `MonsterStanceBoard`（非 compact 战斗沙盒）                |

## 仍缺或未接

- 先攻牌背、苦难/美德/怪癖/疾病牌堆（刻意不在桌面展示）
- 部分扩展英雄仅 art-only STAT、技能效果未接线时仍显示卡图 + 文案提示
- 无 PNG 的 map 行：占位，不猜图

## 截图建议路径

有缓存时：`/?play=1` 走完建队 → 出征 → 遗迹房间战斗，对照战斗区站位四格与区域格内缩略卡图、左栏 STAT 缩略图。
