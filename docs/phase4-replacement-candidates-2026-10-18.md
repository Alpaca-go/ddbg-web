# Phase 4：四人替补候选库存盘点（R-095 后续）

## 基线

#238 合并为 main `87e9773` 后，Kyries 确认 Q-97 LIMITED 映射（R-095）。本文件在 #237 盘点基础上更新正式可用池。

## 结论（短）

正式网页任务目录与引擎候选白名单当前共**八名**已接线身份：开局四人 + 赏金猎人 + 瘟疫医生 + 盗墓者 + 神秘学者。开局四人战死后，可用额外候选为**四名**，相对驿站 III 余额 4 已齐。Jester / Arbalest / Abomination 仍无 `attributesVerified`，未进可用池。

## 正式可用池（已接线）

| 身份          | I级属性id              | 网页正式目录       | 引擎白名单 | attributesVerified | I级技能转录7/7 | 技能/村庄运行时                    | 开局四人死后是否可替补 |
| ------------- | ---------------------- | ------------------ | ---------- | ------------------ | -------------- | ---------------------------------- | ---------------------- |
| CRUSADER      | `hero_stat:p001:front` | 是（含II/III属性） | 是         | 是                 | 是             | 是                                 | 否（本战役已死）       |
| HELLION       | `hero_stat:p003:front` | 是                 | 是         | 是                 | 是             | 是                                 | 否                     |
| HIGHWAYMAN    | `hero_stat:p007:front` | 是                 | 是         | 是                 | 是             | 是                                 | 否                     |
| VESTAL        | `hero_stat:p009:front` | 是                 | 是         | 是                 | 是             | 是                                 | 否                     |
| BOUNTY HUNTER | `hero_stat:p005:front` | 是（仅I级技能）    | 是         | 是（R-088）        | 是             | 是（含Scout Ahead）                | **是（额外#1）**       |
| PLAGUE DOCTOR | `hero_stat:p013:front` | 是（仅I级技能）    | 是         | 是（R-094）        | 是             | 是（含Experimental Vapours）       | **是（额外#2）**       |
| GRAVE ROBBER  | `hero_stat:p017:front` | 是（仅I级技能）    | 是         | 是（R-095）        | 是             | **未接**（技能效果 / Pilfer）      | **是（额外#3）**       |
| OCCULTIST     | `hero_stat:p019:front` | 是（仅I级技能）    | 是         | 是（R-095）        | 是             | **未接**（技能效果 / Dark Ritual） | **是（额外#4）**       |

目录规模：正式`virtual:quest-battle-data` = 24属性面 / 112技能；`…-v2`六英雄 = 18/98；`…-v1`五英雄 = 15/91；战斗沙盒 = 4/84。

全灭：四人同死后可准备身份 = `{BOUNTY HUNTER, PLAGUE DOCTOR, GRAVE ROBBER, OCCULTIST}`，共4；`joinPreparedReplacements` 可成功入队。

## 未进入可用池

| 身份        | 缺口摘要                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------- |
| JESTER      | 无 attributesVerified；Dirk Stab 图标仍 unverified；同 hash `8cbe7d6703` **不在** R-095 范围 |
| ARBALEST    | 无 attributesVerified；Rallying Flare 图标缺口                                               |
| ABOMINATION | 无 attributesVerified；变身双面未按替补流程验收                                              |

## 边界

仍保持 Phase 4。Q-79/Q-80、正式 Boss、人工试玩保留。下一主题优先 GR/Occ I 级技能与 Pilfer / Dark Ritual 接线，不以转录通过冒充效果完成。
