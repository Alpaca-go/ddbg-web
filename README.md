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

`pnpm dev` 打开普通遭遇战沙盒；`/?phase=3` 打开地牢探索沙盒。main 已合并 #115：四核心英雄 84 张技能、侦察、探索骰、部分房间结算、完整 42 张 I 级怪物池、Ritual Chamber 战斗与胜利 / 四轮撤退回传已接通。当前 `codex/phase3-disease-runtime` 分支接入真实 Maggot 感染、疾病 / 负面怪癖被动、有限牌池与地图回传，尚未合并；Q-66 保持待定，Q-67 / Q-68 与少量复合续接仍保留停点。当前尚不是完整任务或战役，进度见 [最新交接](docs/HANDOFF-FROM-CODEX-2026-10-09.md)，本轮范围与种子 4 的测试布置见 [疾病运行时接线](docs/phase3-disease-runtime-2026-10-12.md)。
