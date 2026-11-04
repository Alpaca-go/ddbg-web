# 最终战形态正式目录待核对

**R-187 待 Kyries 确认**（本 PR）。最终战生产部署见 **R-186**（[#595](https://github.com/Alpaca-go/ddbg-web/pull/595)）。Acc / 召唤 / Impending Doom 等最小运行时见既有 `ancestor*` / `gestating-heart-*` / `heart-of-darkness-*` 验收；本刀只接正式网页战斗目录与 `preFinalBattleBossCatalogTaskSources` 迁移。

数据来源：`darkest_boss_content.finalBattle` 形态 id 与 card id；印刷 COREBOX `DD_EN_COREBOX_CARDS_70_120_monsters_medium_FRONT.pdf` p105–p111、`monsters_large_FRONT.pdf` p18–p20；已入库 raw footer OCR 与 R-139（Heart footer）。

## Speed（核心 R24 · 靴印计数）

| 卡 id                 | 名称                 | 印刷页          | Speed | 备注                      |
| --------------------- | -------------------- | --------------- | ----- | ------------------------- |
| `monster_medium:p105` | Ancestor 1           | medium p105     | **3** | 三枚 confirmed speed 图标 |
| `monster_medium:p106` | Perfect Reflection   | medium p106–108 | **2** | 两枚靴印                  |
| `monster_medium:p109` | Imperfect Reflection | medium p109–111 | **1** | 一枚靴印                  |
| `monster_large:p018`  | Ancestor 2           | large p18       | **3** | 三枚靴印（既有 verified） |
| `monster_large:p019`  | Gestating Heart      | large p19       | **0** | 卡面无 speed 图标         |
| `monster_large:p020`  | Heart of Darkness    | large p20       | **0** | 卡面无 speed 图标         |

## 四姿态 d10 选招表（R-015 footer）

| 卡 id                 | d10 分段         | 技能 slot | 备注                                         |
| --------------------- | ---------------- | --------- | -------------------------------------------- |
| `monster_medium:p105` | 1–3 / 4–10       | 1 / 2     | slot 3 Time Heals All 仅 `boss_ability:p034` |
| `monster_medium:p106` | 1–5 / 6–10       | 1 / 2     | Reunion / We Are the Same                    |
| `monster_medium:p109` | 1–5 / 6–10       | 1 / 2     | It Chooses / We Are the Same                 |
| `monster_large:p018`  | 1–2 / 3–6 / 7–10 | 1 / 2 / 3 | 与 Fanatic III 同型 footer                   |
| `monster_large:p019`  | —                | 固定 1    | 仅 Dispersion；Ichor / 召唤走 boss_ability   |
| `monster_large:p020`  | 1–4 / 5–7 / 8–10 | 1 / 2 / 3 | 与 R-139 Impending Doom 一致                 |

## 目录与迁移

`DARKEST_BOSS_CATALOG_CARD_IDS` 现包含上述六张卡（含 Ancestor 1 部署时的 Reflections 支援卡 p106 / p109）。`deployFinalBattleForm`（R-186）不变。

加入前的固定目录 `preFinalBattleBossCatalogTaskSources`（叠在 `preMammothCystTaskSources` 上）只用于旧档完整重放，验证成功后才升级正式 `bossMonsters` 目录。
