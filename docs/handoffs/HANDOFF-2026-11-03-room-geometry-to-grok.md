# 核心盒25张Room几何收口交接（给Grok Bot）

> **2026-11-04 最新接手**：Kyries 已交给 DeepSeek Harness；请以 [HANDOFF-2026-11-04-core-pack-to-deepseek-harness.md](HANDOFF-2026-11-04-core-pack-to-deepseek-harness.md)（main tip `685a20b8`）为准，本文几何表仍有效但 usable/runtime 状态可能已过时。

日期：2026-11-03（Asia/Shanghai）。接手方：Grok Bot。仓库：Alpaca-go/ddbg-web。本次用户指令是“狂热者房间完成后就合入，然后写一份交接文档给grok bot”。本文交接现状，不授权自动扩大后续规则实现范围。

## 已合入基线

- 几何及闸门修复PR：[#560](https://github.com/Alpaca-go/ddbg-web/pull/560)。合入提交：6e66cda81577bacf51296d6b628db80243d12619。
- 内容提交：e77c6329（Ancestor）、7c5cc2c（Vault/饰品质量闸门修复）、ad7f3dae（四张遗迹Boss房）、10f077e8（400种子重场景独立时限）。
- 当前核心盒25张具名Room全部有唯一、geometryVerified=true的生产几何；usable=true为13张，usable=false为12张。未缺几何，未因此宣称完整战役验收或开放Phase 6。
- 以当前JSON、独立schema与R-165～R-169为准。旧交接文档里“p006–p012/最暗/Ancestor无生产几何”和人工填写表里的空白已落后，不应据此重复核图或重复开发。

## 25张Room状态

| Room ID   | 名称                   | 来源（Tile PDF） | 几何裁定 | usable |
| --------- | ---------------------- | ---------------- | -------- | ------ |
| room:p001 | Ritual Chamber         | FRONT p1         | R-054    | true   |
| room:p002 | Torture Chamber        | BACK p2          | R-048    | true   |
| room:p003 | Healing Fountain       | FRONT p2         | R-065    | true   |
| room:p004 | Spiked Pit             | BACK p3          | R-066    | true   |
| room:p005 | Beacon of Light        | FRONT p3         | R-065    | true   |
| room:p006 | Treasure Chamber       | BACK p4          | R-065    | true   |
| room:p007 | Tomb of Ancestor       | FRONT p4         | R-065    | true   |
| room:p008 | Invocation Chamber     | BACK p5          | R-065    | true   |
| room:p009 | Old Abbey              | FRONT p5         | R-065    | true   |
| room:p010 | Necromancer Room       | BACK p6          | R-166    | false  |
| room:p011 | Prophet Room           | FRONT p6         | R-167    | false  |
| room:p012 | Collector Room         | BACK p7          | R-168    | false  |
| room:p013 | Fanatic Room           | FRONT p7         | R-169    | false  |
| room:p014 | Pool of Rebirth        | FRONT p9         | R-144    | true   |
| room:p015 | Hall of Ascension      | BACK p9          | R-153    | true   |
| room:p016 | Eldritch Vault         | FRONT p10        | R-156    | true   |
| room:p017 | Toxic Chamber          | BACK p10         | R-157    | true   |
| room:p018 | Eldritch Power Chamber | FRONT p11        | R-158    | false  |
| room:p019 | Teleporters            | BACK p11         | R-159    | false  |
| room:p020 | Evil Eye               | FRONT p12        | R-160    | false  |
| room:p021 | Temple of the Chosen   | BACK p12         | R-161    | false  |
| room:p022 | Templars Room          | FRONT p13        | R-162    | false  |
| room:p023 | Shuffling Horror Room  | BACK p13         | R-163    | false  |
| room:p024 | Mammoth Cyst Room      | FRONT p14        | R-164    | false  |
| room:p025 | Ancestor Room          | BACK p14         | R-165    | false  |

生产目录：packages/data/normalized/corebox/room_tile_geometry.json；Room卡目录：packages/data/normalized/corebox/room.json。几何生成与union入口：packages/data/src/normalize/room-tile.ts；Room来源断言由normalize/build.ts统一调用。不要手改生成JSON代替修改规范化来源。

## 本轮获批事实与实现位置

| Room             | 裁定  | 关键事实                                                  | 独立规范化模块      |
| ---------------- | ----- | --------------------------------------------------------- | ------------------- |
| Ancestor p025    | R-165 | 11区，18条共享边；D-E/H-J共享边，B-D/E-J仅角点            | ancestor-room.ts    |
| Necromancer p010 | R-166 | E容量由2修正为3；A高地；英雄四姿态G，怪物只印Aggressive A | necromancer-room.ts |
| Prophet p011     | R-167 | D-H/F-H是短共享边；八处橙色编号；只印怪物Aggressive E     | prophet-room.ts     |
| Collector p012   | R-168 | F三个独立宝箱，各有白色叹号；lootAreas保留三个F，不去重   | collector-room.ts   |
| Fanatic p013     | R-169 | B高地；D/F分别为完整折区；A-E/C-E不通也非角点             | fanatic-room.ts     |

上述模块位于packages/data/src/normalize/，各有同名.test.ts；逐面审核文档为docs/phase5-{ancestor,necromancer,prophet,collector,fanatic}-room-geometry-review-2026-11-03.md。Q-148～Q-152全部解决。审核批准的是图面事实与来源，不是额外规则授权。

所有新Boss房维持usable=false。Prophet橙色编号保存在printedMarkers，尚未赋予掷骰/落石效果；Collector宝箱及叹号保存在printedLoot，runtimeReady=false，叹号未作规则命名。Necromancer/Prophet未印其余怪物姿态，不补默认区域；后续Boss部署必须走独立已核实规则路径。

## Grok接手的剩余工作

1. 四张最暗普通房仍不可用：p018 Eldritch Power Chamber、p019 Teleporters、p020 Evil Eye、p021 Temple of the Chosen。各面几何已获批，接手时先查各独立模块与运行时，再按已有官方规则/R裁定完成效果，遇未裁定问题停为Q项；不能直接把usable改为true。
2. 八张Boss房仍不可用：p010–p013、p022–p025。逐Boss核查部署、技能/选招、召唤/位移、胜负与后续流程及生产入口。尤其Prophet落石/掷骰、Collector三宝箱奖励、Fanatic/Pyre、最暗中Boss与最终战，不能用几何批准替代规则/准入审核。
3. 最终战packages/engine/src/boss/final-battle-deploy.ts已按usable等条件读取Ancestor生产几何；本轮Ancestor维持false，所以占位区域fallback仍存在。该文件“几何未批准”的旧注释已过时，但不能只修注释就宣称生产部署已接通。其它Boss同样先查实际入口，不只看旧文档标题。
4. 不修改combatReady总开关、不扩大任务白名单、不自动启动Phase 6。本轮用户只批准图面并要求合入/交接。后续以用户新指令、官方规则和docs/rulings.md为准。

## 合入前质量闸门修复

7c5cc2c单独处理main既有类型/lint阻塞：Vault交互收窄为英雄回合；新增clearEldritchVaultReward，在四张饰品逐个处置完后真正移除临时字段而非赋undefined；饰品结算中间态显式为GameState；两处let改const；两处既有测试格式整理。已有Vault测试并新增四张全部discard-new后的清理回归，不改变R-156支付、压力或抽牌数量。

## 验证与限制

- Node24.21.0、pnpm12.9.1；全仓typecheck、build通过。
- 干净检出pnpm lint通过；本地原工作区有未跟踪UTF-16导出JSON导致原地prettier失败，此文件未提交，也未移动或改写。
- 本地首页/升华大厅两条既有Playwright冒烟通过。远端完整Playwright smoke通过。
- 规范化再生8测与最终专项两文件8测通过，新增25张唯一覆盖及八张Boss入口拒绝测试。
- 本地完整单元/场景：406文件3076测全部通过（maxWorkers=2、testTimeout=20000，915.02秒）。首轮远端CI [41601281114](https://github.com/Alpaca-go/ddbg-web/actions/runs/41601281114)中405文件3075测通过，只有threat-is-real-no-l1-lair.test.ts的400种子场景超过默认5秒；该文件原默认时限本地复核同样超时，确认实际约6秒。10f077e8只给该条测试设置20秒独立限时，保留400种子、全部断言与全局默认值，修复后单文件4测通过（11.79秒总耗时）。该最后提交的远端CI尚未完成，本次合入依据本地完整闸门与专项复核，不宣称远端全绿。
- 本轮没有新增美术、卡图、印刷PDF或证据链；只使用本机私有缓存核图。

## 本地工作区注意

本机D:/ddbg-web另有未跟踪旧交接稿docs/HANDOFF-2026-11-01-codex-core-pack-remaining.md、人工表docs/manual-room-tile-survey.md及docs/screenshots/_p001-geom-export.json，均保留未提交，不要把它们误当本次漏提交或随手清理。核图与验证脚本、日志位于gitignored .cache；不应把私有图片或缓存加入Git。干净验证临时worktree位于.cache/room-closeout-clean。接手先git fetch并核对main，勿从旧分支开始重复合入。
