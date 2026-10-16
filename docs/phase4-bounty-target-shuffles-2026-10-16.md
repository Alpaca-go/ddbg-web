# Phase 4：Come Hither I / Uppercut I 完整状态与目标位移

## 基线与进度复核

Kyries 本轮要求“合并，检查当前开发进度，然后推进下一步开发任务”。已审查并合并 [#214](https://github.com/Alpaca-go/ddbg-web/pull/214)，head `0e431b4`、main `1d738c0`，再从主线建立 `codex/phase4-bounty-target-shuffles`。本地 8080 配置和既有未跟踪资料保留，不提交。

#214 合并前在 Node 24.21.0 / pnpm 12.9.1 下重新通过 typecheck、ESLint、排除既有本地资料的 Prettier、143 文件 / 1215 项 Vitest、build 和三条战斗 Playwright 冒烟。GitHub Actions 的失败注释明确为账户付款 / 支出额度导致作业未启动，不是测试失败。默认浏览器缺失、5173 被其他项目占用；最终冒烟通过本机已有 Chromium 及独立 5186 端口执行，没有修改项目配置。

当前仍在 Phase 4：村庄事件 16/16，村庄服务、任务循环与 I 级正式存读档已接；II 级两任务 / 五种怪物可在预览中运行。Phase 3 普通遗迹 9/9 可战，核心盒 Room Tile 9/28，仅 QuestMap p1 获批。正式 Boss 升幕 / 高等级战役存档、死亡补人、Q-79 / Q-80 和人工试玩仍未完成，不进入 Phase 5。

## 来源与实现

对照当前版印刷 `02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_44x68_SKILLS_FRONT.pdf` p49 / p52 完整卡面，并查看官方规则书 R20 / R21 完整页面图像。对应规格书 §6.5、§6.9、§7，沿用 R-001、R-020、R-025、R-030、R-033、R-048；不使用 FAQ，不新增裁定，不改全局词典。图片只在忽略缓存中。

| 卡                              | 已核实完整效果                               | 本轮接线                   |
| ------------------------------- | -------------------------------------------- | -------------------------- |
| `hero_skill:p049` Come Hither I | 射程 2；Crit0→4 / Acc9→2；目标 Mark2t、Pull2 | 同行状态注解及完整目标位移 |
| `hero_skill:p052` Uppercut I    | 射程 0；Crit0→5 / Acc9→3；目标 Stun1t、Push2 | 同行状态注解及完整目标位移 |

生成层只为两张 I 级卡添加状态注解，检查英雄、卡名、正背等级、页码、份数、完整效果行及已确认图标。II/III、原始未命名数字、raw/parsed、词典保持原状；重生成实际只改变这两张规范化卡。

状态解析器在校验完整 Nt 与同行剩余文本后返回目标 Shuffle，技能结算沿用已有命中 / 抗性与位移命令链。未知剩余内容、重复目标位移拒绝整次，不只应用半行。命中时先完成伤害和状态，再经 `resolveShuffles` 及已有 `PendingChoice` 处理区域和姿态；落空不施加状态或位移。存档协议及正式英雄入口不变。

新增机制场景覆盖两张卡全部十个骰面、公开命令命中 / 落空、区域和姿态同时移动、Uppercut 眩晕代币消耗、分岔选择冻结 / 过期拒绝、目标 Shuffle 抗性、同行漂移 / 缺防御原子拒绝、JSON 往返及同种子回放。分岔完成不重复伤害、状态或 RNG。数据测试覆盖黄金状态 / 时长、来源漂移、幂等和不向高等级扩散。

## 验收与后续

最终验证：Node 24.21.0 / pnpm 12.9.1；typecheck、ESLint、排除既有本地未跟踪资料的仓库 Prettier、144 文件 / 1226 项 Vitest（296.86 秒）、build、`git diff --check` 全部通过。根 `pnpm lint` 的原样扫描仍会碰到既有本地资料，因此以上明确记录实际执行的 lint 两部分，没有格式化或提交这些资料。本次无 UI 变更、非阶段末尾，不新增 Playwright 条数；#214 的三条冒烟已在合并前重跑。

赏金猎人现已接通四张 I 级技能：Mark for Death、Caltrops、Come Hither、Uppercut。下一主题为 Collect Bounty 的 Humans / Mark 双条件、Finish Him 的 Stun 条件，或 Flashbang 的 Stun 与 Push/Pull 选择续接。三张完成前仍不开放完整英雄入口；Scout Ahead、战役死亡名单、饰品让渡、驿站继承 XP / 免费升级及实际死亡替换继续另开主题，不能将机制夹具称作完整战役补人验收。
