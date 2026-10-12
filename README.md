# ddbg-web

《暗黑地牢桌游》（Darkest Dungeon: The Board Game，简称 DDBG）网页客户端的私有仓库。先做核心盒（遗迹 Ruins 与最暗地牢），用单设备、1–4 人轮流操作（hot-seat）走通战役，再按地点扩展。

仓库保持私有，是因为卡图和版图的美术版权属于原游戏与桌游发行方。TTS 创意工坊资源和印刷文件中的图像不放进仓库；印刷 PDF 只用来提取卡牌文字和数字。规划见 [docs/plan.md](docs/plan.md)（大纲 v0.2，2026-10-06 由 Kyries 确认），给编码代理的约定见 [AGENTS.md](AGENTS.md)，规则歧义见 [docs/rulings.md](docs/rulings.md)。核心规则说明书 v0.2 在 [docs/spec/](docs/spec/README.md)。图标图例在 [docs/data-legend.md](docs/data-legend.md)（词典 v1.8 已入库，见 R-048 / Q-47）。

## 开发

Node.js `24.21.0`（`.nvmrc`）和 pnpm `12.9.1`（根目录 `packageManager`）。

```bash
pnpm install
pnpm dev        # 启动 apps/web
pnpm typecheck
pnpm lint       # ESLint 与 Prettier
pnpm format
pnpm test       # 引擎单元测试
pnpm test:e2e   # Playwright 冒烟
pnpm build
```

`pnpm dev` 打开普通遭遇战沙盒；`/?phase=3` 打开地牢探索沙盒。main 已合并 #115–#119：四核心英雄 84 张技能、侦察、探索骰、部分房间结算、完整 42 张 I 级怪物池、Ritual Chamber 战斗与胜利 / 四轮撤退回传，以及疾病 / 负面怪癖运行时、Balanced 可选减位移、空区域 Vertigo 压力收尾、Dark 房间与地图 Torch 均已接通。当前 `codex/phase3-exploration-trap` 分支接探索骰 Trap 攻击，尚未合并，范围见[探索 Trap 交付](docs/phase3-exploration-trap-2026-10-12.md)。低光照探索仍有实现边界；Q-66 / Q-67 / Q-68 的未决复合保持停点。当前尚不是完整任务或战役。

接手开发先读 [Codex 总交接](docs/HANDOFF-FROM-CODEX-2026-10-09.md) 顶部的当前入口与最近提交补记；跨代理背景见 [交给 Codex 的说明](docs/HANDOFF-TO-CODEX-2026-10-09.md)。历史段落中的分支 / 合并状态不覆盖当前入口。
