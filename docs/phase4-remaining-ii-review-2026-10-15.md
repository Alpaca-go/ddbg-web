# Phase 4：其余四种II级怪物核对表（待Kyries批准）

#201已合并，main为`46ff57a`。本主题继续II级怪物入场前置；以下全部是候选数据，**没有写入生产映射、规范化牌池或网页可用目录**。R-082只批准Bone Spearman，不覆盖本表。

## 来源与核对范围

规则术语来自核心官方规则书R24完整页面图像（怪物卡解剖图、Speed、目标与执行动作）、规格书§6.9–6.10及R-015。印刷件仅供卡面文字、数字、图标位置，不补规则；不使用FAQ、旧版本或旧仓代码。

本机当前版印刷源：Downloads的`DARKEST DUNGEON EN_FILES-20260929T061941Z-1-001/DARKEST DUNGEON EN_FILES/DARKEST_DUNGEON_PRINT_EN_WAVE 1/MG_DD_01_EN_COREBOX_Print/02_DD_CARDS_COREBOX/`。

- M表示`DD_EN_COREBOX_CARDS_70_120_monsters_medium_FRONT.pdf`的一基页码：完整目视M12、M49、M50–52、M53–55。
- L表示`DD_EN_COREBOX_CARDS_140x140_monster_large_FRONT.pdf`的一基页码：完整目视L1、L3。
- Gargoyle三个颜色副本的生命、闪避、靴印、完整技能与骰表相同；Rattler三个副本同样一致。
- M12/M49是大型怪抽牌参考，指向L1/L3战斗卡，不是额外实体；参考卡自身没有独立Speed/技能值。完整II级目录含11张实体：Captain1、Spearman3、Ghoul1、Gargoyle3、Rattler3。

## Q-86：请求批准的限定表

以下A/D/R/S依次为进攻/防御/远程/支援。`1(1–6)`表示d10为1–6时用技能1；“固定”不掷选招骰。Speed数值按头部蓝框靴印枚数，**不是左侧Dodge数字**。

| 战斗卡及来源                                       | Life / Dodge | Speed候选 | 姿态选招候选                                       | 头部常驻Protection候选 |
| -------------------------------------------------- | ------------ | --------- | -------------------------------------------------- | ---------------------- |
| Bone Captain II，`monster_large:p001`，L1；抽牌M12 | 33 / 1       | 1         | A/D：1(1–6)、2(7–10)；R/S：固定2                   | 无                     |
| Gargoyle II，`monster_medium:p050`，M50–52         | 7 / 2        | 3         | A/D/R：1(1–6)、2(7–10)；S：固定2                   | 有                     |
| Rattler II，`monster_medium:p053`，M53–55          | 22 / 2       | 3         | A/D/R：2(1–5)、1(6–10)；S：1(1–5)、3(6–10)         | 无                     |
| Ghoul II，`monster_large:p003`，L3；抽牌M49        | 26 / 1       | 2         | A/D/R：1(1–4)、2(5–7)、3(8–10)；S：2(1–5)、3(6–10) | 有                     |

请求批准范围：这四个具体战斗卡id/等级/页组的Speed、完整姿态选招表及头部常驻Protection有无；Life/Dodge等其余字段沿已有具名转录再预检，不把本次批准扩大为其他等级或整卡所有效果已可执行。大型怪按占用姿态集合沿R-015选招，不读取参考卡上的灰色姿态当骰表。

Protection沿已有confirmed图标语义和R24解剖图标注，不修改词典、不为图标null填数字；无图标的两卡不按同种族/等级推断有Protection。

## 完整技能与运行时预检清单

卡面伤害以下按“Crit伤害 / 普通命中伤害”表示；Crit与Acc另列。未批准的Speed/选招不会因本清单而放行。

| 卡 / 技能                   | 目标；射程；人数      | Crit / Acc；伤害 | 卡面效果行                      |
| --------------------------- | --------------------- | ---------------- | ------------------------------- |
| Captain 1 Crushing Blow     | Closest；1；1         | 2 / 9；17 / 11   | 目标Push1                       |
| Captain 2 Ground Pound      | Crowded；0；4         | 1 / 9；7 / 5     | 目标Stun2t                      |
| Gargoyle 1 Flurry of Claws  | Crowded；0；2         | 1 / 9；6 / 4     | 目标Debuff2t                    |
| Gargoyle 2 Lash of the Tail | Closest；1；1         | 1 / 9；4 / 3     | 目标Stun2t，Push1               |
| Rattler 1 Warning Rattle    | Self；无攻击射程/人数 | 无Crit/Acc/伤害  | 自身Buff2t，Guard1t，Riposte1t  |
| Rattler 2 Snakebite         | Furthest；1；1        | 1 / 10；8 / 5    | 目标2 Bleed3t                   |
| Rattler 3 Slither Forward   | Closest；2；1         | 0 / 8；4 / 2     | 自身Pull2                       |
| Ghoul 1 Rend                | Closest；0；1         | 2 / 9；12 / 7    | 目标3 Bleed2t，Debuff2t，压力+1 |
| Ghoul 2 Skull Toss          | Furthest；1；1        | 1 / 9；12 / 7    | 目标Stun2t，压力+1              |
| Ghoul 3 Howl                | Crowded；1；4         | 0 / 10；1 / 0    | 目标光照−1，压力+2，Disease     |

附：Captain抗Shuffle，免疫Stun/Bleed；Gargoyle抗性栏空、免疫Bleed；Rattler抗Blight/Shuffle、免疫栏空；Ghoul抗Shuffle/Debuff、免疫Stun。均为既有具名图标，仍须在真实入场时逐项检查。

## 批准后的实现顺序与边界

1. 独立记录书面批准和具体id映射；扩展已有Bloodletter的大型战斗卡Speed/姿态映射及高等级入场校验，参考卡仍只作抽牌身份。完整53张池不筛掉未支持卡、不重抽。
2. 优先Captain/Gargoyle：核对完整状态/位移，接常驻Protection持久投影及真实混合部署；不能只补Speed就开放Gargoyle而漏掉其减伤。
3. Rattler：另接无Acc的纯自身状态技能，保持选招骰与行动结算各自必要的RNG；不能伪造伤害、目标或射程来绕过现有攻击门。
4. Ghoul：另接完整复合行、零伤害命中、多目标共享骰、光照/压力/疾病与死亡取消顺序；不把“有伤害图标”当完整效果已支持。

这些是后续实现要求，不是本主题已交付功能。本主题仅核对文档，保留所有现有停点。II级仍仅两任务/一种已获批怪物；事件11/16、Q-79/Q-80 pending；正式Boss升幕、高等级正式存档、驿站死亡补人未接，未进入Phase5，人工试玩未代签。

原始PDF只读；渲染只留本机`tmp-verify`，不提交卡图、美术、原始资料或证据JSON。无代码改动，不新增测试墙或Playwright条数。
