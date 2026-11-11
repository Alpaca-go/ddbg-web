# DDBG「核心盒收尾」交接（给 Codex）

> **日期**：2026-11-09（Asia/Shanghai）  
> **接手方**：Codex（一条一事；大型功能开 PR，小补可直接 `main`——以本仓近期惯例为准）  
> **发出方**：DDBG·核心包续 / Grok Bot（Kyries：写一份交接文档给 Codex）  
> **仓**：https://github.com/Alpaca-go/ddbg-web · 本机 `D:\ddbg-web`（machineId `b56e2651-c5ab-4795-bff7-f7d49993b1f4`）  
> **tip（交接时）**：`b72d14141c52fdaa497a2f3c2c0a8fc018eed6ca`  
> · `docs: 修正村庄事件持续天数为空时的显示`  
> **核对**：本机 `git rev-parse HEAD` → 同上；`main...origin/main` **0/0**（交接时）  
> **勿照抄为缺口**：
>
> - `HANDOFF-2026-11-01/03-codex-core-pack-remaining.md`、`HANDOFF-2026-11-05-core-pack-next-session.md`（未跟踪旧稿；usable / Boss II–III / Evil Eye 等均已过时）
> - `HANDOFF-2026-11-08-hero-skill-verification.md`（写作时 tip 较旧；扩展 7 名 II/III 与 #625 目录切流**已合**，勿再开「98 张核实」主刀）
> - 旧 C-* / A-5「可立刻开」表

## 边界（硬）

| 项                             | 口径                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **核心盒**                     | 遗迹 **Ruins** + **最暗地牢 Darkest Dungeon**（含 Stygian **模式骨架**已接；房间效果另刀）                                                |
| **R-001**                      | 只认规则书 + `docs/rulings.md`；不编造规则/数值                                                                                           |
| **R-048**                      | 不自发明印刷几何 / 未核实图标；拿不准开 `Q-xxx` 等 Kyries                                                                                 |
| **R-190**                      | 不为绿灯调自然策略 / 种子；不可胜就记 hold + Q                                                                                            |
| **Boss 输赢**                  | **不是**自动化目标；只验流程不冲突 / 不卡死（Kyries 2026-11-07）                                                                          |
| **Phase 6 / Stygian 房间效果** | 骨架已接；**17 张 Stygian 房间效果**须 Kyries 确认审核表后再接线                                                                          |
| **全局图标词典**               | Kyries **暂不**做全局修正；技能表逐卡核对优先。单卡错配用逐卡注解，**不要**改 `icon-dictionary-v1.8` 扫全仓                               |
| **合入习惯**                   | 中文 commit；引用 `R-xxx` / `Q-xxx`；本机闸门绿可合（远端 CI unstable 可按惯例）；合后 `git pull --ff-only`；vite **8080** 只留本地勿提交 |
| **模型**                       | 接线优先 **Composer 2.5**；或 Grok 4.5 Medium；**都不要 fast**                                                                            |
| **扩展包**                     | Weald / Warrens / Cove / CC / CoM 地点 Boss **勿抢**（英雄已核心化除外）                                                                  |

## 1. 现在在哪（一句话）

核心盒规则 / 战斗 / 存档**主干已完成**。剩下是 **P0 数据核准与 II/III 存档自然链**、**P1 Stygian 房间效果**、以及若干已划定的验收 hold。

写作时 tip 相对 `HANDOFF-2026-11-07` 的增量（已合，勿重做）：

| 合入附近               | 内容                                                        |
| ---------------------- | ----------------------------------------------------------- |
| `e24ebe2e`             | 中途 Boss 生产区域 + Undulations 自动分派                   |
| `698937ad`             | Stygian 模式骨架（0 金 / Boss +1 Crit / UI 警告）           |
| `4233b1b6`             | R-201 最终战自然存档验收边界（只到首形态）                  |
| `4f409967`             | 关闭 Q-141 / Q-145 / Q-154 / Purify 溢出 → **R-202～R-205** |
| `9c6f7d32`             | Stygian 17 房间逐卡审核表（**待 Kyries 确认**）             |
| `996ff2f4`～`a82bdea9` | 英雄／怪物／Boss／村庄等卡面文档与审核工作簿                |
| `#618`～`#625`（更早） | 扩展英雄 II/III 核实 + 十八英雄统一目录（`01425ba3`）       |

