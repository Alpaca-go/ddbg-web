# HANDOFF 2026-11-08：18 名英雄核心化 —— 扩展英雄 II/III 技能逐卡核实

给下一位代理（grok bot）的交接。当前 `main == origin/main == 6b880a08`。先读 `docs/rulings.md` 的 R-200 / Q-104 与 `docs/phase7-hero-expansion-verification-2026-11-08.md`。

## 1. 任务目标

Kyries 决定：**18 名正式英雄都按核心内容对待**（Musketeer 纳入，覆盖 R-008）。目标是让 18 名英雄的 **I–III 级全部技能卡**都能在战斗里选择、结算：

- 数据：378 张技能卡（每名 7 技能 × 3 级；Abomination 6 + 1 张 Transform/级 = 18+3）。
- 现状：核心盒 11 名的 231 张已全部接好；扩展 7 名只接了 L1 的 49 张，**II/III 的 98 张只入库、没有逐卡注解**，战斗目录里也没有。
- 你的工作：把扩展 7 名的 II/III 共 **98 张**逐卡核实（范围 / 目标 / 状态 / 加伤 / 支援），接入目录，并让全部 252 张高等级技能通过审计测试。

## 2. 当前状态（可直接核对）

- `FORMAL_HERO_NAMES` = 18；`FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS = []`（仅指 L1）。
- `hero_stat`：54 面，18 名英雄 `attributesVerified = true`；Antiquarian III 已在 `6b880a08` 入库（Life 15 / Dodge 3 / Speed 0；Blight 抗性；Shuffle + Disease 免疫）。
- `hero_skill`：378 张，`verification.unverified` 全为 false（数据转录层）。
- 战斗目录 `apps/web/battle-data-plugin.ts`：核心 11 名 I–III（231 张）+ 扩展 7 名 L1（49 张）；`core-higher-skill-catalog.ts` 的 `coreHigherSkillAvailable` 只放行 `hero_skill:p001–p231`。
- 审计 `packages/engine/src/core-higher-skills.test.ts`：只覆盖核心 154 张高等级卡，逐 d10 面通过。
- 扩展 L1 测试：`cove-skills.test.ts`、`weald-skills.test.ts`、`warrens-skills.test.ts`、`musketeer-skills.test.ts`（都只测"七张 I 级"）。
- 试切目录后的审计结果（2026-11-08）：98 张里 **只有 8 张直接通过**（Leper Chop/Hew L2–L3、Antiquarian Nervous Stab L2–L3、Man-at-Arms Crush L2–L3），90 张失败：26 张 `effect_lines` 未消费、16 张缺 damage/heal 目标注解、14 张 Musketeer（R-008，已由 R-200 覆盖）、13 张 Self/All Allies 缺射程、10 张区间射程 `numeric=null`、10 张缺目标图标、1 张目标图标混用。

## 3. 已定裁定（必须遵守）

- **R-200**：18 名英雄一律核心；Musketeer 覆盖 R-008；Antiquarian III 免疫 = 位移 + 疾病（`8510428636` 只在本卡 higher defence 注解，不写全局词典）；图标语义：
  - 直角箭头左 = 作用自己，右 = 作用选中目标（规则书 p20）；
  - 弧形箭头 + 数字 = 射程（1 相邻、2 隔一格、无数字 = 0，只能当前地块）；后面跟 `Self` = 只作用自己；
  - 红色爪痕上的数字 = 伤害；
  - Protection（受伤减半向上取整）/ Guard（必须锁定守卫敌人）见 p21。
- **R-048**：不猜规则、数值、图标。卡面歧义时先在 `docs/rulings.md` 开 `Q-xxx` 问 Kyries，不要按图标顺序硬猜。
- **R-190**：不为测试变绿去调自然策略/种子。
- 不要改全局图标词典（`packages/data/dictionary/icon-dictionary-v1.8.json` 及 CSV）来处理单卡错配；用逐卡注解/覆盖。

## 4. 数据与管线

