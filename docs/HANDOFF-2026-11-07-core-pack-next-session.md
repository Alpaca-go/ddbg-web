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
pnpm test --maxWorkers=2 --testTimeout=30000   # 全量约 20 分钟
```

基线（R-199 后）：**457 个测试文件 / 3307 通过 / 1 跳过**（skip 是 Q-162 的 Templars 自然存档；R-198 前为 456 / 3302）。

已知 Windows 长场景超时：`packages/engine/src/quest-save.test.ts` 的自然回放有自带的 20000ms 上限，并行时偶发超时，单独跑会过——不是回归。

Playwright 浏览器版本本机不匹配（需要 chromium 1243，本机 1234），**e2e 跑不了**；网页路径用组件测试覆盖。

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

R-194 的模型已就绪（`createQuestSave` 写 `campaignLevel` 并校验回放），跨任务验收在 `packages/engine/src/campaign-quest-save.test.ts` 已过。缺的是**合法的 Act I 自然链**：自然策略在 R-190 下会输（等替补耗尽），不能为绿灯调策略/种子。需要：人工逐日记录一条合法 Act I 路径，或批准一套玩家策略。

### 4.4 其它 hold

- Purify 的 **治疗泉常规效果**（未净化不生效）仍 hold，见 `docs/phase5-a07-purify-set-aside-2026-11-01.md`。
- Purify 池满 16 时「丢弃哪些既有补给」目前按**池尾自动丢弃**；若须玩家选择，另开 Q。
- Templars 自然存档 skip 已定（Q-162），不要恢复。
- 旧 P2「Treasure T4–T5 口径冲突」（仓内 `blocked: true`，旧交接稿称可通行）仍**未确认**，需要 Kyries 拍板。

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
- `pnpm test` 全量约 20 分钟，别在等待时重复跑。

## 7. 未跟踪文件（保留，不要提交）

```
docs/HANDOFF-2026-11-01-codex-core-pack-remaining.md
docs/HANDOFF-2026-11-03-codex-core-pack-remaining.md
docs/HANDOFF-2026-11-05-core-pack-next-session.md   ← 本文件的上一版，已过时
docs/manual-room-tile-survey.md
docs/screenshots/_p001-geom-export.json
```

（`docs/HANDOFF-2026-11-03-room-geometry-to-grok.md`、`HANDOFF-2026-11-04-*` 也是历史交接，未跟踪。）
