# Phase 5：Boss 任务 quest→script 映射（2026-10-28）

> Kyries 批准本刀：填写已核实映射，使 #332 `isBossEncounter` / 第 4 轮撤退豁免在生产路径可生效（须已注册脚本 + Boss 战斗卡在场）。

## 映射表

| 来源                                            | questId                  | 脚本 id                    | 状态                                                         |
| ----------------------------------------------- | ------------------------ | -------------------------- | ------------------------------------------------------------ |
| 静态 `bossQuestScriptId`                        | quest:p016               | —                          | 待脚本（印刷 Boss：Shuffling Horror，spec §2.3 / QUEST p16） |
| 静态                                            | quest:p017               | —                          | 待脚本（Templars，p17）                                      |
| 静态                                            | quest:p018               | —                          | 待脚本（Mammoth Cyst，p18）                                  |
| 运行时 `faceTheThreatBossScriptByCampaignLevel` | quest:p019 @ CL **I**    | `boss:ruins:necromancer:1` | **已接**（#331 注册）                                        |
| 同上                                            | quest:p019 @ CL II / III | —                          | 待脚本（Necromancer II/III 与其余 Ruins Boss）               |

## 证据与语义

- **p019 非静态 1:1**：同一 Face the Threat 卡用于三幕（规则书 §14.1、R30）；Boss **等级**随战役等级（§2.1 / R35），**身份**随迫近威胁（§2.2 / R11 四选一）。迫近威胁运行时未接 → 仅按 `campaignLevel` 填已落地脚本；缺省 `readCampaignLevel` = 1。
- **p016–p018**：任务卡 SPECIAL 已指名最暗 Boss（extract `quest.json`）；与 spec §2.3「三任务卡对应三组 Boss」一致。脚本未注册 → 映射留空，小怪战仍第 4 轮撤退（Kyries 认可）。
- **生产注册**：`resolveEncounterBossBattleRules` 调用 `ensureCoreBossScriptsRegistered()`，避免 UI 未显式注册时查不到 Necromancer I。
- **判定链**（#332）：Boss 任务 + 解析到已注册 `scriptId` + 部署含该脚本 `combatMonsterCardId` → `countsRounds: false`。

## 仍待确认

- quest:p019 在 CL I 下默认 Necromancer I：沙盒/缺省威胁下的最小接线；Prophet/Collector/Fanatic I 需「当前威胁」字段或 `faceTheThreatEmbark` 落地后再改解析。
- 最暗 p016–p018 → `boss:darkest:*` 脚本 id（未发明）。
- Necromancer / 其它 Boss II、III 级脚本。

## 测试

```bash
pnpm exec vitest run \
  packages/engine/src/boss/quest-bridge.test.ts \
  packages/engine/src/boss/encounter-rules.test.ts \
  packages/engine/src/boss/boss-framework.test.ts
```
