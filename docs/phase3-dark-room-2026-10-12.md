# Phase 3：Dark 房间与地图 Torch

基于已合并 #118 的 main `1e701a7`，分支 `codex/phase3-dark-room`；代码 `6a817ec`、开放草稿 [PR #119](https://github.com/Alpaca-go/ddbg-web/pull/119)，本切片未合并，Phase 3 尚未完成。PR 创建后的接续入口已同步两份总交接。

## 范围与依据

已对照官方核心规则书 R12 / R15 的完整页面。Dark 房间每次进入光照 −1，保留代币、永不清理；Torch 在探索中弃一颗实际补给骰，光照 +1。沿用规格书 §5.2 / §5.7、§8、R-002 / R-027 / R-045 与官方 R26–28 具名被动，光照范围保持 0–5。Torch 只在房间效果结束后恢复光照，不能抵消 Dark 的 −1，不重新命名图标或新增裁定。

- `dungeon-light.ts` 在实际光照变化时调用全队既有 `lightRaised` / `lightLowered` 被动，继续使用共享 RNG、压力、状态防御与生命接口；0 不再降、5 不再升时不触发虚构变化。
- `resolveDungeonRoom` 新接 Dark；`roomResolution.kind=dark` 保存光照已支付的房间入口。压力资料缺失时保留已支付光照，补齐后只完成当前房间，不重新降光或进入 Trap 分配。旧 Trap 记录缺 kind 时继续按原路径读取。
- 导航就绪且没有待选时，`useProvision` 可在地图使用真实 Torch 提升光照。补给压力收尾用独立 `pressureSource=provision`，意志恢复不会重扣补给、侦察揭示或赠送减骰；英雄死亡仍停在替换接口。其他地图补给、效果中途插入或 Curio 补用 Torch 未开放。
- 中文 UI 增加 Dark 结算、真实 Torch 操作与结果提示。测试布置 p1 / seed 1 交换 D 与原 Dark 节点的种类以保持八槽代币数量，并标记起始 G 已清理；这是显式沙盒布置，不是完整任务开局。

## 验证与边界

八项新增场景覆盖 DL 独立的 −1、保留代币、重复进入与确定性、0 / 5 边界、Night Blindness / Nervous / 低光修正、Night Owl / Early Riser / Warrior of Light、压力缺资料恢复、Torch 意志 / 心脏病，以及 Q-66 / 缺防御 / 待选拒绝。既有 Trap 拒绝测试改用尚未接线的 Objective，不再把新增 Dark 路径当非法入口。

本地 Node 24.21.0 / pnpm 12.9.1 下，typecheck、lint、74 文件 / 713 项测试、build 与 `git diff --check` 通过。六条 Playwright 冒烟通过，在第二条 Phase 3 路径中加入 Dark → Torch → 普通走廊返回 → 再次进入 Dark；已检查最终完整截图，仍沿用忽略缓存 Chromium 1234 配置，不增加阶段测试条数。选路前保留 Torch 窗口的补充后，713 项测试、typecheck、lint、build 与六条冒烟再次通过。构建保留约 1.71 MB 主包提示。

非 5 光照的有骰走廊探索与 Trap 房间仍受现有实现范围限制；R-002 / R-003 已有规则依据，本切片不将该代码边界称作新的待裁定问题。有骰探索在选路前拒绝，保留导航就绪窗口，玩家可先用 Torch 恢复光照 5；补给用尽时相应入口仍拒绝。Radiant 侦察后的零骰路径沿用既有行为。探索骰的 Darkness 降光与陷阱攻击、本切片以外的房间、休息、撤离、任务 / XP 未接入。Q-66 / Q-67 / Q-68 保持待定。
