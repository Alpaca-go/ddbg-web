# 核心战役 1–5 自动推进记录（2026-11-02）

基线：`main` / `bac6d4f5`（#530）。本轮按 Kyries“自动推进1–5、自动分配PR”执行。只使用既有规则与批准数据；不以任务授权替代未知数值或印刷几何的审核（R-001 / R-048）。

## 交付与依赖

PR 依次以前一分支为 base；没有合并到 main。

| PR                                                     | 主题                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| [#531](https://github.com/Alpaca-go/ddbg-web/pull/531) | 清理 ESLint，排除本地私有缓存扫描                                      |
| [#532](https://github.com/Alpaca-go/ddbg-web/pull/532) | 补给待选窗口与怪物重选目标射程续接                                     |
| [#533](https://github.com/Alpaca-go/ddbg-web/pull/533) | 最暗三招友方技能进入公开回合命令，自身位移后再治疗                     |
| [#534](https://github.com/Alpaca-go/ddbg-web/pull/534) | 正式战斗技能目录、Boss 展示、最终战准备文案与浏览器回归                |
| [#535](https://github.com/Alpaca-go/ddbg-web/pull/535) | 已批准高等级卡面与自然任务/存档回归基线                                |
| [#536](https://github.com/Alpaca-go/ddbg-web/pull/536) | 最终战待选不再被已完成回村记录截获                                     |
| [#537](https://github.com/Alpaca-go/ddbg-web/pull/537) | 既有源码与文档的机械格式清理                                           |
| [#538](https://github.com/Alpaca-go/ddbg-web/pull/538) | 保留2400次准入检查，按五任务分组并共享不可变起点；附最终验证与剩余停点 |

## 1–5 当前边界

| 阶段               | 结果                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 1 质量基线         | 清理规则漂移后的旧断言、不可回放的注入夹具、格式错误和长测试重复构造；最终全量验证见下节                           |
| 2 最暗普通怪运行时 | p069 slot2、p086 slot1/2 接通友方选目标、射程移动、治疗/Buff、自身Push及JSON选择续接；生产随机遭遇仍受未审字段阻塞 |
| 3 最暗中途Boss     | 保留已有技能/召唤结算；缺获批Speed、姿态表、尖刺坑/Teleport落点与生产几何时不推断完整AI                            |
| 4 标准战役贯通     | 修复最终战选择分发断点；正式战斗、回村、读档和最终准备/部署有回归；尚无从开局自然打完11任务的完整战役回放          |
| 5 正式页面         | 修复沙盒目录导致正式战斗空手牌的问题，展示正式Boss名称/技能；清理过时最终战提示，两个关键浏览器冒烟通过            |

## 验证

- `pnpm lint`、`pnpm typecheck`、`pnpm build` 在 Node 24.21.0 下均通过。
- Playwright：正式战斗（技能、移动、死亡补员、回村和读档）及最终准备至部署开战，两条冒烟通过。最终准备测试明确使用机制夹具，不代表自然战役完成。
- 最终全量：`pnpm test --maxWorkers=2 --testTimeout=30000` 全绿，379/379 测试文件、2937/2937 测试通过（Node 24.21.0）。
- 长准入测试保留原5任务×4房型×120种子=2400次检查、拒招断言与总准入大于500的断言；没有增加种子默认值或跳过场景。
- 最终复核使用 Node 24.21.0、pnpm 12.9.1；Node 从官方发行地址取得并核对 SHA-256，仅位于本地私有缓存，不修改系统默认版本。

## 剩余阻塞与后续代码

最暗普通池9种怪物仍均有 `missingBattleFields: [speed, stanceGroups]`：p063 Ascended Brawler、p066 Ascended Witch、p069 Rapturous Cultist、p072 Cultist Priest、p075 Malignant Growth、p078 Flesh Hound、p080 Polyp、p083 Antibody、p086 Defensive Growth。效果计划齐全不代表这些字段已批准。

中途Boss及White Cell/Reflection还缺部分获批战斗字段；Ruins Boss房间、最暗房间与Ancestor Room的正式几何、Pit Toss/Teleport落点仍是R-048停点。不能用逻辑夹具、占位areaId或默认Speed将这些遭遇标记为生产可战。

上述输入确认后，仍须完成正式准入、生产部署/移动/完整AI接线及全战役自然路径验证；本轮不宣称1–5全部完成或核心盒v1.0可交付。R-121三Boss槽实际布置已在`setupDarkestDungeon`中实现，不按旧钩子的历史wiringHold文案重复开发。

未提交缓存、私有卡图或新的evidence/proof证据链；本地交接副本继续保持未跟踪。
