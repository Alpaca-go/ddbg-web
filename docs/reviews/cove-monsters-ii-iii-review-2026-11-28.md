# Cove 剩余普通怪物（II／III 级）资料目录审阅

**日期**：2026-11-28  
**分支**：`cursor/cove-monsters-ii-iii-f5cd`（堆叠于 #827 `cursor/cove-monsters-catalog-3134`）  
**印刷来源**：`DD_EN_COVE_CARDS_70_120_monsters_medium_FRONT.pdf`、`DD_EN_COVE_CARDS_140x140_monster_large_FRONT.pdf`（附件威权；包内无对应 BACK PDF，raw 仍登记 BACK 路径占位）

## 本刀录入清单

| Canonical ID               | 名称          | 印刷等级 | 类别     | PDF 页（FRONT） | 份数 | 备注                                                                |
| -------------------------- | ------------- | -------: | -------- | --------------: | ---: | ------------------------------------------------------------------- |
| `monster_medium:cove:p018` | Uca Major     |       II | 中型     |         p18–p19 |    2 | `card_kind=large_monster_reference`（大型参考卡，印在 medium 套内） |
| `monster_large:cove:p001`  | Uca Major     |       II | 大型战斗 |              p1 |    1 | 与 p002 为两张独立实体各 1 印张                                     |
| `monster_large:cove:p002`  | Uca Major     |       II | 大型战斗 |              p2 |    1 | 同上                                                                |
| `monster_medium:cove:p020` | Squiffy Ghast |      III | 中型战斗 |         p20–p22 |    3 | Unholy - Back                                                       |

**输出文件**（与 I 级 `monster_medium.json` / `monster_large.json` 隔离）：

- `packages/data/normalized/extension/cove/monster_medium_higher.json`
- `packages/data/normalized/extension/cove/monster_large_higher.json`

构建入口：`buildCoveHigherMonsters` / `COVE_HIGHER_MONSTER_IDENTITIES`。

## 与 #827 I 级目录的关系

- I 级中型仍为 6 实体 / 17 印张（`COVE_LEVEL_ONE_MONSTER_IDENTITIES`）；I 级大型仍为 0。
- `sourcesForContentPacks` 与内容包测试仍只挂载 I 级 `monster_medium.json` / `monster_large.json`。
- II／III 不进 I 级遇遇池、不接入出征或当地牌堆。

## 待确认项

- **Uca Major 归属（Q-186 延展）**：印刷为 II 级 Eldritch - Beast - Front - Large 普通大型；部分任务文案提及「Uca Major / Deep Horrors」— 是否含 Boss 相关语义待 Kyries 裁定。本刀按**非 Boss 普通怪**录入资料层，**不**写入 Boss 刀或 I 级池。
- 图标 hash、抗性、技能效果语义仍按 **Q-186** 停点；全部 `verification.unverified`。

## 仍排除（Boss／召唤物，等 Kyries Boss 刀）

| ID                                       | 名称                            | 原因摘要                  |
| ---------------------------------------- | ------------------------------- | ------------------------- |
| `monster_medium:cove:p023`/`p025`/`p027` | Shambler Tentacle               | Shambler 召唤物 I–III     |
| `monster_medium:cove:p029`–`p031`        | Drowned Anchorman               | Drowned Crew 召唤物 I–III |
| `monster_large:cove:p003`–`p011`         | Shambler / Siren / Drowned Crew | 各 Boss I–III 大型战斗卡  |

登记于 `packages/data/src/cove/monsters/excluded-monsters.ts`（15 条；自 #827 的 19 条移除本刀录入的 4 条实体）。

## 明确未做

- 战斗运行时、怪物牌堆、出征／战役接哇。
- 新图标 hash 或词典变更。
- Playwright 冒烟变更。
- Boss（Shambler / Siren / Drowned Crew）及召唤物录入。

## 验证

- `pnpm typecheck`、`pnpm lint`
- `packages/data/tests/cove/monsters/monsters.build.test.ts`
- `packages/engine/tests/shared/core/content-packs.test.ts`（I 级隔离：medium=6、large=0；排除表 15 条）
