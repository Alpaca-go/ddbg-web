# C-017：Fanatic I 本体技能 AI

基线：`a324688`（#366 已合入并在本机 `git pull --ff-only`）。只接核心 Ruins I 级 Fanatic 本体三招，不改任务卡、几何、II/III、Phase 6 或扩展。

## 核对

来源：规格书 §6.5–6.10（R19–24）、§14.5（R39），`docs/rulings.md` R-015 / R-024 / R-048。已对照官方 R39 页面与本地当前版印刷图像：`monster_large:p008`、`p011`、`boss_ability:p022`；raw / normalized 的图标已命名 confirmed。

Fanatic I：Speed 为两枚脚印，四姿态共用 d10 表：1–2 → 1；3–6 → 2；7–10 → 3。大型怪取所占两格的前姿态（R-015）。

| slot | 技能                   | 射程 / 目标               | Crit / Acc；暴击 / 普通伤害 | 效果                          |
| ---- | ---------------------- | ------------------------- | --------------------------- | ----------------------------- |
| 1    | Righteous Condemnation | 2 / Crowded，最多 4 英雄  | 0 / 10；2 / 1               | Self Buff 3t；目标压力 +2     |
| 2    | Strike the Heretic     | 1 / Most Stressed，1 英雄 | 1 / 10；6 / 3               | 目标 Stun 1t、Push 2、压力 +1 |
| 3    | Fury of the Righteous  | 1 / Crowded，最多 4 英雄  | 0 / 10；7 / 5               | 目标压力 +1                   |

三招均无召唤图标；R39 / p022 仅规定开战放置 Pyre。故 `summon(purpose:skill)` 返回明确 `notApplicable`，不发明技能召唤或 Pyre 重生规则。其它脚本原有 stub 语义不变。

## 接线与验收

- 用现有 `stanceGroups` 与 `verified_monster_effects`，通过既有选招、目标、Speed 移动、共享技能骰、自身 / 目标效果和状态续接结算；不增加 Boss 专用攻击分支。
- normalized 只更新 p008；构建映射同步更新，单测核对生成结果与提交数据。未知整行或原语漂移仍拒绝。
- Sentence 有效时仍优先替代技能；Pyre 不在场或其区域满员时走卡面技能。
- `fanatic-i-skill-ai.test.ts` 覆盖四姿态十骰面、三招公开命令流程、Crowded 多目标、Most Stressed 平手 / Guard、满 Pyre、落空仍有一次自身 Buff、不可重选、原语漂移拒绝与确定性回放。

验证：相关 9 个测试文件共 119 条通过（新增 9 条）；typecheck、build、改动代码 ESLint / Prettier 与 `git diff --check` 通过。

## 保留 hold

Pyre 自身的 Burn the Heretic（无 Acc、99 伤害）、R39 的 Fanatic 死后移除 Pyre 尚未接；本刀不宣称整场 Boss 或正式出征 / 存档闭环。原 Pit Toss、先攻 4 和 Sentence 逻辑不重做。

全量 test / lint 在 `2d4f1ea` 的基线失败沿用 #366 的复核记录；本刀只清除已触及 Fanatic 文件内的两个未使用变量，不夹带其它 Boss 或自然流程修复。当前排除本地 `.cache` 后全仓 ESLint 仍有 8 个原有错误，均在未改动文件中。
