# Fanatic I 正式目录待核对

待确认（拟 **R-179**）。Fanatic I 的真实部署见 **R-178**（[#583](https://github.com/Alpaca-go/ddbg-web/pull/583)），战后交接同 #583。Pyre `monster_large:p011` 已在 Boss 目录（开战布置，非 Fanatic 本体选招表）。本次将 `monster_large:p008` 接入网页 `bossMonsters` 正式目录，并补齐 `preFanaticTaskSources` 旧档迁移。

目视核对本地印刷缓存 COREBOX `monster_large_FRONT.pdf` 第 8 页（与 C-017、[skill-ai 验收](phase5-fanatic-i-skill-ai-2026-10-29.md) 一致）。按核心规则 R24 已确认的 Speed 栏位置，头部右侧有两枚蓝框靴印，提案为 Speed 2。底部四种姿态共用右侧骰点表。

| 姿态                   | d10 1–2 | d10 3–6 | d10 7–10 |
| ---------------------- | ------- | ------- | -------- |
| 进攻、防御、远程、辅助 | slot 1  | slot 2  | slot 3   |

slot 1–3 技能名与效果见 C-017 表；Sentence Rendered 仍按核心 R39 在回合开始替代选招，不由上表覆盖。

正式战斗目录现包含 Fanatic I（`monster_large:p008`）。I 级 Face the Threat 的 Fanatic 专属目标房显示 **`deployFanaticI`** 部署按钮（R-178 已接引擎与 `ruins-boss-room-actions.tsx`）。加入前的固定目录 `preFanaticTaskSources` 只用于旧档完整重放，验证成功后才升级目录。
