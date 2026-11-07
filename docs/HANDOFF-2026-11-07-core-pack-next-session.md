# 交接：核心盒收尾（2026-11-07）

给新 session 的入口文档。写作时 `main` = `origin/main` = **`474e4203`**（本文件本身是紧随其后的一个提交）。工作区只有 6 个按约定保留的未跟踪文件（见 §7），不要提交。

## 1. 现在在哪

核心盒（遗迹 + 最暗地牢）的规则/战斗/存档主干已完成，剩下的是**收尾与数据核准**：

- 战役结构：III → 最暗入口、随机抽 1/3（R-191/R-192）。
- 战役存档：模型与跨任务严格回放（R-194）；II/III 验收缺一条合法 Act I 自然链。
- 中途 Boss：Templars 尖刺/Pit Toss（R-193）、Mammoth White Cell Teleport（R-195）、Shuffling Echoing 召唤 + 先攻洗入（R-034/R-197）均已接。
- 任务 SPECIAL：Rising Threat、Purify 已接；Dem Bones 既有路径已符合（R-197）。
- DL3 三张普通怪：Speed/选招已入库（R-196）；**八招技能效果已接**（R-198，Q-163 关闭）。
- 走廊：核心盒没有走廊板块，误提取数据已删除（Q-161）。

## 2. 新 session 先跑什么

```bash
pnpm install                     # 依赖已装则跳过
pnpm typecheck
pnpm exec vitest run <改动相关的测试文件>   # 每次改动只跑相关文件，几秒到一两分钟
pnpm test:changed                # 改动面较大时：只跑受改动影响的测试
pnpm test --maxWorkers=2 --testTimeout=30000   # 全量约 20 分钟，只在收尾/里程碑或用户要求时跑
```

**不要每次改动都跑全量 `pnpm test`**（2026-11-07 教训：一次 18–29 分钟，改几轮就一小时起步）。
默认闸门是 `pnpm typecheck` + 相关测试 + 改动文件的 eslint/prettier；全量留到一批工作收尾时跑一次。

基线（玩家策略链后）：**458 个测试文件 / 3310 通过 / 1 跳过**（skip 是 Q-162 的 Templars 自然存档；R-198 前为 456 / 3302）。

已知 Windows 长场景超时：`packages/engine/src/quest-save.test.ts` 的自然回放有自带的 20000ms 上限，并行时偶发超时，单独跑会过——不是回归。`natural-wipeout-save.test.ts` 同类：单独跑约 84s，并行全量下会撞 120s 上限（2026-11-07 放宽到 240s）。

