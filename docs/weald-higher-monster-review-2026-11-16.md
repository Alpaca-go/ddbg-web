# Weald II／III 级普通怪物审阅稿

状态：**Q-186 待 Kyries 核准**。本批只整理卡面；不开放高等级随机池，不从 I 级推算数值。

## 来源与实体范围

依据 W-02（官方 Weald W3，同等级当地＋通用怪物），R-001、R-048。印刷文件位于 `MG_DD_06_EN_WEALD/`：`DD_EN_WEALD_CARDS_70_120_monsters_medium_FRONT.pdf` p15–19、`DD_EN_WEALD_CARDS_140_140_monsters_large_FRONT.pdf` p3。已查看私有缓存 medium FRONT p15、p17、p18，large FRONT p3，以及 medium BACK p18、large BACK p3（红门背面）；本批未重新逐页检查 medium p16、p19 的副本图，以 raw 的去重记录列出，副本一致性仍待核实。

| 等级 | 怪物           | medium 实体页 | copies | 战斗字段来源 | 当前资格                                      |
| ---- | -------------- | ------------- | ------ | ------------ | --------------------------------------------- |
| II   | Crone          | p15、p16      | 2      | medium p15   | R-253 已核准，现仅用于 Circle of Witches 例外 |
| II   | Unclean Giant  | p17           | 1      | large p3     | medium 是大型参考卡，large 不额外增加实体     |
| III  | Hateful Virago | p18、p19      | 2      | medium p18   | 待核准                                        |

以上为当地实体候选，不是最终混合池数量；通用同等级怪物须按现有来源规则另行加入。现有文件没有五种 I 级普通怪物的 II／III 升级卡，不复制或倍率生成。

## Crone II：复用已核准字段

见 [原审阅稿](weald-crone-review-2026-11-13.md)及 R-244／R-247／R-253。Human / Back，Life 12、Dodge 3、Speed 3；腐蚀／减益抗性，无免疫。原三技能与姿态表不重送审。下一批将其加入 II 级地点随机来源时，仍须保留 I 级任务例外与 14 实体池边界，验证副本守恒与日志版本。

## 待核准属性与选招

下列为卡图观察／语义候选，尚未登记新裁定。Life 读心形、Dodge 读右侧蓝格脚印、Speed 读头部数字；不采用 parsed 的未命名头部字段直接入运行。

| 怪物               | 类型／部署                    | Life | Dodge | Speed | 抗性候选         | 免疫候选 |
| ------------------ | ----------------------------- | ---- | ----- | ----- | ---------------- | -------- |
| Unclean Giant II   | Human / Beast / Front / Large | 60   | 1     | 1     | 眩晕、腐蚀、位移 | 无       |
| Hateful Virago III | Human / Back                  | 39   | 3     | 4     | 腐蚀、减益       | 眩晕     |

- Giant：A／D／R／S 共用 1–2 → 技能 1，3–6 → 技能 2，7–10 → 技能 3。右侧灰栏仍按 R-232／R-015 的双格延伸语义候选处理，不造另一套选招。
- Virago：A／D／R／S 共用 1–5 → 技能 1，6–10 → 技能 2。
- **解析差异**：Giant 的 parsed `resistances_icons` 为 `86bf0146dc`、`e4c65ea683`、`6d6ead4551`。卡图实际可见黄色三菱、绿色液滴、蓝色双箭头；不能只按 icon ID 的其他卡映射命名。核准后应独立记录本卡视觉对应与效果签名，保留 raw，不全局改图例。

## 待核准技能

Crit／Acc 两栏读法沿用 R-230；以下每个具体数字、目标数及效果仍待本批核准。效果以命中目标为候选，Self 与其他触发按现有规则，不从游戏电子版补规则。

| 怪物／技能                   | 目标     | 射程／最多目标 | Crit／伤害 | Acc／伤害 | 效果候选                    |
| ---------------------------- | -------- | -------------- | ---------- | --------- | --------------------------- |
| Giant 1 Treebranch Smackdown | Closest  | 1／1           | 1／24      | 9／16     | 目标 Push 1                 |
| Giant 2 Confusion Spores     | Crowded  | 2／4           | 1／4       | 9／2      | 目标减益 2t                 |
| Giant 3 Poison Spores        | Furthest | 2／1           | 0／4       | 9／2      | 目标腐蚀 2／3t              |
| Virago 1 Ruinous Hex         | Crowded  | 1／2           | 0／9       | 10／6     | 目标 Mark 2t、减益 2t       |
| Virago 2 Putrefying Breath   | Closest  | 2／1           | 1／14      | 10／9     | 目标腐蚀 3／3t、目标 Push 1 |

Giant 技能 2 的最多目标数按卡图四个人头转录，不能按 parsed 的四个图标 token 之外另加数量；Virago 技能 2 的蓝箭头在目标效果行，不是 Self Push。

## Q-186 本批确认项与下一刀

1. 核准 Giant／Virago 上述属性、防御、姿态和五项技能候选；大型参考卡与实际实体对应分别为 medium p17 → large p3。
2. 补查 Crone p16／Virago p19 副本图，确认与首份战斗字段一致；不以本稿的去重记录冒充逐页图像验证。
3. 获准后建立高等级独立核准目录与随机池适配；测试 II／III 等级过滤、实体副本守恒、I 级任务例外隔离和旧日志兼容。随后按计划核实高等级任务、Boss，再接 Stygian 房间替换。

本批不更改 normalized、引擎或 UI。I 级三个 Boss 的自然养成／实机验收继续后置，完整战役未结案。图片及 PDF 仅留私有忽略缓存。
