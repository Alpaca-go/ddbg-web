# Necromancer I 页面入口（2026-11-03）

此前正式页没有deployNecromancerI按钮；Boss专属房也复用普通抽怪准备区。现在正式页与沙盒共用专属部署入口，只对标准/Radiant模式、I级Face the Threat、已绑定Necromancer I房间显示；派发既有命令，继续由引擎核验完整准入。已接通入口不再显示旧的“几何/交接尚未获批接通”文案，所有Boss房均不展示普通怪物抽牌按钮。

依据R-166/R-172：Boss初始进攻姿态/A，四英雄/G。部署后复用开始战斗与现有胜负交接按钮；胜利清房返回地图，全灭按R-044显示战役失败。R-068双方全灭停点不变。没有改引擎、规则数据、combatReady、任务白名单或room:p010 usable。

新增2条Playwright冒烟通过：标准模式真实prepareDungeonBattle→deployNecromancerI→startBattle→胜利交接；Radiant同一入口→全灭交接。核对真实部署区域/77Life/命令顺序、错级隐藏入口、不展示普通抽怪按钮、无页面异常或命令拒绝。目标房入口及胜负终态为明示机制夹具，不声称自然完成Boss任务、11任务战役或正式存档回放。

Node24.21.0/pnpm12.9.1下typecheck、全仓ESLint、build及改动文件Prettier通过。原始pnpm lint仍受原有未跟踪交接稿和UTF-16几何JSON阻塞，未修改这些文件。引擎与数据未改，沿用#568的412文件/3116项全量测试基线；前端测试另行回归。

## 回归补记

前端36个测试文件、111项测试全部通过（`pnpm test apps/web --maxWorkers=2 --testTimeout=30000`）。首轮默认5秒限时有1项既有存档迁移测试超时；按#568完整套件使用的30秒限时重跑通过，未修改测试断言或全局配置。#568最新提交d119e354的[CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/41644353446)已全部通过。
