# 核心疾病接入记录

本轮在同一守卫战斗主题 / PR #115 推进，不另开任务。完整疾病运行时尚未交付，Maggot 疾病技能仍整次拒绝。

## 已完成的来源与目录

已查看本地完整 `DD_EN_COREBOX_RULES.pdf` R26–28 和 `DD_EN_COREBOX_CARDS_44x68_Disease_FRONT.pdf` 全部 11 页。图片只留私有忽略缓存。`packages/data/src/disease.ts` 的触发 / 效果全部来自官方 R27–28 的具名明文条目，不按卡面未命名图标推理，不修改全局词典。

管线生成 `normalized/corebox/disease.json`：11 张唯一实体牌，保留原始规范化行、图标与未验证原因，另附官方规则来源 / 页码。核对身份、页码、卡名、正反面文件、份数、触发与效果；缺牌、重复卡、错误参数或错误规则页码拒绝。

| 印刷页 | 疾病           | 官方触发            | 追加效果                             |
| ------ | -------------- | ------------------- | ------------------------------------ |
| 1      | Black Plague   | 施加 Blight 时      | Blight 1 / 2t；2 Wounds × Hero Level |
| 2      | Bulimic        | 消耗 Food 时        | 弃另一 Food（若有）；Stress +1       |
| 3      | Ennui          | Resolve Tested      | Virtue Chance −1                     |
| 4      | Hemophilia     | 施加 Bleed 时       | Bleed 1 / 2t；2 Wounds × Hero Level  |
| 5      | Lethargy       | 使用 Move action 时 | 1 Wound × Hero Level                 |
| 6      | Syphilis       | 受到 Damage 时      | 1 Wound × Hero Level                 |
| 7      | Vertigo        | Push / Pull 时      | Stress +2                            |
| 8      | The Worries    | 受到 Stress 时      | Stress +1；2 Wounds（不乘等级）      |
| 9      | Creeping Cough | 探索结算 Rubble 时  | Bleed 1 / 4t                         |
| 10     | Tapeworm       | 探索结算 Hunger 时  | Bleed 1 / 4t                         |
| 11     | Spotted Fever  | 受到 Damage 时      | Blight 1 / 2t                        |

Black Plague / Bulimic 在 R27，其余在 R28。数据目录不等于已经在游戏命令里执行效果，也不把未知图标的旧 key 当成规则语义。

## 后续完整运行时所需范围

官方 R27：每英雄最多一个疾病，再感染替换旧病并获得一张负面怪癖。负面怪癖不能只保存名字而不执行效果；R26 限制最多三怪癖，第四张负面可能替换正面或导致永久死亡。现有规范化怪癖目录含 18 张负面实体牌，需要同疾病一起接完整被动触发。

同一次攻击的追加伤口与死门须遵守 R-026 / R29；Damage 与 Wound 分开，疾病伤口不能再次触发 takes Damage。持续条件防御遵守 R21 / R-033，使用本轮获批的四英雄限定读取。移动、Shuffle、食物、压力、光照、意志检定与探索结算都须由实际命令发出触发，不从净伤口 / 压力差猜事件。

牌堆和英雄所持疾病 / 怪癖必须沿用共享种子 RNG、保留有限实体牌守恒，并随战斗回传地牢；疾病 / 怪癖运行时完整接入前，不开放 Maggot 或疾病 Curio，也不假定中途重新洗牌。整套怪物战斗与 Phase 3 仍未完成。
