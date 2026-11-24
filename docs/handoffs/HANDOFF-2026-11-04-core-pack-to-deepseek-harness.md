# DDBG·核心包续 → DeepSeek Harness 交接（2026-11-04）

Kyries 指令：**合入 #597，然后写个交接文档，接下来交给 deepseek harness**。本文随独立 PR 入库；合入后 **DDBG·核心包续 / Grok Bot 停止新增开发**，由 **DeepSeek Harness** 续（一条一事、**一任务一 PR**、中文提交与 PR 说明）。不是解除既有 hold，也不是批准 Phase 6 或批量改准入开关。

> **最新接手入口（2026-11-04）**：请先读本文，再按需读 `AGENTS.md`、`docs/rulings.md` 与下表引用的 `phase5-*` 切片。旧文 [HANDOFF-TO-GROK-2026-10-31.md](HANDOFF-TO-GROK-2026-10-31.md)、[HANDOFF-2026-11-03-room-geometry-to-grok.md](HANDOFF-2026-11-03-room-geometry-to-grok.md)、[HANDOFF-2026-11-04-collector-i.md](HANDOFF-2026-11-04-collector-i.md) 及 Nov 1 未入库草稿里的 **usable / tip / 云端 bc** 可能已过时，**不能**当当前缺口表。

## 1. 从哪里开始

| 项              | 值                                                                  |
| --------------- | ------------------------------------------------------------------- |
| **tip（main）** | `685a20b8ea07c64e527e3b747d50d2fd6d7574ea`（#597 最终战自然存档）   |
| **仓库**        | https://github.com/Alpaca-go/ddbg-web · 本机 `D:\ddbg-web`          |
| **发出方**      | DDBG·核心包续 / Grok Bot（#561 几何收口后至 #597）                  |
| **接手方**      | DeepSeek Harness                                                    |
| **核对**        | `git fetch origin main && git rev-parse origin/main` 应等于上表 tip |

先读本文 → `AGENTS.md` → `docs/rulings.md`（尤其 R-001、R-048 及下表 R 列）→ 动手前用 tip 代码与 `git log` 核对 PR，勿从旧分支或旧 handoff 的 tip 开刀。

## 2. 本轮已合入（核心包续 · Grok 接手后主线增量）

下列为 **Evil Eye / Temple 之后** 至 **最终战入口三连** 的主线交付（含更早同链的遗迹 I 级 Boss 与最暗中途 Boss，避免重复开发）。文档列 `phase5-*`；裁定列 `docs/rulings.md`。

### 2.1 最暗普通房运行时（几何已在 #560）

