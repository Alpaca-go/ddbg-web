# DL3 三怪技能效果接线（Q-163 → R-198）

状态：**已裁定（Kyries 2026-11-07：方案 2、数值表不变）→ R-198**。八招全部写入 `verified_monster_effects`，含新的 cleanse 原语；`startDungeonBattle` 对这三张卡不再按技能效果拒战。

来源：本地私有印刷缓存 COREBOX 怪物**中卡** FRONT p056–61（Brigand Raider / Brigand Hunter）与**大卡** FRONT p4（Adder）。只读缓存，不入库。

## 数值（规格书 §6.5：Crit X = 暴击伤害，Acc Y = 普通伤害）

| 卡             | 技能                | 目标                      | Crit / 暴伤 | Acc / 普伤 | 效果                                        |
| -------------- | ------------------- | ------------------------- | ----------- | ---------- | ------------------------------------------- |
| Brigand Raider | 1 Slice and Dice    | Crowded 0，2 目标         | 2 / 11      | 10 / 7     | 目标 Debuff 2t                              |
| Brigand Raider | 2 Shank             | Closest 0                 | 1 / 16      | 10 / 10    | 目标 Bleed 3，2t                            |
| Brigand Raider | 3 Harmless Poke     | Furthest 1                | 0 / 12      | 7 / 8      | 自身 Buff 2t + Pull 1                       |
| Brigand Hunter | 1 Blanket Fire      | Range 2 / Crowded，4 目标 | 1 / 8       | 10 / 5     | 目标 Debuff 2t、Stress +1                   |
| Brigand Hunter | 2 Rushed Shot       | Closest 0                 | 1 / 11      | 9 / 7      | 自身 Push 1                                 |
| Adder          | 1 Adder's Fang      | Furthest 2                | 1 / 5       | 10 / 3     | 目标 Blight 3，4t                           |
| Adder          | 2 Paralyzing Quills | Closest 1                 | 1 / 10      | 10 / 7     | 目标 Stun 1t                                |
| Adder          | 3 Molt              | Self                      | —           | —          | 自身 Buff 2t、Heal 9、Remove Bleed + Blight |

## 实现位置

- `packages/data/src/normalize/verified-monster-effects.ts`：新增 8 条（`monster_medium:p056` ×3、`p059` ×2、`monster_large:p004` ×3），原始整行签名逐字守门。
- `packages/data/normalized/corebox/monster_medium.json`、`monster_large.json`：用 `$env:WRITE_NORMALIZED='1'; pnpm exec vitest run packages/data/src/normalize/normalize.test.ts` 重生成。
- `packages/data/src/monster-effects.ts`：新增 `cleanse` 效果类型（`scope: "self"`、`kinds: ["bleed","blight"]`，去重校验）。
- `packages/engine/src/monster-effect-plan.ts`：
  - 签名归一吃掉 `{self_plate}`（「Self」文字底板）与 `Remove:…` 尾段；
  - Remove 行的 `blight_resist` 变体图标归一回 Blight（R-140 同招上下文映射，保留原 `iconId` 与 `confirmed` 命名）；
  - cleanse 编译成同行 `Remove{bleed}{blight}`，交给既有 `readVerifiedStatusEffects` 的 `selfRemove`。
- `packages/engine/src/monster-self-status.ts`：纯自身路径接受自身治疗与 Remove，并把治疗量 / 清除标记带出；自身位移 / 光照仍拒绝而不是静默丢弃。
- `packages/engine/src/battle-monster-action.ts`：自身技能结算后按 `selfHeal` 减伤、按 R21 清空 Bleed / Blight 全部堆叠并同步投影；事件补 `selfHeal` / `cleanse`。
- `packages/engine/src/hero-skill.ts`：导出既有 `readSelfHeal`，怪物自身技能复用同一份治疗校验，不另写一套。

## 测试

- `packages/engine/src/dungeon-battle-l2-admission.test.ts`：DL3 用例从「断言仍拒战」改为断言 admitted（`startDungeonBattle` → `startBattle` → `awaitingInitiative`），并核对三张卡的计划条数（3 / 2 / 3）；合成缺 `speed` 的拒战断言保留。
- `packages/engine/src/dl3-monster-effects.test.ts`（新增）：八招计划表、Adder 命中 / 落空状态、Molt 自身路径读取，以及 Molt 命令一次结算（Heal 9、Buff 2t、清空 Bleed/Blight、只消费一次选招骰、可回放）。
- `packages/engine/src/monster-effect-plan.test.ts`：全量攻击技能完整结算计数 93 → 100（新增 7 招；Molt 为 Self 目标，走自身路径）。

## 边界

- 不实现完整 AI / 自动选招（Q-158 仍按显式命令）。
- cleanse 只支持自身「Remove Bleed、Blight」同一条整行；少一项或多一项都拒绝，不猜。
- 不为绿灯调整自然策略或种子（R-190）；不改遭遇几何、生产准入白名单或其它卡。

## 验证

- `pnpm typecheck`：通过。
- 全量 `pnpm test --maxWorkers=2 --testTimeout=30000`：**457 文件 / 3306 通过 / 1 跳过**（R-198 前 456 / 3302；新增本切片 4 条测试）。
