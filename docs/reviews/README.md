# 英雄技能 / 属性语义复核（Phase A0.5）

依据 [PLAN-2026-11-23-icon-semantics-decoupling.md](../PLAN-2026-11-23-icon-semantics-decoupling.md)。

## 计数（必读）

| 范围       | 数量    | 说明                                              |
| ---------- | ------- | ------------------------------------------------- |
| 英雄技能   | **378** | 18 名英雄 × 7 技能 × 3 级（Abomination 含变身卡） |
| 英雄属性面 | **54**  | 18 名英雄 × 3 级（I / II / III 各一面）           |
| **合计**   | **432** | 矩阵一行一张卡 / 一面                             |

计划正文写「每批 21 张」时，指的是**每英雄技能**（7×3）。  
**属性面另计 3 张**；Leper 批次 = **21 技能 + 3 属性 = 24 行**，不得只审技能。

18 名英雄一律按核心内容（R-200）；canonical ID 保留归类 pack。

## 矩阵文件

[`hero-skills-2026-11-23.json`](hero-skills-2026-11-23.json)

- `verdict` 未审为 `null`（允许 pending）；**禁止**编造 verdict / evidence / reviewer。
- `printed_lines` / `current_effects` 由工作台运行时从 `packages/data/normalized/corebox` 读取；矩阵只存索引与审阅状态。
- 无本地 `.cache/print-card-art` 时 `review_blocked=true`，不得做卡面语义判定。

## 工作台

开发模式：`/?review=hero-skills`（仅 `import.meta.env.DEV`）。

需要本机印刷缓存：`.cache/print-card-art/<png_rel>`（见矩阵 `png_rel` / Leper `expected_cache_relative_paths`）。  
不暴露公网隧道，不公开私有卡图。
