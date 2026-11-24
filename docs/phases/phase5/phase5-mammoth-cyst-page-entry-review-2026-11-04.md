# Mammoth Cyst 正式目录待核对

**R-185** Kyries 已确认 [#593](https://github.com/Alpaca-go/ddbg-web/pull/593)。Mammoth Cyst 的真实部署见 **R-184**（[#592](https://github.com/Alpaca-go/ddbg-web/pull/592)），战后交接同 #592。Acc / Revivify / 召唤 White Cell 最小运行时见既有 `darkest-mammoth-cyst-*` 验收；自然任务与严格存档见 [phase5-mammoth-cyst-natural-save-2026-11-04.md](phase5-mammoth-cyst-natural-save-2026-11-04.md)。

目视核对本地印刷缓存 COREBOX `monster_large_FRONT.pdf` 第 16 页（与 [mid-boss Acc 盘点](phase5-darkest-mid-boss-skills-acc-2026-11-01.md)、A-01 Bulging Gaze / Digestion / Revivify 核图一致）。按核心规则 R24 已确认的 Speed 栏位置，头部右侧有一枚蓝框靴印，提案为 Speed 1。底部四姿态共用 Fanatic 同型 footer（两行 d10 表）：主行 1–4 / 9–10 → slot 1 / 3，次行 5–8 → slot 2。

| 姿态                   | d10 分段         | 技能 slot                                        |
| ---------------------- | ---------------- | ------------------------------------------------ |
| 进攻、防御、远程、辅助 | 1–4 / 5–8 / 9–10 | 1 / 2 / 3（Bulging Gaze / Digestion / Revivify） |

slot 3 Revivify 为 Self 技能，但卡面 footer 与 Fanatic I 一样把 slot 3 写入骰表（不同于 Shuffling Horror 的 Echoing，后者不进表）。White Cell 召唤与 boss_ability 替换行动仍走专用命令，不另改表。

正式战斗目录现包含 Mammoth Cyst（`monster_large:p016`）。quest:p018 最暗目标房显示 **`deployMammothCystI`** 部署按钮（R-184 已接 `darkest-boss-room-actions.tsx`）。加入前的固定目录 `preMammothCystTaskSources` 只用于旧档完整重放，验证成功后才升级目录。
