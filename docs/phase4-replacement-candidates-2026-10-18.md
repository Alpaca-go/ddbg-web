# Phase 4：四人替补候选库存盘点（R-095 后续）

## 基线

#238 合并为 main `87e9773` 后，Kyries 确认 Q-97 LIMITED 映射（R-095）。本文件在 #237 盘点基础上更新正式可用池。

## 结论（短）

正式网页任务目录、开局入口与引擎候选白名单当前共**八名**已核实身份（`FORMAL_HERO_NAMES`）。开局可从八名中任选四人；某身份开局已用则死后不可再替补。四人同死后，未用过的额外身份仍可替补。Jester / Arbalest / Abomination 仍无 `attributesVerified`，未进可用池。开局门控见 [八英雄开局](phase4-eight-hero-roster-2026-10-18.md)。

## 正式可用池（已核实属性；技能效果另列）

| 身份          | I级属性id              | 网页正式目录／开局 | 引擎白名单 | attributesVerified | I级技能转录7/7 | 技能/村庄运行时                                | 若未开局则死后可替补 |
| ------------- | ---------------------- | ------------------ | ---------- | ------------------ | -------------- | ---------------------------------------------- | -------------------- |
| CRUSADER      | `hero_stat:p001:front` | 是（含II/III属性） | 是         | 是                 | 是             | 是                                             | 是（若开局未用）     |
| HELLION       | `hero_stat:p003:front` | 是                 | 是         | 是                 | 是             | 是                                             | 是                   |
| HIGHWAYMAN    | `hero_stat:p007:front` | 是                 | 是         | 是                 | 是             | 是                                             | 是                   |
| VESTAL        | `hero_stat:p009:front` | 是                 | 是         | 是                 | 是             | 是                                             | 是                   |
| BOUNTY HUNTER | `hero_stat:p005:front` | 是（仅I级技能）    | 是         | 是（R-088）        | 是             | 是（含Scout Ahead）                            | 是                   |
| PLAGUE DOCTOR | `hero_stat:p013:front` | 是（仅I级技能）    | 是         | 是（R-094）        | 是             | 是（含Experimental Vapours）                   | 是                   |
| GRAVE ROBBER  | `hero_stat:p017:front` | 是                 | 是         | 是（R-095）        | 是             | I级七技能已接；Pilfer 抽取已接（R-096、R-098） | 是                   |
| OCCULTIST     | `hero_stat:p019:front` | 是                 | 是         | 是（R-095）        | 是             | I级七技能已接；Dark Ritual I–III 已接（R-097） | 是                   |

目录规模：正式`virtual:quest-battle-data` = 24属性面 / 112技能；`…-v2`六英雄 = 18/98；`…-v1`五英雄 = 15/91；战斗沙盒 = 4/84。

全灭：四人同死后可准备身份 = `{BOUNTY HUNTER, PLAGUE DOCTOR, GRAVE ROBBER, OCCULTIST}`，共4；`joinPreparedReplacements` 可成功入队。

## 未进入可用池

| 身份        | 缺口摘要                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------- |
| JESTER      | 无 attributesVerified；Dirk Stab 图标仍 unverified；同 hash `8cbe7d6703` **不在** R-095 范围 |
| ARBALEST    | 无 attributesVerified；Rallying Flare 图标缺口                                               |
| ABOMINATION | 无 attributesVerified；变身双面未按替补流程验收                                              |

## 边界

仍保持 Phase 4。Q-79/Q-80、正式 Boss、人工试玩保留。自然全灭正式存档路径已接（驿站 III 余额 4 → 四名额外 prepare/join → createQuestSave 往返）；Pilfer 抽取边已由 R-098 锁定（抽取不翻面 / 空堆拒绝 / 出征保留 claimed），不以转录通过冒充效果完成。
