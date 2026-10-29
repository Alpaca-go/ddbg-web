# C-022 限定切片：死灵法师 II 幕末任务入口

基线 main `01e5683`：#375 → #376 → #377 已按 Kyries“合入，然后继续”顺序合并，本机 ff-only 同步。合入后的文件与此前最终 head `dca67f8` 完全一致，44 项相关测试通过；远端检查仍受五项既有 Swine / Flesh ESLint 错误阻塞，不声称全绿。

R-124 明确未批准 II/III 幕末 offer；本次另经 Kyries 批准并记录为 R-126，仅接 II 级死灵法师切片。依据官方核心规则书 R30、R35（已对照原 PDF 页面图像），规格书 §2.1–2.3、§14.1；不使用 FAQ，也不从印刷卡补规则。

- II 级已发放本幕第二次普通任务摘要后，按 R-124 同时核对实际 p002、死灵法师 II 注册及战斗入口；成功则 `offerNextQuest` 只给 Face the Threat，不洗牌、不消耗 RNG。
- 缺实际威胁、缺描述卡、错级、描述卡 / 脚本冲突或其它未实现威胁时，幕末明确拒绝。返回原状态，保留 cursor / decision，不继续抽普通任务，不默认替换 Boss。
- 一次普通任务后仍按既有路径抽两张；旧等级弃置和 Boss 摘要不增加本幕普通任务计数。I 级保持既有行为。
- 已发出的单项待选拒绝普通任务、过期 id 和重复 offer；选 p019 沿既有出征路径写入 II 战斗计划并保留实际威胁 / 已击败身份。JSON 往返和同命令结果一致，重复选择拒绝。

测试使用明确的 II 级幕末机制夹具，并经公开 `drawImminentThreatAfterActAdvance` 验证实际抽到 p002 时激活、其它两种剩余描述卡仍停点。覆盖 offer → 待选 JSON 往返 → `resolveChoice` 出征，不冒称自然 I→II 战役或正式存档回放。

C-022 总项保持未完成：III 级 offer、其它 II/III Boss、正式升幕和战役存档闭环仍待后续；R-121 / 边缘房、正式 Boss 房间、最暗线与 Phase 6 未接。无 UI 或存档格式变化，无图片入库，本刀不是阶段末尾，不新增 Playwright。

草稿 [PR #378](https://github.com/Alpaca-go/ddbg-web/pull/378)，实现提交 `28640aa`，尚未合并。

验证：六个相关文件 61 项测试通过，含新增十一项；typecheck、build、修改代码 ESLint / Prettier、新说明格式及 `git diff --check` 通过。全仓 `pnpm lint` 仍失败：排除本地缓存后为既有 Swine / Flesh 五项错误，本机另有原有缓存脚本错误。

全量 Vitest（maxWorkers=4）：218 文件通过 / 48 失败，1794 用例通过 / 34 失败 / 118 跳过。与 #377 最终日志相比，多出的五项均为未改动旧测试的 5 秒超时，分别在 dungeon-stances、hamlet-event、hamlet-events-batch、replacement-join、web-quest-catalog。停止并发负载后，按原超时以 maxWorkers=1 仅复跑这五项，全部通过（另 28 项按名称过滤跳过）。其余失败标题与上一轮一致，没有新增断言失败；不把分项复跑等同全仓全绿。未放宽超时或修改既有断言。
