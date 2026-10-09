# Codex 接线交接（2026-10-09）

- 基线：`efbc59d`（main，PR #47）。本地分支：`codex/phase2-apply-command-battle-sandbox`。
- 本次只推进 Phase 2 块 A；Kyries 已授权本地提交，尚未推送或合并。
- 状态与命令是单场战斗沙盒的临时接口，需 Kyries 审阅，不作为 Phase 4 正式存档格式。

## 已接通

`createBattleState(seed, setup)` 接收调用方提供的已核实卡牌、实体、区域邻接与高低地、光照。它复制初始数据，拒绝重复 ID、非法区域关系、非法生命 / 压力等输入。

`applyCommand` 支持 `playHeroSkill`（使用者、技能、单个目标、可选正反面与方向）和 `resolveChoice`（选择 ID、选项 ID）。使用者必须装备该技能；从状态推导姿态、区域最短距离、Guard、同区英雄名单，调用现有 `resolveHeroSkill`。

- 伤口、压力、怪物死亡标记、清除已有 Bleed / Blight、形态写回新状态；同一个实体的自身与目标结果合并。
- 卡面明确的 Push / Pull 存为 `shuffleIntents`，保留被位移者及参照对象，不移动棋子与姿态轨。
- `Push N or Pull N` 沿用纯函数的解析器返回 `PendingChoice`；等待时其他命令拒绝，过期选择拒绝。
- 掷骰来自种子与 `rngCursor`。拒绝和待选不消耗 RNG，无 Acc 的自身效果不消耗 RNG。事件记录骰面、结算结果与跳过项。
- 原有 `ping` 探针保持兼容。

依据：核心规则说明书 §6.5（R19–21）、§6.7–6.9（R21、R25），裁定 R-020、R-021、R-024、R-031、R-048。没有引入新的规则裁定或卡牌数值。

## 已知限制与下一步

仅支持单目标技能结算。尚无先攻 / 轮次 / 行动次数 / 同回合技能重用限制，也不处理怪物死亡后的姿态补位与战斗结束。位移只记录意图；当前状态不能用于完整战斗的合法性判断。

没有英雄 Life、死门、压力达到 10 的意志 / 心脏病检定、状态代币计时、怪物 AI、饰品窗口与战斗 UI。Bleed / Blight 只保存既有堆的标识以便整堆移除，不解释或新增面值 / duration。null 射程区间仍拒绝；无 Acc 且纯函数可结算的自身效果无需选目标区域，不把区间或 Self 文本转成数值。未命名数值继续拒绝或通过 `skipped` 报告。

下一块建议：块 B，先攻与回合结构；随后接多目标一次掷骰及位移实际应用。接口与规则类改动仍由 Kyries 确认后合并。

## 验证与本地环境

新增沙盒测试覆盖种子回放、入参不变、反弹 / 死亡、暴击压力、自疗、自身与目标压力合并、形态、方向待选 / 落空 / 抗性、非法目标 / 姿态 / Guard / 射程、R-048 拒绝路径。

Node 24.21.0 放在忽略的 `node_modules/.cache/node24/`，pnpm 12.9.1。Windows 的 `core.autocrlf=true` 导致初始 Prettier 与数据字节哈希失败；本地文本恢复 LF，未改提取数据内容或报告。提取 fixture 的路径列表比较改用 `path.posix.join`，使 Windows 与 Linux 使用相同路径表示。

验证通过：`pnpm typecheck`、`pnpm lint`、`pnpm test`（7 文件、139 项）、`pnpm build`。新增沙盒测试 15 项。

默认 `pnpm test:e2e` 因缺少配套 Chromium 无法启动，浏览器下载停滞后已停止。使用忽略的 `apps/web/node_modules/.cache/smoke.config.mjs`，在独立端口 5174 以本机 Chrome 运行原有首页冒烟，1 项通过；正式 Playwright 配置未修改。这仅验证现有首页，不代表战斗 UI 验收。
