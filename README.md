# ddbg-web

《暗黑地牢桌游》（Darkest Dungeon: The Board Game，简称 DDBG）网页客户端的私有仓库。先做核心盒（遗迹 Ruins 与最暗地牢），用单设备、1–4 人轮流操作（hot-seat）走通战役，再按地点扩展。

仓库保持私有，是因为卡图和版图的美术版权属于原游戏与桌游发行方。TTS 创意工坊资源和印刷文件中的图像不放进仓库；印刷 PDF 只用来提取卡牌文字和数字。规划见 [docs/plan.md](docs/plan.md)（大纲 v0.2，2026-10-06 由 Kyries 确认），给编码代理的约定见 [AGENTS.md](AGENTS.md)，规则歧义见 [docs/rulings.md](docs/rulings.md)。核心规则说明书 v0.2 在 [docs/spec/](docs/spec/README.md)。图标图例在 [docs/data-legend.md](docs/data-legend.md)（词典 v1.8 已入库，见 R-048 / Q-47）。

## 开发

Node.js `24.21.0`（`.nvmrc`）和 pnpm `12.9.1`（根目录 `packageManager`）。

```bash
pnpm install
pnpm dev        # 启动 apps/web
pnpm typecheck
pnpm lint       # ESLint 与 Prettier
pnpm format
pnpm test       # 引擎单元测试
pnpm test:e2e   # Playwright 冒烟
pnpm build
```

`pnpm dev` 打开普通遭遇战沙盒；`/?phase=3` 打开地牢探索沙盒，`/?phase=3&play=1` 打开三张基础任务的正式入口。

2026-10-15进度：Phase 3三张基础任务自然命令路径已贯通，普通遗迹9/9可战、核心盒9/28，仅QuestMap p1获批；人工试玩验收仍待Kyries确认。Phase 4存读档、回村结算、完整16张村庄事件池及首日看守人已合并（#170–#173）。三栋I级恢复建筑、Intimidate/Zealous Speech与逐日准备已合并；恢复建筑升级与II/III级服务已合并（#174）；修道院正面怪癖及第四怪癖存档续接已合并（#175）；Vestal I的Pray/Chant已合并（#176）；Survivalist服务/升级与下次任务奖励骰记录已合并（#177）；Medical Breakthrough疾病选择与三天准备已合并（#178）；Caregivers Convention逐英雄免费移除怪癖与两天准备已合并（#179）；Town Fair全体减压/治疗与一天准备已合并（#180）；村庄减压的Resilient修正已合并（#181）；驿站等待英雄代币与升级已合并（#182）；Labor Force免费升级/整周禁访/永久弃牌与铁匠/游商10金升级已合并（#183）；墓地首次免费获得美德已合并（#184），重复来访仍保留Q-79待确认；Hellion I的Sharpen Spear已合并（#185）；游商I陈列/4金购买已合并（#186）；游商I出售洗回/继续购买已合并（#187）；铁匠I–III服务已合并（#188）；Guild技能永久升级已合并（#189），R-080铁匠归还卡随永久升级更新；R-081四英雄II/III防御数据前置已合并（#190）；高等级防御运行时已合并（#191）；Guild英雄等级升级与技能/饰品槽已合并（#192）；下一任务出征循环、临时技能应用/归还与奖励补给骰已合并（#193）；自然两任务4XP→Guild升II验收已合并（#194）；高等级英雄出征与地牢战斗交接已合并（#195）；Guild Training / Unsettling Darkness / Traveling Merchants已合并（#196）；In Good Spirits已合并（#197）；沙盒I→II牌堆预览与Reduce to Rubble II出征已合并（#198）；Clear the Path II及两张II级任务退出摘要已合并（#199）；当前按R-082接Bone Spearman II限定获批字段与完整53张池入场，其余II级仍停点；正式升幕仍待Boss胜利/新威胁流程，预览不进入正式存档，见[当前开发记录](docs/phase4-ii-monster-review-2026-10-15.md)。出征要求技能槽=2+HL（I–III）。事件已实现11/16，其他5张事件保留真实抽牌停点（含未审图标或天数`?`）；剩余事件与驿站死亡补人（需扩展英雄池）继续后续，尚不是完整连续战役，未进入Phase 5。

接手开发先读 [Codex 总交接](docs/HANDOFF-FROM-CODEX-2026-10-09.md) 顶部的当前入口与最近提交补记；跨代理背景见 [交给 Codex 的说明](docs/HANDOFF-TO-CODEX-2026-10-09.md)。历史段落中的分支 / 合并状态不覆盖当前入口。

本轮补记：#203已审查合并（main `b2352a5`），Rattler完整入场已合入。当前接Ghoul Rend/Skull Toss复合效果，Howl仍阻塞整卡入场；II级仍四种可战、事件11/16，下一主题为Howl零伤害多目标与光照/压力/疾病收尾，见[当前开发记录](docs/phase4-ghoul-attacks-2026-10-15.md)。

最新补记：#200/#201已合并（main `46ff57a`）；跨等级饰品弃装与旧池回收已接。#202按R-083接四种II级怪物获批基础字段及Captain/Gargoyle完整入场（含常驻Protection），Rattler/Ghoul额外运行时仍停点，见[当前开发记录](docs/phase4-remaining-ii-review-2026-10-15.md)。正式升幕及高等级存档仍未开放。

24张Curio已按R-069完成印刷行序结算及待选续接；早期[Q-60交付](docs/phase3-q60-curio-icons-2026-10-12.md)中的未完成数量是历史基线。当前验收边界见[Phase 3复核](docs/phase3-acceptance-gap-2026-10-13.md)。
