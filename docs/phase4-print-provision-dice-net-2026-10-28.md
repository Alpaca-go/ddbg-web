# Phase 4 · D6 Provision 展开图（dice_net）→ 桌面骰面 raster · 盘点与候选面序

状态：**待 Kyries 批面序**。引擎语义六面 + Wild 已接；**展开图 panel → 引擎 key → PNG 裁切** 未绑，不接生产 map / UI 骰面图。

关联：[phase4-print-provision-player-aid-2026-10-28.md](phase4-print-provision-player-aid-2026-10-28.md)（AID-Prov 整卡 reference 已 enabled）；探索骰先例见 [phase3-corridor-empty-2026-10-11.md](phase3-corridor-empty-2026-10-11.md) 与 `exploration_die.json`（仅录语义面集合 + 软件抽样序，**不**绑展开图格）。

## 规则与裁定（语义已批，几何未批）

| 项 | 出处 | 批状态 |
| --- | --- | --- |
| 六面语义 + Wild 效果 | 规格书 §5.2、§18.1；**R-010**；图标图例 I-28–I-33 | **已批**（效果与名称） |
| 展开图 panel 与引擎 key / 裁切框 | **DICE-P** `DD_COREBOX_DICE_D6_Provision.pdf`；**R-048** | **待批** |
| 辅助卡标题图 vs 骰面 raster 是否同图 | 词典 `player_aid` heading icons vs dice_net 矢量面 | **待批**（不得默认等同） |

## 1. 资产位置（extract / 印刷根）

| 字段 | 值 |
| --- | --- |
| 印刷相对路径 | `01_DD_DICE_COREBOX/DD_COREBOX_DICE_D6_Provision.pdf` |
| extract 标签 | `dice_net`（与 D10×2、D6 Exploration 同类） |
| 页数 | **2**（`packages/data/extract/corebox/reports/summary.json`） |
| raw JSON | **无**（纯矢量、无文字；extract-print `REPORT.md` §2.2「需人工录入」） |
| 印刷根（规格书） | `ddbg-print/…/MG_DD_01_EN_COREBOX_Print/`（云环境通常无 PDF；目视需本机 EN_FILES） |
| 规格书代号 | **DICE-P**（`docs/spec/core-rules-spec-v0.2.md` 印刷部件表） |

**p1 / p2 分工（候选，未目视确认）**：对照探索骰，引擎数据只引用 **p1** 作为展开图来源（`exploration_die.json` → `page: 1`）。Provision 尚无 `provision_die.json`；p2 是否为背面/第二份网、是否与 p1 同形，**待 Kyries 对照 PDF 后写入「已批」栏**。

本地整页 PNG（供批面序，不入库）：

```bash
# 需本机 EN_FILES；输出目录与 player aid 相同前缀
node tools/pipeline/scripts/export-print-card-art.mjs --input "<EN_FILES>"
# 预期 slug 形如：01_DD_DICE_COREBOX/DD_COREBOX_DICE_D6_Provision.pdf_p001.png（及 p002）
```

## 2. 引擎面 key 与现有 pending 标记

### 2.1 引擎（语义 + RNG）

| key | 类型 | 说明 |
| --- | --- | --- |
| `food` | `ProvisionFace` | PROVISION_FACES |
| `bandage` | `ProvisionFace` | 同上 |
| `potion` | `ProvisionFace` | 同上 |
| `torch` | `ProvisionFace` | 同上 |
| `tool` | `ProvisionFace` | 同上 |
| `wild` | 掷骰结果 / 待选 | **不在** `PROVISION_FACES`；Wild 落定后选上述五面之一 |

- 定义：`packages/engine/src/loot.ts` — `PROVISION_FACES`、`nextProvisionFace`（R12：六面各一次采样；**数组顺序仅为软件 RNG 桶序**，注释写明「不当作印刷数字」）。
- Wild 逻辑：开局 / Curio / 奖励骰等见 `dungeon-starting-provisions.ts`、`dungeon-curio-effects.ts`；UI 文案 `apps/web/src/provision-labels.ts`（无 `wild` 条目，Wild 走事件/待选文案）。

### 2.2 桌面 UI / map（未接骰面 raster）

| 位置 | 内容 |
| --- | --- |
| `apps/web/src/card-art/player-aid-print-art-map.json` | `pendingConfirmation` 含 D6 Provision dice_net |
| `tools/pipeline/scripts/build-print-player-aid-art-map.mjs` | 再生 map 时写入相同 pending 说明 |
| `docs/phase4-print-provision-player-aid-2026-10-28.md` | 「待确认」表：展开图→桌面 PNG **未批** |
| `apps/web/src/tabletop/sections/tabletop-control-rail.tsx` 等 | `AssetPlaceholder` `assetType="dice_net"` |
| `apps/web/src/card-art/resolve-print-player-aid-art.test.ts` | 断言 pending 含 `D6_Provision`，且不含 `player_aid:p005` |

**不存在**：`provision-dice-print-art-map.json`、`resolve-print-provision-dice-art.ts`、`build-print-provision-dice-art-map.mjs`（Kyries 书面面序前不得添加）。

