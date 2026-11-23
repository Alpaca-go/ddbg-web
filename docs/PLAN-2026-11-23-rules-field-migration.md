# verified_* → rules 迁移计划（2026-11-23）

目标：把 23 个 `verified_*` 顶层字段换成按卡类别分组的 **`rules` 对象**，
让「规则输入」只有一个命名空间，不再用 `verified_` 前缀暗示逐项人工核对。

现状：全仓 `verified_` 约 **2917 次**，分布在约 197 个文件（engine 114、data 70、
web 3、docs 若干）。因此作为独立迁移分支，不夹在 A2 里做。

> **2026-11-23 进展：R1 已完成。** hero_skill / hero_stat / monster（卡级 + 技能级）/
> virtue_affliction 的 schema 都增加了可选 `rules`；`normalize/rules.ts` 负责投影，
> `build` 在最后一步双写；`normalize/rules.test.ts` 断言 `projectRules(card)` 与
> `card.rules` 逐值一致。引擎仍只读旧 `verified_*`，R2 未开始。
> R1 的 `rules` 保留旧字段的 `lineIndex` / `source` / `approval`，便于 R2 直接替换读取路径。
> A2 单元 2 的 `rules.removal` 已直接写在 `rules` 下（Battlefield Medicine / Toxin Trickery），
> 引擎已优先读取；单元 3 的 `rules.targets`（18 名英雄 346 张非特殊目标卡）也已上线。

## 1. 终态形状

### hero_skill

```json
{
  "id": "hero_skill:core:h01:p007",
  "rules": {
    "statuses": [{ "kind": "stun", "duration": 1, "lineIndex": 0, "scope": "target" }],
    "range": { "min": 0, "max": 0 },
    "self": { "range": true, "heal": 5, "stress": -1 },
    "target": {
      "header": { "lineIndex": 0 },
      "heal": { "lineIndex": 2, "amount": 3 },
      "stress": { "lineIndex": 1, "amount": -1 },
      "support": { "lineIndex": 0, "heal": 1, "stress": -1, "light": 1 }
    },
    "damage": { "lineIndex": 0, "amount": 2, "condition": "marked" },
    "actorDamage": { "lineIndex": 0, "amount": 2 },
    "alliesStress": -1,
    "rallyingFlare": {},
    "receipts": [],
    "transfer": {}
  }
}
```

### 字段映射

| 旧字段                           | 新路径                 |
| -------------------------------- | ---------------------- |
| `verified_status_effects`        | `rules.statuses`       |
| `verified_damage_bonus`          | `rules.damage`         |
| `verified_damage_bonuses`        | `rules.damageBonuses`  |
| `verified_actor_damage_bonus`    | `rules.actorDamage`    |
| `verified_range`                 | `rules.range`          |
| `verified_self_range`            | `rules.self.range`     |
| `verified_self_heal`             | `rules.self.heal`      |
| `verified_self_stress`           | `rules.self.stress`    |
| `verified_target_header`         | `rules.target.header`  |
| `verified_target_heal`           | `rules.target.heal`    |
| `verified_target_stress`         | `rules.target.stress`  |
| `verified_target_support`        | `rules.target.support` |
| `verified_allies_stress`         | `rules.alliesStress`   |
| `verified_rallying_flare`        | `rules.rallyingFlare`  |
| `verified_effect_line_receipts`  | `rules.receipts`       |
| `verified_bleed_blight_transfer` | `rules.transfer`       |

### hero_stat

| 旧字段                              | 新路径                         |
| ----------------------------------- | ------------------------------ |
| `verified_buff_defence`             | `rules.buffDefence`            |
| `verified_condition_defence`        | `rules.conditionDefence`       |
| `verified_higher_condition_defence` | `rules.higherConditionDefence` |

### monster

| 旧字段                     | 新路径               |
| -------------------------- | -------------------- |
| `verified_monster_effects` | `rules.effects`      |
| `verified_weald_attack`    | `rules.wealdAttack`  |
| `verified_weald_profile`   | `rules.wealdProfile` |

### 美德 / 折磨

| 旧字段                | 新路径            |
| --------------------- | ----------------- |
| `verified_turn_start` | `rules.turnStart` |

后续 A2 新增的字段（shuffle / ignores / removal / requiredForm）直接加在 `rules` 下，
命名用小驼峰：`rules.shuffle`、`rules.ignores`、`rules.removal`、`rules.requiredForm`。

`verification`（图标命名状态）**不改名**，它和 `rules` 是两件事。

## 2. 迁移阶段

### R1：schema + 双写

1. 在各卡 schema 增加可选 `rules`（形状用 zod strictObject，子字段可选）。
2. build 在最后一步根据旧 `verified_*` 生成 `rules`（双写）；旧字段保留。
3. 注解层暂时不变。
4. 验收：normalized 新增 `rules`；全量测试通过；引擎行为不变。

### R2：引擎改读 `rules`

1. 新增访问 helper：

```ts
export function rulesOf(card: { rules?: Rules }): Rules {
  return card.rules ?? {};
}
```

2. 按文件迁移：先 `hero-skill.ts`，再 hero 相关模块，再怪物/Boss/饰品。
   迁移时保留旧字段 fallback，直到该文件不再引用 `verified_`。
3. 每迁移一个文件，跑该文件相关测试 + 行为快照。

### R3：删除旧字段

1. 从 schema 删除 `verified_*`；build 不再写。
2. 注解层数据行改成直接产出 `rules`（或保留内部字段、在 build 里一次性映射）。
3. 验收：

```powershell
git grep -n "verified_" -- packages/engine/src packages/data/src apps/web/src
```

应为 0（历史 docs 除外）。

### R4：文档与审计

- 更新 `normalized/README`、`hero-annotations/README`、A1 审计表的字段名；
- 更新 A2 清单里的目标字段（`verified_*` → `rules.*`）。

## 3. 验收与回滚

- 每个阶段都要求：`typecheck`、`lint`、`build`、相关测试通过；
- R1 允许 normalized 增加字段；R2/R3 不改变引擎行为（用 A0.5 前的行为快照对比）；
- 双写期间 `rules` 与旧字段必须一致，可加一条测试：
  `projectRules(card)` 与 `card.rules` 相等。

## 4. 风险

- 字段数量多、引用广（2917 处），必须用 codemod + 人工 review，不能只靠正则全替换；
- `skillStatFields` 同时被 hero_skill 与 monster_skill 使用，`rules` 形状要按卡类别分开定义；
- JSON 体积在双写阶段会变大，R3 后回落；
- 注解层（hNN 数据 + applier）目前直接写 `verified_*`，R3 时要统一改写到 `rules`；
- 历史文档（`docs/phase*`、`docs/reviews`）不改写，只在新的计划/README 里说明。

## 5. 顺序

1. R1（schema + 双写 + 一致性测试）；
2. R2（engine，按文件）；
3. R3（删旧字段 + 注解层改 `rules`）；
4. R4（文档）。

完成 R3 后，再继续 A2 的单元 2–9（此时目标字段已经是 `rules.*`）。
