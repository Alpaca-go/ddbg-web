# Weald P1 未确认项盘点（2026-11-19）

> **历史快照（2026-11-19）**：核心规格现行稿已是 **v0.3**（#799）；混合 II→III 已由受控夹具覆盖（#797/#798）；V1 已于 2026-11-19 停止，自然全胜不再作流程门槛。下文 U3／U4 的“待做”“需要 V1”已被取代，当前状态以 [开发计划](../plans/weald-development-plan.md) 为准。

基准：`main` @ `4a7e504b`（#790 合入后）。范围：核心盒＋Weald；PvP 与人工实机不在本轮。本文只记录现状、证据与待拍板项，不新增规则。

## U1 规则规格书整稿复核（延后）

- Weald 规格书 v0.1 头部仍写“本稿待 Kyries 复核”；核心规格书现行稿为 **v0.3**（待复核，检查点 ① 未完成），v0.2 仅为历史快照。
- Kyries 已明确留到最后，本批不动。

## U2 Q-186 残留边界

Q-186 主体（卡面、12 面几何、真菌位置、任务／奇物／房间／Boss 印刷效果、九张 Stygian 房）已核准。计划中保留的三项边界是：

| 项                 | 证据                                                                                                            | 现状                                                | 建议                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------- |
| 全局图标词典       | Q-186 状态行；`docs/rulings.md` R-200 / Q-186                                                                   | 不把 Weald 每卡确认的图标写入全局词典               | 保留为边界，不再当作待审问题     |
| I 级原目录验证标记 | `packages/data/src/weald-room.ts` 的 `runtimeReady: z.literal(false)`；`weald-rooms.ts` 的 `runtimeReady:false` | 房间卡仍不因核准自动 `usable`；部署走独立核准选择器 | 保留到规格书整稿复核；本批不翻转 |
| PvP 范围边界       | AGENTS／Q-186 状态；Weald 包 PvP 卡未进主线                                                                     | PvP 未接                                            | 保持排除                         |

**已确认（Kyries 2026-11-19）**：以上三项记为“保留边界”并结案，不再作为每批重复的未确认问题。

## U3 R-272／R-273 验收状态

| 项                      | 现状                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| R-272 正式 Stygian 出征 | 已接线；Stygian I→II 自然链已由 #786（seed 20）验收。混合 II→III 已由受控夹具覆盖；自然全胜不作门槛。    |
| R-273 跨地点地牢侧威胁  | 已收口：遗迹 Boss 全部地牢侧入口＋Weald 的 Hag／Pounder／Shrieker 入口；村庄侧不变                       |
| 混合 II→III             | 由 `wealdMixedActReadyFixture`／公开命令覆盖升幕与存档；`naturalActTwoBoundary` 仍为 false，但不再作门槛 |

**已更新（2026-11-19 后）**：R-272 的“未验收”已细化为“Stygian I→II 已验收；混合 II→III 受控夹具覆盖；自然全胜不作门槛”；无需再按旧建议重复。

## U4 Act II 停点探测（5 seed，仅第一趟 II 级任务）

方法：从 `wealdFaceTheThreatNaturalCrossActJourney` 的 II 幕出征末态继续，用现有 Weald 自然驱动（含 `useCombatProvisions`）跑第一趟 II 级任务；不访问公会，不调策略。基线已入库为 [weald-act-two-probe.test.ts](../../packages/engine/tests/weald/weald-act-two-probe.test.ts)（快照，非验收，V1 会替换）。记录如下（**探测记录，不是验收**）：

| seed | 模式     | II 级任务          | 结果                                               |
| ---- | -------- | ------------------ | -------------------------------------------------- |
| 7    | Radiant  | `quest:weald:p009` | 正常退出，`cleared=["D"]`，1 XP，四人存活但均 1 级 |
| 13   | Radiant  | `quest:weald:p006` | `noWaitingHeroes`（替补耗尽）                      |
| 56   | Radiant  | `quest:weald:p006` | `noWaitingHeroes`                                  |
| 90   | Standard | `quest:weald:p010` | `noWaitingHeroes`                                  |
| 20   | Stygian  | `quest:weald:p010` | `noWaitingHeroes`                                  |

**结论（仅限这 5 颗种子）**：

- 现有驱动只在 seed 7 完成一趟 II 级任务，且只有 1 XP；没有一颗种子完成两趟普通任务＋II 级 Boss。
- 驱动不访问 `visitGuild`，英雄全程 1 级；这与“II 级任务难”相关，但**不能**据此断言是唯一原因。
- V1 后续接入了公会／技能／村庄与战斗策略，但于 2026-11-19 停止：Boss 胜负属玩家决策，自然全胜不再作为流程门槛。本表只保留为早期探测记录。

## U5 `usable`／`runtimeReady` 标记口径

- `weald-room.ts` 对房间卡固定 `runtimeReady:false`；`weald-rooms.ts` 的 `verifiedEffect.runtimeReady` 也为 false，部署由独立核准选择器承担。
- 这些是 Q-186 的审阅标记，不是“未实现”。翻转会改变 schema 对房间卡的接受口径，可能影响部署／UI。
- **已确认（Kyries 2026-11-19）**：保留到规格书整稿复核，不因本批验收翻转。

## U6 R-200 的 98 张扩展高等级技能

- 8 个逐英雄 II/III 测试文件：`antiquarian`、`core`、`flagellant`、`houndmaster`、`leper`、`man-at-arms`、`musketeer`、`shieldbreaker` 的 `*-higher-skills.test.ts`。
- `FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS = []`，18 名正式英雄均无“未接线战斗技能”标记。
- Musketeer 已由 Kyries 确认完成并进入英雄选池。
- **建议**：U6 结案为“已逐卡覆盖”，不再把 R-200 的旧待办句当作未完成项。

## 已拍板（Kyries 2026-11-19）

1. U2 三项记为“保留边界”并结案。
2. U5 保持 `usable/runtimeReady=false` 到整稿复核。
3. U4 的 V1 方向（`visitGuild`＋村庄／战斗策略＋有界入库探测）按此推进。
