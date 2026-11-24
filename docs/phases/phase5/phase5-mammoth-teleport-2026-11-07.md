# White Cell Teleport 与紫星落点（2026-11-07）

**基线**：`248265e5`（#616 Templars 尖刺/Pit Toss 合入后）
**授权**：Kyries 2026-11-07「继续推 Q-157」；裁定见 **R-195**（关闭 Q-157）。
**范围**：White Cell Stalk 的 Teleport（`monster_medium:p104` slot 3 / `boss_ability:p031`）与 Mammoth Cyst Room 紫星落点的生产运行时；不改 AI、`usable`、`combatReady` 或其它紫星效果。

## 接入

| 层   | 改动                                                                                                                                                                                               |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 数据 | `verified-monster-effects` 增 p104 slot 3：`{target_effects}{stress}+2,Teleport` → 仅 +2 压力原语；`monster-effect-plan` 剥离 `Teleport` 文本（同 `PitToss` 做法）后重新生成 `monster_medium.json` |
| 技能 | `monster-skill` 的「纯状态技能」白名单增加 `p104` slot 3（卡面无 damage，仅压力），允许命中/落空照常结算                                                                                           |
| 引擎 | 新增 `boss/mammoth-cyst-teleport.ts`：d10 → 紫星区映射（1–2 A、3–4 C、5–6 B、7–8 G、9–10 I），命中后链式传送；`recordMonsterSkill` 在技能结算后调用                                                |
| 满员 | 落点无空位 → §6.7 位移截断：英雄不移动、姿态轨不变；已在落点同样不移动                                                                                                                             |
| RNG  | d10 在技能自身掷骰之后消费 1 次战斗骰，同种子同命令同结果                                                                                                                                          |
| 文案 | `darkest-mid-boss-runtime` 的 p018 wiringHold 改为「White Cell Teleport 已接（R-195）；完整 AI 仍 hold」                                                                                           |

## 验证

```bash
pnpm exec vitest run packages/engine/src/boss/mammoth-cyst-teleport.test.ts
pnpm exec vitest run packages/engine/src/monster-effect-plan.test.ts \
  packages/engine/src/boss/darkest-mammoth-cyst-combat-runtime.test.ts \
  packages/engine/src/boss/mammoth-cyst-i-deploy.test.ts
pnpm typecheck
```

- 新增 4 测：d10 映射；命中后英雄移动到对应紫星区且姿态不变、+2 压力；落点满员按 §6.7 截断、事件标注满区；落空/非生产战斗不触发（链式结算原样返回）。
- 数据与既有回归：`monster-effect-plan`（新增 1 条已验证纯压力技能）、Mammoth 召唤/部署、White Cell Reconstitute/Displace 全过。
- 全量 `pnpm test --maxWorkers=2 --testTimeout=30000`：**455/456 文件、3294 测通过**；唯一失败是 `quest-save.test.ts` 自然战斗回放的 20s 自带上限在并行下超时（单跑 3 测全过），属已知 Windows 并行长场景超时；另有 1 个 skip 为 Q-162 的 Templars 自然存档。
- `typecheck`、`build`、变更文件 ESLint / Prettier 通过。

## 边界（诚实）

- **不实现完整 AI / 自动选招**：Teleport 仍需玩家/测试显式选择目标与技能（Q-158）。
- 紫星只接 Teleport 落点；不扩展其它紫星效果、不改 `usable`（仍 false，生产经 `deployMammothCystI`）。
- 未新增公开命令或存档字段：传送在既有 `playMonsterSkill` 结算内完成，严格存档按种子 + 命令日志回放。
- 浏览器 e2e 未加（本机 Playwright 浏览器版本不可用）。
