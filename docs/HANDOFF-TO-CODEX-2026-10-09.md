# DDBG → Codex 交接说明（2026-10-09，UTC+8）

> 2026-10-13 最新入口：#131准确head两项CI成功后按用户授权合并为main `323cec1`。当前 `codex/phase3-ruins8-9-verify-drafts` 新增Invocation Chamber / Old Abbey及VQ-17/18；普通遗迹1–9审核材料已齐，但实际可用仍1/28。没有批准新面或接运行时，Fountain、Torture候选排除项及全部未决Q保持。接手看[总交接顶部](HANDOFF-FROM-CODEX-2026-10-09.md)和[VQ队列](kyries-verify-queue-2026-10-12.md)。

> 2026-10-13 最新入口：#130 最新head两项CI成功后按用户授权已合并为main `675c389`，本地ff-only同步。当前 `codex/phase3-ruins6-7-verify-drafts` 新增 Treasure Chamber / Tomb of Ancestor 独立审核稿及VQ-15/16，尚未批准数据或写生产几何。未知图标、Fountain待审核、Torture仅候选及全部未决Q保持。接手读[总交接顶部](HANDOFF-FROM-CODEX-2026-10-09.md)与[VQ队列](kyries-verify-queue-2026-10-12.md)。

> 2026-10-13 最新入口：#129 最新head两项CI成功后按用户授权已合并为 main `64b6e94`。Kyries 明确“Fountain 尚未审核，先继续准备其他板块”；本轮新增遗迹4/5的 Spiked Pit / Beacon of Light 独立草稿与 VQ-13/14，未批准、未写生产几何或运行时。实际可用仍1/28，Torture 候选排除项、Fountain 与未决Q边界不改。接手读[总交接顶部](HANDOFF-FROM-CODEX-2026-10-09.md)与[VQ队列](kyries-verify-queue-2026-10-12.md)。

> 2026-10-13 最新入口：#128 最新 head 两项 CI 成功后已按用户授权合并为 main `d0bfadb`，本地 ff-only 同步。当前 `codex/phase3-curio-composite-rewards` 接通 Torch 后余下 05 / 07 / 24 的正面复合，获得选择覆盖 24 / 24；本主题尚未合并。未知饰品装备、Torture / Fountain、VQ 与未决 Q 边界不改，Phase 3 未完成。接手看[总交接顶部](HANDOFF-FROM-CODEX-2026-10-09.md)与[本轮交付](phase3-curio-composite-rewards-2026-10-13.md)。

> 2026-10-13 最新入口：#127 最新 head 两项 CI 成功后已按用户授权合并为 main `ff9c557`，本地已 ff-only 同步。当前 `codex/phase3-curio-trinket-acquisition` 新接单一饰品获得的 12 / 18 / 22：完整等级牌堆、携带容量、转交 / 弃牌待选；未知卡不装备，可明确弃新卡或保留复核停点。使用 / 翻面仍留 Phase 4，Torture / Fountain 和 Q 边界不改。接手看[总交接顶部](HANDOFF-FROM-CODEX-2026-10-09.md)与[本轮交付](phase3-curio-trinket-acquisition-2026-10-12.md)。

> 2026-10-12 最新入口：#122～125 已依用户本次“合并”授权、最新 head 两项 CI 成功后顺序合并，main 为 `b7a4cbe`；本地已 ff-only 同步。当前 `codex/phase3-curio-positive-quirk` 新接单一正面怪癖奖励，Torch 后 06 / 11 新增可完成，合计 16 / 24 张；未合并。Torture 的 Unholy Aura 仍仅候选、不接运行时、usable=false；Fountain 待 VQ 批准，Q 裁定不改。接手看[总交接顶部](HANDOFF-FROM-CODEX-2026-10-09.md)和[本轮交付](phase3-curio-positive-quirk-2026-10-12.md)。下方旧未合并状态为历史记录。

