# Ruins 四 Boss II／III 接线

基线 main `2dbc4ee`（#397）。Kyries 本聊天明确要求将 Ruins Boss II／III 一起完成。本轮补七个等级身份，连同既有 Necromancer II，共八个脚本；正式房间几何及 R-121 仍保留停点。

依据：官方核心规则书 R11、R19–26、R29–31、R33–35、R38–39；规格书 §6、§11、§14；R-001/R-026/R-034/R-048/R-124–126，以及本聊天确认的 R-135–137。已目视官方 R26/R38/R39 完整页图与当前版印刷卡面。印刷 PDF 只供卡文、数字与已命名图标，不补规则；卡图和缓存不提交。

| Boss        | II：Life / Dodge / Speed | III：Life / Dodge / Speed | 战斗卡             |
| ----------- | ------------------------ | ------------------------- | ------------------ |
| Necromancer | 103 / 1 / 3              | 144 / 3 / 3               | Medium p090 / p091 |
| Prophet     | 106 / 1 / 1              | 151 / 3 / 1               | Large p006 / p007  |
| Collector   | 88 / 1 / 2               | 111 / 2 / 2               | Medium p093 / p094 |
| Fanatic     | 55 / 1 / 2               | 72 / 2 / 3                | Large p009 / p010  |

Boss Abilities：Necromancer p003/p006；Prophet p008–009/p011–012；Collector p014–015/p017–018；Fanatic p020–021/p023–024，均核对正反面。召唤物另核对 Medium p095–103 和 Large p011–013。Bone Spearman p013 沿 R-082 独立批准，不把 III 级 Boss 的召唤物擅改成 III 级普通怪物。

本轮接通：

- 死灵法师 III 三招、Bone Spearman 召唤、当前轮先攻、挤占续接与死亡清场。Reanimation 按 R-135 每场首次非 Large 死亡重新生成，清除条件；区域不足忽略，缺部署绑定拒绝。III 的首日墓地守卫沿相同卡文与 R-125 的并列选择流程。
- 先知 II／III 首行动四骰木长椅、第二行动按独立骰表选招、第三行动逐木长椅区域攻击、三先攻与三行动；II 侦察额外压力和酒馆恢复 −2，III 每只 Unholy 生成全体压力 +1、酒馆恢复 −3。
- 收藏家 II／III 两招及自身治疗、三件同级 Collected 的召唤与完整行动。Collected 原 parsed.hp 误取技能编号 1；规范化层按完整卡面独立绑定 Life，保留原始提取。Vestal 按 Most Wounded 选怪物、移动到射程并治疗/Buff，不伪造攻击骰。
- R39 的收藏家先攻修正同时用于 I–III：开场仅本体一张；Collect All 成功后向当前堆恰好洗入三张，不预发未生成怪物的先攻，不按剩余数量补到四张。收藏家死亡清除 Collected，先知死亡移除木长椅。
- 收藏家 II 的 Curio 金币/饰品奖励按整卡只掷一次，结果随待选保存；日末按实际访问建筑判定并另掷偷金币。III 的 Resting 固定四点，均分每人一点；Snatch! 由玩家选持牌并按 R-137 弃置，不重掷或重扣准备日。
- 狂信者 II／III 的完整三招、同级 Pyre、Sentence Rendered、Pit Toss、四先攻与三本体行动。II 全体 Mark 3t、村庄技能后 Debuff 4t；III 全体 Mark/Debuff 2t、日末 Lynch Mob 按访问建筑英雄等级结算伤口与压力，并保留意志/死亡/补员续接。
- Pyre I–III 按 R-136 自动命中 99 Damage，仍经防护、受击饰品、被动、反击与死门；没有攻击骰或 Crit 数字。新增防御窗口用“自动命中”文案，不提供依赖 Dodge 或缺失 Crit 数字的选项。
- 八个身份按实际同级迫近威胁严格匹配出征；II／III 幕末两次普通任务后可提供 p019，缺项/错配仍拒绝，不默认换成死灵法师。网页把 Boss/召唤物目录追加到战斗数据，普通怪物抽牌池不变。
- 加入 Boss 目录前的正式网页目录保留为可信旧档来源；先严格回放旧快照，战斗卡只允许追加已知 Boss 身份，不能借目录升级修改实体、牌序、骰子或伤口。不改存档版本。

验证：`pnpm typecheck`、`pnpm build`、本轮全部 TS/TSX 文件 ESLint 与格式检查通过；Boss、威胁、卡面与网页存档迁移共 39 文件 / 422 测试分批通过（网页存档迁移另按默认配置复跑 14/14 通过）。

浏览器冒烟：补装当前 Playwright Chromium 后，`home.spec.ts` 通过；`formal-battle.spec.ts:89` 的既有手牌按钮计数失败（期望 3、实际 0），该已知小问题按当前优先级保留。

全库质量闸门未全绿：`pnpm lint` 报 190 条，主要来自本地 `.cache` 脚本及既有 Flesh/Swine 代码；未提交缓存或修改这些扩展。全量 Vitest 已运行并报告六个既有规范化快照差异（`quirk` 图标词典已确认、英雄旧 JSON 未同步）、`provision-use` 失败，以及长场景 `dungeon-battle-l1-admission`、`quest-save` 超时；约七分钟后停止该轮，不声称全量通过。首次网页目录测试超时已给实际多次回放留 20 秒并单独验证通过。

机制夹具使用显式逻辑区，不冒称获批房间几何或自然 II／III 完整战役。正式 Boss 房间 token、边缘房选图、Prophet/Collector 生产房间绑定、普通 III 级怪物与高等级英雄全技能、最暗线均不在本轮完成范围。
