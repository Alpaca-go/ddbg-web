# Codex → Grok Bot 交接（2026-10-31）

Kyries 本聊天最新指令：**“写好交接文档，然后合并，接下来交给grok bot”**。本交接随 #427 合入；完成后 Codex 停止新增开发，由 Grok Bot 接手。不是新增数据审批，也不是解除既有 hold。

## 1. 从哪里开始

- 仓库：`D:\ddbg-web`，远端 `Alpaca-go/ddbg-web`。
- 本轮代码提交：`f8afccdf`（#427，Warm Up 暗房清理）；合并前主线 `aa6357d6`（#426）。交接文档提交追加在 #427 同一分支，合入后以 `git log -1 origin/main` 查询最终合并提交，勿把这里的代码 tip 当最终 main。
- 先读本文、`AGENTS.md`、`docs/rulings.md`，再读 [核心包余下工作总表](HANDOFF-2026-10-29-codex-core-pack-remaining.md) 顶部的最新分类。总表下部有大量历史状态，不能照抄为当前缺口。
- 本轮只合入 #427 与本文，不批量合并其它开放 PR；交接不含向外部机器人发送消息。
- 用户优先级持续有效：**待裁定/核对与反复阻塞的先保留，优先核心盒已有依据的数据/运行时；零碎旧欠账随后处理。** 核心盒 = Ruins + Darkest Dungeon，不抢地点扩展。

## 2. 本聊天已完成的切片

| PR   | 已交付                                                            | 详细记录                                                        |
| ---- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| #420 | 憎恶 Transform 战役持有、公会/训练/铁匠升级、真实入场校验         | [憎恶持有](phase5-a6-abomination-ownership-2026-10-31.md)       |
| #421 | Break Them / They Are Back 指定怪物与属性加成数据计划；不开放战斗 | [任务怪物计划](phase5-quest-monster-plan-2026-10-31.md)         |
| #422 | 指定怪物目标房不能降级为普通随机遭遇；部署/入场均保留停点         | [入口保护](phase5-quest-monster-deployment-guard-2026-10-31.md) |
| #423 | 最暗胜利后固定4天准备，不抽事件；网页/命令/存档白名单             | [最后村庄](phase5-final-preparation-2026-10-31.md)              |
| #424 | 最终战前补给、自选面、奖励骰；完成后仍不进探索                    | [最终补给](phase5-final-battle-provisions-2026-10-31.md)        |
| #425 | 最终补给前应用铁匠临时技能、洗回游商未购陈列                      | [出征装备](phase5-final-embark-loadout-2026-10-31.md)           |
| #426 | 最终形态序列与跳过、胜利续接边界、网页展示；部署仍 hold           | [形态流程](phase5-final-form-sequence-2026-10-31.md)            |
| #427 | Warm Up the Halls Torch点亮暗房、清理及待发XP，含满光照网页入口   | [Warm Up](phase5-warm-up-dark-room-2026-10-31.md)               |

#420–#426 已在主线；#427 与本文是本次最后合并项。不要重复开发上述内容。A-4/A-7/A-9 都没有标全完；英雄 II/III 可用目录仍是151/154，p044/p048/p063及Q-126/Q-127继续保留。

## 3. 建议下一刀：Warm Up 的开局改Torch

当前 #427 **只实现点亮/清理/XP**。QUEST FRONT p11 另一条SPECIAL：“After rolling for Provisions, each Hero may turn one of them into a [Torch]”仍未接。

可从以下位置继续核对并实现，遇到未裁定语义继续提出待确认项，不自行猜测：

- `packages/engine/src/dungeon-starting-provisions.ts`：普通8骰、Radiant/Wild选择、奖励骰与后续续接；保留原骰和RNG，不能重新掷骰或跳过其它既有待选。
- `packages/engine/src/hamlet-traveling-merchants.ts`：已有逐英雄改骰模式可参考，但不要直接假定同任务规则的顺序、奖励骰归属或可选范围完全一致。
- `packages/data/normalized/corebox/quest_cards.json` 的 `quest:p011`：已入库卡文；印刷文字仅作卡面数据，规则优先官方规则书 + 本项目裁定。
- 当前 `createCoreDungeonQuest` 单任务沙盒入口不开放普通 II/III 任务；测试应使用明确机制夹具或真实战役续接，不为图方便扩大开局白名单。

当前点亮实现位于 `dungeon-light.ts` 的 `warmUpDarkRoomNeedsTorch` / `useDungeonTorch`，摘要例外在 `dungeon-quest.ts`。普通Dark仍不清理，p011必须先结算入房减光，然后完整效果间使用真实Torch。满光照5也可点亮；三间最多3XP，到回村才发。

