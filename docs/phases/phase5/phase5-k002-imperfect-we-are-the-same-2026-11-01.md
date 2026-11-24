# K-002 · Imperfect Reflection We Are the Same

日期：2026-11-01；基线 `a54af02b`（It Chooses #488）。

依据：monster_medium FRONT p109（同卡副本 p110–111），R-001 / R-048，规格书 R20–21。卡面 Acc 12、Crit 0、range 2、Most Stressed；confirmed target_effects / stress 图标对应压力 +1。

- 仅为 `monster_medium:p109` slot 2 增加 verified 计划并生成目录，签名 `{target_effects}{stress}+1`。
- 沿用 `resolveMonsterSkill` 的命中及压力结算；不新增自动目标选择、UI 或独立命令。
- 覆盖命中压力 3 → 4、落空保持 3、射程错误、计划数值及签名漂移拒绝、确定性与输入不变。保留 It Chooses 回归；全目录攻击回归 68 → 69 招。
- Perfect Reflection 的同名技能印刷压力 +2，本刀不外推。Reunion、Perfect 同名技能留后续切片；combatReady / 最终战流程 / 生产几何保持 hold。

验证：专项 4 文件 20 测通过；build、改动文件 ESLint / Prettier、diff 检查通过。全量 typecheck 仍为此前记录的 5 处未改动路径错误；全量 lint / test 未重跑，已有失败见 Displace 验收记录。非阶段收尾，不新增 Playwright。