上一版权威入口：`docs/HANDOFF-2026-11-07-core-pack-next-session.md`（机制细节仍有效；**缺口表以本文 §3 为准**）。

## 2. 已完成，勿重做

### 2.1 房间 / Boss / 战役

- 25/25 具名 Room `geometryVerified`；普通/特殊房 **17** `usable`（含 Evil Eye / Temple）；8 Boss 房 `usable=false` 走专用 `deploy*`，**不是缺口**。
- 遗迹 4 Boss × I/II/III 生产入口；最暗中段 3 Boss deploy + 特殊机制（尖刺/Pit Toss、Echoing、White Cell Teleport 等，见 11-07 §1/§4.5）。
- 最终战四形态链；**自然存档自动化只到首形态**（R-201）。
- 战役：III → 最暗入口、随机抽 1/3（R-191/R-192）；失败「开新战役」等已接（见 11-07 切片索引）。
- Phase 6：`autoMonsterTurn` + 战斗 UI；中途 Boss 生产区域补丁已合。

### 2.2 任务 / 怪物 / 走廊

- Rising Threat、Purify、Dem Bones（R-197）；Purify 池满丢弃（R-205）；治疗泉与目标房边界见 R-197 补记。
- DL3 三怪 Speed/选招（R-196）+ 八招效果（R-198，Q-163 关）。
- 走廊：核心盒无走廊板块，误提取已删（Q-161）。
- Treasure T4–T5：**保持 `blocked: true`**（Kyries 2026-11-07）；旧「可通行」作废。
- Q-19 大型怪姿态顺移（R-199）。
- Q-141 / Q-145 / Q-154 已关（R-202～R-204）。

### 2.3 英雄

- 18 名正式英雄（R-200）；I–III 目录切流 **#625** 已合；扩展 7 名 II/III 核实批次 **#618～#624** 已合。
- Kyries 正在用横版九列表 / `docs/hero-skill-review-2026-11-08.xlsx` **人工逐卡核对**；**未交回修正前不要批量改数据**。
- 全局图标词典修正：**Kyries 已决定先不做**；继续技能表。

### 2.4 已关闭 Q（勿翻案）

沿用 11-07 §3：Q-158～Q-163、Q-19→R-199，以及本次 **Q-141 / Q-145 / Q-154**（R-202～R-204）。Templars 自然存档 **Q-162 保持 skip**。

## 3. 待办（按 P 级）

### P0

| id       | 项                        | 说明                                                                                                             | 状态                                 |
| -------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **P0-1** | 英雄技能逐卡核准          | Kyries 对照印刷改 Word/xlsx；交回后才可按差分开数据 PR                                                           | **等人**；勿抢改仓                   |
| **P0-2** | II/III 战役严格存档自然链 | R-194 模型 + `campaign-quest-save.test.ts` 已有；level 2/3 **不依赖打赢 Act I Boss**；机制夹具不能伪造 canonical | **hold**；等真实玩家链或 Kyries 另批 |

### P1

| id       | 项                         | 说明                                                           | 状态                     |
| -------- | -------------------------- | -------------------------------------------------------------- | ------------------------ |
| **P1-1** | Stygian 17 房间效果接线    | 骨架见 `docs/phase6-stygian-skeleton-2026-11-08.md`            | **待** Kyries 确认审核表 |
| **P1-2** | Stygian 房间逐卡审核表确认 | `docs/phase6-stygian-rooms-review-2026-11-08.md`（`9c6f7d32`） | **等人**                 |

### P2 / 已划定 hold

| id       | 项                           | 说明                                              |
| -------- | ---------------------------- | ------------------------------------------------- |
| **P2-1** | 最终战四形态连胜 / 整链 save | R-201：**不**纳入自动化；仅 Kyries 明示扩验收时做 |
| **P2-2** | Templars 自然存档            | Q-162 skip，**不要恢复**                          |
| **P2-3** | 全局图标词典                 | 暂缓；单卡用逐卡注解                              |

