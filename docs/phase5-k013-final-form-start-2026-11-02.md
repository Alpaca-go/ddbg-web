# K-013 · 最终战部署与开始衔接

依据 R36 / R-035、既有 final-battle-initiative 运行时；本轮明确授权完成半开项。UI 的“部署并开始当前形态”使用 deployFinalBattleForm 的可选 startBattle:true 参数，部署成功后调用同一 startBattle 入口。共享种子 / RNG 游标，每形态重新洗先攻；不沿用上一形态 encounter，不休息、不回村、不恢复英雄状态。

省略参数的旧命令行为不变，存档 schema 只增加可选 true，不接受 false 或状态注入。任一步拒绝均返回原状态，避免停在半完成部署。与显式两命令结果相同，确定性、旧命令兼容及形态间重洗共9测通过。不改变生产几何、combatReady 或最终战奖励。
