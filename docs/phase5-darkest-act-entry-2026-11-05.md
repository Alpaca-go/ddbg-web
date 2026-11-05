# III → 最暗入口与固定提供 p016（2026-11-05）

**基线**：`49525e9a`（#615 Fanatic II/III 合入后）
**授权**：Kyries 2026-11-05 本对话确认「第 4 幕只打 1 张最暗任务；本刀固定提供 p016」，见 [R-191](rulings.md)。
**范围**：Act III Boss 后的最暗战役入口 + 固定提供 p016 的最小垂直切片：入口命令、单候选确认、出征最暗布置。不改 Boss 特殊机制、`usable` / `combatReady`、任务白名单。

## 结构裁定（先于实现）

11-05 交接稿 §3.2（本机未跟踪副本）的「p016 → p017 → p018 三连」与规格书冲突：

| 来源                      | 文本                                                                       |
| ------------------------- | -------------------------------------------------------------------------- |
| 规格书 §2.1               | Act IV：① 最暗地牢任务（3 选 1，随机抽）→ ② 最终战（Heart of Darkness）    |
| 规格书 §14.7.3            | 3 张最暗地牢任务卡**随机抽 1 张（不是 2 选 1）**；该任务取消最终战一个形态 |
| 规格书 §15 L1 QuestSelect | 第 4 幕：随机 1 张最暗地牢任务                                             |
| `docs/plan.md` 第 4 幕    | 最暗地牢任务 + 最终战；打其中 3 个形态，跳过哪个由此前完成的任务决定       |
| 本切片                    | **只打 1 张**；随机 1/3 抽签未接（Q-155），暂时固定 p016                   |

三张全打会把 Ancestor 1、Ancestor 2、Gestating Heart **三个形态全部取消**，与「前三个形态中有一个被最暗任务取消、第 IV 形态不能跳过」直接矛盾。因此不实现三连，也不把 p016–p018 塞回普通 2 选 1 池（R-120）。

## 接入

| 层       | 改动                                                                                                                               |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 引擎命令 | 新增 `packages/engine/src/darkest-entry.ts`：`readDarkestDungeonEntryReadiness` / `darkestActEntryPending` / `enterDarkestDungeon` |
| 入口     | 固定 p016「We Are The Flame」单候选 `hamlet-next-quest:*` 待选；不抽卡、不消耗 RNG、不新增状态字段                                 |
| 前置     | Act III Boss 胜利 + 3 XP 已发 + 回村完成 + **该次村庄阶段结束** + 3 个 Boss 已击败 + 3 级；无待选、无迫近威胁、四人存活            |
| 出征     | `chooseNextQuest` 最暗分支复用 `setupDarkestDungeon`：16 房、3 Boss 位、26 张最暗怪物、8 张最暗普通房间、III 级饰品                |
| RNG      | `placeDarkestRooms` 增加 `startCursor`；自然战役续接既有游标，不回到 0 重放（沙盒入口仍用 0，布局不变）                            |
| 拦截     | Act III Boss 后 `offerNextQuest` 直接拒绝，不再回落到 III 级剩余普通任务（旧行为会给出 2 选 1 或错位的 Face the Threat 提示）      |
| 存档     | `savedCommandSchema` 接受无载荷 `enterDarkestDungeon`（与 `advanceRuinsAct` 同型）                                                 |
| 网页     | 村庄准备完成后显示「进入最暗地牢（p016 We Are The Flame）」；该状态下不再显示「抽取下一任务」                                      |

依据：核心 R35–R36；规格书 §2.1 / §14.7.1–.3 / §15；R-120（最暗任务不进普通池）、R-121（Boss 位布置）、R-048（不发明规则）。

## 验证

```bash
pnpm exec vitest run packages/engine/src/darkest-entry.test.ts
pnpm exec vitest run apps/web/src/dungeon-sandbox/hamlet/hamlet-event-section.test.tsx
pnpm exec vitest run \
  packages/engine/src/darkest-setup.test.ts \
  packages/engine/src/hamlet-embark.test.ts \
  packages/engine/src/hamlet-ii-embark.test.ts \
  packages/engine/src/hamlet-higher-embark.test.ts \
  packages/engine/src/quest-save.test.ts \
  packages/engine/src/dungeon-quest-entry.test.ts \
  packages/engine/src/act-transition-readiness.test.ts \
  packages/engine/src/advance-ruins-act.test.ts
pnpm typecheck
```

- 新增 8 条引擎测：入口前置、单候选与零 RNG、确认后的最暗布置（16 房 / 唯一目标在三 Boss 位 / 26 张最暗怪物 / 8 张房间 / III 饰品 / 抽补给停点）、同状态回放一致、`offerNextQuest` 拒绝、重复入口拒绝、II→III 升幕后残留的 II 幕 p019 摘要不误触发入口、存档命令 schema。
- 新增 2 条网页组件测：III 幕后村庄准备完成只显示「进入最暗地牢」，点击 → 确认 → `awaitingProvisions`（16 房 / 26 怪 / III 饰品）；II 级不显示最暗按钮。
- 机制夹具 `act-three-complete.ts` 明确标注为夹具，不代表自然打通 III 幕（R-190）。
- 回归：Boss 108 文件 / 787 测、数据 76 文件 / 298 测、相关出征/存档 41 测、`typecheck`、`build`、变更文件 ESLint / Prettier 通过。
- 全量 `pnpm test --maxWorkers=2 --testTimeout=30000`：**452 文件 / 3280 测通过**。首轮全量曾在 `warm-up-natural-iii-replay` 暴露误判（II→III 升幕后仍带 II 幕 p019 摘要），已用「已击败 3 个 Boss」区分并加回归测。

## 边界（诚实）

- **浏览器冒烟未加**：本机 Playwright 1.63 需要 `chromium_headless_shell-1243`，本地缓存只有 `1234`，`playwright install` 下载无进展。入口网页路径改由组件测覆盖；下次在有浏览器的环境补 1 条 e2e（注入 `actThreeCompleteFixture` → 点入口 → 确认）。
- **随机 1/3 抽签未接**（Q-155）：本切片固定 p016；p017/p018 的生产入口仍只走沙盒。
- **严格存档未覆盖**：`QuestStart` 仍只有 seed/quest/mode/party，III→最暗不能单独 `createQuestSave`；本切片以公开命令回放与机制夹具验收。
- **未接**：最暗中途 Boss 特殊机制（Templars 尖刺/Pit Toss、Shuffling Echoing/Undulations 完整召唤、Mammoth White Cell Teleport/紫星）、最终准备门槛收紧、战役级存档与全链自然回放。
- 不改 `readFinalBattlePlanAfterDarkestVictory`：它只看「最暗 Boss 胜利 + 已发 XP + 回村完成」，在单最暗任务结构下不再需要三连顺序校验；后续仍可与最终准备门槛一起收紧。
