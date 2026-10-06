# 编码代理工作约定

本文件给在本仓库里写代码的代理。内容摘自 [docs/plan.md](docs/plan.md)（开发大纲 v0.2）。大纲没有写的流程，不要自行添加。

## 项目目标与范围

- 从零做《暗黑地牢桌游》网页客户端。先做核心盒（遗迹 Ruins + 最暗地牢 Darkest Dungeon），走通完整战役，再按地点扩展。
- 默认顺序：Weald → Warrens → Cove → Crimson Court → The Color of Madness → Master Webber → Butcher's Circus（PvP）。Musketeer 首版不纳入（[docs/rulings.md](docs/rulings.md) 的 R-008）。
- 首版只做单设备、1–4 人轮流操作（hot-seat）、英文卡面 + 中文 UI。
- 不在首版范围：联机多人、手机端深度适配、完整中文化卡面、动画与音效、AI 托管英雄、成就与统计。

## 技术栈与计划中的仓库结构

沿用大纲 §3.1、§3.2。这些目录尚未建立。

- Vite + React + TypeScript + Tailwind CSS。
- 引擎状态是不可变数据。UI 用 Zustand，只订阅状态、派发命令。
- Zod 校验数据 schema 和存档 schema。
- Vitest 做引擎单元测试和场景测试。Playwright 每个阶段只做 1–3 条关键路径冒烟。
- pnpm workspaces（或 npm workspaces）、ESLint + Prettier。GitHub Actions 跑 typecheck、lint、test、build。
- 流程状态默认用判别联合 + reducer。只有最外层流程需要可视化时才考虑 XState。

```
packages/engine/     # 纯 TypeScript 规则引擎，不依赖 React / DOM
packages/data/       # Zod schema + 规范化游戏数据 JSON
apps/web/            # React + Tailwind UI
tools/pipeline/      # TTS 解析、图片缓存与切图、转录辅助、校验、抽检页
docs/rules-spec/     # 规则规格书（中英术语对照，标页码）
docs/rulings.md      # 本项目裁定
docs/data-legend.md  # 卡面图标图例
```

核心规则说明书 v0.2 在 [docs/spec/core-rules-spec-v0.2.md](docs/spec/core-rules-spec-v0.2.md)，状态是初稿，待 Kyries 逐条确认（检查点 ①）。大纲 §3.2 中的 `docs/rules-spec/` 指的是同一份规格书；正式稿放在 `docs/spec/`。

## 规则引擎

- 纯函数、确定性，不依赖 React / DOM。d10、探索骰、补给骰、死门骰、洗牌都走可设种子的 RNG。
- 同样的种子 + 同样的命令序列 = 同样的结果。
- 存档 = 初始种子 + 命令日志（Phase 4 另加快照和版本号）。
- `applyCommand(state, command) → { state, events[], pendingChoice? }`。需要玩家决策时返回 `PendingChoice`，UI 只呈现选项。
- 效果用数据驱动的原语和触发钩子。Boss 专属逻辑可以每个 Boss 一个 TypeScript 模块，不必塞进 DSL。
- 规则书中的例子做成黄金测试。

## 规则来源

按大纲 §2.3、§7，并经 [docs/rulings.md](docs/rulings.md) 的 R-001 修订，优先级为：

1. 官方规则书（核心盒与各扩展 PDF）。规格书写条目时标页码，并对照页面图像；文字提取会丢掉图标。
2. [docs/rulings.md](docs/rulings.md) 里 Kyries 拍板的本项目裁定。

不使用模组 FAQ 或设计师 FAQ（R-001）。

规则有歧义时不要自己发明规则或数值。先查 `docs/rulings.md`。没有裁定，就在 PR 里提出待确认项（沿用 `Q-xx`），不要按猜测实现。印刷 PDF 只提供卡牌文字和数字，不能用来补规则。卡面上没有标签的数字和图标，等图标图例确认后再命名。

## 美术与版权

- 仓库保持私有。美术版权属于原游戏和桌游发行方。
- TTS 创意工坊美术和印刷 PDF 里的图像都不提交。印刷 PDF 只作数据和文字来源。
- 需要图片时用本地私有缓存（Steam CDN）或占位图，缓存不进仓库。

## 旧仓库

`Alpaca-go/darkest-dungeon-boardgame` 只作参考，不复制代码，也不在它上面重构。大纲 §1.6 点名的定义，以及种子化先攻、`PendingChoice`、存档回放，可以交叉核对。不要搬它的 evidence / proof 证据链。规则来源以 [docs/rulings.md](docs/rulings.md) 的 R-001 为准：只认官方规则书，不使用 FAQ。

## 质量闸门

- typecheck、lint、单元测试与场景测试、build 都要通过。
- 每个阶段末尾加 1–3 条 Playwright 冒烟，不做全量回归墙。
- 不建立旧仓库那种 evidence / proof JSON 证据链。

## PR

- 小 PR：一个主题。有效改动建议不超过 600 行。
- 描述用中文，写清改动、测试和已知限制。
- 涉及规则的 PR 要引用规格书条目（含页码）或 `docs/rulings.md` 的编号（`R-xxx`，或尚未裁定的 `Q-xx`）。
