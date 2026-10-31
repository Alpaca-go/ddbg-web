# 最暗 Boss 与最终战内容目录、胜利边界和形态计划

基线 main `e7a80c7`（#405 已合入）。Kyries 最新指示：按建议的依赖与收益顺序推进，不必严格按 A 类编号；核心数据优先。

本刀依据官方 R35–36/R39–41、规格书 §14.5/§14.7、R-035/R-120/R-122。已目视 R39/R40/R41 完整页图；任务 SPECIAL 与行动数对照当前 raw QUEST p16–18、Boss Abilities p26/p28/p30–37，战斗卡身份沿已入库的核心盒中/大型怪物目录。不修改未审 Speed、骰表、技能效果或几何。

| 任务 | 初始 Boss / 战斗卡                                | 房间      | 初始怪物先攻 | 取消最终形态    |
| ---- | ------------------------------------------------- | --------- | ------------ | --------------- |
| p016 | Shuffling Horror · Large p17                      | room:p023 | 2            | Ancestor 2      |
| p017 | Templar Impaler · Large p15 + Warlord · Large p14 | room:p022 | 各2，共4     | Ancestor 1      |
| p018 | Mammoth Cyst · Large p16                          | room:p024 | 2            | Gestating Heart |

目录还记录 Cultist Priest/Malignant Growth、White Cell Stalk 与 Reflections 的卡牌引用、各主体能力卡及起始姿态。White Cell Stalk 是召唤物，不计入 p018 初始先攻；Ancestor 1 的行动数保留 Special，不伪造常数。

最终战计划保持 Ancestor 1 → Ancestor 2 → Gestating Heart → Heart of Darkness 的固定顺序，只移除任务取消的一形态，最后形态永远保留；同用 Ancestor Room，计划含最后村庄4天、不抽事件、无探索、仍掷补给。它是计划数据，不代替尚未接通的最终村庄/形态战斗执行器。

新增 `darkest_boss_content.json`、Zod schema、raw→normalized 构建/写入和公开数据接口。来源文件、任务/Boss/房间/形态、能力卡、先攻/行动数与召唤物引用均校验；不顺带再生旧卡。最暗目标房改用统一目录，移除重复映射。

引擎增加最暗目标胜利谓词，普通守卫战不算；Templars 两只都须存在且均已死亡，同卡仍有活体也不算。已有战斗收尾读取该谓词，但最暗完整部署/回收仍需后续接通。只有最暗胜利、XP已发、回村完成且任务身份一致时，才提供最终战准备计划。

验证：5文件19条目录、形态、目标边界、A-3建局/自然存档及摘要测试，另3文件51条既有战斗/威胁/旧档回归通过，共70条；typecheck、build、本次文件 ESLint/Prettier 通过。全仓既有失败沿 #400 保留，本刀不声明全仓全绿。

限制：全部 `combatReady: false`。未注册未完成的最暗 Boss 脚本，不以数据引用解锁战斗。召唤/传送/Pit Toss/Impending Doom、Reflections 先攻不移除、完整先攻与形态切换、最终村庄执行和战斗几何/部署均待后续。**已接**：Ancestor 1 Reflections Guard 常驻（见 `phase5-final-ancestor1-reflections-guard-2026-10-31.md`）；Imperfect Reflection 死亡 → Ancestor 10 伤口（见 `phase5-final-ancestor1-reflections-2026-10-31.md`）。原始印刷美术及核对页面不提交。
