# HANDOFF 2026-11-23：英雄技能注解层整理（第二步交接给 Codex）

新 session 先读本文件，再读 [AGENTS.md](../../AGENTS.md) 与
[docs/id-naming-rules.md](id-naming-rules.md)。规则裁定以
[docs/rulings.md](rulings.md) 为准（R-048、R-200 与本批强相关）。

## 0. 一句话现状

英雄技能的**逐卡注解**已经从散落的 `verified-*` 文件收进
`packages/data/src/normalize/hero-annotations/`，按 `hNN-*.ts` 一英雄一份。
其中 h01–h11 是纯数据表，h14 已改成统一 patch 表（参考实现）；
**还剩 h12、h13、h15、h16、h17、h18 六个代码模块待按同一模式改写**。

> **2026-11-23 方向调整（优先读）**：Kyries 已拍板走 A+C 方案
> （规则只读逐卡注解、图标降级为显示层；提取器一形一 ID），见
> [PLAN-2026-11-23-icon-semantics-decoupling.md](PLAN-2026-11-23-icon-semantics-decoupling.md)。
> 本文 §3–§4 的「把剩余 6 个改成 patch 表」**暂停**：先做该计划的 Phase A1/A2，
> A3 会直接删掉 h12–h18 的 rekey/重建类代码。本文保留作为当前结构的说明。

截至撰写时：分支 `main`，工作区干净，本地 `ff007a4c` 领先 `origin/main`
（`14995041`）1 个提交。开工前先 `git status` / `git log --oneline -3` 核对。

## 1. 目标结构

文件骨架与两种文件形态见
[hero-annotations/README.md](../../packages/data/src/normalize/hero-annotations/README.md)：
h01–h11 是纯数据表，h12–h18 是「数据 + 逐卡补丁」；**前 11 个不需要改**，
它们的注解本来就由共享 applier 消费。改写 h12–h18 时按 README 的统一顺序排版
（imports → 数据 → 工厂 → patch 表 → 模块导出），h14 是参考实现。

```text
packages/data/src/normalize/hero-annotations/
  README.md          文件骨架、两种形态、数据表与 applier 对应表
  shared.ts          lineSignature（唯一实现）
  patch-helpers.ts   text / cloneKey / iconFromPool / iconFromCard /
                     segmentOnCard / segmentOnCardAll / segmentOnCardInEffects /
                     applyPatches（逐卡 runner）
  types.ts           HeroAnnotationApplier / HeroAnnotationModule / HeroSkillPatch
                     + 所有数据行类型（StatusEffectEntry / RangeEntry / …）
  index.ts           汇总入口：CORE_HIGHER_SKILL_ROWS、STATUS_EFFECTS、RANGES、
                     SUPPORT_EFFECTS、RALLYING_FLARE_ENTRIES、BOUNTY_STATUS_ROWS、
                     LAYOUT_ENTRIES、DAMAGE_ENTRIES、HERO_ANNOTATIONS
                     + applyHeroAnnotations / applyHeroStatuses / applyHeroRanges /
                       applyHeroSupport / applyHeroRallyingFlare /
                       applyHeroBountyStatuses / applyHeroLayouts / applyHeroDamage
  h01…h11-*.ts       纯数据表（无函数）
  h14-leper.ts       已改写：工厂函数 + 逐卡 patch 表（参考实现）
  h12/h13/h15/h16/h17/h18-*.ts   仍是有 switch 的代码模块（待改）
  status-effects.ts / ranges.ts / support-effects.ts /
  rallying-flare.ts / bounty-statuses.ts / layout.ts / damage.ts
                     各 aspect 的共享 applier（数据从 hNN 读）
```

`build.ts` 的 `hero_skill` 段只调用 `hero-annotations` 的导出函数；
`applyHeroAnnotations` 内部按 `HERO_ANNOTATIONS`（h12–h18）顺序跑各英雄模块。

## 2. 已完成的工作（不要再重复）

| 提交       | 内容                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------- |
| `0e45ce85` | 移除 TTS 美术链路，印刷 PDF 为唯一美术来源                                                    |
| `cbd2286c` | II/III 注解按 hNN 收拢；删除 `core-higher-skill-annotations.json`                             |
| `95833afa` | 状态效果表 134 行按英雄拆分；删除 `verified-hero-statuses.ts`                                 |
| `b07488e2` | 区间 47 行 + 支援 3 行按英雄拆分；删除 `verified-hero-ranges/-support.ts`                     |
| `3a1cc4a3` | Rallying Flare 6 行 + 赏金猎人状态卡 4 行；删除 `verified-rallying-flare/-bounty-statuses.ts` |
| `079fd771` | 效果框布局 5 行按英雄拆分；删除 `verified-hero-layout.ts`                                     |
| `851b8364` | 条件伤害 21 行按英雄拆分；删除 `verified-hero-damage.ts`                                      |
| `14995041` | 抽取公共 helper 到 `patch-helpers.ts`（7 个文件 −360 行）                                     |
| `320cf35c` | README：18 名英雄按核心内容收在 `corebox/`，禁止按包拆                                        |
| `ff007a4c` | h14 Leper 改为统一 patch 表（第二步试点）                                                     |

