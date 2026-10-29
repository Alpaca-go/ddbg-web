# C-019：Necromancer II · Army of the Dead

基于 #375 的战斗与 R-124 实际威胁匹配。C-019 总项保持未完成，本刀不开放 II 正式迫近池。

## 规则与行为

依据官方核心规则书 R11、R16–17（规格书 §2.3、§6.1）、R-001 / R-048；核对 `boss_ability:p005` 背面已确认文案：地牢首次战斗将 Bone Captain 作为第一个怪物生成。

- 按既有算法洗真实 Common + Ruins I/II 53 张牌堆，将唯一 Captain 实例 `monster-deck:p012`（`monster_large:p001`）先交给普通生成器，再沿原牌序填满四姿态。不创建额外卡，不改变其它卡的相对顺序，不增加 RNG。
- Captain 占进攻起的两姿态、棋子落点沿已批准房间部署。实例守恒、普通 Large / Small 生成和挤占规则沿用 R17；缺唯一 Captain 实例则明确拒绝，不复活永久移除的卡。
- 部署不消费首战；完整 `startDungeonBattle` 成功后才写本趟 `necromancerIIArmyUsed`。入场拒绝可按原部署重试；后续战斗按原牌序，下一任务重新启用首战，I 级及无此威胁不变。
- 标记为可选纯状态字段，沿现有 JSON 快照 / 命令重放保存，不增加命令或改变存档 schema。不能将抽象夹具说成自然 I→II 战役验收。

## 验证与停点

新场景覆盖四个种子的首位 / 四姿态 / 53 张实例守恒、RNG 与输入不变；入场失败 / 重试 / 重复命令；JSON 序列化后同命令结果；首战已用后的普通部署；Captain 缺失原子拒绝。既有出征场景增加新任务清除首战标记断言。最终闸门结果见 PR。

Haunted Graveyard 的最低并列、墓地封锁 / 已占用冲突记为 Q-114，仍待 Kyries 裁定；该钩子保留 `stub`。当前 II 显式场景可测，正常升幕抽到 p002 仍停点。R-121、其它 II/III Boss、II/III 幕末 offer、最暗线和 Phase 6 均未推进。
