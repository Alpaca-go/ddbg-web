# 执行计划：图标语义解耦（A + C）

日期：2026-11-23。交给 Codex 执行的长期计划。
前置阅读：[AGENTS.md](../../AGENTS.md)、[docs/id-naming-rules.md](../id-naming-rules.md)、
[docs/rulings.md](../rulings.md)（R-048、R-200）、
[hero-annotations/README.md](../../packages/data/src/core/heroes/annotations/README.md)、
[HANDOFF-2026-11-23-hero-annotations.md](../handoffs/HANDOFF-2026-11-23-hero-annotations.md)。

## 0. 问题与决策

现状的根因：

- 提取器第 2 阶段是**感知聚类**（`tools/pipeline/extract-print/scripts/ddbg_extract/cluster.py`）：
  按 pHash / 颜色 / 尺寸的阈值把视觉相近的图标并成一簇，`iconId = sha1(簇首签名)[:10]`。
  结果：**一个 iconId 可能同时代表多个字形**（例：`20ffe98e2d` 既是 Battle Heal 的治疗，
  又被 Purge III / Revenge 的伤害/目标标记共用）。
- 而规则层把 `icon.key` 当语义用，于是聚类错误直接变成规则错误；
  为绕开它，h12–h18 写了大量逐卡 `cloneKey` / 重建行的补丁。

决策（Kyries 拍板）：做 **A + C**。

- **A（架构）**：规则只来自逐卡注解（`verified_*` 数据）；图标降级为显示层。
- **C（数据源）**：提取器收紧聚类，做到「一个字形一个 ID」。
- A 是必做项；C 在 A 之后做，作为数据质量改进。

**目标终态**：英雄注解层全是数据（`hNN` 文件不再有 `cloneKey` / rekey 类代码）；
引擎不读 `icon.key` 决策；字典只负责标签/可读性。

## 1. 终态设计

### 1.1 数据

规范化数据里，一张技能卡的规则语义**只能**来自这些字段（已有或按需扩展）：

| 字段                                                                          | 用途                                           |
| ----------------------------------------------------------------------------- | ---------------------------------------------- |
| `verified_status_effects`                                                     | 状态（stun/bleed/…，含 scope/duration/amount） |
| `verified_damage_bonus` / `verified_damage_bonuses`                           | 条件伤害 / 多行伤害                            |
| `verified_range`                                                              | 射程                                           |
| `verified_target_header`                                                      | 目标框                                         |
| `verified_target_heal` / `verified_target_stress` / `verified_target_support` | 治疗 / 压力 / 支援                             |
| `verified_self_range` / `verified_self_heal` / `verified_self_stress`         | 自身效果                                       |
| `verified_rallying_flare` 等技能专属字段                                      | 单技能结算参数                                 |

需要新增语义时，**扩展 `verified_*` 字段 + schema + 逐卡数据行**，
不要新增「从图标猜」的逻辑。

`effect_lines` / `stats_line` 的保留用途：

- 卡面显示；
- 漂移断言（签名）。

### 1.2 签名

逐卡断言改为 **「文本 + 语义族序列」**，不绑定具体字形：

```text
"{target_effects} {damage} +2 vs {mark}"
→ "text: |family:target_effects|text: +2 vs |family:mark|"
```

好处：换来源、换尺寸、换底色都不影响签名；如果某个字形被错误归族并被纠正，
签名会随之变化，正好触发复核。
具体字形的视觉身份（phash/尺寸）作为 `fingerprint` 存在数据里，只用于重新提取时归族和 QA，
不参与签名、不参与规则。

### 1.3 引擎

规则解析函数只读 `verified_*`；`icon.key` 只允许出现在：

- 显示层（把图标渲染成文字/图像）；
- 与卡面外观相关的测试（golden 断言）；
- 明确标注「仅为签名/显示」的辅助函数。

`packages/engine/src/hero-skill.ts`（3469 行）是主战场；其它需要审计的文件至少包括：

