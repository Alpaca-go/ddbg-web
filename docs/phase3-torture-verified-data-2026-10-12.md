# 步骤 2：Torture Chamber VQ-01–05 获批入库

实现 `90a2c93`，开放草稿 [PR #125](https://github.com/Alpaca-go/ddbg-web/pull/125)，以 #124 主题分支为 base；尚未合并。本地检查通过，合并前另核最新 head 的质量与 Playwright 两项 CI。

Kyries 本轮回传 Kyries/Grok 目视确认：Torture Chamber BACK p2（遗迹 2）VQ-01、02、03、04、05 全部批准，无修正。明确只入库，H 的 Unholy Aura 为本面候选，不接运行时、不全局复用 Cornered；治疗拒绝路径就绪前 `usable=false`。批准与逐项队列状态见[verify-queue](kyries-verify-queue-2026-10-12.md)。

## 数据与边界

- 新增独立 `room_tile:p002:back`，关联 `room:p002` / ruins / 编号 2；来源只接受 `DD_COREBOX_TILES_BACK.pdf` p2。原 Ritual Chamber 数据保留，Fountain FRONT p2 不入库。文件去重以 raw ID + 面区分，为同页正反面保留独立身份。
- 八区容量 A–H 为 2 / 2 / 3 / 4 / 2 / 3 / 3 / 4；normal 来自本次通过的逐区表，未补未知圆点或缺印数字。
- 十条通行边：A–C、B–C、B–F、C–D、C–F、D–E、D–G、D–H、E–G、G–H。A–B、A–E、F–H 保留 `cornerOnly`；C–H、F–D、F–H 保留 `blocked`。F–H 的角点与中下段黑墙观察并存，任一标志都阻止通行。
- 四英雄 → H；怪物 Aggressive / Defensive → D、Ranged → E、Support → C；宝箱 A / B / E。本面八个出生框与三个宝箱位置单独 confirmed，`deployment.printReview=verified`；词典不改，不推广同 hash。
- H 的 `4591aebebd` 保存 `effect=unholyAura`、`status=candidate`、完整卡面文字及 `runtimeReady=false`。同 hash 在 Ritual Chamber 的 Cornered 保持原数据。新 schema 拒绝 Cornered 替换、候选升 confirmed、runtimeReady=true 或 usable=true。
- 生成器读取获批的具体面，预检文件、页码、印刷编号及各定位 hash；BACK 缺失 / 漂移不能用 FRONT 补齐。规范化文件当前两面入库，只有 Ritual Chamber 一面可用。引擎和 UI 没有新增参战入口。

规则 / 数据依据：VQ-01～05 的本轮批准、规格书 §6.2 / §6.8（官方 R16–18）、R-021 / R-048；R-054 / R-055 继续仅约束原 Ritual Chamber。没有修改 Q-52 / Q-59 / Q-61–68，没有把 VQ 审核当作复合规则裁定。

## 验证

Node 24.21.0 / pnpm 12.9.1：typecheck、lint、76 文件 / 747 项单元与场景测试、build、六条 Playwright 冒烟、diff 检查全部通过。新增三项数据回归锁住本面来源 / 容量 / 通行与非通行边 / 部署，验证 BACK 丢失或漂移不能借 FRONT 补齐，以及候选不能被改成 Cornered 或提前开放 usable。全量规范化再生与入库 JSON 一致，原 Ritual 保持可用。没有新增冒烟条数；本机浏览器沿用忽略配置 Chromium 1234，正式配置不改，构建已有主包大小 / Vite 配置提示保留。

下一块先接 Torture 的治疗拒绝路径并核对本面整体可用门；只有获得对应后续授权和验证后才开放整面。Fountain VQ-06 的审核稿已有，保持待确认，不重复请求本轮已批准的 Torture / BACK p2，也不把“不要问 FRONT p2”解释为 Fountain 获批。仍是步骤 2 / Phase 3，不跳 Phase 4。
