# Phase 4：连续两任务自然 4XP → Guild 英雄升级验收

本主题从 main（#193 出征循环 tip `c6a0567`）继续。依据规格书 §4.5 / §13.1–§13.2（官方 R29 / R34 / QUEST p1–p2）、R-004、R-038、R-037。

## 核实后的最短自然路径

单任务最高仍为 3XP（R-038）。验收选用可回放实例 **seed14**：

1. **Scout Ahead I**：清理 4 间可计分房间 → 每英雄 / 驿站待发 **2XP**（既有 `guildQuest` 同型目标）。
2. 回村发奖 → Busy Week（2 天）→ Crusader **Zealous Speech** 逐日收束至 `preparationComplete`（真实命令，非灌 XP）。
3. `offerNextQuest` 抽到 Wipe / Fundraiser，选定 **Wipe ‘Em Out I**。
4. 续跑第二任务：清理 **2** 间巢穴 → 再发 **2XP**；累计 **4XP**、金币 ≥2。
5. 第二轮村庄 `visitGuild` → `upgrade-hero` → 英雄 **I→II**。

疾病保留：在自然 4XP 状态上经 `gainDisease` 牌堆守恒抽病后升级，断言疾病不因新卡免疫清除（R21）；不把疾病夹具写入命令日志。

## 改动

- `naturalQuest` 支持 `continueFrom`（已出征状态续跑）与 `wipeLairs`（Wipe 巢穴目标数）。
- 新增测试辅助 `twoQuestGuildPath` / `withNaturalDisease` 与场景 `hamlet-two-quest-guild.test.ts`：同种子命令回放、Guild 升 II。
- 无产品命令面变更；不进 Phase 5；不代签人工试玩。

## 测试与限制

- 本路径是选定种子的可回放实例，不主张对牌池概率作统计结论。
- 第一轮若非 Busy Week / Crusader 非当前英雄，辅助函数仍保留天数收束夹具退路（不改 XP）；seed14 走真实 Speech。
- 正式地牢仍只接受 I 级英雄出征；高等级出征未开放。
- Q-79 / Q-80 pending，不自行裁定。
- 非阶段收尾，不新增 Playwright。

## 下一主题

剩余 9 张村庄事件、驿站死亡补人，或高等级英雄出征 / 正式 II 级地牢交接。

## 最终验证

本机 Node 24.21.0 / pnpm 12.9.1：`pnpm typecheck`、`pnpm lint`、123 文件 / 1101 项单元与场景测试（`pnpm test --maxWorkers=4`）、`pnpm build`、`git diff --check` 全部通过。未检查远端 Actions。用户 8080 配置、临时资料/截图与美术不提交。
