# Templars 尖刺 / Pit Toss 审查与覆盖补强（2026-11-07）

**基线**：`61d04085`（R-195 White Cell Teleport 合入后）
**授权**：Kyries 2026-11-07「按你建议的来」——审查 #616 并补 Q-156 的覆盖缺口。
**范围**：只补测试与文档；不改 #616 的引擎/数据实现，不改 `usable` / `combatReady`。

## 审查结论（#616 / R-193）

实现与 R-193 一致，未发现规则性或功能性错误：

| 检查项                                                          | 结果                                                                 |
| --------------------------------------------------------------- | -------------------------------------------------------------------- |
| d10 映射 B/E/H/K/N（1–2/3–4/5–6/7–8/9–10）                      | 与印刷编号一致                                                       |
| 触发：仅「被位移进入」或「移动结束停在此处」，同场合去重        | `battle-shuffle` + `moveHero`，按 reason + 路径去重                  |
| Pit Toss：命中才掷、满区 ignore、不结算尖刺、Body Slam 效果照常 | 满区不移动；仅 Impaler、slot 2、非 miss                              |
| 含 shuffle 的 Body Slam 延后到位移完结再掷 d10                  | 有 `deferTemplarsPitToss` 门控（见下：当前房内不可达）               |
| RNG 与 `usable`                                                 | 种子化 `nextBattleRoll`；`usable` 仍 false，生产走 `deployTemplarsI` |

## 本次补强

新增 1 条定向测（`templars-spikes-pit-toss.test.ts`）：

- **Pit Toss 命中且坑区有空位**：英雄落入 d10 对应尖刺坑、事件含 `d10=→区`、**不结算尖刺伤害**；同状态同命令重放结果一致（d10 只消费一次种子化战斗骰）。
- 覆盖了此前只测「满区 ignore」而缺失的成功落点与「Pit Toss 不触发尖刺」两条裁定语义。

```bash
pnpm exec vitest run packages/engine/src/templars-spikes-pit-toss.test.ts
pnpm typecheck
```

## 已知缺口（诚实）

- **被位移进入尖刺的分支在 Templars 房内不可达**：该房只有 Impaler / Warlord，两者技能都不含 Hero Shuffle；`battle-shuffle` 的尖刺结算保留为防御性代码（R-193 写明 Push·Pull·Shuffle 均适用）。若未来给该房加入位移来源，需要补一条集成测。
- **尖刺 / Pit Toss 的严格存档回放未覆盖**：Q-156 后唯一的自然存档验收被 `it.skip`（Q-162，待 Kyries 决定），定向测只验证了确定性，不验证 `createQuestSave` 往返。
- #616 自身没有切片文档（仅 rulings）；本文件作为其审查/补强记录。

## 关联

- 裁定：R-193（尖刺/Pit Toss）、R-162（房间几何）。
- 待确认：**Q-162**（Templars 自然存档 skip 的处置）、Q-158（中途 Boss 自动选招范围）。
