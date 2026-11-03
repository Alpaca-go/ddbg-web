# Necromancer I真实房间部署

依据R-166、R-172、核心R30/R38及规格书§14.4–14.5，新增公开命令deployNecromancerI。在已正式绑定room:p010的Face the Threat I级目标房中，将Boss置于进攻姿态/A，四英雄保留各自姿态并放G；使用获批8区、容量、A区高地与11条真实通路。

入口校验实际迫近威胁、描述卡、出征战斗卡、I级战役、边缘房标记、完整房间目录、Boss及Bone Rabble战斗卡、英雄属性与装备。未知Dodge不补0；错级/其它Boss/旧无边缘标记/篡改计划/重复部署/待选均拒绝。继承英雄伤口、压力、疾病、怪癖、状态及装备；不抽普通房间或怪物牌、不发奖励、不消耗RNG。

部署后进入inBattle，但必须另行startBattle洗先攻；沿用已实现的Necromancer I选招、召唤与死亡清场。新增场景使用真实几何执行自动选招、移动、Six Feet Under、自身Push续接与Bone Rabble召唤，G满员时由PendingChoice选择挤占落点。

命令纳入存档schema；JSON命令序列可确定性重放。保留旧prepareDungeonBattle绑定输出，避免改变旧日志快照。本次不声称从自然任务起点完成正式存档闭环，也不新增前端按钮、完整Boss胜负/回村流程。

边界：仅I级真实部署；不改combatReady或任务白名单。普通选择继续拒绝Boss，room:p010保持usable=false，因此目录仍17/25可用；这不是Boss房整体收口。II/III、其它Boss与Stygian继续保留停点。

验证：相关7文件87测通过（新增7测），包含真实部署、先攻、不限四轮、保留状态、拒绝回滚、JSON重放、既有技能召唤和几何漂移检查。Node24.21.0/pnpm12.9.1下typecheck/lint/build与完整CI另行核验。非阶段末收尾，不新增浏览器冒烟路径；现有全量Playwright由CI核验。
