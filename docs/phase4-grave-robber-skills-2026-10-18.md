# Phase 4：Grave Robber I 级战斗技能与 Pilfer（Q-98）

状态：**I 级七战斗技能效果已接线；Pilfer 因 Draw 图标 `79084a2922` 仍 unverified（Q-98）未接。`FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS` 仍含 GRAVE ROBBER。Occultist 未动。**

## 1. 基线与来源

基线 main tip `034f95d`（#241：八英雄正式名录；GR/Occ 标未接线）。本主题只接 GR I 级七技能与对 Pilfer 的停点文档，不裁定 Q-79/Q-80，不进 Phase 5，不改存档 schema / 命令名。

规则来源：官方 R19–21 / R29 / R33；规格书 §6.5–6.7 / §7；R-001 / R-048 / R-095；规范化 `hero_skill` p169–p187（步长 3）与 `hero_stat` p017/p018。不使用 FAQ，不提交 PDF/图片。

## 2. 技能状态表

| 技能 | id | 接线 | 说明 |
| --- | --- | --- | --- |
| Pick to the Face I | `hero_skill:p169` | 已接 | 既有「Ignores Protection」运行时；无新增注解 |
| Lunge I | `hero_skill:p172` | 已接 | 自身 Pull 2；`verified_damage_bonus` vs Blight +2；公开命令先自身位移再结算目标 |
| Flashing Daggers I | `hero_skill:p175` | 已接 | 双目标共享骰、逐名伤害；效果行空 |
| Shadow Fade I | `hero_skill:p178` | 已接 | 无 Acc；Buff 2t + Push 2；`formOnly` 允许无 Acc 自身位移 |
| Throw Dagger I | `hero_skill:p181` | 已接 | 射程 1–2；同框 +1 vs Blight / +2 vs Mark；布局继承目标标记 |
| Poison Dart I | `hero_skill:p184` | 已接 | 射程 1–2；Blight 2·3t |
| Toxin Trickery I | `hero_skill:p187` | 已接 | 无 Acc；Buff 2t + 换行 Remove Bleed/Blight |
| Pilfer | Hamlet Skill | **未接** | Q-98：`79084a2922` unverified；不新增命令 |

条件伤害新增 `blighted`（读真实 `statusStacks` 中的 Blight，同 Finish Him 的 Stun 模式）。缺合法状态堆整次拒绝（R-048）。

## 3. 实现要点

- 数据：`verified-hero-statuses` / `verified-hero-damage` / `verified-hero-ranges` / `verified-hero-layout`；规范化 JSON 重生成。
- 引擎：`blighted` 条件；无 Acc 自身位移的 `formOnly` 边界（Shadow Fade）。
- 名单：GR 因 Pilfer 缺口保留在 `FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS`；UI 标明 Pilfer/Q-98，不再对 GR 战斗技能写「使用时拒绝」。
- Occultist、Jester、Arbalest、Abomination、Phase 5 未动。

## 4. 验收

专项：数据黄金值 + 引擎每技能公开命令 / 纯函数；Pilfer 断言命令 schema 拒 `pilfer`、图标仍 unverified。存档命令形状不变。本机 typecheck、eslint、完整 Vitest。