## 4. 最终战现状与下一步的硬依赖

已经有真实命令准备流程：

`beginFinalPreparation` → 4天已有村庄行动 → `beginFinalBattleProvisions` → `rollDungeonProvisions` / `resolveChoice` → `prepareFinalBattleForms` → **awaitingDeployment停点**。

- `final-preparation.ts`：复用持有技能检查、`applyTemporarySkillUpgrades` 和 `washNomadDisplay`；开始补给前完成原子交接，原卡归还计划继续保留。
- `boss/final-form-sequence.ts`：根据最暗任务取消前三形态之一，完成记录必须是精确前缀；Heart不可跳过。
- `finishDungeonBattle` 仅当最终形态进度已是 `fighting`、对应Boss实体实际死亡、终局victory且无待选时推进。**目前没有生产路径从 awaitingDeployment 进入 fighting**；测试是明示逻辑终局夹具。
- 形态间保留同一个BattleState、英雄伤口/压力/姿态与资源，不休息、不恢复、不自由重排，不把它当普通任务回村。
- **未接**：Ancestor Room获批几何/实际部署、各形态技能与特殊能力执行、从待部署进入战斗、形态间生成/先攻重洗/新一轮、最终战完整胜利与自然战役存档验收。
- `command.ts` 顶层在 `finalBattleProvisions` 存在时冻结普通流程，目前只放行补给和已接的最终流程命令。以后接真实战斗时须明确调整此路由；不能只改进度为fighting就宣称可玩。
- `readFinalBattlePlanAfterDarkestVictory` 目前要求 `d.phase === inHamlet`、最暗胜利、已发XP、完整回村。以后引入最终战专用阶段，要一起调整查询/续接，不能丢失原任务身份或绕过准备。
- 最暗Boss能力目录的 `combatReady: false` 仍有效，不能因准备流程完成而改成true。

## 5. 其它剩余与审批边界

- Break Them指定III级Bone Bearer、They Are Back指定Bone Captain(+20 Life/+2 Dodge)目前只有计划及拒绝错误普通遭遇的保护；指定生成执行器未完成。后者卡面没有明示怪物等级，计划保留null。
- Ruins四Boss专属房间几何/区域绑定、剩余Room Tile、最暗地牢及Ancestor房几何、未审核Speed/选招/图标继续hold。已确认QuestMap布局与R-121三Boss位不是战斗板几何审批。
- 最暗普通怪物/能力文字目录、升幕状态/池切换/命令/网页均已有切片；数据入库、夹具通过不等于完整可战斗或自然跨幕验收。
- Stygian只有房间文字/替换关系数据，不开放困难模式；桌面UI S4–S11等原暂停项不因本次交接恢复。Musketeer等目录后续裁定与总表历史不一致时以现行rulings/代码为准。
- 不新增FAQ来源，不发明数值、几何或图标；不提交私有卡图、印刷图、`.cache`，不建evidence/proof JSON链。

## 6. 验证和本机状态

最近 #427 的代码版本已通过：

```powershell
pnpm typecheck
pnpm exec vitest run packages/engine/src/warm-up-dark-room.test.ts packages/engine/src/dungeon-light.test.ts packages/engine/src/dungeon-quest.test.ts
pnpm --filter @ddbg/web exec playwright test e2e/warm-up-dark-room.spec.ts --workers=1
pnpm build
```

3个引擎文件25项、1条Playwright机制冒烟通过；修改文件ESLint/Prettier和`git diff --check`通过。最终准备相关单测与 `e2e/final-preparation.spec.ts` 的验证细节见各切片记录。

**不是全库全绿**：既有全库lint、规范化快照、provision-use、长场景和其它浏览器欠账未全修；读取#427原代码head时远端质量检查failure，浏览器检查仍in_progress，不写成CI通过。交接文档追加后的CI以最新head另查，不继承旧head结论。夹具不等于自然III级任务、真实Boss击杀或全程存档回放。

本机实际Node `v24.20.0`，pnpm `12.9.1`；仓库要求Node `24.21.0`（`.nvmrc`）。本轮未改运行时安装。8080配置保留本地，勿提交端口改动；Playwright复用可用服务，不随意结束用户进程。

交接前仅有未跟踪 `.cache/`，保留未提交。本机日志 `.cache/warm-up-dark-{tests,types,build,e2e}.log` 仅供本机复核，不是仓库依赖或证据链。最终交付后应在main，`git status --short`除原有`.cache/`外无代码改动；从主线新建`codex/`主题分支继续，一任务一PR，中文描述并引用规则条目。
