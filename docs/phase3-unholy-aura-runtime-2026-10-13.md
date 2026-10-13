# Phase 3：Torture Chamber 禁疗运行时

依据 R-067 的本面逐项批准，H 的 Unholy Aura 已接入。英雄在 H 时不能发动治疗技能或接受治疗；补给治疗拒绝且不消耗补给。伤害技能的附带自疗、Warrior of Light、Vigorous 自动治疗被阻止，其他伤害、被动和回合流程继续。检查使用当前位置，离开 H 后恢复通常治疗。

本面几何、部署和标记保持逐项获批内容；全部治疗入口验证后 `usable=true`、`runtimeReady=true`。不同板块的同 hash 星形不复用本面规则。普通遗迹现有 4/9 面可以参战，其余已获批数据仍待运行时。

验证：主动单目标／多目标治疗原子拒绝；补给不消耗；Judgement 伤害继续且不自疗；Warrior of Light 禁疗与同行 Buff；Vigorous 自动治疗被阻止仍完成回合开始；完整九房与 42 怪物池自然抽取并进入本面；目录篡改、来源错配仍拒绝。完成全仓 typecheck、lint、单元／场景测试、build 和现有阶段冒烟。