```text
packages/engine/src/hero-skill.ts
packages/engine/src/abomination-skills.ts
packages/engine/src/battle-attack-trinkets.ts
packages/engine/src/battle-free-trinkets.ts
packages/engine/src/battle-fortunate-armlet.ts
packages/engine/src/battle-empty-area.ts
packages/engine/src/battle-hero-targets.ts
packages/engine/src/battle-skill-status.ts
```

### 1.4 显示

阶段目标（从低到高）：

1. 技能卡文字改为「效果摘要 + 原始英文行」：摘要来自 `verified_*`，
   未确认语义的图标显示中性标记（如 `[图标]`），不再声称含义。
2. （可选，依赖 C）按 `bbox` 从卡图裁切渲染原始字形；
   需要提取器为每个 token 输出 bbox（见 Phase C1）。

### 1.5 图标身份与字典

**不存在「精确像素一致」的全局字形身份。** 同一设计在不同包/不同卡面上会有不同尺寸、
抗锯齿、底色（active / dimmed、明暗背景），像素级哈希必然把同义变体拆散；
而放宽到能合并变体，又会像现在的感知聚类一样把不同字形并在一起（`20ffe98e2d`）。

因此不追求「字形 ID」，而是把三件事分开：

| 信息           | 名称                                     | 谁用                        | 说明                                 |
| -------------- | ---------------------------------------- | --------------------------- | ------------------------------------ |
| 语义族         | `family`（`heal` / `stun` / …）          | 字典、注解、显示标签、签名  | 人工审阅决定；同义变体归一族         |
| 每次出现的指纹 | `fingerprint`（phash + 尺寸 + 底色统计） | 重新提取时自动归族、视觉 QA | 每次出现各存一份，**不要求全局唯一** |
| 每次出现的裁剪 | `bbox` / crop                            | UI 显示原字形               | 不同来源天然不同，不需要一致         |

- 规则不读上述任何一项（这是 A 的前提）。
- 提取器内部的 `clusterId` 只是工作键，可以随重跑变化，**不进语义层**。
- 字典按 family 绑定含义；一张卡的完整效果 = 图标含义 + 数字/时长/目标/条件，
  后四项来自逐卡注解。
- 继续遵守 R-048：单卡歧义留在逐卡注解，不进全局字典。
- **注意**：`verification.unverified === false` 只代表图标命名已确认，
  不代表效果语义核对过；正确性质量门见 Phase A1.5。

## 2. 分阶段执行（每阶段一个 PR）

### Phase 0：基线（必须先做）

目标：在改任何语义之前冻结当前行为。

1. 记录基线：`pnpm typecheck`、`pnpm lint`、`pnpm test`（可 `--maxWorkers=2`）、`pnpm build`、
   `pnpm test:e2e` 的结果与测试数。
2. 加 3 条**引擎行为快照**（新增测试，不改现有逻辑）：固定种子 + 命令日志 →
   最终状态 hash / 关键事件序列；至少覆盖：核心战斗一轮、一个 II 级技能、一个扩展英雄技能。
3. 记录当前 `pnpm test` 的失败/跳过基线（若有）。

验收：基线记录写进 PR 描述；快照测试在当前代码上通过。

### Phase A0.5：全量语义复核（英雄技能 378 + 属性 54）

目标：不是重写数据，而是把「每张卡的效果」逐张对着印刷面核一遍，
让正确性有证据、有状态、有回归测试。这是给 Kyries 的「安全感」来源。

范围（第一阶段）：

- 英雄技能 **378 张**（18 英雄 × 7 技能 × 3 级；Abomination 含变身卡）
- 英雄属性 **54 面**（18 英雄 × 3 级）
- 怪物 / 奇物 / 饰品等不在本阶段；A1.5 的抽样只用于它们

方法：

1. **复核工作台**（dev-only 路由，例如 `/?review=hero-skills`）：
   每张卡一屏显示印刷卡面（`/print-card-art`）、提取行、当前 `verified_*`、
   引擎解析结果；可标记 `confirmed` / `needs_fix` / `ambiguous` / `stop`，
   填 `Q` 号与备注。
