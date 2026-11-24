# 最暗 / 最终战 `combatReady` 放开为 true（R-189）

**日期**：2026-11-04
**基线**：`54250ab5`（#601 后）
**PR**：[#602](https://github.com/Alpaca-go/ddbg-web/pull/602)
**授权**：Kyries 2026-11-04：「combatReady 允许改为 true，核心包开发完毕后会做大量测试，遇到问题再改」。

## 改了什么

- **17 处 `combatReady` → `true`**：
  - `darkest_boss_content` 7 条：`quest:p016/017/018` 三条遭遇 + 最终战四形态（`ancestor1` / `ancestor2` / `gestatingHeart` / `heartOfDarkness`）；
  - `darkest_boss_abilities` 9 张：`p026/p028/p030/p031/p033/p034/p035/p036/p037`；
  - `absolute_nothingness_support` 1 张。
- **schema 从 `z.literal(false)` 改为 `z.boolean()`**：保留可回退能力（发现问题可改回 false），不再由 schema 写死。
- **移除「true 就拒绝部署」的旧反守卫**：`final-battle-deploy`、`darkest-mid-boss-deploy` 各删一条；四个专用 deploy（Templars / Shuffling / Mammoth / 最暗中途）的 `encounter.combatReady` 拒绝条件删除，只保留「目录缺失」检查。
- **消息与测试同步**：旧日志里的 `combatReady: false` / `仍 hold` 改为已批准口径；25 个测试文件的期望改为 true。
- 未改：`usable`（17/8）、任务白名单、几何、技能效果线。

## 四形态现状（审计）

| 形态                     | 进战                                                 | 选招                                        | 技能结算                                                                                | 召唤 / 特殊                                                          | 自动程度            |
| ------------------------ | ---------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------- |
| Ancestor 1 `p105`        | `deployFinalBattleForm`                              | R-187 姿态表 → slot 1/2                     | 走通用 `playMonsterSkill`（该卡 0 条 `verified_monster_effects`，通用路径只结算攻击骰） | Perfect / Imperfect Replication、Time Heals All **目前只有显式命令** | 需要补 hook         |
| Ancestor 2 `p018`        | 同上                                                 | `ancestor2SkillAiShouldReplacePrepare` 自动 | 3 招效果线已 verified                                                                   | Swift Teleportation / Absolute Nothingness 已接                      | 自动                |
| Gestating Heart `p019`   | 同上                                                 | 姿态固定 slot 1                             | Dispersion 走通用                                                                       | Ichor 已自动；**Summon 只有显式命令**                                | 需要补 hook         |
| Heart of Darkness `p020` | 同上                                                 | `Impending Doom` d10 自动                   | 3 招效果线已 verified                                                                   | Impending Doom 每回合重掷                                            | 自动                |
| 形态切换                 | 手动 `finishDungeonBattle` + `deployFinalBattleForm` | —                                           | —                                                                                       | —                                                                    | 保持手动（UI 按钮） |

结论：`combatReady: true` 是**准入声明**，不等于四形态 AI 全部自动。Ancestor 1 与 Gestating Heart 的自动行为按下方后续切片补。

## 后续切片（依此顺序）

1. ~~Ancestor 1 自动选招~~：已完成，见 [Ancestor 1 自动选招](phase5-ancestor1-skill-ai-2026-11-04.md)。
2. ~~Gestating Heart 召唤~~：已完成，见 [Gestating Heart 自动召唤](phase5-gestating-heart-summon-2026-11-05.md)。
3. 四形态端到端自然回放：一场真正打完的连续战斗（不再用「判死」夹具），验收后写入严格存档。

## 验证

```bash
pnpm exec vitest run packages/data/src/normalize packages/engine/src/boss
pnpm typecheck
pnpm build
```

- 数据与 boss 目录：161 文件 / 980 测通过。
- 全量：见 PR 描述（本机 4 worker，长场景超时为历史 Windows 抖动）。
