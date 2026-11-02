# B09：I 级 Curio 停点盘点（2026-10-27）

依据 `docs/full-flow-l1-breakpoints-2026-10-27.md` 断点 **B09**、`docs/rulings.md` **R-001 / R-048 / R-064 / R-069**，对照核心盒 Curio 01–24（`packages/data/normalized/corebox/curio.json`）与引擎 `dungeon-curio.ts` / `dungeon-curio-effects.ts`。

## 1. 盘点结论（I 级主路径）

| 类别                                            | 状态                 | 依据                                                                 | 引擎行为                                                                   |
| ----------------------------------------------- | -------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 24 张效果行（R-064）                            | **可接**             | `docs/rulings.md` R-064；`packages/data/src/normalize/curio.test.ts` | 无 `effect: null` 行；`resolveDungeonCurio` 按行序结算                     |
| Torch 仅抑制负面（R14）                         | **可接**             | 规则书 R14；`isNegativeCurioEffect`                                  | 已测全池 Torch / 无 Torch                                                  |
| 复合行序 + 死亡取消未发奖励（R-069）            | **可接**             | R-069（Q-62/68/71 confirmed）                                        | `effectIndex` 续接；压力 10 → `blockedPressure` → `resolveDungeonPressure` |
| 怪癖替换 / Wild 补给 / 饰品待选                 | **可接**             | R-026、R-012、R-035；既有 `dungeon-curio.test.ts`                    | 公开 `resolveChoice` 续接，**不得**在待选时重复 `resolveDungeonCurio`      |
| 抽牌前 `beforeCurio`（Fear）压力 10             | **可接**             | R-028；`pendingCurioDraw` + `continueDungeonExploration`             | 意志完成后自动续抽；缺意志资料为 **blockedReason**，非假效果               |
| 房间 Curio（R15）                               | **可接**             | `dungeon-curio-room.ts`                                              | 与走廊 Curio 共用行序引擎                                                  |
| 印刷未批效果行 / 缩减牌堆                       | **拒令（停点模板）** | R-048、R-064（生产 24/24 行已核实）                                  | `effect === null` → `blockedReason`；`drawDungeonCurio` 牌池守恒           |
| Curio 饰品待选（生产 I 级池）                   | **可接**             | R-035 + 饰品 38/38 verified（`5fbb752`）                             | 已核实卡可装备/转交；未核实仍仅 `discard-new`（R-048）                     |
| 同卡新负面怪癖何时参与余下行（Q-71 旧文案）     | **已按 R-069 接**    | R-069 通则：新怪癖对**后续行**立即生效                               | 见 `dungeon-curio.test.ts` p6/p14 等；**不**回改当次已付压力事件           |
| Curio 压力 10 与同卡其余奖惩排序（Q-68 旧文案） | **已按 R-069 接**    | R-069 Q-66 类压力链                                                  | 行间压力保存 `effectIndex` 后意志恢复                                      |
| Boss / Phase 5 Curio                            | **不在范围**         | AGENTS.md                                                            | 本 PR 不触及                                                               |

**p001（Scout Ahead）**：探索骰 Curio 面依赖完整 24 张牌池；自然路径 helper 在 `awaitingCurio` / `blockedPressure` 上已走公开命令。  
**p005（Rising Threat I）**：任务分布 **3× curio** 房间 + 走廊 Curio 概率更高；`natural-quest` seeds **1–100** 无 `commandRefused`（见 `b09-curio-natural-paths.test.ts`）。

## 2. 本 PR 有依据改动

1. **`natural-quest` 辅助**：`settle()` 在 `blockedPressure` 时派发 `resolveDungeonPressure`，避免 Curio 复合（行间压力 / 抽牌前 Fear）在自动化路径上卡在「未接线」误解。
2. **`resolveDungeonCurio` 拒令文案**：待选 Wild / 饰品 / 怪癖或 `blockedPressure` 时，明确应使用的**公开命令**（仍 `commandRefused`，不伪造结算）。
3. **回归**：I 级 `quest:p001` / `quest:p005` 多种子自然路径；走廊 Fear + `pendingCurioDraw` 集成测。

## 3. §3 停点（已由 R-048 切片接线，2026-10-27）

详见 [`docs/r048-curio-pending-slice-2026-10-27.md`](r048-curio-pending-slice-2026-10-27.md)。

- **`rows[].effect === null`**：Q-60 停点模板，`blockedReason` 标明 R-048，不结算、不弃牌。
- **未核实饰品**：仅 `discard-new` 完成 Curio；不提供装备 / 转交选项。
- **Curio 抽空（Q-61）**：R-068 拒抽 + 地牢内不洗回；扣 Torch 前拒绝。
- **§4 饰品 verification（2026-10-28）**：见 [`r048-curio-remaining-2026-10-28.md`](r048-curio-remaining-2026-10-28.md)；自然路径优先装备已核实饰品。

仍可能因 **新** 未批准印刷 / 词典项出现 `effect: null` 停点，或 **无 Torch 疾病复合（Q-68）** 整卡停场；需数据或裁定，本引擎不伪造 `effect`。

## 4. 如何测

```bash
pnpm typecheck
cd packages/engine && pnpm exec vitest run dungeon-curio r048-curio-pending b09-curio-natural-paths
```
