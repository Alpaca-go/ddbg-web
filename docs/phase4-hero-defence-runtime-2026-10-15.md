# Phase 4：四核心高等级英雄防御运行时

#190已按本轮授权合并，head `376dd0c`，main `9d0cd8d`。合并前本机typecheck、lint、120文件/1083项单元与场景测试、build通过；沿既有约定不检查远端Actions。当前分支 `codex/phase4-hero-defence-runtime`。

本主题接通R-081八张获批II/III级卡的防御消费，依据规格书§6.7、§7、§13.2（官方R20–21、R29）、R-033与R-048。完整卡身份和左右栏仍经既有严格读取器验证，缺失或伪造高等级批准拒绝，不用I级或Buff专项回退。

- 持续状态只接已获批的Stun/Bleed/Blight/Debuff；抗性仅将每次新施加的Nt减1，不减伤口面值，不清已有堆。自身效果仍无视防御。Shuffle和Disease独立处理，不进入状态堆或回合递减。
- Crusader II的目标Shuffle距离在技能结算层减1，同时作用于区域与姿态。怪物单目标、多目标及定位预检均传入战斗目录，避免遗漏英雄防御。Balanced和区域待选沿用已减距离，不重复抵抗或重掷。
- Crusader III目标Shuffle免疫先于Balanced/区域选择，不触发实际位移的Vertigo；真实Holy Lance自身Pull仍移动。Ancestor's Glory原有效果继续叠加。
- Vestal III在真实怪物命中和Curio逐行结算中免疫新疾病；跳过抽病及再感染怪癖，不改病堆、不推进感染RNG，保留已有疾病。Curio其他行照常继续。

新增七项场景：八卡持续状态及自身例外、Maggot首次/重复感染免疫、伪造/缺失批准原子拒绝、真实Push2抵抗后Balanced与区域分岔、Dead Weight零位移/免疫、Holy Lance自身位移及Curio疾病行跳过。使用获批卡与明确引擎夹具；同种子/同命令回放与输入不突变均有断言，没有注入XP后声称自然英雄升级或连续战役验收。

进度核对：Phase3三张基础任务的自然路径已通、普通遗迹9/9可战、核心盒9/28，仅QuestMap p1获批；人工试玩仍待Kyries确认。Phase4已有存档/回村/逐日村庄、7/16事件、多数建筑服务、Guild技能永久升级与铁匠计划。本次完成英雄升级前的防御适配，正式地牢入口仍只接受I级英雄。

下一主题接Guild英雄等级升级与技能/饰品槽管理，并明确未装备技能管理（已由本后续主题推进，见[guild-hero-upgrade](phase4-guild-hero-upgrade-2026-10-15.md)）；随后接下一任务出征、临时技能实际应用/归还、奖励补给骰及连续两任务验收。单个现有任务最高3XP，自然付4XP升级仍依赖连续任务接口。驿站死亡补人、其他9张事件/剩余技能继续后续；Q-79/Q-80 pending，不自行裁定，未进入Phase5。

本主题无UI变化，不是阶段收尾，不新增或重复Playwright。用户8080配置、临时资料/截图与美术不提交。Node24.20.0低于仓库声明24.21.0；保留既有Vite配置和包体积提示。

最终验证：本机typecheck、lint、120文件/1090项单元与场景测试、build全部通过（`pnpm test --maxWorkers=4`），`git diff --check`通过。未检查远端Actions。
