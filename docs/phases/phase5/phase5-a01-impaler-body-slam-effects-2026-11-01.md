# A-01 · Templar Impaler Body Slam 效果线最小结算

**日期**：2026-11-01  
**基线**：`55fc2f28`（#478 Shuffling Horror Lacerate bleed 已合）  
**切片**：P0 A-01 · 单卡单招（`monster_large:p015` slot 2）

## 候选与取舍

| 卡             | 招                             | 效果线                                                                    | 本刀                     |
| -------------- | ------------------------------ | ------------------------------------------------------------------------- | ------------------------ |
| `p015` Impaler | Body Slam                      | `{target_effects}{stun}2t,PitToss`（图标 confirmed；Pit Toss 为印刷文字） | **接 stun**              |
| `p015` Impaler | Torment                        | 空 / 未核实效果行                                                         | hold                     |
| `p015` Impaler | Revelation                     | `{stress}+2`                                                              | #464 已合                |
| `p014` Warlord | Torment / Stinger              | 多效果 / 未入库                                                           | hold / #463 已接 Stinger |
| Pit Toss 几何  | `boss_ability:p028` d10→尖刺坑 | 规则 R39                                                                  | **B hold**（本刀不位移） |

依据：`monster_large` FRONT **p015**、[phase5-a01-impaler-revelation-effects-2026-11-01.md](phase5-a01-impaler-revelation-effects-2026-11-01.md)、`docs/phase5-a5-remaining-a-candidates-2026-11-01.md` §1 A-01；规则 R-001 / R-048。

## 本刀接通

- `verified-monster-effects.ts` 增 **`monster_large:p015` slot 2** 计划：`stun 2t`（scope target）；签名 `{target_effects}{stun}2t,PitToss`（`attachVerifiedMonsterEffects` 空格归一；**Pit Toss 仅防漂移，不生成效果原语**）。
- 规范化层经 `writeNormalizedCorebox` 写入 `monster_large.json` 的 `verified_monster_effects`。
- `monster-skill.ts` 对 `p015` slot 2 有计划时**不再** Acc-only 剥离；经 `applyTemplarImpalerBodySlam` → `playMonsterSkill` 命中后施加 stun。
- `darkest-mid-boss-skill-acc-core.ts`：#464 已通用区分「含 verified 效果线」与「效果线 hold」，本刀无需改 core。

- `monster-effect-plan.ts`：`PitToss` 印刷后缀在 compile 时剥离（不生成原语；几何仍 hold）。
- `monster-effect-plan.test.ts`：回归计数 +1（Impaler Body Slam）。
- `darkest-templars-skills-acc.test.ts`：Body Slam 命中 stun / 落空无 stun。

## 仍 hold

- Impaler **Torment**；Warlord Torment；**Pit Toss d10 落点**；White Cell / 最终战余招效果线。
- `combatReady` 仍 **false**；Room Tile 正式几何 / Phase 6 / 完整 Boss AI。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/data/src/normalize/normalize.test.ts \
  packages/engine/src/monster-effect-plan.test.ts \
  packages/engine/src/boss/darkest-templars-skills-acc.test.ts
```

## 建议下一刀

- **Shuffling Horror Echoing Disassembly**（stress + light，卡面已核实）或 **A-05 Pyre 回合** 或停。