每一步都做了「`WRITE_NORMALIZED=1` 重生成后 `packages/data/normalized` 零 diff」
的验收，说明这些整理只动结构、不改规则数据。

## 3. 剩余工作：六个英雄改成 patch 表

| 文件                   | 行数 | 现有数据导出                                                             | 现有私有 helper                                                                                                                                                                  | 备注                                        |
| ---------------------- | ---- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `h12-man-at-arms.ts`   | 414  | —                                                                        | `assertMaa`、`rangeZeroUnlabeled`、`stressMinusOneAnchor`、`fixRampart`、`fixBellow`、`fixDefender`、`fixRetribution`、`fixCommand`、`fixBolster`                                | 用 `segmentOnCardAll`；结构接近 h14，先做它 |
| `h16-shieldbreaker.ts` | 606  | —                                                                        | `assertSb`、`rangeZeroUnlabeled`、`fixPierce`、`fixPuncture`、`fixAddersKiss`、`fixImpale`、`fixExpose`、`fixCaptivate`、`fixSerpentSwaySelf`、`fixSerpentSwayIii`               | 也先做，逻辑与 h12 同族                     |
| `h17-houndmaster.ts`   | 519  | —                                                                        | `assertHm`、`stressDeltaAnchor`、`stripHmOcrBesideNumbers`、`fixHoundsRush`、`fixHoundsHarry`、`fixTargetWhistle`、`fixCryHavoc`、`fixGuardDog`、`fixLickWounds`、`fixBlackjack` | 有 OCR 数字修正，注意 `unlabeled_numbers`   |
| `h13-flagellant.ts`    | 660  | `statusEntries`、`rangeEntries`                                          | `assertFlagellant`、`fixStatsDamageBuff`、`actorBonusLine`、`fixPunishFamily`、`fixRainFamily`、`fixExsanguinate`、`fixReclaim`、`fixEndure`、`fixRedeem`、`fixSuffer`           | fix 族最多，按技能逐条搬                    |
| `h15-antiquarian.ts`   | 713  | `statusEntries`                                                          | `assertAntiquarian`、`fixGetDown` + 两次 OCR 修正（`9ffbd6087a` / `8d4bbe5e11` / `9d58d3d431`）                                                                                  | 用 `segmentOnCardAll`                       |
| `h18-musketeer.ts`     | 700  | `statusEntries`、`rangeEntries`、`rallyingFlareEntries`、`damageEntries` | `assertMus`、`fixHealStatsLine`、`fixAimedShot`、`fixSmokescreenDebuff`、`fixCallTheShot`、`fixBuckshot`、`fixSidearm`、`fixPatchUp`、`fixSkeetEffectLines`                      | 最后做，stats_line 重建最多                 |

### 3.1 建议顺序

`h12` → `h16` → `h17` → `h13` → `h15` → `h18`，**一个英雄一个 commit**。

## 4. 单个英雄的改写配方（照抄 h14）

参考 [h14-leper.ts](../../packages/data/src/normalize/hero-annotations/h14-leper.ts)，
文件顺序按 [hero-annotations/README.md](../../packages/data/src/normalize/hero-annotations/README.md)：
imports → 数据导出（若有）→ 工厂函数 → patch 表 → 模块导出。

1. **删掉** `switch (card.id)` 与 `assertXxx`。
2. 每个技能族写一个工厂函数，返回 `HeroSkillPatch`：

```ts
function purge(page: number): HeroSkillPatch {
  const level = page - 279; // 保持原来的等级推导
  return {
    id: `hero_skill:p${page}`,
    name: "Purge",
    level,
    page,
    apply: (card) => {
      // 原来 case 分支里的逻辑原样搬进来
      // 断言仍用 lineSignature(...)，不要放宽
      return normalizedHeroSkillCardSchema.parse({ ... });
    },
  };
}
```

需要从全卡池借图标的（`iconFromPool(cards, key)`）把 `cards` 作为工厂第一个参数：

```ts
function withstand(cards: readonly NormalizedHeroSkillCard[], page: number): HeroSkillPatch { … }
```

3. 用表列出来：

```ts
function manAtArmsPatches(cards: readonly NormalizedHeroSkillCard[]): readonly HeroSkillPatch[] {
  return [ fixRampart(cards, 232), fixRampart(cards, 233), … ];
}

export const manAtArmsAnnotations: HeroAnnotationModule = {
  id: "h12",
  hero: "MAN-AT-ARMS",
  apply: (cards) => applyPatches(cards, manAtArmsPatches(cards), "MAN-AT-ARMS"),
};
```

4. **保留文件底部的数据导出**（`statusEntries` / `rangeEntries` / …）原样不动；
   `index.ts` 仍在 import 它们。
5. **保留所有 `//` 评审注释**（R-xxx / Q-xxx），跟着对应行/函数走。
6. 模块内的应用函数统一命名为 `applyXxxAnnotations` 且**不导出**；若需要新增导出，先确认无外部引用：

