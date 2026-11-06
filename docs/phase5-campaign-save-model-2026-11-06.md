# 战役级存档模型第一步（2026-11-06）

**基线**：`3617291c`（战役失败面板已合入）
**授权**：Kyries 2026-11-06「按你建议的来」；模型裁定见 **R-193**。
**范围**：明确战役级严格存档的模型（起点 + 全段日志 + 等级声明），补跨任务验收；不改回放语义、不新增快照信任、不动 Boss 机制。

## 模型（R-193）

| 项   | 约定                                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 起点 | `QuestStart` 是**战役起点**：seed + 第一个任务 + mode + party；`p019` 沙盒入口仍允许，但中途任务不能当起点                                        |
| 日志 | 命令日志覆盖从起点到保存点的整段战役：回村、村庄准备、`offerNextQuest`/`resolveChoice`、`advanceRuinsAct`、`enterDarkestDungeon` 等全部是公开命令 |
| 等级 | `QuestSave.campaignLevel`（1–3）保存时写入，读档时与回放结果比对；旧档缺省按回放解释                                                              |
| 回放 | 仍是「种子 + 命令 + 快照校验」；快照只做一致性校验，不参与恢复                                                                                    |

## 改动

- `packages/data/src/quest-save.ts`：`questSaveSchema` 增加可选 `campaignLevel`（v1 旧档兼容）。
- `packages/engine/src/quest-save.ts`：`createQuestSave` 写入保存时等级并校验；`loadQuestSave` 校验声明等级与回放一致。
- `packages/engine/src/test-helpers/natural-quest.ts`：新增 `handleDeaths` 选项（默认关闭）。开启时按公开命令完成驿站替补（`prepareReplacementHero` → 选择 → `joinPreparedReplacements`），供跨任务战役回放使用；**不改战斗策略、不改种子**（R-190）。
- 新增 `packages/engine/src/campaign-quest-save.test.ts`（3 测）。

## 验收

- **跨任务战役存档**：从 `quest:p001` 起点用公开命令打完第一任务、回村、村庄准备、抽并选定第二任务，`createQuestSave` 成功；`loadQuestSave` 严格相等（含 `start` 与完整命令日志）。
- **等级声明**：把 `campaignLevel` 伪造成 2 → 读档拒绝；快照篡改金币 → 拒绝；删除 `campaignLevel` 的旧档仍可读。
- **起点语义**：把当前任务（`quest:p002`）当 `start` 保存跨任务状态 → 拒绝。

```bash
pnpm exec vitest run packages/engine/src/campaign-quest-save.test.ts
pnpm typecheck
```

- 新增 3 测（跨任务存取 / 等级声明 / 起点语义）；相关回归 5 文件 17 测通过（含既有 `quest-save`、`necromancer-i-natural-save`、`final-battle-natural-save`、`ii-natural-replay`）。
- 全量 `pnpm test --maxWorkers=2 --testTimeout=30000`：**454 文件 / 3287 测通过**；`typecheck`、`build`、变更文件 ESLint / Prettier 通过。

## 仍未完成（诚实）

- **II/III 的验收链没有打通**：要走到 II 级，必须自然打完 Act I 的 2 个普通任务 + p019。按 R-190 不许为绿灯调策略或搜索种子；实测自然策略（seed 2、radiant、naturalParty）在第 2 个任务前后就耗尽驿站等待英雄代币 → 战役失败。因此本切片只证明了**跨任务**严格存档与等级模型，Act II 的存档验收留到「完整自然战役回放」切片（需要合法玩家策略或逐日人工记录，不能用夹具冒充）。
- 未实现按任务分段存档/快照续接；日志仍是整段战役。
- 浏览器 e2e 未加（本机 Playwright 浏览器版本不可用）。
