# Phase 3：完整怪物牌池与守卫部署记录

#113 已合并为 main `258459e`。本主题分支 `codex/phase3-monster-pool` 接完整 Common + Ruins 牌池和获批房间的抽怪部署记录，尚未创建正式战斗。Phase 2 按批准范围完成；Phase 3 仍未达到三张任务卡完整流程的验收目标。

## 资料、分堆与可用性

只读本地资料库的官方核心规则书 R10、R16–17，并对照完整页面图像；核对当前版印刷 `monsters_medium_FRONT/BACK`，普通卡 p1–62 的标题、地点徽记、等级、Front / Back / Small / Large 与实际份数，24 种代表完整卡面和 62 页卡头交叉检查。规则依据：规格书 §6.1–6.2（R15–17）、R-029、R-048、R-052、R-054、R-055、R-058。印刷件只提供卡牌数据，没有引用 FAQ，没有提交 PDF / 图像或自造批准。

| 牌池               | 普通卡印刷页 | 实际份数  |
| ------------------ | ------------ | --------- |
| Common + Ruins I   | 1–11、18–48  | 42，15 种 |
| Common + Ruins II  | 12–15、49–55 | 11        |
| Common + Ruins III | 16–17、56–62 | 9         |

三等级总计 62 张 / 24 种。p63 起的最暗地牢、Boss、召唤物和 ADD_014 不混入当前 Common + Ruins 池。大型抽牌引用卡 p12 / p30 / p49 / p62 分别对应大型战斗卡 p1 / p2 / p3 / p4，战斗卡不额外增加牌堆份数。Small 仍占一个姿态格，没有实现其战斗中的额外挤占规则。

`monster_pool.json` 可通过既有 normalize 管线再生；Zod 校验完整页集合、分堆、份数、前后排及大型映射。每个真实印刷页都有唯一实例 ID。原怪物数值、词典、已批准 Speed / 姿态映射均不变。

I 级六种（17 张）已有 Speed / 姿态选招 / 图标基础字段；另外九种（25 张）仍缺已批准 Speed / 姿态映射：Cultist Brawler、Brigand Cutthroat、Brigand Fusilier、Brigand Bloodletter、Maggot、Webber、Spitter、Madman、Pliskin。`missingBattleFields` 只列这三类数据依赖，空数组不等于整卡战斗验收。未按技能名称、图标数量或同名高等级补值，也没有删掉它们改变概率。

## 命令与网页

已抽 Ritual Chamber → `prepareDungeonMonsters` → 完整 I 级 42 张共享种子洗牌（游标 +41）→ 按真实顺序调用已有 `spawnMonsters` → 保存部署、被大型怪替换的弃牌和余牌。缺战斗字段的真实卡仍进入部署记录，具体停点附在当前房间。大型替换后起点沿用 R-058；部署只是记录，尚未支付 Cornered、放置英雄 / 战利品或开始先攻。

只支持当前 DL 1 遗迹 Lair / Treasure 与获批 Ritual Chamber；未获批房间、Curio / Objective、错误等级、陈旧活动房间、截断目录和不守恒房间堆原子拒绝。重复命令不重洗 / 重抽；房间保持未清理，英雄生命 / 压力、补给与金币不变，Treasure 20 金仍等真实胜利。下一场抽牌、怪物堆回收与抽空接口尚未实现。

网页复现：`/?phase=3` → p1「Lair → Ritual Chamber（种子 11）」→ 重置 Radiant → 侦察并全员同意 → 探索 D → 结算零骰 → 抽房间牌 → 从完整 42 张怪物池抽牌。依次得到 Bone Rabble p41、Pliskin p47、Bone Rabble p40、Spitter p38；姿态为进攻 / 防御 / 远程 / 支援，区域 J / D / F / D，余牌 38，弃牌 0，游标 56。Pliskin / Spitter 的缺字段保留；种子 12 的 Tomb of Ancestor 仍停在板块复核，不能提前抽怪物。

## 验证与下一步

Node 24.21.0 / pnpm 12.9.1：typecheck、lint、Vitest 65 文件 / 636 项、build、Playwright 六条通过。新增覆盖可再生 / 分堆 / 大型引用、不变性、回放、42 实例均可达、Small / Large / 替换、守恒、入口与重复操作拒绝；既有 Phase 3 三条冒烟中加入真实部署路径，保留原战斗三条。截图已检查；本机沿用忽略缓存的 Chromium v1234，CI 配置不变。既有 Vite 提示及 bundle 体积提示仍存在。

下一主题优先从资料库复核缺失 I 级怪物字段，按 R-048 保留审批边界；接着接地牢英雄状态、房间效果、先攻与正式战斗，再做胜利 / 四轮退场回传。Curio / Objective / Dark、休息、撤离和任务奖励 / XP 仍在后面；Phase 4 战役 / 存档未开始。Q-52、Q-59–Q-64、光照 / 陷阱缩放及其他板块停点不变。
