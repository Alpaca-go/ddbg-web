# K-002 · Imperfect Reflection It Chooses

日期：2026-11-01；基线 `9acba42b`（Reconstitute #487）。

依据：monster_medium FRONT p109（同卡副本 p110–111），R-001 / R-048，规格书 R20–21。卡面 Acc 11、Crit 0、range 1、Closest；confirmed target_effects / mark / stun 图标对应标记 2t、眩晕 1t。

- 仅为 `monster_medium:p109` slot 1 增加 verified 计划并生成目录。签名 `{target_effects}{mark}2t,{stun}1t`。
- 复用 `resolveMonsterSkill` 的命中及状态原语输出；本切片验收为最小纯结算，没有新增自动选招或 UI。
- 回归覆盖命中、落空、射程拒绝、持续时间漂移拒绝、输入不可变与确定性；全目录已验证攻击回归 67 → 68 招。
- We Are the Same、Perfect Reflection 攻击留后续切片。最终战 combatReady、形态切换、召唤先攻与生产几何保持原有 hold。

验证：规范化 8 测、引擎 9 测通过；build、改动文件 ESLint / Prettier、diff 检查通过。全量 typecheck 仍有前两刀记录的 5 处未改动路径错误；全量 lint / test 未重跑，已知失败见 Displace 验收记录。本切片不涉及阶段收尾，不新增 Playwright。