| PR / 合入                                              | 已交付                                            | 文档                                                                                                   | 裁定          |
| ------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------- |
| [#562](https://github.com/Alpaca-go/ddbg-web/pull/562) | Eldritch Power Chamber（`room:p018`）橙星特殊效果 | `phase5-eldrich-power-chamber-runtime-2026-11-03.md` 等                                                | R-158         |
| [#563](https://github.com/Alpaca-go/ddbg-web/pull/563) | Teleporters（`room:p019`）橙星传送与穿过压力      | `phase5-teleporters-runtime-2026-11-03.md` 等                                                          | R-159         |
| [#564](https://github.com/Alpaca-go/ddbg-web/pull/564) | Evil Eye 凝视 / 毁眼交互                          | [phase5-evil-eye-runtime-2026-11-03.md](phase5-evil-eye-runtime-2026-11-03.md)                         | R-160 / R-170 |
| [#565](https://github.com/Alpaca-go/ddbg-web/pull/565) | Temple of the Chosen 回合结束效果                 | [phase5-temple-of-the-chosen-runtime-2026-11-03.md](phase5-temple-of-the-chosen-runtime-2026-11-03.md) | R-161 / R-171 |

tip 上上述四面 **`room_tile_geometry.usable: true`**（仅该面 runtime 开放；不表示 Boss 房或 Ancestor 面开放）。

### 2.2 遗迹 Ruins I 级 Boss（部署 → 目录/技能 → 自然存档）

| PR                                                     | 已交付                                                                   | 文档（代表）                                                                                   | 裁定（代表）        |
| ------------------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------- |
| #566–#570                                              | Necromancer I 部署 / 交接 / 页面 / 自然存档                              | `phase5-necromancer-i-*-2026-11-04.md`                                                         | R-166 等            |
| #571–#574                                              | Prophet I 同上链                                                         | `phase5-prophet-i-*-2026-11-04.md`                                                             | R-167 等            |
| #575–#581                                              | Collector I 部署 / 交接 / 页面 / R-177 宝箱 / R-176 Acc / Collected 闭环 | [HANDOFF-2026-11-04-collector-i.md](HANDOFF-2026-11-04-collector-i.md)、`phase5-collector-i-*` | R-168 / R-175–R-177 |
| [#582](https://github.com/Alpaca-go/ddbg-web/pull/582) | Boss 目标房 `blockedReason` 与文档对齐                                   | `phase5-boss-objective-room-entry-2026-10-31.md`                                               | —                   |
| #583–#585                                              | Fanatic I 部署 / 目录 / 自然存档                                         | `phase5-fanatic-i-*-2026-11-04.md`                                                             | R-178 / R-179       |

各 Boss **专用 `deploy*I`** + 显式 `startBattle`；**不**靠 `selectRoomTile`、**不**扩 `createCoreDungeonQuest` 白名单进 Boss 房。

### 2.3 最暗中途 Boss I（部署 → 目录 → 自然存档）

| PR / 提交          | 已交付                                          | 文档                                                                                     | 裁定          |
| ------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------- |
| #586–#587          | Templars I 部署 / 正式目录与页面                | `phase5-templars-production-entry-review-2026-11-04.md` 等                               | R-180 / R-181 |
| `693a13e`          | Templars I 自然任务与严格存档                   | [phase5-templars-natural-save-2026-11-04.md](phase5-templars-natural-save-2026-11-04.md) | R-180 / R-181 |
| `51dd4b8`（R-182） | Shuffling Horror I **`deployShufflingHorrorI`** | `phase5-shuffling-horror-production-entry-review-2026-11-04.md`                          | R-182         |
| #590–#591          | Shuffling Horror I 目录 / 自然存档              | `phase5-shuffling-horror-*-2026-11-04.md`                                                | R-183         |
| #592–#594          | Mammoth Cyst I 部署 / 目录 / 自然存档           | `phase5-mammoth-cyst-*-2026-11-04.md`                                                    | R-184 / R-185 |

### 2.4 最终战（#595–#597）

| PR                                                     | 已交付                                                                                                                                                                                   | 文档                                                                                                                   | 裁定                          |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| [#595](https://github.com/Alpaca-go/ddbg-web/pull/595) | **`deployFinalBattleForm`** 接 R-165 Ancestor Room **生产几何**（非 `final-*` 占位区）                                                                                                   | [phase5-final-battle-production-entry-review-2026-11-04.md](phase5-final-battle-production-entry-review-2026-11-04.md) | **R-186**                     |
| [#596](https://github.com/Alpaca-go/ddbg-web/pull/596) | 六张最终战形态纳入正式 **`bossMonsters`** 目录                                                                                                                                           | [phase5-final-battle-page-entry-review-2026-11-04.md](phase5-final-battle-page-entry-review-2026-11-04.md)             | **R-187**                     |
| [#597](https://github.com/Alpaca-go/ddbg-web/pull/597) | **`naturalFinalBattle`**：最暗 **quest:p018** 自然路径 → 回村 → 最终准备 → 补给 → `prepareFinalBattleForms` → **`deployFinalBattleForm` + `startBattle`**；严格 JSON 回放；种子 **3279** | [phase5-final-battle-natural-save-2026-11-04.md](phase5-final-battle-natural-save-2026-11-04.md)                       | R-186 / R-187 / R-122 / R-048 |

更早的最终战准备链（#423–#426、#429 占位部署、各形态 Acc/AI 最小切片等）已在 main，见 [HANDOFF-TO-GROK-2026-10-31.md](HANDOFF-TO-GROK-2026-10-31.md) 与 `phase5-final-*-2026-10-31.md` / `2026-11-01.md`。**勿重做**。

## 3. 最终战诚实边界（#597 · 必读）

### 3.1 已覆盖

- 路径：`naturalQuest`（p018 胜利）→ `beginReturnToHamlet` / `finishReturnToHamlet` → `beginFinalPreparation` → 四天村庄行动 → `beginFinalBattleProvisions` → 补给掷骰 / `resolveChoice` → `prepareFinalBattleForms` → **`deployFinalBattleForm` → `startBattle`**（首形态 Ancestor 1 + Reflections，先攻洗入）。
- 验收：引擎 `final-battle-natural-save.test.ts`、网页 `e2e/final-battle-save.spec.ts`、目录迁移 `preFinalBattleBossCatalogTaskSources`。
- 引擎修复：`rollDungeonProvisions` 在 `startingProvisionChoices === []` 时不误拒（最暗遗留空数组）。

### 3.2 未覆盖（禁止在 PR 里「宣称战役已通」）

- **胜利后回村（R32）**：终局已接（`campaignVictory` + 结局面板 + 开新战役，见 R-188 与 [切片](phase5-final-battle-victory-2026-11-04.md)）；Kyries 2026-11-04 明确打完最终 BOSS 游戏结束，**不回村**。
- Ancestor 2 与 Heart of Darkness 的**自动选招**已接；**Ancestor 1 三招与 Gestating Heart 召唤仍需显式命令**，按 [combatReady 切片](phase5-combatready-2026-11-04.md)的后续清单补。
- **`ancestorGlory`** 属 Tomb of Ancestor（`room:p007`），已实现并有测试；最终战房间无该特殊区。
- 铁匠 / 游商深度购买（自然路径仅消费任务历史中的 `nextQuestProvisionDice` 等）。

### 3.3 准入事实（tip · 勿照抄 Nov 3 几何表当 runtime 表）

- **`combatReady` 已按 R-189 全量放开为 `true`**（17 处：3 条遭遇 + 最终战四形态 + 9 张 Boss 能力 + 1 张 Absolute Nothingness 支援；Kyries 2026-11-04 授权，实测后再修）。口头 hold **K-H08 已解除**；`usable` 未变。
- **`room_tile:p014:back`（Ancestor Room）`usable: false`** 保持不变；R-186 生产 deploy **不依赖** `usable: true`（对标 R-184 Mammoth）。
- 核心盒 **25 张**具名 room 几何 **`geometryVerified: true`**（#560）；`room_tile_geometry.json` 在 tip 上 **`usable: true` 17 面 / `usable: false` 8 面**（8 面均为 Boss 相关面，含 Ancestor back）。Evil Eye / Temple 等最暗普通面已为 **true**；八张 Boss 房面仍为 **false**。

## 4. 硬边界（现行 · 违反即停）

| 类别        | 要求                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| 规则来源    | **R-001**：仅官方规则书 + 本仓库 `docs/rulings.md`；不用模组/设计师 FAQ                                   |
| 数据准入    | **R-048**：未核实卡面字段不补伤害/图标语义；Boss **`combatReady: false`** 时不跑完整技能探针式生产战斗    |
| 任务入口    | **不扩** `createCoreDungeonQuest` 白名单；自然/Boss 走获批任务源、威胁脚本与 **专用 deploy**              |
| 范围        | **不抢** 地点扩展包；**Phase 6**（Stygian、英雄 II/III **全战役**等）须 **Kyries** 明示，**默认不开**     |
| 任务卡 hold | **DDBG·任务卡** 名下 hold 的 SPECIAL / 任务卡语义归原轨道，Harness **不抢**                               |
| 流程        | **一任务一 PR**；中文 commit / PR 描述；引用规格页码或 `R-xxx` / 待确认 `Q-xxx`                           |
| 质量        | 本机 **typecheck / lint / test / build** 绿再合；远端 CI **unstable 为惯例**，不以远端 alone 否决本机闸门 |
| 工具        | 接线用 **Composer 2.5 或等价**，**不用 fast**；本地 Vite **8080** 配置勿提交                              |
| 资产        | 不提交 TTS/印刷图、`.cache`、evidence/proof JSON 链                                                       |

## 5. 已接勿重做（摘要）

- #560 二十五张 Room **几何**与 R-165～R-169；#562–#565 最暗普通房 **SPECIAL 运行时**（Evil Eye / Temple 等）。
- 遗迹 I 级四 Boss **生产 deploy + 自然存档**（#566–#585 链）及 Collector 文档链（#577–#581）。
- 最暗 I 级 Templars / Shuffling / Mammoth **deploy + 目录 + 自然存档**（上表 2.3）。
- 最终战 **R-186 生产部署**、**R-187 六卡目录**、**#597 自然路径到首形态部署/开战检查点**。
- Warm Up / 最终准备 / 补给 / 形态登记 / 形态 Acc 与最小 AI 等 **#420–#427 及 #429 后各 `phase5-final-*` 切片**（见 Grok 交接与 Nov 1 文档）。

## 6. 建议下一刀（DeepSeek Harness · 可选优先级）

按依赖与收益自选 **一条** 开 PR；多条须 **Kyries 批** 的已标注。

1. **（须 Kyries 批）** 最终战 **多形态胜利链**、形态间 **`finishDungeonBattle` 续接**、各形态 **完整 Boss AI**、或 **`combatReady: true` / `ancestorGlory` 运行时**。未批前仅可修 #597 文档边界内缺陷，**不得**自行翻开关。
2. **（已核 tip · 2026-11-04 接手复测）** 全量**确定性**红为 **4 文件 6 条**，均由 **#595 / #596** 自己引入，**不是**「与本交接无关」：`ancestor2-skills-acc.test.ts` 3 条（Refashion ×2 的拥挤区越出卡面射程 1；Unmake 的 4t 期望写成 3 枚）、`heart-of-darkness-skills-acc.test.ts` 1 条（目标 Crusader 带卡面 Stun 抗性，1t 应被抵消，R-033）、`monster-speed.test.ts` 与 `dungeon-ii-monster.test.ts` 各 1 条（#596 新增 p105/p106/p109 等已批卡未同步守门期望）。另有 5 条长场景在默认全并行下**超时抖动**（`quest-save`、`natural-wipeout-save`、`warm-up-natural-iii-replay`、`task-sources` ×2），单跑通过。修复见 [phase5-red-tests-595-596-2026-11-04.md](phase5-red-tests-595-596-2026-11-04.md)（仅测试与文档，不改准入）。
3. **（对照 tip + 最新 rulings）** 核心包余债：其它 Boss **II/III**、Shuffling **Echoing/Undulations 生产深化**、Mammoth **White Cell**、遗迹 Boss 高等级、英雄 **p044/p048/p063**、任务 SPECIAL 等——**勿**用 Nov 3 handoff「12 张 usable false」当当前表；以 `room_tile_geometry.json` 与 `docs/rulings.md` 为准，未裁定写 **Q-xxx**。
4. **明确不做**：无 Kyries 指令时 **不要** 默认启动 **Phase 6**、Stygian 运行时或「全核心盒自然战役一键通关」验收 PR。

## 7. 验证与 CI 说明

- Node **`24.21.0`**（`.nvmrc`）、pnpm **`12.9.1`**（根 `packageManager`）。
- #597 相关闸门见 [phase5-final-battle-natural-save-2026-11-04.md](phase5-final-battle-natural-save-2026-11-04.md) 内命令块；全仓 `pnpm test` 在 tip 上因 **§6.2** 的 4 文件 6 条确定性红（已由 [phase5-red-tests-595-596-2026-11-04.md](phase5-red-tests-595-596-2026-11-04.md) 修复）与长场景并行超时而不绿——**不表示** #597 路径未验收。
- Playwright / 长场景超时等历史问题见各 `phase5-*` 记录；修测试时限须 **单测独立加时**，勿全局放水。
- 本 PR **仅文档**（及可选一行旧 handoff 指针）；合入后从 **`origin/main` @ tip** 新建 `cursor/<主题>-b071` 分支继续。

## 8. 本地工作区

未跟踪 `.cache/`、私有核图、未入库 Nov 1 交接副本等 **保留不提交**。接手前 `git status --short` 除上述外应无业务代码脏改。

---

**发出方**：DDBG·核心包续 / Grok Bot · **2026-11-04（Asia/Shanghai）**  
**接手方**：DeepSeek Harness · **tip `685a20b8`**
