# K-015 · 最暗目标击败边界

依据 R36、R-122 与本轮半开项授权。修复 darkest-finish-battle 中“绑定任意 Boss 脚本即可视为击败”的旁路：只采用 darkestBossVictoryAfterEncounter 对 p016–18 所需身份的全部死亡检查。目标战声明胜利却缺失 Boss / Boss 存活时原子拒绝，不清目标、不记录胜利；普通最暗遭遇不因脚本上下文记录 Boss 胜利。

沿用既有 bossQuestVictory → 离开任务 / 摘要 / 回村定额3 XP 连接，不额外发最终战 XP。13 测通过，含三任务每项缺失 / 存活边界及既有胜利退场回归。
