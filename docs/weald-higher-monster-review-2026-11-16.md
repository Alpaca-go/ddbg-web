# Weald II／III 级普通怪物审阅稿

状态：**Kyries 已修改并核准全部未修改字段，登记 R-263**。Virago III 采用 Dodge 4、Speed 3；本稿其它字段按确认后版本采用，不从 I 级推算数值。独立目录和组池已接，正式任务／存档入口随后推进。

## 来源与实体范围

依据 W-02（官方 Weald W3，同等级当地＋通用怪物），R-001、R-048。印刷文件位于 `MG_DD_06_EN_WEALD/`：`DD_EN_WEALD_CARDS_70_120_monsters_medium_FRONT.pdf` p15–19、`DD_EN_WEALD_CARDS_140x140_monster_large_FRONT.pdf` p3。已查看私有缓存 medium FRONT p15、p17、p18，large FRONT p3，以及 medium BACK p18、large BACK p3（红门背面）；核准后另从原 PDF 渲染并查看 medium FRONT p16、p19，与 p15、p18 的战斗字段一致，仅副本标识不同。

| 等级 | 怪物           | medium 实体页 | copies | 战斗字段来源 | 当前资格                                      |
| ---- | -------------- | ------------- | ------ | ------------ | --------------------------------------------- |
| II   | Crone          | p15、p16      | 2      | medium p15   | R-253 已核准，现仅用于 Circle of Witches 例外 |
| II   | Unclean Giant  | p17           | 1      | large p3     | medium 是大型参考卡，large 不额外增加实体     |
| III  | Hateful Virago | p18、p19      | 2      | medium p18   | R-263 已核准                                  |

以上为核准当地实体，不是最终混合池数量；通用同等级怪物须按现有来源规则另行加入。现有文件没有五种 I 级普通怪物的 II／III 升级卡，不复制或倍率生成。

## Crone II：复用已核准字段

见 [原审阅稿](weald-crone-review-2026-11-13.md)及 R-244／R-247／R-253。Human / Back，Life 12、Dodge 3、Speed 3；腐蚀／减益抗性，无免疫。原三技能与姿态表不重送审。下一批将其加入 II 级地点随机来源时，仍须保留 I 级任务例外与 14 实体池边界，验证副本守恒与日志版本。

## 已核准属性与选招

下列按 Kyries 修改后版本核准；Virago 的 Dodge 4、Speed 3 以本次明确更正为准。parsed 未命名头部字段不直接进入运行。

| 怪物               | 类型／部署                    | Life | Dodge | Speed | 抗性             | 免疫 |
| ------------------ | ----------------------------- | ---- | ----- | ----- | ---------------- | ---- |
| Unclean Giant II   | Human / Beast / Front / Large | 60   | 1     | 1     | 眩晕、腐蚀、位移 | 无   |
| Hateful Virago III | Human / Back                  | 39   | 4     | 3     | 腐蚀、减益       | 眩晕 |

- Giant：A／D／R／S 共用 1–2 → 技能 1，3–6 → 技能 2，7–10 → 技能 3。右侧灰栏按 R-232／R-015 的双格延伸语义处理，不造另一套选招。
- Virago：A／D／R／S 共用 1–5 → 技能 1，6–10 → 技能 2。
- **解析差异**：Giant 的 parsed `resistances_icons` 为 `86bf0146dc`、`e4c65ea683`、`6d6ead4551`。卡图实际可见黄色三菱、绿色液滴、蓝色双箭头；不能只按 icon ID 的其他卡映射命名。核准后应独立记录本卡视觉对应与效果签名，保留 raw，不全局改图例。

## 已核准技能

Crit／Acc 两栏读法沿用 R-230；以下具体数字、目标数及效果均经本批核准。效果应用于命中目标，Self 与其他触发按现有规则，不从游戏电子版补规则。

| 怪物／技能                   | 目标     | 射程／最多目标 | Crit／伤害 | Acc／伤害 | 核准效果                    |
| ---------------------------- | -------- | -------------- | ---------- | --------- | --------------------------- |
| Giant 1 Treebranch Smackdown | Closest  | 1／1           | 1／24      | 9／16     | 目标 Push 1                 |
| Giant 2 Confusion Spores     | Crowded  | 2／4           | 1／4       | 9／2      | 目标减益 2t                 |
| Giant 3 Poison Spores        | Furthest | 2／1           | 0／4       | 9／2      | 目标腐蚀 2／3t              |
| Virago 1 Ruinous Hex         | Crowded  | 1／2           | 0／9       | 10／6     | 目标 Mark 2t、减益 2t       |
| Virago 2 Putrefying Breath   | Closest  | 2／1           | 1／14      | 10／9     | 目标腐蚀 3／3t、目标 Push 1 |

Giant 技能 2 的最多目标数按卡图四个人头转录，不能按 parsed 的四个图标 token 之外另加数量；Virago 技能 2 的蓝箭头在目标效果行，不是 Self Push。

## Q-186 本批结案与下一刀

- R-263 核准 Giant／Virago 上述属性、防御、姿态和五项技能；medium p17 → large p3，参考卡不重复计数。原始抗性聚类保持不改，运行直接采用本表核准语义。
- medium FRONT p16／p19 已从原 PDF 补查，副本战斗字段一致。私有缓存未入库。
- 新增 `higher_monsters.json` 和 Zod 校验、独立战斗目录及同等级当地＋通用组池：II 为 2 Crone＋1 Giant，III 为 2 Virago；不重复算大型板。
- Crone 原任务例外与 I 级随机池保持原状；正式高等级地点创建、任务入口和存档版本随后随高等级任务接入，本批不宣称高等级任务可玩。
- 下一刀按计划核实高等级任务，再补高等级 Boss 与 Stygian 房间替换。三个 I 级 Boss 自然养成／人工实机继续后置，完整战役未结案。
