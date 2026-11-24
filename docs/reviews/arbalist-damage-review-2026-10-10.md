# Bone Arbalist I 条件伤害复核（2026-10-10）

## 来源与范围

只使用官方核心规则书 R20「Target Effects」、R21「Mark / Riposte / Protection」、规格书 §6.5–6.6 / §7 与 R-001、R-017、R-019、R-048。

已只读查看当前印刷文件 `C:\Users\kyrie\Desktop\新建文件夹\DARKEST DUNGEON EN_FILES\DARKEST_DUNGEON_PRINT_EN_WAVE 1\MG_DD_01_EN_COREBOX_Print\02_DD_CARDS_COREBOX\DD_EN_COREBOX_CARDS_70_120_monsters_medium_FRONT.pdf` 的完整第 7、8、9 页，以及官方规则书完整 R20 页。三份颜色副本的技能效果一致；未使用 Old_Version、FAQ 或旧仓库。渲染图仅在忽略目录 `node_modules/.cache/stance-review/`，原始资料未修改。

## 核对结果

| 项目     | 印刷 / 既有命名                                      | 本次接入                                  |
| -------- | ---------------------------------------------------- | ----------------------------------------- |
| 卡牌     | `monster_medium:p007`，Bone Arbalist，I 级，p007–009 | 仅此 id / 等级 / 页码                     |
| 技能     | 1 Quarrel，Marked → Furthest，射程 2，目标英雄一名   | 使用既有目标 / 射程数据                   |
| 基础数值 | Crit 1 / 伤害 8；Acc 9 / 伤害 5                      | 不修改                                    |
| 目标效果 | 目标效果箭头 + 伤害图标内 `+1` + `vs` + Mark         | 标记敌方目标命中或暴击时，额外伤害 1 一次 |
| 图标     | `target_effects`、`damage`、`mark` 均已 confirmed    | 不修改词典、不新增语义                    |

提取器没有把效果图标内的 `+1` 收进 `unlabeled_numbers`，原列表只有暴击伤害 8、命中伤害 5、射程 2。本次保留原列表，附加逐技能 `verified_damage_bonus`，不向缺失或 null 数值补默认值。II / III 级及其他怪物不推断。

管线严格核对卡名、等级、完整页码、唯一技能号、技能名、整行签名及图标命名状态；不符时拒绝生成。引擎复用既有条件伤害原语，再核对注解与原效果行。标记多堆只改变既有命中阈值，额外伤害仍只加 1；落空不加。Protection / Riposte 继续按 R-019 / R-017 使用加成后的伤害。

## 验证与限制

- 覆盖无标记 / 一堆 / 多堆、命中 / 暴击 / 落空、防护 / 反击；无注解仍跳过，伪造注解或效果漂移拒绝。
- 公共命令场景覆盖按 Mark 选远处英雄、固定选招、Speed 定位、一次攻击 RNG、一次回合结束、重复调用拒绝、确定性回放，以及错误注解在定位前原子拒绝。几何仅为算法夹具，不宣称真实房间部署。
- 本块不扩大 UI 怪物池，不增加浏览器冒烟条数。Phase 3 尚未授权；Q-52 与未核实卡 / duration 继续保留。
