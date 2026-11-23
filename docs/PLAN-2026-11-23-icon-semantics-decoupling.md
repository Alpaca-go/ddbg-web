# 执行计划：图标语义解耦（A + C）

日期：2026-11-23。交给 Codex 执行的长期计划。
前置阅读：[AGENTS.md](../AGENTS.md)、[docs/id-naming-rules.md](id-naming-rules.md)、
[docs/rulings.md](rulings.md)（R-048、R-200）、
[hero-annotations/README.md](../packages/data/src/normalize/hero-annotations/README.md)、
[HANDOFF-2026-11-23-hero-annotations.md](HANDOFF-2026-11-23-hero-annotations.md)。

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

逐卡断言改为 **「文本 + iconId 序列」**，不再用语义 `key`：

```text
"{target_effects} {damage} +2 vs {mark}"
→ "text: |icon:763ad8e857|text: +2 vs |icon:1ce58a493c|"
```

好处：聚类改名不影响签名；提取器换 ID 时只需一次迁移。

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

### 1.5 字典

- 只负责 `iconId → 标签/含义` 的可读性，不参与规则判定。
- 继续遵守 R-048：单卡错配不改全局词典。
- C 完成后，一个字形一个 ID，字典可以一形一义。

## 2. 分阶段执行（每阶段一个 PR）

### Phase 0：基线（必须先做）

目标：在改任何语义之前冻结当前行为。

1. 记录基线：`pnpm typecheck`、`pnpm lint`、`pnpm test`（可 `--maxWorkers=2`）、`pnpm build`、
   `pnpm test:e2e` 的结果与测试数。
2. 加 3 条**引擎行为快照**（新增测试，不改现有逻辑）：固定种子 + 命令日志 →
   最终状态 hash / 关键事件序列；至少覆盖：核心战斗一轮、一个 II 级技能、一个扩展英雄技能。
3. 记录当前 `pnpm test` 的失败/跳过基线（若有）。

验收：基线记录写进 PR 描述；快照测试在当前代码上通过。

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

### Phase A2：引擎迁移（按技能族，小步）

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

### Phase C1：提取器一形一 ID

前置：A 已合入；`iconId` 在规则层已无引用。

1. 修改 `ddbg_extract/cluster.py`：
   - 先用**精确签名**（phash + grid + size 完全相同）建 ID；
   - 感知合并只用于生成 `family`（可选），不再合并 ID；
   - 或采用两级：`glyphId`（精确）/ `iconId`（兼容别名）。
2. 产出 `alias.json`：`oldIconId → newGlyphId`（按签名匹配生成，人工抽检）。
3. 用私有 PDF 重跑（本机需 Python 3.12）：

```powershell
cd tools/pipeline/extract-print
python3 scripts/run_all.py --force
python3 scripts/test_parse.py
```

4. 对比：`n_unique` 变化、已知错配（如 `20ffe98e2d` 拆成多个 ID）是否消失。

验收：同一字形全局唯一 ID；已知错误合并清单全部拆开；旧 ID 保留在 alias 表。

### Phase C2：引用迁移 + 清理

1. 按 alias 表替换：字典、normalized（重生成）、art maps、测试。
2. 重生成并审查 diff：

```powershell
$env:WRITE_NORMALIZED='1'
pnpm exec vitest run packages/data/src/normalize/normalize.test.ts
git diff --stat packages/data/normalized
```

3. 删除兼容开关与 alias 表；文档收敛。

验收：`git grep -n "20ffe98e2d"` 不再出现在规则/标注代码里（历史文档除外）；
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

| 阶段 | 硬性验收                                             |
| ---- | ---------------------------------------------------- |
| 0    | 基线记录 + 3 条行为快照                              |
| A1   | 审计表 100% 覆盖；新字段有 schema/测试；快照不变     |
| A2   | 迁移函数无 `icon.key` 语义读取；测试/快照绿          |
| A3   | h12–h18 无 rekey 代码；`verified_*` 逐卡不变；快照绿 |
| A4   | 摘要来自注解；未知图标中性；冒烟通过                 |
| C1   | 一形一 ID；已知错配拆开；alias 表产出                |
| C2   | 引用全部迁移；无旧 ID 残留；全量测试绿               |

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
> 再做 Phase A1（`git grep -n "icon\.key" -- packages/engine/src ':!*.test.ts'` 审计并产出
> `docs/audit-2026-11-23-icon-semantics.md`）。A1 完成前不要改 h12–h18 的代码，也不要动提取器。
> 每个阶段单独 commit，按文档 §4 验收；不确定的规则/图标含义按 R-048 停下问 Kyries。
