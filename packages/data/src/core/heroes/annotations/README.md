# 英雄技能注解层（hero-annotations）

`packages/data/normalized/corebox/hero_skill.json` 的逐卡审校层。
`build.ts` 先按 canonical ID 归一技能卡，再由 [index.ts](./index.ts) 的模块依次叠加数据与补丁。

18 名英雄一律按核心内容（R-200），因此全部数据都在 `normalized/corebox/`，
ID 里的 pack 段只用于归类；**不要按包拆出去**。

## 目标模式（2026-11-25 起）

一个英雄 = 一个 `hNN-*.ts` = 一个模块导出 `hNN`：

```ts
const entries: HeroAnnotationEntries = {
  status: [...],
  range: [...],
  // 只写该英雄实际有的表
};

const fixes: readonly SkillCorrection[] = [
  {
    id: "hero_skill:<pack>:hNN:pNNN",
    name: "...",
    page: 1,
    level: 1,
    expectedEffects: ["..."],
    expectedStats: null,
    effects: [["..."]],
  },
];

export const hNN = defineHeroModule({ id: "hNN", hero: "...", entries, fixes });
```

统一约定：

- 文件依次写 imports、注解数据表与 `entries`、逐卡修正表 `fixes`，最后导出 `hNN`。数据表由 `entries` 汇总。
- **所有 entry / fix 的 ID 都是 canonical ID**：`hero_skill:<pack>:hNN:pNNN`。
  不再从 ID 尾巴读页码；需要页码时用 `card.pages[0]` 或 `printedPageOf(id)`。
- **一个 fix runner**：[patch-helpers.ts](./patch-helpers.ts) 的 `applyCardFixes`。
  它检查每个 key 唯一命中一张卡，并断言英雄与验证状态；元数据断言用 `assertCardMeta`。
- 所有模块都声明 `id / hero / entries / fixes`。纯数据模块写 `fixes: null`，由构造器提供 no-op `apply`；
  有修正的模块用同名 `fixes` 函数返回以 canonical ID 为键的表。
- `TARGET_COUNTS` / `EFFECT_KINDS` 已拆进各英雄的 `entries.targetCount` / `entries.effectKind`。

## 数据表与 applier 的对应

`entries` 的 key 与消费方一一对应：

| key             | 消费方                                                          |
| --------------- | --------------------------------------------------------------- |
| `status`        | [status-effects.ts](./status-effects.ts)                        |
| `range`         | [ranges.ts](./ranges.ts)                                        |
| `self`          | [self-effects.ts](./self-effects.ts)                            |
| `targetStress`  | [target-stress.ts](./target-stress.ts)                          |
| `removal`       | [removal.ts](./removal.ts)                                      |
| `targetCount`   | [target-counts.ts](./target-counts.ts)                          |
| `support`       | [support-effects.ts](./support-effects.ts)                      |
| `layout`        | [layout.ts](./layout.ts)                                        |
| `damage`        | [damage.ts](./damage.ts)                                        |
| `rallyingFlare` | [rallying-flare.ts](./rallying-flare.ts)                        |
| `bounty`        | [bounty-statuses.ts](./bounty-statuses.ts)                      |
| `shuffle`       | [text-rules.ts](./text-rules.ts)                                |
| `ignores`       | [text-rules.ts](./text-rules.ts)                                |
| `higher`        | [../core-higher-skills.build.ts](./core-higher-skills.build.ts) |

`index.ts` 只做泛型聚合：`HERO_ANNOTATIONS` 是 18 个模块，`entriesOf(key)` 拼出各 applier 的输入。

## 逐卡修正表

- `expectedEffects` 和 `expectedStats` 保存修正前的效果行与 stats 行签名，比较时忽略空白。依赖印刷标签的记录同时声明 `expectedLabels`。
- `effects` 和 `stats` 按输出顺序列出文字和图标。效果行里的数字引用原效果行的索引，`stats: null` 清除旧 stats 行。
- 图标可按确认键、印刷 ID 或原行位置引用。`from: "pool"` 沿用跨卡取图标；`relabelAs` 覆盖取出的图标键。
- `numbers` 声明数字锚点的增删与重标。`annotations` 声明随修正写入的状态、射程等注解。省略的字段由原卡保留。

共享处理器在原逐卡修正阶段执行。修正表内每张卡只允许一条记录。

## 规则

- 旧字段仍写 `annotation_*`；A2 新增的文本/移除/目标规则直接写嵌套 `rules.*`
  （`rules.shuffle`、`rules.ignores`、`rules.removal`、`rules.targets`），引擎优先读 `rules`，
  文本解析作未注解卡的 fallback。
- 所有签名断言保留（`lineSignature`），不得放宽（R-048）。
- 评审注释（`R-xxx` / `Q-xxx`）随对应行保留。
- 改写后必须零 diff：

```powershell
$env:WRITE_NORMALIZED='1'
pnpm exec vitest run packages/data/tests/shared/normalize.build.test.ts
git diff --stat -- packages/data/normalized   # 必须为空
```
