# Phase 3：探索骰 Trap 攻击

基于已合并 #119 的 main `5681196`，分支 `codex/phase3-exploration-trap`；代码 `83c6533`、开放草稿 [PR #120](https://github.com/Alpaca-go/ddbg-web/pull/120)，本切片尚未合并，Phase 3 尚未完成。PR 创建后的本次入口补记与两份总交接一并提交；后续合并前须核对最新 head 的质量与 Playwright 两项 CI。

## 范围与依据

对照官方核心规则书 R14 / R27 完整页面，沿用规格书 §5.5、§6.6、§8–9 与黄金例 G-06，以及 R-002 / R-003 / R-026 / R-031 / R-048。探索骰的 Trap 可用实际 Tool 抵消，或由该骰所属英雄承受固定 Acc 8、Crit 2 的环境攻击；普通命中为 2 × DL，暴击为 4 × DL 且只给该英雄基础 1 压力。光照与怪癖修改英雄 Dodge，不给环境陷阱套用怪物 Acc / Crit 加成。

- `dungeon-trap.ts` 使用共享种子与游标，读取获批英雄身份 / Life / Dodge，接 Quick / Slow Reflexes、实际闪避的 Evasive，以及自身 d10 的 Skilled / Bad Gambler。死亡冻结移动，完成骰面后继续当前英雄剩余探索骰，不提前移动。
- 抽出 `attack-damage.ts`，技能与陷阱共享 On Guard → Hard Skinned → Protection 的向上取整顺序。净伤害和 Fragile / Syphilis 合成同批伤口，死门只掷一次；后续 damageTaken / criticalDamage 复用具名被动与真实完整抗性。环境攻击没有可反弹对象，不制造虚拟怪物，也不转交 Guard。
- `completeDungeonHazard` 复用探索压力收尾。缺意志目录时保留已支付伤害、攻击骰和完成标记，补齐后只恢复剩余探索骰；Q-66 / Q-67 组合原子拒绝，不消费骰或伤害。
- 中文沙盒直接呈现“陷阱攻击”与实际骰面 / 伤害结果。沿用第一条 Phase 3 冒烟加入 seed 31 的 Trap 暴击：hero-0 伤口 4/17、压力 1、游标 16，仍在 G 且第一颗 Darkness 待结算；保持三条阶段 / 六条总冒烟。

## 验证与边界

新增 12 项场景覆盖 DL 1–3 十个骰面、光照 / Dodge、暴击、减伤、同批伤口、首次 / 已在死门、补给抵消、被动 / 抗性、确定性回放、原子拒绝和压力恢复。Node 24.21.0 / pnpm 12.9.1 下，typecheck、lint、75 文件 / 725 项测试、build、`git diff --check` 与六条 Playwright 冒烟通过，已检查 Trap 完整截图；最后仅修正陷阱伤害事件的中文来源提示，并复核类型、lint 与新增场景。浏览器沿用忽略缓存的 Chromium 1234 配置，正式配置未改。构建保留约 1.71 MB 主包提示。

仅开放探索骰 Trap 攻击。低光照有骰探索、探索骰 Darkness 降光仍受现有实现范围限制；Trap 房间沿用既有点数分配。Q-66 / Q-67 / Q-68 不变，其他房间、任务 / XP、休息与撤离仍未完成。原有 `docs/_q52-search.txt` 保留且不提交。
