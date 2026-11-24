# Phase 3：普通遗迹其余获批几何入库

依据 R-065/066/067，Spiked Pit、Treasure Chamber、Tomb of Ancestor、Invocation Chamber、Old Abbey 的独立来源、容量、地形、全部批准邻接／角点／blocked、英雄与怪物部署、宝箱和本面特殊区域入库。普通遗迹九面几何齐全，仍只有 Ritual、Torture、Fountain、Beacon 四面可参战；其余五面全部 `usable=false`、所有特殊区域 `runtimeReady=false`，待完整运行时逐面验证后开放。

Spiked 使用 R-066 的最终十五通路、两 blocked、无角点；S1 没有生产通路，不自行补跳跃或跨墙距离。Treasure 按批准修正 T4–T5 为 blocked，T4 也没有其他批准通路。真实图距离按 R-021，所以 S1 怪物无法被其他区域攻击，S1/T4 宝箱无法普通移动到达；Kyries 在 R-071 再次确认 S1 断图，无法清场走第四轮撤退；收到视觉改判前保持。R-071 / Q-72 同时确认 Shuffle 仅按结算后的实际 S8/S9 落点触发（含截断），进入／经过／移出／起点在坑不另触发；结束回合条款不变。

整面深度锁定包括 usable、特殊区域就绪、来源、部署、容量和边。不同 PDF 同页 FRONT/BACK 的身份不混用；特殊星形按本面批准，不全局套用 Cornered。既有抽牌保留完整九房池，抽到未就绪面时明确显示运行时未就绪，而非要求重复批准已获批几何。

验证：五面容量序列、通路／角点／墙数量、Spiked 最终分类与高地、Treasure 修正、完整九面但仅四面可战；任意篡改 usable／runtimeReady／来源／容量／出生拒绝；raw 来源编号与全部标记校验；规范化重生一致；完整房间／怪物牌池守恒。生成的 JSON 为规范化产物，不含图像。