- 规范数据：`packages/data/normalized/corebox/hero_skill.json`、`hero_stat.json`。
- 原始提取：`packages/data/extract/corebox/raw/hero_skill.json`；扩展在 `extract/extension/{warrens,cove,weald,musketeer}/raw/hero_skill.json`（每张卡 `faces.front.lines[].text` 是带 `{icon:...}` 的印刷行，`icons[]` 有 bbox）。
- 逐卡注解文件（`packages/data/src/normalize/`，按 build.ts 顺序 attach）：
  1. `verified-hero-layout.ts`
  2. `verified-hero-statuses.ts`（状态：lineIndex/scope/signature/effects）
  3. `verified-hero-ranges.ts`（区间射程）
  4. `verified-hero-damage.ts`（伤害加成/条件伤害）
  5. `verified-hero-support.ts`（治疗/支援/Empty Area 等）
  6. `verified-bounty-statuses.ts`
- 生成入口：`packages/data/src/normalize/build.ts`（`hero_skill` 段）。
- 重生成：`$env:WRITE_NORMALIZED='1'; pnpm exec vitest run packages/data/src/normalize/normalize.test.ts`
- 卡面数字位置：raw 的 `spans`（文本）与 `icons`（图标 bbox）；核对时以印刷行为准。

## 5. 已知图标数据错配（逐卡，不要改全局字典）

| iconId       | 字典           | 实际                                                                                        |
| ------------ | -------------- | ------------------------------------------------------------------------------------------- |
| `20ffe98e2d` | heal           | Battle Heal 确实是治疗；但 Purge III / Revenge 上被错提成 heal，按 Kyries 读数是伤害/非治疗 |
| `f18923574c` | shuffle        | Solemnity 的 `-1` 是**压力 -1**（不是 Shuffle）                                             |
| `d4329c2a97` | buff           | 实际是**弧形箭头（攻击范围）**；字典待单独修（先确认核心卡使用处再改）                      |
| `1ff34c908b` | buff           | 在 `{range} … Self` 行里的宽图标，疑为 Self 侧标记，**待 Kyries 确认**                      |
| `8fc8635162` | self_effects   | 疑为**指向左的直角箭头**                                                                    |
| `b6afaa4d7b` | target_effects | 疑为**指向右的直角箭头**                                                                    |

处理方式：给具体卡加逐卡覆盖（例如新增 `verified_stat_line` 或扩展 `verified-hero-*` 的签名断言），不要动全局 `icon.key`。

## 6. Leper 试点（14 张，先做这一批）

已通过（4 张，无需新注解）：`p275/p276 Chop II/III`、`p278/p279 Hew II/III`。

Kyries 已给读数（2026-11-08）：

| 卡                         | 读数                                                                      |
| -------------------------- | ------------------------------------------------------------------------- |
| p281 Purge II              | 攻击目标；自身 Buff 2t；目标 Push 2                                       |
| p282 Purge III             | **19/12 是伤害**（数据里是 heal，需逐卡覆盖）                             |
| p284/285 Revenge II/III    | **没有 heal**；Mark 和（Debuff）给**目标**                                |
| p287/288 Withstand II/III  | Mark 给**自身**                                                           |
| p290/291 Solemnity II/III  | **没有 Buff**；只有给自己 Heal 9/12 和**压力 -1**                         |
| p293/294 Intimidate II/III | `Ignores` = 无视 **Protection** 和 **Guard**；**另有单独的 Debuff 2t/3t** |

仍需 Kyries 确认的 4 点（不要猜）：

1. **Revenge** 有伤害吗？stats 只有 Crit/Acc；效果是否就是目标 Mark + Debuff？"mark 和的 buff"里的 buff 是否指 Debuff？
2. **Intimidate** 的 `{light}` 行是什么效果？除无视 Protection/Guard + 目标 Debuff 外还有别的吗？自身 Buff 2t 是否真实？
3. **Withstand** 除了自身 Protection 2t + Mark 1t，还有 Buff 吗？
4. **Solemnity** 确认只有自身 Heal 9/12 + 压力 -1，无 Buff、无 Shuffle？

