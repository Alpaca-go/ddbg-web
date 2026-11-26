#!/usr/bin/env node
/**
 * Phase A0.5 复核矩阵生成器。
 *
 * 读取 normalized 的英雄技能 / 属性数据，输出可供人工逐卡复核的矩阵：
 *   docs/reviews/hero-skills-2026-11-23.json
 *
 * 用法：
 *   node tools/pipeline/scripts/audit-hero-annotations.mjs
 *   node tools/pipeline/scripts/audit-hero-annotations.mjs --out docs/reviews/other.json
 *
 * 说明：
 * - 只做「可机器判断」的三角定位（印刷行、当前注解、明显缺口），
 *   不替代人工判定；verdict 默认 pending。
 * - 不修改任何游戏数据。
 * - 生成后请运行 pnpm exec prettier --write docs/reviews/*，否则 lint 会报格式问题。
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

const outPath = resolve(root, arg("--out", "docs/reviews/hero-skills-2026-11-23.json"));

const STATUS_KINDS = new Set([
  "stun",
  "bleed",
  "blight",
  "mark",
  "buff",
  "debuff",
  "protection",
  "guard",
  "riposte",
  "disease",
]);
const HEAL_KEYS = new Set(["heal", "damage_or_heal_combined_marker"]);
const CONDITION_RE = /vs|ignores|remove|if\b|target is/i;

const textOf = (line) =>
  line.map((s) => (s.type === "text" ? s.text : `{${s.icon.key ?? s.icon.iconId}}`)).join("");

const iconKeysOf = (line) =>
  line.filter((s) => s.type === "icon").map((s) => s.icon.key ?? s.icon.iconId);

function flagsForSkill(card) {
  const flags = [];
  const rules = card.rules ?? {};
  const annotations = card.rules ? ["rules"] : [];
  const statuses = rules.statuses ?? [];
  const healAnno =
    rules.self?.heal !== undefined ||
    rules.target?.heal !== undefined ||
    rules.target?.support !== undefined ||
    rules.self?.stress !== undefined;
  const damageAnno =
    rules.damage !== undefined ||
    rules.damageBonuses !== undefined ||
    rules.actorDamage !== undefined;

  card.effect_lines.forEach((line, lineIndex) => {
    const text = textOf(line);
    for (const icon of line) {
      if (icon.type !== "icon") continue;
      const key = icon.icon.key;
      if (key && HEAL_KEYS.has(key) && !CONDITION_RE.test(text) && !healAnno) {
        flags.push({ code: "effect-heal-unannotated", lineIndex, key });
      }
      if (key && key === "damage" && /vs/i.test(text) && !damageAnno) {
        flags.push({ code: "effect-damage-unannotated", lineIndex, key });
      }
      if (key && STATUS_KINDS.has(key) && !CONDITION_RE.test(text)) {
        const covered = statuses.some((e) => e.lineIndex === lineIndex && e.kind === key);
        if (!covered) flags.push({ code: "effect-status-unannotated", lineIndex, key });
      }
    }
  });

  if (card.verification.unverified) flags.push({ code: "icons-unverified" });
  if ((card.issues ?? []).length > 0)
    flags.push({ code: "parsed-issues", count: card.issues.length });
  if (card.effect_lines.length === 0) flags.push({ code: "empty-effect-lines" });
  if (card.hero === null) flags.push({ code: "double-faced" });

  return { flags, annotations };
}

function digestSkill(card) {
  return {
    lines: card.effect_lines.map((line, i) => ({
      i,
      text: textOf(line),
      icons: iconKeysOf(line),
    })),
    stats: card.stats_line ? textOf(card.stats_line) : null,
    printed_labels: card.printed_labels,
    annotations: card.rules ?? {},
  };
}

function digestStat(card) {
  return {
    parameters: {
      life: card.life,
      dodge: card.dodge,
      speed: card.speed,
      level: card.level,
    },
    annotations: card.rules ?? {},
  };
}

const skills = JSON.parse(
  readFileSync(resolve(root, "packages/data/normalized/corebox/hero_skill.json"), "utf8"),
).cards;
const stats = JSON.parse(
  readFileSync(resolve(root, "packages/data/normalized/corebox/hero_stat.json"), "utf8"),
).cards;

const entries = [];
for (const card of skills) {
  const { flags, annotations } = flagsForSkill(card);
  entries.push({
    kind: "skill",
    id: card.id,
    hero: card.hero,
    name: card.name,
    level: card.level,
    pages: card.pages,
    verdict: "pending",
    evidence: null,
    reviewer: null,
    date: null,
    qid: null,
    notes: null,
    annotationKeys: annotations,
    flags,
    digest: digestSkill(card),
  });
}
for (const card of stats) {
  const flags = [];
  if (card.verification?.unverified) flags.push({ code: "icons-unverified" });
  if ((card.issues ?? []).length > 0)
    flags.push({ code: "parsed-issues", count: card.issues.length });
  entries.push({
    kind: "stat",
    id: card.id,
    hero: card.hero,
    name: card.name,
    level: card.level,
    pages: card.pages,
    verdict: "pending",
    evidence: null,
    reviewer: null,
    date: null,
    qid: null,
    notes: null,
    annotationKeys: card.rules ? ["rules"] : [],
    flags,
    digest: digestStat(card),
  });
}

// 保留人工已填写的 verdict / 证据，重跑矩阵时不清空复核结果。
if (existsSync(outPath)) {
  try {
    const prev = JSON.parse(readFileSync(outPath, "utf8"));
    const byId = new Map((prev.entries ?? []).map((e) => [e.id, e]));
    for (const entry of entries) {
      const old = byId.get(entry.id);
      if (!old) continue;
      for (const key of ["verdict", "evidence", "reviewer", "date", "qid", "notes"]) {
        if (old[key] !== undefined && old[key] !== null) entry[key] = old[key];
      }
    }
  } catch (error) {
    console.warn("existing matrix unreadable, ignoring:", error.message);
  }
}
const flagged = entries.filter((e) => e.flags.length > 0);
const byCode = {};
for (const e of flagged) for (const f of e.flags) byCode[f.code] = (byCode[f.code] ?? 0) + 1;

const payload = {
  schema: "ddbg.hero-annotation-review.v1",
  generatedAt: new Date().toISOString(),
  source: "packages/data/normalized/corebox/hero_skill.json + hero_stat.json",
  totals: {
    entries: entries.length,
    skills: skills.length,
    stats: stats.length,
    flagged: flagged.length,
  },
  byCode,
  entries,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");

const mdPath = outPath.replace(/\.json$/, ".md");
const lines = [
  "# 英雄技能/属性复核矩阵（自动生成）",
  "",
  `- 生成时间：${payload.generatedAt}`,
  `- 总数：${entries.length}（技能 ${skills.length} / 属性 ${stats.length}）`,
  `- 有机器标记：${flagged.length}`,
  "",
  "## 标记统计",
  "",
  "| code | 数量 |",
  "| --- | --- |",
  ...Object.entries(byCode)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `| ${k} | ${v} |`),
  "",
  "## 待人工复核（有标记）",
  "",
  "| id | hero | name | L | flags |",
  "| --- | --- | --- | --- | --- |",
  ...flagged.map(
    (e) =>
      `| ${e.id} | ${e.hero ?? ""} | ${e.name} | ${e.level} | ${e.flags
        .map((f) => f.code)
        .join(", ")} |`,
  ),
  "",
  "> verdict 需要人工填写；本文件只是清单，不是判定。",
];
writeFileSync(mdPath, lines.join("\n") + "\n", "utf8");

console.log(`wrote ${outPath}`);
console.log(`wrote ${mdPath}`);
console.log(`entries=${entries.length} flagged=${flagged.length}`, byCode);