### 明确不做（除非 Kyries 明示）

扩展地点 Boss；Radiant 全模式；为绿灯调策略/种子；擅自改 `combatReady` / 任务白名单；未确认印刷数值。

## 4. 建议开工顺序

1. **有 Kyries 交回的技能表 diff → 按英雄/技能族开小 PR 落数据**（P0-1）。无交回时**不要**猜改 `hero_skill`。
2. **Kyries 确认 Stygian 审核表后 → P1-1 逐房效果**（一房或一小簇一 PR）。
3. **P0-2** 仅在 Kyries 批准「用真实玩家链补 level 2/3」或给出替代验收口径后开。
4. 闲时可整理文档/测试稳定性，**不要**重开已关 Q。

## 5. 开工检查

```powershell
git fetch origin main
git rev-parse HEAD   # 交接时 b72d1414…；若 main 已前进以 origin/main 为准
git status --short   # 仅允许 §7 未跟踪旧稿
pnpm typecheck
pnpm exec vitest run <改动相关测试> --maxWorkers=4 --testTimeout=30000
# 改动面大：pnpm test:changed
# 全量 pnpm test 只在收尾/里程碑（约 20 分钟）；不要每次小改都跑
```

Playwright 本机：见 11-07 §2（`PLAYWRIGHT_CHROMIUM_EXECUTABLE` → chromium-1234；workers=1）。`templars-i-save` 保持 skip。

数据重生成：

```powershell
$env:WRITE_NORMALIZED='1'; pnpm exec vitest run packages/data/src/normalize/normalize.test.ts
```

只提交有意的 `normalized/corebox/*.json` diff。

## 6. 关键文件地图

| 主题                   | 路径                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 本交接                 | `docs/HANDOFF-2026-11-09-core-pack-to-codex.md`                                                                         |
| 上一版机制交接         | `docs/HANDOFF-2026-11-07-core-pack-next-session.md`                                                                     |
| 裁定                   | `docs/rulings.md`（R-191～R-205、相关 Q）                                                                               |
| Stygian                | `docs/phase6-stygian-skeleton-2026-11-08.md`、`phase6-stygian-rooms-review-2026-11-08.md`                               |
| 英雄审核               | `docs/hero-skill-review-2026-11-08.xlsx`、`hero-skill-audit-vs-grok-doc-2026-11-08.md`                                  |
| 战役存档               | `packages/engine/src/campaign-quest-save.test.ts`、`quest-save.ts`；策略见 `phase5-player-strategy-act-i-2026-11-07.md` |
| 中途 Boss / 自动回合   | `battle-monster-auto.ts`、`docs/phase6-boss-auto-turn-2026-11-08.md`                                                    |
| Purify / Rising Threat | 见 11-07 §5 表                                                                                                          |

## 7. 未跟踪文件（保留，不要提交 / 删除）

```
docs/HANDOFF-2026-11-01-codex-core-pack-remaining.md
docs/HANDOFF-2026-11-03-codex-core-pack-remaining.md
docs/HANDOFF-2026-11-05-core-pack-next-session.md
docs/manual-room-tile-survey.md
docs/screenshots/_p001-geom-export.json
```

（`HANDOFF-2026-11-03-room-geometry-to-grok.md`、`HANDOFF-2026-11-04-*` 亦为历史稿。）

## 8. 工作约定速查

- 一任务一刀；中文 commit / PR；规则改动写页码或 R/Q。
- 卡面歧义 → `Q-xxx`，不猜。
- 自然战斗测试遵守 R-190；Boss 输赢不是断言目标。
- PowerShell：用 `;` 不用 `&&`；复杂 node 用临时 `.cjs`。
- 控制台中文可能乱码：读文件用编辑器 / `Get-Content -Encoding UTF8`，别靠乱码输出决策。

---

**当前可交付状态**：核心盒 Ruins + Darkest 主干可玩可审；收尾焦点 = **Kyries 技能核准 → 数据落差**、**Stygian 房间效果（确认后）**、**II/III 存档自然链（另批）**。
