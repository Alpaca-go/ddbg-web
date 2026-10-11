# Phase 2 四核心技能整批接线（2026-10-11）

Crusader、Hellion、Highwayman、Vestal 共 28 种技能，各 I / II / III，合计 **84 张**，全部进入战斗沙盒白名单。每名英雄可选 21 张；本批技能 blocked 清单为空。技能等级选项按印刷等级显示，不增加战役升级或 Phase 3 流程。

## 印刷核对与规则范围

- 核心盒 `02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_44x68_SKILLS_FRONT.pdf` 完整正面 p001–042、p064–105，84 页均逐页对照页面图像；卡名、等级、姿态、射程、目标数、Acc / Crit、伤害 / 治疗及左右效果框均核对。原始提取的未命名数值保持原状，明确数字通过既有 verified 注解接线。
- 自身效果与目标效果沿用官方 Core R19–21 / 规格书 §6；状态持续时间、抵抗与免疫依 Core R27，伤口与死门依 R29。图标批准依 R-048 / R-061。印刷件只用于卡面文字、数字与图形，不补规则。
- 核心盒 `DD_EN_COREBOX_CARDS_100x180_Hero_STAT_FRONT.pdf` p001 / 003 / 007 / 009 的完整 Resistances / Immunities 框复核：四名 I 级英雄均无 Buff 抗性或免疫，单独保存已核实的两项 false。其他未确认抗性图标保持未验证；没有以未知图标推定其含义。II / III 属性面未外推 Buff 抗性。

## 可用卡表

每行依次列出 I / II / III 的印刷页；对应 id 为 `hero_skill:pNNN`。

| 英雄       | 技能               | I / II / III    |
| ---------- | ------------------ | --------------- |
| Crusader   | Smite              | 001 / 002 / 003 |
| Crusader   | Zealous Accusation | 004 / 005 / 006 |
| Crusader   | Stunning Blow      | 007 / 008 / 009 |
| Crusader   | Bulwark of Faith   | 010 / 011 / 012 |
| Crusader   | Battle Heal        | 013 / 014 / 015 |
| Crusader   | Holy Lance         | 016 / 017 / 018 |
| Crusader   | Inspiring Cry      | 019 / 020 / 021 |
| Hellion    | Wicked Hack        | 022 / 023 / 024 |
| Hellion    | Iron Swan          | 025 / 026 / 027 |
| Hellion    | Barbaric YAWP!     | 028 / 029 / 030 |
| Hellion    | If It Bleeds       | 031 / 032 / 033 |
| Hellion    | Breakthrough       | 034 / 035 / 036 |
| Hellion    | Adrenaline Rush    | 037 / 038 / 039 |
| Hellion    | Bleed Out          | 040 / 041 / 042 |
| Highwayman | Wicked Slice       | 064 / 065 / 066 |
| Highwayman | Pistol Shot        | 067 / 068 / 069 |
| Highwayman | Point Blank Shot   | 070 / 071 / 072 |
| Highwayman | Grapeshot Blast    | 073 / 074 / 075 |
| Highwayman | Tracking Shot      | 076 / 077 / 078 |
| Highwayman | Duelist’s Advance  | 079 / 080 / 081 |
| Highwayman | Open Vein          | 082 / 083 / 084 |
| Vestal     | Mace Bash          | 085 / 086 / 087 |
| Vestal     | Judgement          | 088 / 089 / 090 |
| Vestal     | Dazzling Light     | 091 / 092 / 093 |
| Vestal     | Divine Grace       | 094 / 095 / 096 |
| Vestal     | Divine Comfort     | 097 / 098 / 099 |
| Vestal     | Illumination       | 100 / 101 / 102 |
| Vestal     | Hand of Light      | 103 / 104 / 105 |

## Wound 合并与批量清理

统一 key `wound`，含义 Wound / 创伤；沿用已确认 `163b31751a`（player aid / Core p.27）与 `ccade5e7ad`。保留 hash，不造词条，不向图标填数值。