```powershell
git grep -n "applyManAtArmsAnnotations"
```

`applyPatches` 已经统一断言 hero / 卡名 / 等级 / 页码 / `verification.unverified`，
并额外要求 `card.pages.length === 1`；如果某张卡多页（目前不应出现），
不要放宽 runner，改为在工厂里单独处理并在 PR 里说明。

## 5. 验收命令（每一步必跑）

在仓库根目录（Windows PowerShell）：

```powershell
# 1) 零 diff 验收：重生成 normalized，必须没有 diff
$env:WRITE_NORMALIZED='1'
pnpm exec vitest run packages/data/src/normalize/normalize.test.ts
git diff --stat -- packages/data/normalized   # 必须为空

# 2) 类型 / 格式 / 构建
pnpm typecheck
pnpm exec prettier --write packages/data/src/normalize/hero-annotations
pnpm lint
pnpm build

# 3) 该英雄的签名测试 + normalize 全套
pnpm exec vitest run packages/data/src/normalize/hero-annotations/h12-man-at-arms.test.ts
pnpm exec vitest run packages/data/src/normalize --maxWorkers=2
```

说明：

- **零 diff 是硬性验收**。有 diff 就说明改写改变了规则数据，必须回退重查。
- 全量 `pnpm test`（627 个测试文件）在本机很慢，容易把 worker 拖死；用
  `--maxWorkers=2` 跑 `packages/data/src/normalize` 即可，CI 会跑全量。
- CI（`.github/workflows/ci.yml`）依次跑 Python 单测、typecheck、lint、test、build。

## 6. 红线与已知坑

- **R-048**：不猜规则、数值、图标。所有改写必须保留原有签名断言，不得放宽。
- **R-200**：18 名英雄一律按核心内容；`normalized/corebox/hero_skill.json` /
  `hero_stat.json` 收全部 18 人，**不要按包拆到 `extension/`**。
- 不改全局图标词典（`packages/data/dictionary/`）；单卡错配继续用逐卡注解。
- `segmentOnCard` 有三个搜索范围，保持原样：
  - `segmentOnCard`：effect_lines + stats_line（h13/h16/h17/h18）
  - `segmentOnCardAll`：stats_line + effect_lines + front_icons（h12/h15）
  - `segmentOnCardInEffects`：仅 effect_lines（h14）
- `verified-resolve-triggers.ts` 是**美德/折磨卡**，不属于英雄技能，不要动。
- 模块间顺序：`HERO_ANNOTATIONS` 里各英雄卡不重叠，顺序不影响结果；
  但 `applyHeroLayouts` / `applyHeroStatuses` / `applyHeroRanges` /
  `applyHeroDamage` 等是**独立的管线步骤**，不要把它们的逻辑塞进英雄模块。
- 改写时不要动 `build.ts` 的调用顺序。
- 文件里的中文注释与 `R-xxx` / `Q-xxx` 是评审依据，保留原文。

## 7. 提交规范

- 中文 subject，一行；body 列改动、删除的文件、验证结果。
- 一个英雄一个 commit，例如：

```text
h12 Man-at-Arms 改为统一 patch 表

- 去掉 switch 与 assertMaa，改为按技能的构造函数 + 逐卡 patch
- 保留 statusEntries/… 数据导出与评审注释
- 行为零变更：WRITE_NORMALIZED 重生成后 normalized 零 diff
验证：typecheck、lint、build；vitest normalize（… 文件 / … 测试）
```

- 建议不超过 600 行有效改动；一个英雄通常 400–700 行，可接受。
- 涉及规则时引用 `docs/rulings.md` 编号（本批主要是 R-048 / R-200）。

## 8. 全部 18 个都改完之后

- `hero-annotations/` 下将不存在 `switch` 与 `assertXxx`，全部是
  「数据表 + 工厂 + `applyPatches`」，与 h01–h11 的形状一致。
- 可选收尾：把 `index.ts` 的 8 个汇总数组合并成一张
  `HERO_SKILL_ANNOTATIONS` 注册表；但不急，先保证零 diff。
- 不要顺手改 `normalized/corebox/hero_skill.json` 的目录归属（见红线）。
- 英雄技能以外的 `verified-*`（怪物、美德/折磨、Boss 能力等）不在本批范围。

## 9. 接手检查清单

1. `git status` 干净；`git log --oneline -3` 能看到 `ff007a4c`（或更新）。
2. `pnpm install` 已装（Node 24、pnpm 12.9.1）。
3. 读 [h14-leper.ts](../../packages/data/src/normalize/hero-annotations/h14-leper.ts)
   与 [patch-helpers.ts](../../packages/data/src/normalize/hero-annotations/patch-helpers.ts)。
4. 选 `h12-man-at-arms.ts`，按 §4 改写，按 §5 验收，按 §7 提交。
5. 每完成一个，把本文件 §3 表格的状态改为「已改写」，并更新 §0。