2. **复核矩阵落盘** `docs/reviews/hero-skills-2026-11-23.json`：
   `canonical_id, printed_lines, current_effects, verdict, evidence(页码/签名),
reviewer, date, qid`。
3. **两遍制**：第一遍逐卡读卡面写判定；第二遍只看判定与证据做交叉复核；
   两遍不一致 → `ambiguous`，挂 `Q-xx`。
4. **规则**：拿不准就停点（R-048），不要猜；修正必须由数据（`verified_*`）承担，
   不加新的图标 rekey 代码。
5. 每个英雄一个批次，完成后更新矩阵、补回归测试、跑现有测试。

顺序：先已知有问题的（Leper、Musketeer、Antiquarian、Flagellant），
再其余扩展英雄，最后核心 11 人；每批一个 commit。

工作量参考：432 张 × 1–2 分钟（有工作台）≈ 8–15 小时专注复核，
按英雄分批（每批 21 张）推进。

验收：

- 矩阵 432 行全部有 `verdict` 与证据；
- 所有 `needs_fix` 已改数据并带回归测试；
- 所有 `ambiguous` 有 `Q-xx`，且该卡处于停点；
- 第二遍交叉复核与第一遍一致率 ≥ 95%（不一致的已复议并记录）。

### Phase A1：审计 + 注解补全（数据层）

1. 生成审计清单：

```powershell
git grep -n "icon\.key" -- packages/engine/src ':!*.test.ts'
git grep -n "namedKeys(\|effect_lines" -- packages/engine/src ':!*.test.ts'
```

2. 对每个命中点分类：

| 分类                                                | 处理                                          |
| --------------------------------------------------- | --------------------------------------------- |
| 规则语义（status/damage/range/target/self/support） | 改读 `verified_*`；缺字段就扩展 schema + 数据 |
| 显示/标签                                           | 保留，标注 `display only`                     |
| 漂移断言                                            | 改成文本 + iconId 序列                        |
| 卡面外观测试                                        | 保留                                          |

3. 产出 `docs/audit-2026-11-23-icon-semantics.md`：`file:line | 读取内容 | 目标字段 | 处理方式`。
   清单覆盖率必须是 100%。

验收：审计表完整；新增/扩展的字段有 schema 与测试；不改变运行时行为（快照仍通过）。

### Phase A1.5：语义正确性审计（与 A1 并行，独立质量门）

A1 解决的是「规则从哪里读」，不解决「读到的效果是否写对」。
Leper 已经暴露过三类问题：图标误聚（heal）、提取错位（Revenge 行首）、
人工解读（Intimidate 折角箭头，Q-164）。后两类不会因为 A/C 自动消失。

**先明确一个事实**：`verification.unverified === false`
只表示「这张卡上的图标命名都已确认」（见
[icons.ts](../../packages/data/src/shared/icons.ts) 的 `noteIcon`），
**不代表效果语义核对过**。不能拿它当正确性保证。

要做的事：

1. **覆盖审计（机器）**：每张技能卡的每一行、每个 token 必须有归属：
   - 被某个 `verified_*` 注解消费；或
   - 明确标记为「无规则、仅显示」。
     未被归属的行/token 必须报错或把卡标成「停点」，不能静默跳过。
     引擎现有的 `skipped: effect_lines` 信号要汇总成清单。
2. **双通道核对（逐卡）**：独立产出两条结果再 diff：
   - 通道 1：逐卡注解（`verified_*`）；
   - 通道 2：引擎对该卡的解析/结算结果（d10 审计或模拟）。
     两条不一致 → 该卡停点，登记 `Q-xx`。
3. **审阅状态字段**：给技能卡加独立的 `effects_reviewed`（`confirmed` / `needs_review` +
   证据页/签名 + 审阅批次），与图标命名状态分开。只有 `confirmed` 进可玩卡池。
4. **抽样复检**：英雄技能与属性由 Phase A0.5 做 **100%** 复核；
   本阶段的抽样（建议 ≥10%）只用于怪物、奇物、饰品等非英雄内容。
5. **修正必须带回归测试**：每个语义修正都要加一条断言（数据或行为），
   防止以后重生成/重构把它改回去。