| hash → Wound | rank | 已核对出现位置                             |
| ------------ | ---- | ------------------------------------------ |
| `8466c441ea` | 544  | Bleed Out I / II / III，技能 p040–042      |
| `2c1824ea21` | 668  | Light Sensitive，quirk p032；Masochistic   |
| `6888d0cf12` | 693  | Bad Gambler / Soft，quirk p034–035         |
| `d42d7955d3` | 731  | Light Sensitive，quirk p032；Masochistic   |
| `48ca9f366e` | 793  | Damage Stone，trinket p007；旋转的同类图标 |

重新规范化后，Bleed Out 三张、Light Sensitive、Soft、Damage Stone 清掉由 Wound 引起的全部 unverified。Bad Gambler 只清 `6888d0cf12`，仍保留唯一原因 `icon:adcab0541a`；没有因另一个未知图标拒绝整批。此处清理只是数据验证状态，未新增怪癖或饰品引擎流程。

## 接线重点

- 条件伤害共五族 15 张：Smite、Holy Lance、Mace Bash、Hand of Light 对 Unholy +1 / +2 / +3；Pistol Shot 对 Marked +2 / +3 / +4。目标类别和标记继续通过既有条件伤原语读取。
- 39 张卡的状态明确面值与持续时间逐卡注解；混合 Light、Remove、位移沿用既有 settle。Bleed 的 I / II / III：If It Bleeds 2×2t / 3×3t / 4×3t；Bleed Out 3×2t / 3×3t / 4×3t；Open Vein 2×2t / 2×3t / 3×3t。
- Bleed Out 自身 Wound 为 3 / 4 / 5，接有序生命效果。落空仍承受自身创伤，防护不减自身创伤，多目标合并时自身效果只结算一次。
- Adrenaline Rush II / III 的原提取按 y 混合左右框；仅对这两张验证原始行签名后重排已有确认图标。自身与一名 / 两名友方分别移除 Bleed、Blight 并放 Buff 2t，无 Acc、不掷命中骰。I 级仍沿用自身 Buff 3t。
- Inspiring Cry II / III 同时结算自身 Heal 1 / Stress -1 与一名 / 两名友方 Heal 1 / Stress -1；Light +1 随既有目标效果 settle 逐目标结算。目标效果继续沿用 support 注解，自身治疗和减压只结算一次。
- 22 张明确射程区间沿用 range 注解。数据源、页码、等级、原效果行和确认状态变化会拒绝构建，未命名数字不改成推测值。

## 验证

`four-core-skills.test.ts` 对全部 84 张使用真实 `applyCommand`、真实英雄属性和 Bone Soldier 卡：覆盖最大目标数、无未消费效果框、一次技能共用一次命中骰、无 Acc 不耗骰、不可变输入和同种子回放。另测 Bleed Out 三等级落空成本，以及 Adrenaline Rush II / III 的自身与多友方清状态和 Buff。

typecheck、lint、52 文件 556 项单元 / 场景测试、build、`git diff --check` 均通过。Playwright 沿用 3 条关键路径，第一条加入 21 个技能选项及 Bulwark of Faith III 实际结算，3 条通过（49.6 秒）。当前默认 Chromium v1243 缺失且下载未完成，本机通过临时配置使用已有 headless Chromium v1234 验证；临时配置已删除，正式测试配置不变。

## 仍需 Kyries 确认

本批 84 张技能无新增待确认项。以下旧项独立保留，不阻塞本批：

- Bad Gambler 的 `adcab0541a` 未命名图标（Q-47）；Wound 合并后只剩该原因。
- Hellion / Vestal 属性面上的 `d29a868ed8` 仍未命名（Q-47）；本批只核 Buff 不出现在抵抗 / 免疫框，未命名该图标。
- Q-52：同次技能最后英雄与最后怪物双灭的战役收尾排序；继续沿用已有单场停场处理。
