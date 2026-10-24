# Phase 4 · 18 名英雄属性卡（Hero STAT）印刷图接线

状态：**方案 2**——印刷 STAT/SKILLS 卡图优先；玩法数值分期，不扩 `FORMAL_HERO_NAMES`、不伪造 `attributesVerified`。

## 产物

| 项        | 值                                                                     |
| --------- | ---------------------------------------------------------------------- |
| 构建脚本  | `node tools/pipeline/scripts/build-print-hero-stat-art-map.mjs`        |
| 目录      | `tools/pipeline/print-card-art/fixtures/print-hero-18-art-catalog.mjs` |
| 入库 JSON | `apps/web/src/card-art/hero-stat-print-art-map.json`                   |
| 解析      | `apps/web/src/card-art/resolve-print-hero-stat-art.ts`                 |
| UI        | `HeroStatCardFace`（正式桌面详情等）                                   |

## 映射范围

| 范围                                                   | `dataStatus`             | 说明                                                  |
| ------------------------------------------------------ | ------------------------ | ----------------------------------------------------- |
| 核心盒 `hero_stat:p001`–`p023` 正/背面                 | `verified-data`（24 面） | 与 `normalized/corebox/hero_stat.json` 已入库 id 对齐 |
| 同批核心盒其余面（Jester / Arbalest / Abomination 等） | `art-only`               | 仅有印刷页序 + raw 身份，无已核实属性数值             |
| Warrens / Cove / Weald / Musketeer 扩展 STAT           | `art-only`               | 合成 id `hero_stat:{pack}:{hero-slug}:p00x:{face}`    |

18 名英雄名均在 map 中至少有一张 STAT 面；扩展包 **MG_DD 文件夹名与页序** 见 `pendingConfirmation`，需本机 export 后目视确认（R-048）。

## 本机导出

```bash
pnpm install
node tools/pipeline/scripts/export-print-card-art.mjs \
  --input "/path/to/DARKEST DUNGEON EN_FILES" \
  --out .cache/print-card-art

node tools/pipeline/scripts/build-print-hero-stat-art-map.mjs
node tools/pipeline/scripts/build-print-hero-skill-art-map.mjs
node tools/pipeline/scripts/check-print-art-map-refs.mjs --cache .cache/print-card-art
```

未导出时 UI 显示「无本地卡图」，不影响规则引擎。

## 英雄技能扩展行

`hero-skill-print-art-map.json` 在既有 231 条 Kyries CSV 之外追加 **147** 条 `hero_skill:art:*`（TDH 技能页 + Musketeer 包），`dataStatus: art-only`。正式战斗仍只使用 normalized `hero_skill:pNNN` id。

详见 [phase4-print-hero-skill-art-map-2026-10-19.md](phase4-print-hero-skill-art-map-2026-10-19.md)。

## 范围外

- 不改引擎数值、不进 Phase 5。
- 不提交 PNG；`.cache/print-card-art` 仍 gitignore。