> 2026-10-12 步骤 2 续接：当前分支 `codex/phase3-curio-provisions` 基于 #122 的 `124bbb3`，新接 Curio 补给骰 / Wild；Torch 路径由十张增至十四张，仍有十张怪癖 / 饰品停点。已准备核心盒 28 面索引及 Torture Chamber BACK p2 的逐项审核草稿，未批准新几何。接手看[总交接顶部](HANDOFF-FROM-CODEX-2026-10-09.md)、[补给交付](phase3-curio-provisions-2026-10-12.md)与[逐面审核](phase3-tile-face-review-2026-10-12.md)。步骤 2 / Phase 3 未完成，#122 仍未合并。

> 本轮 PR 入口：Q-60 实现 `4788477`，开放草稿 [PR #122](https://github.com/Alpaca-go/ddbg-web/pull/122)，尚未合并；后续核对最新 head 的两项 CI，不把本地验证写成 PR CI 通过。

> 2026-10-12 最新入口：步骤 2 的 Q-60 批次在 `codex/phase3-q60-curio-icons`，基于 main `5714846`，尚未合并。Kyries 批准 17 个 hash / 01–24 效果行（R-064），词典 JSON / CSV 与全部 Curio 效果数据已同步；抽前 Torch 下十张可结算，其他十四张是奖励运行时代码依赖，已非 Q-60 图标停点。接手读[总交接顶部](HANDOFF-FROM-CODEX-2026-10-09.md)与[完整交付](phase3-q60-curio-icons-2026-10-12.md)。步骤 2 仍欠奖励接口和板块覆盖，Phase 3 未验收。

> 2026-10-12 合并完成：#120 已合并为 `d50a823`；#121 最新 head `44c190b` 的质量与 Playwright 两项 CI 成功，已按授权合并为 main `fe0de21`，本地 main 已同步。第一步完成，下一块为板块与 Curio 覆盖；下方等待 CI / 合并的描述为历史状态，Phase 3 仍未验收。

> 2026-10-12 最新入口：Kyries 授权第一步并要求合并。依赖 #120 最新 head 两项 CI 成功，已合并为 main `d50a823`；`codex/phase3-low-light-exploration` 已同步该基线，实现 `bacf3ac`，对应 [PR #121](https://github.com/Alpaca-go/ddbg-web/pull/121)，等待最新 head CI 成功后合并。已接 Darkness 降光、光照 0–5 探索与低光 Trap 房间。接手先读[总交接顶部](HANDOFF-FROM-CODEX-2026-10-09.md)与[本轮交付](phase3-low-light-exploration-2026-10-12.md)，下方旧合并状态及“低光照未接线”为历史记录。Q 停点保留，下一块为板块与 Curio 覆盖，Phase 3 未完成。

> 2026-10-12 最新入口：#119 含交接入口的 `a9caf2b` 已通过两项 CI，并按本次授权合并为 main `5681196`，本地 main 已 ff-only 同步。当前主题分支 `codex/phase3-exploration-trap`，代码 `83c6533`、开放草稿 [PR #120](https://github.com/Alpaca-go/ddbg-web/pull/120)，接探索骰 Trap 攻击，尚未合并；本次 PR 入口补记随同分支提交。本地 typecheck、lint、75 文件 / 725 项测试、build 与六条冒烟通过，最后中文提示修正另复核类型、lint 与新增场景；合并前须核对最新 head 两项 CI。接手先读[总交接顶部](HANDOFF-FROM-CODEX-2026-10-09.md)与[探索 Trap 交付](phase3-exploration-trap-2026-10-12.md)。下一块为 Darkness 降光与低光照探索接线；Q-66 / Q-67 / Q-68 不变，Phase 3 未完成。下方旧入口与未合并状态均为历史记录。

> 2026-10-12 最新入口：#118 含总交接补记的 `a641f45` 已通过两项 CI，并按 Kyries 本次授权合并为 main `1e701a7`，本地 main 已 ff-only 同步。当前主题为 `codex/phase3-dark-room` 的 Dark 房间与地图 Torch，代码 `6a817ec`、开放草稿 [PR #119](https://github.com/Alpaca-go/ddbg-web/pull/119)，未合并；接手先读 [总交接顶部](HANDOFF-FROM-CODEX-2026-10-09.md)与 [Dark 交付](phase3-dark-room-2026-10-12.md)。低光照探索 / Trap 仍是实现边界，Q-66 / Q-67 / Q-68 继续保持待定，Phase 3 尚未完成。下方入口与 PR 状态均为历史记录。

> 2026-10-12 当前接手入口（补齐最近提交）：#115 / #116 / #117 已合并，远端与本地 main 均为 `3407f38`。当前检出 `codex/phase3-empty-area-vertigo`，代码提交 `7f8323d`，对应开放草稿 [PR #118](https://github.com/Alpaca-go/ddbg-web/pull/118)，尚未合并；该代码 head 的质量与 Playwright 两项 CI 均通过。本次总交接补记在同分支追加并随 #118 提交。
>
> 已交付：真实房间战斗与地图回传、完整 42 张 I 级怪物池和获批参战字段、四核心 I 级英雄完整防御、疾病 / 负面怪癖运行时，以及 Balanced 可选减位移。#118 新增空区域技能的 Vertigo 位移压力到 10 收尾，尚不能视为 main 已交付。Phase 2 按批准范围验收通过，Phase 3 仍未形成完整任务，Phase 4–6 未完成。
>
> 接手先读 [Codex 总交接顶部补记](HANDOFF-FROM-CODEX-2026-10-09.md)、[Balanced 交付](phase3-balanced-shuffle-2026-10-12.md)和[空区域 Vertigo 交付](phase3-empty-area-vertigo-2026-10-12.md)。下一块先审阅 #118；合并后同步 main，再继续已明确规则的复合事件或下一张遗迹 Room Tile 核对准备。Q-66 / Q-67 / Q-68 继续保持待定，涉及真实目标攻击 / 反击或追加伤口的压力复合仍保留停点。下文的旧 tip、待办、#114 / #115 未合并及数据未获批叙述均是历史基线，不覆盖本段。

## 历史交接基线（以下保留各轮原记录，当前入口见上方）

> 2026-10-12 当前进度：#114 已合并到 main `202a14e`。Kyries 要求后续作为一次重型任务推进；`codex/phase3-guarded-battle-loop` 已接真实房间战斗、胜利 / 四轮撤退回传与 Small 挤占，仍待审 / 未合并。九种新怪物核图确认请求尚未收到回复，疾病 / 新增完整效果仍待继续，整个重型任务与 Phase 3 尚未完成。接手先读 [Codex 最新交接](HANDOFF-FROM-CODEX-2026-10-09.md)、[本轮交付与限制](phase3-guarded-battle-loop-2026-10-12.md)和[待审表](monster-battle-review-2026-10-12.md)；下文“怪物池尚未合并”是历史状态。

> 2026-10-12 最新交接：#113 已合并为 main `258459e`，Phase 3 守卫房间抽牌 / 板块匹配已交付；完整 42 张 I 级怪物池与真实部署记录在 `codex/phase3-monster-pool`，尚未合并。接手先读 [Codex 最新交接](HANDOFF-FROM-CODEX-2026-10-09.md) 与 [怪物牌池交付](phase3-monster-pool-2026-10-12.md)。Phase 3 未形成完整任务；下文阶段状态、tip 与合并准备属于历史记录。

> 2026-10-10 持续开发授权：Kyries 要求按四步推进，每个独立主题提交、CI 通过后合并，并更新交接。#92 已合并（`6853d9b`）；人工检查点③已通过，四步按批准范围完成；最新批准及印刷复核见 R-055–R-060。最新状态与下一块见 [Codex 接线交接](HANDOFF-FROM-CODEX-2026-10-09.md)。下文 2026-10-09 的 tip / 完成情况是历史基线，不覆盖最新进度。缺 duration 仍不补默认值。

> **读者**：即将接手的 Codex（或其他本地编码代理），以及之后再接回 Cursor /「DDBG·开发 2」的人。  
> **作者**：DDBG·开发 2（Cursor 侧协调机器人）。  
> **仓库 tip**：**`74bc5f7`**（合并 [PR #46](https://github.com/Alpaca-go/ddbg-web/pull/46) 之后的 `main`）。  
> **本地检出**：Kyries 电脑 `D:\ddbg-web`（hostname `DESKTOP-50QHUR1`），应已与 `main` 对齐。  
> **交接原因**：Cursor 额度将尽，开发暂时改由 Codex 推进；之后仍可能转回 Cursor。本文必须让两边都能**不跑偏、不丢上下文**地继续。

---

## 0. 开场必读（按这个顺序，不要跳）

1. 本文件全文。
2. 仓库根目录 [`AGENTS.md`](../AGENTS.md)（编码代理硬性约定；与本文冲突时以 **AGENTS.md + docs/rulings.md** 为准）。
3. [`docs/plan.md`](../docs/plan.md)（开发大纲 v0.2，Kyries 已确认；阶段定义以此为准）。
4. [`docs/rulings.md`](../docs/rulings.md)（本项目裁定；**R-001、R-048 尤其重要**）。
5. [`docs/spec/`](../docs/spec/) 下核心规则说明书（初稿，检查点 ① 尚未逐条签完）。
6. 当前代码入口：`packages/engine/src/hero-skill.ts`、`packages/engine/src/command.ts`、`packages/engine/src/rng.ts`。

读完再改代码。不要凭「别的桌游 / 电子游戏 Darkest Dungeon / 旧仓库」猜规则。

---

## 1. 项目一句话与目标

从零重做《暗黑地牢桌游》（Darkest Dungeon: The Board Game）**网页客户端**。  
旧仓库 `Alpaca-go/darkest-dungeon-boardgame` **只作交叉核对**，**禁止复制代码**，禁止搬它的 evidence/proof 证据链。

- **首版范围**：核心盒（遗迹 Ruins + 最暗地牢）→ 完整战役；单设备 hot-seat；英文卡面 + 中文 UI。
- **首版不做**：联机、手机深度适配、完整中文化卡面、动画音效、AI 托管、成就统计。
- **Musketeer**：不在第一版（R-008）。
- **扩展顺序**（核心盒之后）：Weald → Warrens → Cove → Crimson Court → Color of Madness → Master Webber → Butcher's Circus。

仓库私有。美术版权属于原厂；**卡图 / TTS 资产 / 图标切图不入库**。印刷 PDF 只抽取文字与数字。

---

## 2. 仓库与环境

| 项         | 值                                                                              |
| ---------- | ------------------------------------------------------------------------------- |
| GitHub     | https://github.com/Alpaca-go/ddbg-web （private）                               |
| 当前 main  | `74bc5f7`                                                                       |
| 本地路径   | `D:\ddbg-web`（不要同步到 `C:\Users\kyrie`）                                    |
| 合并后同步 | `git -C 'D:\ddbg-web' pull --ff-only`                                           |
| Node       | `24.21.0`（`.nvmrc`）                                                           |
| 包管理     | pnpm `12.9.1`                                                                   |
| 结构       | pnpm monorepo：`packages/engine`、`packages/data`、`apps/web`、`tools/pipeline` |

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
pnpm dev
```

CI：两个 job（`typecheck / lint / test / build` + Playwright smoke）。**合并前必须全绿。**

### 2.1 资料位置（不在 git 里）

这些路径在共享工作机 / Kyries 本机，**只读**，不要改 Kyries 电脑上的原始资料。

| 内容              | 路径                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| 开发大纲源稿      | `/workspace/ddbg-plan/`（仓库内副本为 `docs/plan.md`）                                          |
| 规则书 PDF        | `/workspace/ddbg-src/` 或本机 `C:\Users\kyrie\Desktop\DDBG`                                     |
| 印刷 PDF          | `/workspace/ddbg-print/`；本机另有 `C:\Users\kyrie\Desktop\新建文件夹\DARKEST DUNGEON EN_FILES` |
| 图标工作区 / 切图 | `/workspace/ddbg-extract/icons/`（切图**只留共享机**）                                          |
| 规格草稿          | `/workspace/ddbg-spec/`                                                                         |
| 历次交接          | `/workspace/ddbg-handoff/`（含本文件与 `HANDOFF-2026-10-07.md`）                                |

---

## 3. 开发方案大纲（阶段，勿自创阶段名）

完整正文在 `docs/plan.md`。摘要：

| 阶段        | 目标                       | 工期（大纲估） | 当前状态                                                                                                                 |
| ----------- | -------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Phase 0** | 基建 + 规则规格书 v1       | 1.5–2 周       | **基本完成**（monorepo、CI、文档、说明书初稿）                                                                           |
| **Phase 1** | 数据管线 + 核心盒数据      | 1.5–2.5 周     | **主体完成**：印刷提取、parsed schema、图标词典 **v1.8**、规范化卡牌；约 45/388 张卡仍待日后人工复核；板块几何标注仍未做 |
| **Phase 2** | 战斗引擎 MVP + 最简战斗 UI | 2.5–4 周       | **进行中**：英雄技能纯函数结算已大量落地；**尚未**接到 `applyCommand`；先攻/AI/死门/状态代币/战斗 UI 未做                |
| Phase 3     | 地牢探索                   | 1.5–2.5 周     | 未开始                                                                                                                   |
| Phase 4     | 村庄、战役、存档           | 1.5–2.5 周     | 未开始                                                                                                                   |
| Phase 5     | Boss 与第 4 幕             | 2.5–4 周       | 未开始                                                                                                                   |
| Phase 6     | 核心盒打磨 v1.0            | 1.5–2.5 周     | 未开始                                                                                                                   |
| Phase 7–8   | 地点扩展与独立模式         | 见大纲         | 未开始                                                                                                                   |

里程碑（大纲）：可玩单场战斗约 2026-11-13～11-27；核心盒 v1.0 约 2027-01～02。

**现在只允许在 Phase 2 内推进。** 不要跳到地牢/村庄/Boss，除非 Kyries 书面改范围。

---

## 4. 当前进度（截至 2026-10-09）

### 4.1 已合并 PR 全表（#1–#46）

文档与基建：#1–#4。  
数据与词典：#5–#14（词典至 **v1.8**），#15（R-053 美德/折磨名单写入 role）。  
**英雄技能结算引擎**（`resolveHeroSkill`，纯函数，**未接线**）：#16–#46。

| PR      | 要点                                                                  |
| ------- | --------------------------------------------------------------------- |
| #16     | 命中伤害 / 治疗                                                       |
| #17     | 防护、反弹、怪物死亡、暴击压力                                        |
| #18     | 卡面数值齐全的立即压力                                                |
| #19     | 自身治疗（从使用者伤口扣）                                            |
| #20     | 命中/暴击清除目标 Bleed、Blight                                       |
| #21     | 印明的 Push / Pull                                                    |
| #22     | 无视防护                                                              |
| #23     | 形态切换（记下）                                                      |
| #24     | 自身目标                                                              |
| #25     | 顶行姿态门控                                                          |
| #26     | 射程核对                                                              |
| #27     | 同区域目标个数上限                                                    |
| #28–#29 | Buff / Debuff 堆 → Crit +1                                            |
| #30     | Mark 堆 → Acc +1                                                      |
| #31     | 高地 → Acc +1                                                         |
| #32     | 光照 ≤4 → Crit +1                                                     |
| #33     | 光照 =5 → 英雄目标 Dodge +1                                           |
| #34     | 光照 =0 → 怪物目标 Dodge +1                                           |
| #35     | Shuffle 抗性：Push/Pull 少移 1                                        |
| #36     | **拒绝测试**：光照 2–1 额外压力（numeric null）                       |
| #37     | 无 Acc 时自身行治疗 + 压力直接生效                                    |
| #38     | front_icons 英雄头盔补目标数（Inspiring Tune I）                      |
| #39     | **拒绝测试**：Bleed/Blight 面值但 duration null 不放堆                |
| #40     | Transform 背面 → Human                                                |
| #41     | 高地：单个整数射程上限 +1                                             |
| #42     | 打怪漏选 Guarded → `guardedEnemyOmitted` 整次拒绝                     |
| #43     | **拒绝测试**：仅 Acc + stun 1t（null）不放堆、不把 Acc 当伤害         |
| #44     | Self Remove Bleed → 清使用者全部流血                                  |
| #45     | 跨行配对 Remove Bleed+Blight（Battlefield Medicine / Toxin Trickery） |
| #46     | `Push N or Pull N` + 调用方 `shuffleChoice`                           |

### 4.2 引擎现状（代码事实）

- **`resolveHeroSkill`**（`packages/engine/src/hero-skill.ts`）：纯函数。输入卡牌视图 + 战斗上下文 + 可选骰面 / 距离 / `shuffleChoice` 等，输出结算结果与跳过原因。**不修改**游戏状态，**不移动**区域/姿态轨实体（只「记下」位移意图等）。测试在 `hero-skill.test.ts`（体量大，改时务必跑全量）。
- **`applyCommand`**（`packages/engine/src/command.ts`）：**仅骨架**。`GameState` 只有 `seed` + `notes`；唯一命令是 `ping` → `pong`。**这是 Phase 2 下一步的中心。**
- **`createRng` / `rollD10`**：已有可种子 RNG。
- **UI**：`apps/web` 仍是壳 + 从 engine 导入的演示值，**没有**战斗板。

### 4.3 Phase 2 待办拆解（按推荐顺序）

1. **把 `resolveHeroSkill` 接到 `applyCommand`（强烈推荐下一步）**
   - 设计真正的 `GameState`（至少战斗子集：英雄/怪物、姿态、区域、伤口、压力、光照、种子、RNG 游标、状态堆意图等）。
   - 定义命令（如 `playHeroSkill`）与 `PendingChoice`（选目标、选 Push/Pull 方向等）。
   - 调用已有纯函数，再把结果**写回**状态；保持确定性：同样种子 + 同样命令序列 → 同样结果。
   - **不缺命名数据也能开工**；这是当前最大「可推进、不靠猜数字」的块。

2. **先攻与轮次**：先攻牌堆；第 4 轮未清场被迫撤退；Boss 战另议。

3. **怪物 AI**：姿态定技能 → 目标优先级 → Speed 移动 → 结算（可先做简化，但规则要对）。

4. **死门与英雄生命**：英雄 Life 数据需核实录入（当前缺口）；死门骰面构成仍有待确认项。

5. **状态堆叠真代币**：Bleed/Blight/Stun/Buff/… 的 `Nt` 在数据里多为 **`numeric: null`**。在补数据或 Kyries 裁定前，**只能拒绝测试，不能发明回合数**（R-048）。

6. **最简战斗 UI**：板块区域、姿态轨、行动面板、卡牌信息、战斗日志、种子/状态调试。

7. **英雄技能里仍可挑的边角**：在 R-048 下已接近枯竭；若再做，优先「真实结算」，否则只加拒绝锁。**不要**为凑 PR 去编数字。

### 4.4 明确被 R-048 / 数据挡住的点（不要「先实现占位数值」）

- 光照 2–1 档额外压力（压力增益 numeric null）— #36 已锁。
- 卡面 `1t` / `2t` 等 duration null → 不能放 Stun/Bleed/Blight/Buff 等堆。
- `+N vs`、带 `+` 导致 numeric null 的压力/光照修正。
- 卡面光照 ±1/±2、怪物 Acc +1 等未命名齐全者。
- Zealous Accusation 类：无命名伤害/治疗。
- Flashbang：Push/Pull 拆行且与 stun 同行。
- Collect Bounty II：Acc 印成 `1O` 等脏数据。
- 射程区间如 `1-2` 的 numeric null（#46：II/III 传距离会拒绝）。
- 效果行头盔是否计入目标数：说明书/裁定未允许的不要擅自计入（见既有测试）。

---

## 5. 必须遵守（不可以做什么）

违反任一条都算「做歪」，转回 Cursor 时要先回滚或重开 PR。

1. **禁止编造规则、数值、图标含义**（R-048）。卡面/词典没有命名的字段 → 拒绝或标 `Q-xx` 等 Kyries，不要默默实现。
2. **规则来源只有**：官方规则书 + `docs/rulings.md`。**禁止**使用 mod FAQ、设计师 FAQ（R-001）。旧仓库 FAQ 目录也不要当权威。
3. **禁止**把印刷 PDF / TTS 卡图 / 图标切图 **提交进仓库**。
4. **禁止**修改 Kyries 电脑上 `C:\Users\kyrie\Desktop\DDBG` 等原始资料；本地仓库只动 `D:\ddbg-web`。
5. **禁止**从旧仓库复制引擎代码或 evidence 流程。
6. **禁止**在未获 Kyries 确认时合并「规则判定 / 存档格式 / 核心交互」类大改（见 §6）。普通小修可自审，但有疑虑就问。
7. **禁止**一次 PR 塞多个主题或超大无关重构；建议有效改动 ≤ ~600 行（AGENTS.md）。
8. **禁止**跳阶段（例如未完成战斗 MVP 就做完整村庄 UI）。
9. **禁止**为了「能跑」而给 null duration / null numeric 填默认 `1` 或 `2`。
10. **禁止**在对话外替 Kyries 对外发消息。
11. **禁止**把仓库改成公开或把美术资产推进 git。
12. **不要**把 `resolveHeroSkill` 改成有副作用的函数；副作用只应出现在 `applyCommand`（或明确的状态应用层）。

---

## 6. 推荐工作思路（怎么做才不歪）

### 6.1 总原则

- **数据驱动 + 确定性**：RNG 可种子；存档将来 = 种子 + 命令日志。
- **先纯函数、再接线**：结算逻辑保持可单测；`applyCommand` 负责校验命令、调纯函数、写状态、发 events / pendingChoice。
- **小步 PR**：一个主题；中文 PR 描述写清改动、测试、已知限制；引用规则书页码或 `R-xxx` / `Q-xx`。
- **拿不准就停**：写成待确认，不要猜。
- **测试先行或同步**：改 `hero-skill` 必须跑现有大测；新行为补正反例；拒绝路径也要有锁测试。

### 6.2 建议的近期执行顺序（给 Codex 的默认 backlog）

**块 A（首选）— `applyCommand` 战斗最小接线**

验收建议：

- 扩展 `GameState` / `Command` / `GameEvent`（可仍只覆盖单场战斗沙盒）。
- 至少能：创建战斗沙盒 → 下发「打出某英雄技能」→ 若需方向则 `pendingChoice` → 应用 `resolveHeroSkill` 结果到伤口/压力/记下的 shuffle 等。
- Vitest：同一 seed 回放一致；非法目标/姿态/Guard 与纯函数拒绝一致。
- **不要**在本块实现完整怪物 AI 或地牢。

**块 B — 先攻牌堆与回合结构**（依赖 A 的状态形状）

**块 C — 怪物技能结算的纯函数**（可平行设计，仍先纯函数）

**块 D — 最简 UI 接到命令**（接口稳定后）

**块 E — 数据补洞**（仅 Kyries 裁定或核图之后）：duration、英雄 Life、脏 Acc 等。

### 6.3 PR / 分支习惯（方便转回 Cursor）

- 分支名可读：`codex/phase2-apply-command-battle-sandbox` 这类。
- 每个 PR 描述末尾加一节 **「交接笔记」**：改了什么、刻意没做什么、下一个建议块、是否需要 Kyries 裁定。
- 合并方式：GitHub **merge**（与现历史一致）；合并后本地 `pull --ff-only`。
- 若使用 Codex 本地直接 commit：仍应尽量走 PR + CI，避免 main 上无审查推送。

### 6.4 与 Cursor 的分工约定（额度恢复后）

| 侧                            | 适合做的                                             |
| ----------------------------- | ---------------------------------------------------- |
| **Codex（本地）**             | 中大型引擎接线、状态模型、本地快速迭代、修测         |
| **Cursor 云端代理**           | 小切片 PR、按任务开草稿 PR、CI 友好的细粒度改动      |
| **协调机器人（DDBG·开发 2）** | 拆任务、审规则向 PR、维护交接与 `rulings`、问 Kyries |

转回 Cursor 时：更新本文件「当前 tip / 进行中 PR / 下一块」，并在 `docs/plan.md` 顶部或单独进度段写一句现状（若 plan 不便大改，至少更新本交接文件）。

---

## 7. 关键裁定速查（不完全；细节以 rulings.md 为准）

- **R-001**：只用官方规则书 + 本项目裁定；不用 FAQ。
- **R-008**：Musketeer 首版不做。
- **R-020 / R-022 / R-024 / R-033**：位移、高地、Guard 等（已有实现对照测试）。
- **R-048**：未标注数字/图标不得命名使用；null numeric 不发明。
- **R-053**：美德 Stalwart / Courageous / Powerful / Vigorous；折磨 Fearful / Masochistic / Hopeless / Irrational；另有规则书面 Focused / Selfish。

美德/折磨角色已写入规范化卡；图标与部分卡复核仍可能遗留。

---

## 8. 已知数据债（不要假装已完成）

- 规范化层约 **45/388** 张卡仍待人工复核（确切数以数据报告为准；勿在文档里写死后不再核对）。
- 词典 v1.8 已入库；部分书上无字图标、卡背箭头、格点数等曾 defer。
- **房间/地牢板块几何标注未做**（Phase 1 尾 / Phase 3 前置）。
- 英雄 **Life** 等战斗必需字段若缺失，死门相关必须等数据或裁定。
- 说明书检查点 ①：Kyries 尚未逐条签完；实现以规则书 + 已写入的 R/Q 为准，冲突时停。

---

## 9. 给 Codex 的「防跑偏」检查清单（每个 PR 合并前自问）

- [ ] 是否只动了本主题相关文件？
- [ ] 是否引用了规则书页码或 R/Q，而不是「我觉得该这样」？
- [ ] 是否对 null / 未核实字段写了拒绝或跳过，而不是默认值？
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build`（及必要的 e2e）是否通过？
- [ ] 是否保持 `resolveHeroSkill` 无副作用？
- [ ] PR 描述是否列出**已知限制**与**下一步**？
- [ ] 若改了存档形状或命令协议：是否标明「需 Kyries 确认」且尚未擅自当最终格式？

---

## 10. 交接回 Cursor 时要交的东西

1. 更新后的本文件（或新文件 `HANDOFF-FROM-CODEX-YYYY-MM-DD.md`）。
2. `main` 的 tip SHA + 未合并 PR 链接。
3. 「进行中」块的验收标准达到了哪几条。
4. 新增的 `Q-xx` / 待 Kyries 拍板列表。
5. 本地 `D:\ddbg-web` 已 `ff-only` 到 tip 的确认。

Cursor 侧会从「下一块」继续开云端代理或审 PR，而不是重做已合并逻辑。

---

## 11. 给 Kyries 的操作提示

- 把本文件交给 Codex 时，附一句：**「严格按 HANDOFF 与 AGENTS.md；下一步优先 applyCommand 战斗接线；不要猜 R-048 卡住的数字。」**
- 额度恢复后把 Codex 写下的交接笔记发回「DDBG·开发 2」即可续上。
- 涉及规则/存档/核心交互的 PR，仍由你确认后再合并。

---

## 12. 文档自身位置

| 副本             | 路径                                                     |
| ---------------- | -------------------------------------------------------- |
| 共享工作机       | `/workspace/ddbg-handoff/HANDOFF-TO-CODEX-2026-10-09.md` |
| 仓库（建议提交） | `docs/HANDOFF-TO-CODEX-2026-10-09.md`                    |
| 本地             | `D:\ddbg-web\docs\HANDOFF-TO-CODEX-2026-10-09.md`        |

提交本文件到 `main` 是可选但推荐的（便于任何代理只 clone 仓库就能读到）。若 Codex 先本地开干，至少保证本地 `docs/` 下有这份文件。

---

_完。若本文与仓库内 AGENTS.md / rulings.md 冲突，以仓库文件与 Kyries 最新书面裁定为准，并请回写修正本交接。_
