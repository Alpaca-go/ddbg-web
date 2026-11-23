#!/usr/bin/env node
/**
 * A1 审计：枚举 packages/engine/src 非测试文件里对图标语义的读取点。
 *
 *   node tools/pipeline/scripts/audit-icon-semantics.mjs
 *
 * 输出 docs/audit-2026-11-23-icon-semantics.md（逐行清单 + 每文件计数）。
 * 分类列留空，由人工/代理按计划 §A1 填写：
 *   规则语义 / 显示标签 / 漂移断言 / 卡面外观测试。
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const base = join(root, "packages/engine/src");

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) files.push(path);
  }
};
walk(base);

const rows = [];
for (const file of files) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/icon\.key|namedKeys\(|effect_lines/.test(line)) {
      rows.push({
        file: relative(root, file).replaceAll("\\", "/"),
        line: index + 1,
        snippet: line.trim().slice(0, 160),
      });
    }
  });
}

const byFile = {};
for (const row of rows) byFile[row.file] = (byFile[row.file] ?? 0) + 1;

const md = [
  "# 图标语义审计（A1）— 2026-11-23",
  "",
  "> 自动生成，分类列留空，待人工/代理逐行填写。",
  "> 分类：规则语义 / 显示标签 / 漂移断言 / 卡面外观测试。",
  "> 目标字段填 `verified_*` 或 `display only` / `signature only`。",
  "",
  `总计命中：${rows.length} 行，涉及 ${Object.keys(byFile).length} 个文件。`,
  "",
  "## 每个文件的命中数",
  "",
  "| 文件 | 行数 |",
  "| --- | --- |",
  ...Object.entries(byFile)
    .sort((a, b) => b[1] - a[1])
    .map(([file, count]) => `| ${file} | ${count} |`),
  "",
  "## 逐行清单",
  "",
  "| 文件:行 | 代码片段 | 分类 | 目标字段/处理 |",
  "| --- | --- | --- | --- |",
  ...rows.map(
    (row) => `| ${row.file}:${row.line} | \`${row.snippet.replaceAll("|", "\\|")}\` |  |  |`,
  ),
];
writeFileSync(join(root, "docs/audit-2026-11-23-icon-semantics.md"), md.join("\n") + "\n", "utf8");
console.log(`rows=${rows.length} files=${Object.keys(byFile).length}`);