验收：覆盖审计 100% 有归属；双通道 diff 清单为空或全部登记 `Q-xx`；
`effects_reviewed` 字段上线；抽样报告与回归测试入库。

### Phase A2：引擎迁移（按技能族，小步）

> 具体迁移单元、行数与顺序见 [PLAN-2026-11-23-a2-migration-backlog.md](./PLAN-2026-11-23-a2-migration-backlog.md)（由 A1 的 168 条规则语义归组）。

> 字段命名调整：erified_* 将迁移为嵌套
> ules 对象，见 [PLAN-2026-11-23-rules-field-migration.md](./PLAN-2026-11-23-rules-field-migration.md)。该迁移先于 A2 执行。

1. 每次只迁移一个技能族（如「四核心基础技能」→「II/III」→「扩展英雄」→「Boss 技能」）。
2. 迁移后：

```powershell
pnpm typecheck
pnpm exec vitest run packages/engine --maxWorkers=2
pnpm exec vitest run packages/data/src/normalize --maxWorkers=2
pnpm build
```

3. Phase 0 的 3 条快照必须一致。

验收：本阶段迁移的函数里不再有 `icon.key` 语义读取；
`git grep -n "icon\.key" -- packages/engine/src ':!*.test.ts'` 的剩余命中都在白名单（显示/签名）。

### Phase A3：删除图标补丁（h12–h18 变纯数据）

前置：A1 的注解已覆盖这些卡；A2 已让引擎不依赖 effect_lines 的 key。

1. 删除 h12–h18 里的 rekey / 重建行代码；保留**几何修复**（提取把行并/拆、丢图标）。
2. `effect_lines` 的 key 可能与旧版不同（因为不再强行改写），**normalized 允许有 diff**；
   此时验收标准换成：
   - `verified_*` 字段逐卡不变；
   - Phase 0 快照一致；
   - 全量测试通过。
3. 注解层检查：

```powershell
git grep -n "cloneKey\|segmentOnCard" -- packages/data/src/normalize/hero-annotations
```

只应剩下几何修复与工具函数。

### Phase A4：显示层

1. `apps/web/src/skill-card-text.tsx`：摘要来自 `verified_*`；
   未确认图标显示中性标记；保留原始英文行（可折叠）。
2. 需要产品确认的点（Kyries）：摘要文案、是否保留图标标签、是否等待 C 的 bbox 裁剪。

验收：手测 + Playwright 冒烟（建队选技能、战斗手牌）。

### Phase C1：语义族 + 指纹（不要求字形一致）

前置：A 已合入；图标在规则层已无引用。

1. `ddbg_extract/cluster.py` 保留感知聚类，但把它降级为**候选分组**：
   - 每次出现额外输出 `fingerprint`（phash / 尺寸 / 底色统计）；
   - 聚类结果只是工作键（`clusterId`），允许随重跑变化。
2. 人工审阅候选分组，确定 `family`：
   - contact sheet：每个候选组一张拼图（不同尺寸/底色各取样例）+ 出现的卡/页；
   - **同义变体**（尺寸、dimmed、跨包重绘）→ 同一 family；
   - **被错并的不同字形**（如 `20ffe98e2d` 的 heal 与 Purge 伤害）→ 拆成不同 family；
   - 无法确认的挂 `Q-xx`，不要猜（R-048）。
3. 每个 family 保存一组**样例指纹**（curated exemplars，取自已确认出现的 fingerprint）：
   - 重跑时把新出现的 fingerprint 匹配到最近的 exemplar → 自动归族；
   - 低于阈值或落在多个 family 之间的 → 进审阅队列，**不静默归类**。
4. 产出 `alias.json`：`oldIconId → family`（一次性迁移用）。
5. 用私有 PDF 重跑（本机需 Python 3.12）：

```powershell
cd tools/pipeline/extract-print
python3 scripts/run_all.py --force
python3 scripts/test_parse.py
```

6. 对比：已知错配是否拆开、同义变体是否同族、审阅队列大小是否可接受。

