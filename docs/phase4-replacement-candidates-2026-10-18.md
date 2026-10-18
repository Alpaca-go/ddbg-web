# Phase 4：四人替补候选库存盘点

## 基线与来源

Kyries要求“合并，然后继续”。#236精确head `ff240fc`与上轮1392测试及本机闸门通过版本一致，无审查留言，按本轮授权合并为main `e0b8f6b`，本地ff-only同步。GitHub检查注释仍明确账户付款/额度限制、作业未启动，不冒称远端通过。

本轮主题仅核对四人替补所缺候选数据与正式目录接线边界。依据官方R9/R25/R29/R31/R33、规格书§4.6/§9.4、R-001/R-008/R-039/R-048/R-088/R-094；不使用FAQ。不发明未批准属性、图标或技能效果；不裁定Q-79/Q-80；不进入Phase5。

## 结论（短）

正式网页任务目录与引擎候选白名单当前共**六名**已接通身份：开局四人 + 赏金猎人 + 瘟疫医生。开局四人在队或战死后，可用额外候选仍只有**两名**。驿站III余额够4人时，全灭交接仍只能准备两名已核实替补，不能伪造第三、第四名进入可用池。缺口诚实保留为Kyries审批清单，不以转录通过或raw页存在冒充`attributesVerified`。

## 正式可用池（已接线）

筛选条件（`replacementHeroCandidates` + 网页`battle-data-plugin`）：身份在白名单、I级、`attributesVerified`、目录内七张I级技能`verification.unverified=false`、且非在队/已暂存/本战役死亡。

| 身份          | I级属性id              | 网页正式目录       | 引擎白名单 | attributesVerified | I级技能转录7/7 | 技能/村庄运行时              | 开局四人死后是否可替补 |
| ------------- | ---------------------- | ------------------ | ---------- | ------------------ | -------------- | ---------------------------- | ---------------------- |
| CRUSADER      | `hero_stat:p001:front` | 是（含II/III属性） | 是         | 是（R-081批）      | 是             | 是                           | 否（本战役已死）       |
| HELLION       | `hero_stat:p003:front` | 是                 | 是         | 是                 | 是             | 是                           | 否                     |
| HIGHWAYMAN    | `hero_stat:p007:front` | 是                 | 是         | 是                 | 是             | 是                           | 否                     |
| VESTAL        | `hero_stat:p009:front` | 是                 | 是         | 是                 | 是             | 是                           | 否                     |
| BOUNTY HUNTER | `hero_stat:p005:front` | 是（仅I级技能）    | 是         | 是（R-088）        | 是             | 是（含Scout Ahead）          | **是（额外#1）**       |
| PLAGUE DOCTOR | `hero_stat:p013:front` | 是（仅I级技能）    | 是         | 是（R-094）        | 是             | 是（含Experimental Vapours） | **是（额外#2）**       |

目录规模：正式`virtual:quest-battle-data` = 18属性面 / 98技能；旧五英雄`…-v1` = 15/91；战斗沙盒 = 4/84。开局仍只选原四人；赏金猎人与瘟疫医生只经由驿站替补进入。

全灭缺口：四人同死后可准备身份 = `{BOUNTY HUNTER, PLAGUE DOCTOR}`，共2；相对驿站III余额4还缺**2**名已核实不同身份。目录不足时停在准备拒绝，**不**记`noWaitingHeroes`/`insufficientWaitingHeroes`冒充代币耗尽（R31/R-039既有边界）。

## 未进入可用池（Kyries审批清单）

以下五名核心盒身份仅存在于印刷raw，**没有**规范化`attributesVerified`面，故不得命名进候选白名单或网页目录（R-048）。Musketeer按R-008首版不纳入，不列入本表。

印刷属性来源目录（本机只读，不提交）：  
`…/02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_100x180_Hero_STAT_{FRONT,BACK}.pdf`  
raw：`packages/data/extract/corebox/raw/hero_stat.json`  
规范化现状：`packages/data/normalized/corebox/hero_stat.json`仅含上表六名共18面。

| 身份         | raw属性页                                    | 规范化属性 | I级技能转录                                                               | 已知R-048技能图标缺口              | 技能/村庄运行时 | 进入可用池前仍缺                                                                                   |
| ------------ | -------------------------------------------- | ---------- | ------------------------------------------------------------------------- | ---------------------------------- | --------------- | -------------------------------------------------------------------------------------------------- |
| JESTER       | `hero_stat:p011`/`p012`（FRONT/BACK p11–12） | 无         | 6/7（`hero_skill:p106` Dirk Stab 仍`unverified`，icon `a2e7252e06`）      | Dirk Stab                          | 未接            | Kyries三面属性+防御批准 → 补Dirk Stab图标 → 七技能与Every Rose Has Its Thorn接线 → 再扩目录/白名单 |
| ARBALEST     | `hero_stat:p015`/`p016`                      | 无         | 6/7（`hero_skill:p166` Rallying Flare 仍`unverified`，icon `d93aef1e33`） | Rallying Flare                     | 未接            | 同上路径；村庄Field Dressing                                                                       |
| GRAVE ROBBER | `hero_stat:p017`/`p018`                      | 无         | 7/7转录通过                                                               | （转录无缺口；≠效果已接通）        | 未接            | **优先候选之一**：仍缺属性/防御Kyries批准，再逐卡技能与Pilfer村庄接线，最后扩目录                  |
| OCCULTIST    | `hero_stat:p019`/`p020`                      | 无         | 7/7转录通过                                                               | （同上）                           | 未接            | **优先候选之一**：仍缺属性/防御批准，再技能与Dark Ritual接线，最后扩目录                           |
| ABOMINATION  | `hero_stat:p021`–`p023`（含变身双面）        | 无         | 人/兽形态共6张I级转录通过；变身另计                                       | 变身双面与形态切换未按替补流程验收 | 未接            | 属性+变身规则逐项批准后再议；不宜当作“差两名就先塞进池”的填料                                      |

说明：技能`verification.unverified=false`只表示图标转录状态，不等于战斗/村庄效果已接通，更不等于可进替补池。未批准前不在生产白名单写这五个英文名以外的“即将可用”开关。

## 本轮实现与验收

- 无新英雄属性、图标、技能文本或存档/命令名变更；不扩白名单。
- 新增`replacement-candidates`专项：锁正式目录六名/两名额外、排除未核实五名；自然死亡下两名额外各自`prepare→join→createQuestSave/loadQuestSave`。
- 扩展#236全灭交接场景：按`hero_stat:p005:front`/`p013:front`公开准备两名；`joinPreparedReplacements`与第三次准备均拒绝；目录不足不记战役失败；准备命令序列JSON续接一致。沿用明示死亡边界夹具，不冒称自然四杀正式存档。

本机Node24.21.0/pnpm12.9.1：`pnpm typecheck`、相关ESLint/Prettier通过；完整Vitest 169文件/1394项通过。

## 边界

仍保持Phase4。相对驿站III余额4仍缺2名已核实不同身份。Q-79/Q-80、正式Boss、人工试玩、自然全灭四人替补入队正式存档均未完成。下一主题须等Kyries对至少两名未入库英雄完成属性/防御批准（建议优先Grave Robber / Occultist，因其I级技能转录已齐），再按赏金猎人/瘟疫医生先例逐技能与村庄接线后扩目录；批准前不扩白名单。
