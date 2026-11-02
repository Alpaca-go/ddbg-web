# R-048：Curio 剩余停点盘点与接线（2026-10-28）

依据 `docs/b09-curio-verified-breakpoints-2026-10-27.md`、`docs/r048-curio-pending-slice-2026-10-27.md`、`docs/trinket-verification-2026-10-28.md`（main `5fbb752`）、`docs/rulings.md` **R-001 / R-048 / R-064 / R-068 / R-069**。本 PR 只接有证据处；缺批标「待确认」，不发明图标或规则。

## 1. 数据层（R-064 + 词典 v1.8）

| 项                             | 状态                 | 依据                                               | 备注                                                            |
| ------------------------------ | -------------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| Curio 01–24 效果行             | **已核实**           | R-064；`packages/data/src/normalize/curio.test.ts` | 生产 `curio.json` 无 `effect: null` 行                          |
| 词典退回 / 转录损坏            | **停点模板（已接）** | R-048 / Q-60                                       | `resolveCurioRows` → `blockedReason` 含 `R-048 / Q-60 停点模板` |
| 缩减牌堆 / 牌池不守恒          | **拒令（已接）**     | R-048                                              | `drawDungeonCurio`                                              |
| Curio 卡面 `verification` 字段 | **不适用**           | schema `ddbg-curio-v1`                             | 未核实语义在行级 `effect`/`reason`，非整卡 flag                 |

## 2. 引擎 §3 停点（#318，2026-10-27）

见 [`r048-curio-pending-slice-2026-10-27.md`](r048-curio-pending-slice-2026-10-27.md)。三项均已接线：`effect === null` 停点、未核实饰品仅 `discard-new`、Q-61 抽空不洗回。

## 3. 本 PR 新接：饰品 verification 与 Curio 奖励（有证据）

| 项                                             | 状态             | 依据                                                | 行为                                                         |
| ---------------------------------------------- | ---------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| I 级饰品 38/38 `verification.unverified=false` | **已接（数据）** | 词典 Q-47 批 + `trinket-verification-2026-10-28.md` | 生产池抽到的 Curio 饰品待选显示正常装备/转交文案             |
| 未核实饰品（夹具 / 未来 drift）                | **仍停点**       | R-048                                               | `trinketOptions` 仅 `discard-new`；`awaitTrinket` R-048 文案 |
| 自然路径 `naturalQuest` 饰品待选               | **本 PR**        | 同上                                                | 优先 `equip:*`（有空位且已核实），不再一律 `discard-new`     |

**不**把「38 张 verified」推广为饰品主动能力运行时（规格书 §11 能力阶段仍缺）。

## 4. 仍待确认 / 故意停点（本 PR 不实现）

| 项                                           | 状态         | 依据                                     | 引擎 / UI                                                                           |
| -------------------------------------------- | ------------ | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| 无 Torch：同卡疾病 + 压力/状态复合（如 p21） | **待确认**   | Q-68 旧文案；R-069 未覆盖无 Torch 疾病链 | `blockedReason` 含「疾病」；整卡不结算                                              |
| 缺完整怪癖/疾病/美德堆                       | **停点**     | R-048                                    | 预检 `block()`                                                                      |
| 缺英雄抗性 / 免疫目录                        | **停点**     | R21、R-048                               | Buff/Debuff/Blight 等行                                                             |
| 怪癖堆耗尽 / 饰品等级不一致                  | **停点**     | R-026、R-035                             | 明确 `blockedReason`                                                                |
| 补给池满 16                                  | **停点**     | R-012                                    | 保留已完成行                                                                        |
| Boss / 扩展 Curio                            | **不在范围** | Phase 5 / AGENTS.md                      | —                                                                                   |
| 卡面美术 icon 语义（非效果行）               | **待确认**   | R-048；印刷 map 仅 raster                | UI 行列表对已核实效果用 `curioEffectLabel`；`effect=null` 仍显示 `待确认（reason）` |

## 5. I 级主路径（Torch 后）

- **24/24** 可完成获得选择（引擎 `dungeon-curio.test.ts`「R-064 全池逐卡」）；饰品待选在 production 数据下优先 **装备** 而非弃新卡。
- **无 Torch 全池**：R-069 测试覆盖按行序负面优先；p21 等疾病依赖仍停点。
- **B09 自然路径**（`b09-curio-natural-paths.test.ts`）：与地图走死、hold 无关的 `commandRefused` 仍可能因其它 B 断点出现；Curio R-048 拒令不在本表「已接」项内则标待确认。

## 6. 如何测

```bash
pnpm typecheck
cd packages/data && pnpm exec vitest run src/normalize/curio.test.ts
cd packages/engine && pnpm exec vitest run dungeon-curio r048-curio-pending
```
