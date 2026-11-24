# Templars 正式目录待核对

**R-181 待 Kyries 确认**（本 PR）。Templars 的真实部署见 **R-180**（[#586](https://github.com/Alpaca-go/ddbg-web/pull/586)），战后交接同 #586。Acc 最小运行时与卡面效果见既有 `darkest-templars-skills-acc` 验收，本刀只接正式网页战斗目录与 `preTemplarsTaskSources` 迁移。

目视核对本地印刷缓存 COREBOX `monster_large_FRONT.pdf` 第 14–15 页（与 [mid-boss Acc 盘点](phase5-darkest-mid-boss-skills-acc-2026-11-01.md)、[Torment 核图](phase5-k018-templar-torment-2026-11-03.md) 一致）。按核心规则 R24 已确认的 Speed 栏位置，头部右侧有两枚蓝框靴印，提案为 Speed 2。底部姿态栏：进攻姿态单独 d10 表，防御/远程/辅助共用另一表。

| 姿态             | d10 分段         | 技能 slot                                                |
| ---------------- | ---------------- | -------------------------------------------------------- |
| 进攻             | 1–2 / 3–4 / 5–10 | 1 / 2 / 3（Torment / Body Slam 或 Stinger / Revelation） |
| 防御、远程、辅助 | 1–5 / 6–10       | 1 / 2                                                    |

slot 1–3 技能名与 Acc 见 `monster_large:p014`（Warlord）、`monster_large:p015`（Impaler）；Pit Toss / 完整 AI 仍 hold。

正式战斗目录现包含 Templar Warlord 与 Templar Impaler。quest:p017 最暗目标房显示 **`deployTemplarsI`** 部署按钮（R-180 已接 `darkest-boss-room-actions.tsx`）。加入前的固定目录 `preTemplarsTaskSources` 只用于旧档完整重放，验证成功后才升级目录。