验收：每个 family 只有一个含义；同义变体都在同一 family；
已知错误合并全部拆开；重跑后未匹配项全部进审阅队列（不静默丢弃）；
alias 表覆盖全部旧 ID。

#### C1.1 词典工作流

词典（`packages/data/dictionary/icon-dictionary-v1.9.json` + CSV）按 **family** 记一行：

| 列                          | 说明                                                            |
| --------------------------- | --------------------------------------------------------------- |
| `family`                    | 语义族键，如 `heal`；注解和代码只引用它                         |
| `slug`                      | 可读名，如 `icon:heal`；文档与报错使用                          |
| `meaning_en` / `meaning_zh` | 人工审阅后的含义                                                |
| `kind`                      | `status` / `damage_type` / `target` / `range` / `dice_face` / … |
| `status`                    | `confirmed` / `needs_review` / `decor` / …                      |
| `exemplars`                 | 该族的样例指纹（跨尺寸/底色各一条，用于重跑自动归族）           |
| `evidence`                  | 出处页或 Kyries 审阅批次                                        |

流程：抽 contact sheet → 人工标 family 与含义 → 同义变体并入该族的 exemplars →
冲突挂 `Q-xx` → 冻结版本。新扩展包只增量追加，不改已有 family 的含义；
匹配不上的新字形进审阅队列，而不是自动猜一个族。

### Phase C2：引用迁移 + 清理

1. 按 alias 表替换：字典（改为 family 行）、normalized（重生成）、art maps、测试。
   normalized 图标带 `family`（语义）+ `fingerprint`（归族/QA）+ `bbox`（显示）。
2. 重生成并审查 diff：

```powershell
$env:WRITE_NORMALIZED='1'
pnpm exec vitest run packages/data/src/normalize/normalize.test.ts
# 注意：只对 normalize.test.ts 设置 WRITE_NORMALIZED；
# 对整个 normalize 目录设置会顺带重写 cove room/curio（格式不同），产生无关 diff。
git diff --stat packages/data/normalized
```

3. 删除兼容开关与 alias 表；文档收敛。

验收：规则、注解、签名里不再出现十六进制 ID（历史文档除外）；
全量测试、构建、e2e 通过。

## 3. 命令速查（Windows PowerShell）

```powershell
# 安装与基线
pnpm install
pnpm typecheck
pnpm lint
pnpm test                      # 全量很慢；可改 --maxWorkers=2
pnpm build
pnpm test:e2e

# 规范化数据重生成（每次改注解后）
$env:WRITE_NORMALIZED='1'
pnpm exec vitest run packages/data/src/normalize/normalize.test.ts
# 注意：只对 normalize.test.ts 设置 WRITE_NORMALIZED；
# 对整个 normalize 目录设置会顺带重写 cove room/curio（格式不同），产生无关 diff。
git diff --stat packages/data/normalized    # 语义整理阶段必须为空

# 限定范围的测试
pnpm exec vitest run packages/data/src/normalize --maxWorkers=2
pnpm exec vitest run packages/engine --maxWorkers=2

# 提取器（需要 Python 3.12 + 私有 PDF 目录；本机 Windows 的 python 可能是 Store 占位符）
cd tools/pipeline/extract-print
python3 scripts/run_all.py --force
python3 scripts/test_parse.py
```

bash 等价命令只需把 `$env:WRITE_NORMALIZED='1'` 换成
`WRITE_NORMALIZED=1 pnpm exec ...`。

## 4. 验收总表

| 阶段 | 硬性验收                                                                                      |
| ---- | --------------------------------------------------------------------------------------------- |
| 0    | 基线记录 + 3 条行为快照                                                                       |
| A0.5 | 432 张英雄技能/属性全部有 verdict 与证据；needs_fix 已修 + 回归测试；ambiguous 有 Q-xx 且停点 |
| A1   | 审计表 100% 覆盖；新字段有 schema/测试；快照不变                                              |
| A1.5 | 覆盖审计 100% 有归属；双通道 diff 登记；`effects_reviewed` 上线；抽样与回归测试入库           |
| A2   | 迁移函数无 `icon.key` 语义读取；测试/快照绿                                                   |
| A3   | h12–h18 无 rekey 代码；`verified_*` 逐卡不变；快照绿                                          |
| A4   | 摘要来自注解；未知图标中性；冒烟通过                                                          |
| C1   | 同义变体同族；已知错配拆开；exemplars 可自动归族；未匹配进审阅队列；alias 表产出              |
| C1.1 | 词典按 family 建行，含 `exemplars` 与出处                                                     |
| C2   | 引用全部迁移；规则、注解、签名无十六进制 ID；全量测试绿                                       |

