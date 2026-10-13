# Phase 3：同次暴击压力合并

依据 R-069 / Q-67，承受暴击的基础压力1与本次实际伤害触发的 Off Guard1、Weak Grip1先合并成一次压力事件，再应用低光照、Nervous、The Worries及追加伤口。没有实际伤害时不触发这两项受伤怪癖；普通命中保留独立 Off Guard 事件。

英雄／怪物技能共用已核实技能解析，探索 Trap 同样合并。后续 damageTaken／criticalDamage 被动仅略过已经结算的压力，Clumsy、Shocker、Spotted Fever 的状态效果照常；并未删除这些被动或把多个无关压力原因全局合并。R-069 / Q-66追加伤口与死门先于存活者意志收尾。

验证：真实怪物暴击与普通命中、低光0/2和明亮5、Off Guard＋Weak Grip＋Soft＋The Worries、Nervous、探索陷阱、压力10真实意志、同种子回放与原状态不变。全量单元／场景、typecheck、lint、build及Phase3浏览器冒烟均列入本步骤检查。Trap房间分配行序、Curio逐行、自身Shuffle完整顺序及其余五面特殊运行时继续分块。