## 7. 分批计划（每批一次提交）

1. **Leper**（14 张）：先把上面 4 点问清；给 p282/p284/p285/p290/p291 做 stats/效果行覆盖，补 `verified-hero-statuses/support` 条目；让 Leper 14 张全部通过 d10 审计。
2. 其余 6 名按顺序：Antiquarian → Flagellant → Man-at-Arms → Houndmaster → Shieldbreaker → Musketeer（每名 14 张）。
3. 每批都要：
   - 扩展 `packages/engine/src/core-higher-skills.test.ts` 的卡集合（或新建审计测试）到对应英雄；
   - 跑该英雄的 d10 审计 + `packages/engine/src/core-higher-skills.test.ts` + `packages/data` 相关测试；
   - 更新 `docs/phase7-hero-expansion-verification-2026-11-08.md` 的记录。
4. 全部 98 张通过后统一切目录：
   - `core-higher-skill-catalog.ts`：把 `coreHigherSkillAvailable` 扩到 18 名英雄全部（`hero_skill:p001–p357` + `hero_skill:musketeer:p001–p021`）；
   - `battle-data-plugin.ts`：按 `catalogNames` 收全部已核实技能，去掉 `formalRosterArtOnlySkills()` 注入；更新 `expectedSkills` / `expectedHeroStats` 计数；
   - 删除或停用 84 张 art-only 占位技能（`formalRosterArtOnlySkills` 相关）；
   - 改 `apps/web/src/dungeon-sandbox/quest-setup/dungeon-quest.tsx` 的过时文案（现在写"十一名核心盒…其余七名扩展…art-only/未接线"，实际 18 名都已核实）；
   - 审计测试扩到 252 张全部通过，跑 web build。
5. 更新 `docs/rulings.md`（Q-xxx 关闭）、handoff 与提交。

## 8. 验收标准

- 18 名英雄 × I–III 全部技能在战斗目录中可选；level 2/3 的扩展英雄能正常升级选招。
- `core-higher-skills` 审计覆盖 252 张（154 核心 + 98 扩展）并全绿；每个 d10 面都不跳过任何 `effect_lines`。
- 所有新增注解都带签名断言：卡面/来源漂移时**拒绝**，而不是静默补值（R-048）。
- `pnpm typecheck`、`pnpm exec vitest run packages/data`、`packages/engine/src/core-higher-skills.test.ts`、web build 全绿。
- 不改自然策略/种子（R-190），不改全局词典，不提交美术/PDF。

## 9. 常用命令

```powershell
pnpm typecheck
pnpm exec vitest run packages/engine/src/core-higher-skills.test.ts
pnpm exec vitest run packages/data
$env:WRITE_NORMALIZED='1'; pnpm exec vitest run packages/data/src/normalize/normalize.test.ts
pnpm --filter @ddbg/web build
```

## 10. 提交与文档约定

- 直接提交 `main`，中文提交信息，引用 `R-200` / `Q-xxx`；一个小批次一次提交。
- 不提交：`docs/HANDOFF-2026-11-01-codex-core-pack-remaining.md`、`docs/HANDOFF-2026-11-03-*`、`docs/HANDOFF-2026-11-05-*`、`docs/manual-room-tile-survey.md`、`docs/screenshots/_p001-geom-export.json`、`.cache/**`。
- 需要问 Kyries 的卡面歧义，先在 `docs/phase7-hero-expansion-verification-2026-11-08.md` 或 ruling 里记 `Q-xxx`，不要猜。

## 11. 不要做的事

- 不要为了让测试变绿而改数值、改自然策略/种子（R-190）。
- 不要为了单卡改全局图标词典；不要给未确认图标命名。
- 不要把 84 张 art-only 占位卡当作真实技能接线。
- 不要删/改既有核心 11 名的已核实注解；只做增量。
- 不要动 Phase 6 的 `autoMonsterTurn` 与既有 Boss 逻辑。