## 5. 红线

- R-048：不猜规则/数值/图标；无法确认就保持 `unverified` / 中性显示。
- R-200：18 名英雄按核心内容；`normalized/corebox/hero_skill.json` **不要按包拆**。
- 不改全局词典来修单卡。
- 不提交 PDF / PNG；提取器只在本地私有目录运行。
- 不一次改完所有引擎模块；按技能族迁移，每步保持测试绿。
- 历史文档（`docs/phase*`、`docs/HANDOFF-2026-11-08*`）不改写，除非明确要求。

## 6. 交接检查清单

1. 环境：Node 24.21、pnpm 12.9.1；提取器需要 Python 3.12（Windows 本机 Store 版不可用）。
2. 读：AGENTS、`docs/id-naming-rules.md`、R-048/R-200、`hero-annotations/README.md`。
3. 起手：Phase 0 基线 + A1 审计表；先不要动 h12–h18 的代码。
4. 每个 PR 用中文描述：改了哪些文件、验收命令结果、已知限制。

## 7. 给 Codex 的启动提示词

> 读 `docs/PLAN-2026-11-23-icon-semantics-decoupling.md`，先执行 Phase 0（基线 + 3 条行为快照），
> 然后做 Phase A0.5（建复核工作台 + 432 张英雄技能/属性的全量语义复核矩阵），
> 再做 Phase A1（`git grep -n "icon\.key" -- packages/engine/src ':!*.test.ts'` 审计并产出
> `docs/audit-2026-11-23-icon-semantics.md`），随后做 A1.5（覆盖审计 + 双通道核对 +
> `effects_reviewed` 字段）。A0.5/A1/A1.5 完成前不要改 h12–h18 的代码，也不要动提取器。
> 每个阶段单独 commit，按文档 §4 验收；不确定的规则/图标含义按 R-048 停下问 Kyries。

## 8. 复核完成后的代码样式统一（Kyries 2026-11-23 追加）

A0.5 的 432 张全部复核完成后，再做一次**纯样式**整理（不与语义改动混在一个 PR）：

- 所有 `hNN-*.ts` 使用同一骨架：imports → 数据导出 → 工厂函数 → patch 表 → 模块导出；
- 同一类 helper 只保留一份（`patch-helpers.ts`），禁止复制到英雄文件；
- 统一命名：工厂 `xxxPatch(...)`、表 `xxxPatches(cards)`、模块 `xxxAnnotations`；
- 纯数据文件不引入函数；纯补丁文件不重复数据表；
- 每步仍用 `pnpm lint` / `pnpm typecheck` / 归一化重生成（允许零 diff）验收；
- 样式统一 PR 不改变任何 `verified_*` 数据与引擎行为。

> 2026-11-23 进展：基础样式统一已完成（hNN 数据前置、模块名 `xxxAnnotations`、应用函数 `applyXxxAnnotations` 不导出、helper 集中）。`switch` → patch 表的结构改写留到 A3 删除 rekey 代码时一起做。

### 8.1 终态验收（A3 后）

- `hero-annotations/hNN-*.ts` 必须是**纯数据文件**：不再有工厂函数、patch 表或模块导出；
  用 `git grep -n "function " packages/data/src/normalize/hero-annotations/h*.ts` 检查应为空。
- 确实无法数据化的几何修复，移到 `hero-patches/hNN-*.ts`，文件头注明原因与 R/Q 编号。
- 这一条与 A3 的「删除 rekey 代码」同时验收，不单独作为一个 PR。