Playwright：本机装的 chromium 是 **1234**，Playwright 1.63 默认要 1243；`playwright install` 在本机长时间无进展，因此改用环境变量指向已有 Chromium：

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='C:\Users\kyrie\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe'
pnpm --filter @ddbg/web exec playwright test --reporter=line
```

`playwright.config.ts` 只在设了该变量时才覆盖 `executablePath`，CI 不受影响。本地默认 **workers=1、timeout=120s、retries=1**（Windows + Vite 下并行会超时）。首轮稳定性整理后（55 条）：**53 通过 / 1 flaky（重试后过）/ 1 skip / 0 失败**，约 17 分钟；细节见 `docs/phase5-e2e-local-run-2026-11-08.md`。`templars-i-save` 按 Q-162 保持 skip。

## 3. 已关闭的 Q（别再翻案）

| Q     | 结论                                                         |
| ----- | ------------------------------------------------------------ |
| Q-158 | 核心盒 v1 中途 Boss 保持**显式命令**，自动选招/AI 归 Phase 6 |
| Q-159 | DL3 三怪 Speed/选招已入库 → R-196                            |
| Q-160 | 三条任务 SPECIAL + `dd2d2467ec`=Potion → R-197               |
| Q-161 | 核心盒无走廊板块（p8=PvP、BACK p1=Old Road）；误提取数据已删 |
| Q-162 | Templars 自然存档**保持 skip**（R-190：不为绿灯调策略/种子） |
| Q-163 | DL3 八招一次接完（方案 2 + cleanse 原语）→ R-198             |
| Q-19  | 大型怪让位：整块顺移 + 轨道边界截断 → R-199                  |

## 4. 当前待办（按建议顺序）

### 4.1 Q-163：DL3 三怪技能效果 —— 已完成（R-198）

八招已按**方案 2** 接线（Raider 3 / Hunter 2 / Adder 3），新增 `cleanse` 原语承载 Molt 的 Remove 行；三张卡不再因技能效果拒战。切片与数值表见 `docs/phase5-dl3-monster-effects-2026-11-07.md`。

- `verified-monster-effects.ts` 写入 8 条，`normalized/corebox/*.json` 已重生成。
- `dungeon-battle-l2-admission.test.ts` 的 DL3 用例改为断言 admitted；新增 `dl3-monster-effects.test.ts`。
- 仍需注意：cleanse 只接自身「Remove Bleed、Blight」整行；完整 AI / 自动选招仍归 Phase 6（Q-158）。

### 4.2 Q-19：位移终点切入大型怪两格之间 —— 已完成（R-199）

裁定为**顺移**：同阵营角色按「插入」顺移，大型怪 2 格整块让位并同向级联，顶到轨道头/尾则这一次姿态位移截断（区域位移按 R-020 ④ 照常）。`shuffle.ts` 已改，`b09-curio-natural-paths.test.ts` 的 Q-19 容忍已去掉（p001 / p005 各 100 种子全通过）。切片见 `docs/phase5-q19-large-monster-stance-shift-2026-11-07.md`。

### 4.3 II/III 战役存档验收

R-194 的模型已就绪（`createQuestSave` 写 `campaignLevel` 并校验回放），跨任务验收在 `packages/engine/src/campaign-quest-save.test.ts` 已过。

**机制夹具不能替代自然链**（2026-11-07 核实）：`createQuestSave` 会从 `start`（战役第一任务）重放整条命令日志，`advanceRuinsAct` 之前的状态必须真的由这些命令产生；`ruinsActReadyFixture` 这类合成状态过不了 `canonical` 比对，只能用于状态级测试，不能用来伪造 level 2/3 存档。

**自然链探测结论**（2026-11-07，seed 2/3/5/7/11，未调策略/种子）：

- 之前记的「村庄替补无法结束行动」是**测试驱动器**的问题：只试 Zealous Speech / 建筑，而当时个别英雄只有 `pray` / `chant` 被接受。改成「取任一被接受的公开行动」后村庄正常推进，引擎没有死锁。
- 顺带修了两个旁置目标房（p004 / p010）相关的真 bug：
  1. 出征沿用上一任务的 `deck/discard` 时没把本任务的旁置牌摘掉，导致第二个任务若是旁置目标房，目标房战斗被拒「旁置目标房间与普通牌堆不守恒」；现在 `roomCardsForQuest` 只摘旁置牌，其他牌序不动。
  2. 回村守恒等式没把旁置牌算回去（牌堆落成 8 张时误拒「Curio或遗迹房间牌池不守恒」）；现在 `recoverHamletPools` 把旁置牌补回等式并放回牌堆（下一任务再摘）。
- **玩家策略（Kyries 2026-11-07 批准）**：威胁前置 + 清剿优先（p001→p005，有 p019 必打）+ 保守战斗打分 + 每房「伤口+压力 > 6」休息 + 回村先治疗。seed 2 下两场普通任务胜利后 **`quest:p019` 正常进入 offer**（Boss offer 与威胁持续都验证了）；`player-strategy-act-i.test.ts` 固定在 seed 2 上跑「两场普通任务 → p019 offer → Boss 任务内探索/战斗到合法终局」，只断言**没有引擎拒绝/卡死**，不判断输赢。细节见 `docs/phase5-player-strategy-act-i-2026-11-07.md`。
- **Boss 输赢不再作为测试目标（Kyries 2026-11-07）**：那是玩家的决策。自动化只保证正常流程没有冲突；因此 level 2/3 存档验收不再依赖「打赢 Act I Boss」，继续 hold，等真实玩家链或后续需要时再补。

### 4.4 其它 hold

- Purify 的 **治疗泉常规效果**：已按 R-197 补记——目标房净化前不触发 `Healing Waters`（`objectiveRoomBattleAreas` 裁掉 `endTurnHeal`），普通房间仍按 R-065 治疗 3；不整体重做常规效果。
- Purify 池满 16 时「丢弃哪些既有补给」目前按**池尾自动丢弃**；若须玩家选择，另开 Q。
- Templars 自然存档 skip 已定（Q-162），不要恢复。
- Treasure T4–T5：**已确认保持 `blocked: true`**（Kyries 2026-11-07），旧交接稿的「可通行」作废，不改数据。
- **e2e 已恢复可跑**（本机 Chromium 1234 + 环境变量，见 §2）。`dungeon.spec` 已从 880 行连跑拆成 10 条；本地默认串行 + 重试一次。最新全量（55 条）：53 通过 / 1 flaky / 1 skip / 0 失败，约 17 分钟；`templars-i-save` 按 Q-162 skip。细节见 `docs/phase5-e2e-local-run-2026-11-08.md`。

## 5. 关键文件地图

| 主题            | 文件                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 战役入口 / 抽签 | `packages/engine/src/darkest-entry.ts`、`hamlet-embark.ts`、`darkest-setup.ts`                                                                                      |
| 战役存档        | `packages/engine/src/quest-save.ts`、`packages/data/src/quest-save.ts`、`campaign-quest-save.test.ts`                                                               |
| 中途 Boss       | `packages/engine/src/boss/templars-*`、`mammoth-cyst-teleport.ts`、`darkest-shuffling-horror-combat-runtime.ts`、`darkest-mid-boss-runtime.ts`                      |
| DL3 字段        | `packages/data/src/normalize/verified-monster-speeds.ts`、`verified-monster-stances.ts`、`verified-large-monster-fields.ts`、`normalized/corebox/monster_pool.json` |
| DL3 技能        | `packages/data/src/normalize/verified-monster-effects.ts`、`packages/engine/src/monster-effect-plan.ts`、`monster-skill.ts`                                         |
| Rising Threat   | `packages/engine/src/curio-room-guard.ts`、`dungeon-curio-room.ts`、`dungeon-monsters.ts`、`dungeon-battle.ts`                                                      |
| Purify          | `packages/engine/src/quest-provisions.ts`、`dungeon-starting-provisions.ts`、`dungeon-provision-use.ts`、`dungeon-objective.ts`                                     |
| 任务卡          | `packages/data/src/basic-quests.ts`（p004/p005/p010 的 SPECIAL 字段）                                                                                               |
| 网页            | `apps/web/src/dungeon-sandbox/**`（hamlet 入口、失败面板、QUEST 面板）                                                                                              |
| 裁定            | `docs/rulings.md`（R-191–R-199、Q-158–Q-163）                                                                                                                       |

切片记录（按时间）：`docs/phase5-darkest-act-entry-2026-11-05.md`、`phase5-darkest-quest-draw-2026-11-06.md`、`phase5-campaign-defeat-new-campaign-2026-11-06.md`、`phase5-campaign-save-model-2026-11-06.md`、`phase5-mammoth-teleport-2026-11-07.md`、`phase5-templars-spikes-review-2026-11-07.md`、`phase5-shuffling-horror-echoing-initiative-2026-11-07.md`、`phase5-dl3-monster-fields-review-2026-11-07.md`、`phase5-task-special-review-2026-11-07.md`、`phase5-rising-threat-2026-11-07.md`、`phase5-purify-fountains-2026-11-07.md`、`phase5-corridor-tiles-review-2026-11-07.md`。

## 6. 工作约定与坑

- **提交**：目前直接提交 `main`（内容补齐阶段）；**大型功能再开 PR**。提交信息中文，引用 R-/Q-。
- **不提交**：`HANDOFF-2026-11-01/03/05*`、`docs/manual-room-tile-survey.md`、`docs/screenshots/_p001-geom-export.json`、`.cache/**`。
- **R-190**：不许为让自然测试变绿去调策略/种子；不可胜就记录为已知 hold + Q。
- **R-048**：不猜图标/数值/规则；卡面数字与图标必须来自已确认数据。
- **数据重生成**：`$env:WRITE_NORMALIZED='1'; pnpm exec vitest run packages/data/src/normalize/normalize.test.ts`（会重写 `normalized/corebox/*.json`；只提交有意的 diff）。
- 控制台中文可能乱码，读文件用 read / grep 工具，别用 cat。
- **测试节奏**：每次改动跑 `pnpm typecheck` + 相关测试文件 + 改动文件的 eslint/prettier；改动面大用 `pnpm test:changed`；`pnpm test` 全量只在收尾/里程碑或用户要求时跑，别每次改动都跑。
- **Boss 输赢不是测试目标**：Boss 战是玩家决策，自动化只验证正常流程没有引擎拒绝/卡死/异常。

## 7. 未跟踪文件（保留，不要提交）

```
docs/HANDOFF-2026-11-01-codex-core-pack-remaining.md
docs/HANDOFF-2026-11-03-codex-core-pack-remaining.md
docs/HANDOFF-2026-11-05-core-pack-next-session.md   ← 本文件的上一版，已过时
docs/manual-room-tile-survey.md
docs/screenshots/_p001-geom-export.json
```

（`docs/HANDOFF-2026-11-03-room-geometry-to-grok.md`、`HANDOFF-2026-11-04-*` 也是历史交接，未跟踪。）