## 3. 候选面序表（语义 ↔ 证据 ↔ 展开图格）

下列 **六行语义** 已由 R-010 / AID-Prov 确认；**「展开图 panel」列 intentionally 留空**，避免把辅助卡行序或引擎数组序误绑到 dice_net。

### 3.1 语义面 ↔ 辅助卡 FRONT 行（`player_aid:p001`，非 dice_net）

PDF：`DD_EN_COREBOX_CARDS_70_120_PLAYER_AIDS_FRONT.pdf` **p1**（与 map 中 `printPage: 1` 一致）。坐标：TrimBox 原点左上，mm，y 向下（raw `player_aid.json`）。

| 引擎 key | R-010 / 规格 | AID-Prov 标题行 icon（词典 confirmed） | raw 行文本（摘要） | 标题 icon bbox（mm，y≈） | Kyries 批 dice_net panel |
| --- | --- | --- | --- | --- | --- |
| `torch` | I-28 | `{icon:6b53e3e6fc}` torch_provision | Torch: +1 / Ignore Curio… | 15.97–24.67 | **待批** |
| `food` | I-29 | `{icon:030d73b0ba}` food | Food: Heal 1 / Counter Hunger | 29.65–38.35 | **待批** |
| `tool` | I-30 | `{icon:e08aace22b}` tool_provision | Tool: Ignore Trap or Rubble | 43.65–52.35 | **待批** |
| `bandage` | I-31 | `{icon:f537bc17c3}` bandages | Bandages: Heal 1 / Remove Bleed | 57.65–66.35 | **待批** |
| `potion` | I-32 | `{icon:7c568783f1}` potion | Potion: −1 Stress / Remove Blight | 71.65–80.35 | **待批** |
| `wild` | I-33 | `{icon:c7b2d1f3d3}` wild_face | Wild: Turn to any side… | 85.65–94.35 | **待批** |

卡标题 `{icon:686ca3dd0a}` Provisions（含 Wild「DD」小图）bbox y≈3.6–12.4 — **玩家辅助说明用**，不是逐面 map 行。

### 3.2 展开图 panel 占位（待目视填表）

在 **未** 打开 `DD_COREBOX_DICE_D6_Provision.pdf` p1 渲染图前，仓库 **不能** 负责任地给出 panel 编号或 bbox。批面序时建议 Kyries 在整页 PNG 上标 **6 个互不相同的骰面 panel**（建议命名 `DICE-P-p1-panel-1` … `panel-6`，或沿展开图几何顺时针编号），并填下表：

| 展开图 panel ID（待填） | 目视图案（待填） | 绑定引擎 key（待批） | Kyries 批面序 |
| --- | --- | --- | --- |
| `DICE-P-p1-panel-?` | （Torch 火把？） | | **待批** |
| `DICE-P-p1-panel-?` | （Food …） | | **待批** |
| `DICE-P-p1-panel-?` | （Tool 铲子 …） | | **待批** |
| `DICE-P-p1-panel-?` | （Bandage …） | | **待批** |
| `DICE-P-p1-panel-?` | （Potion …） | | **待批** |
| `DICE-P-p1-panel-?` | （Wild 「DD」…） | | **待批** |

p2 若与 p1 不同网或仅镜像副本，另增行并注明 **p2**；批前不得假设 p2≡p1。

### 3.3 明确 **不是** 面序证据（禁止绑 map）

| 顺序来源 | 顺序 | 为何不能绑 dice_net |
| --- | --- | --- |
| AID-Prov 文本行 | Torch → Food → Tool → Bandage → Potion → Wild | 辅助卡排版顺序；无展开图坐标 |
| 规格书 §5.2 表 | Food → Bandage → Potion → Torch → Tool → Wild | 规则叙述顺序 |
| `PROVISION_FACES` | food → bandage → potion → torch → tool | 引擎 RNG 桶序（`loot.ts`） |
| `nextProvisionFace` 六面数组 | 上表 + 第 6 桶 `wild` | 软件抽样序 |

## 4. Kyries 批面序后（本 PR **不做**）

仅当本文件 §3.2 表「Kyries 批面序」全部为 **已批**（或写入 `docs/rulings.md` 限定裁定）时，才允许：

1. 新增 `provision-dice-print-art-map.json` + `build-print-provision-dice-art-map.mjs`（模式对齐 `player-aid-print-art-map.json`）。
2. `resolve-print-provision-dice-art.ts` + Vitest；桌面 `dice_net` placeholder 换 `pngRel`。
3. 可选：`packages/data/normalized/corebox/provision_die.json` 记录 `source.page` 与 **已批** panel→key（仍不含未核实 bbox 时只存 key 映射）。

在此之前：`player-aid-print-art-map.json` 的 `pendingConfirmation` **保持**。

## 5. 测试（本 PR）

- 文档与 cross-link  only：`pnpm typecheck`
- 回归：`pnpm exec vitest run apps/web/src/card-art/resolve-print-player-aid-art.test.ts`

## 范围外

任务卡 hold、Phase 5/6、#319/#321；改动已有 player aid map 绑定；发明 panel 几何或 heading icon→骰面 raster 的默认等同。
