#!/usr/bin/env node
/**
 * A1 审计：枚举 packages/engine/src 非测试文件里对图标语义的读取点，并按函数/文件给出初分类。
 *
 *   node tools/pipeline/scripts/audit-icon-semantics.mjs
 *
 * 默认输出 Markdown 到标准输出。用 --out <path> 写入指定文件。
 * 分类是**初分**，仍需逐行复核；目标字段列给出 A2 迁移方向。
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const base = join(root, "packages/engine/src");

const HERO_SKILL_FN = {
  namedKeys: ["漂移断言", "signature only（改为文本 + 语义族序列）"],
  readImmediateStress: [
    "规则语义",
    "rules.self_stress / rules.target_stress / rules.allies_stress",
  ],
  readSelfHeal: ["规则语义", "rules.self_heal"],
  readSelfWound: ["规则语义", "无对应字段；暂保留文本解析（A1 缺口）"],
  selfHealLine: ["规则语义", "rules.self_heal"],
  readSelfHealStress: ["规则语义", "rules.self_heal + rules.self_stress"],
  selfHealStressLine: ["规则语义", "rules.self_heal + rules.self_stress"],
  stressLineAudience: ["规则语义", "rules.self_stress / rules.target_stress（scope）"],
  readConditionRemoval: ["规则语义", "rules.effect_line_receipts（或新增 removal 字段）"],
  removeBleedBlightKind: ["规则语义", "rules.effect_line_receipts（或新增 removal 字段）"],
  effectBoxAudience: ["规则语义", "scope 由注解提供"],
  readSelfBleedRemoval: ["规则语义", "rules.effect_line_receipts"],
  selfRemoveBleedLine: ["规则语义", "rules.effect_line_receipts"],
  readShuffles: ["规则语义", "文本 Push/Pull（非图标语义）"],
  needsHeroSkillShufflePushDistance: ["规则语义", "文本 Push/Pull（非图标语义）"],
  shuffleChoiceDistance: ["规则语义", "文本 Push/Pull（非图标语义）"],
  shuffleFromLine: ["规则语义", "文本 Push/Pull（非图标语义）"],
  readIgnoresProtection: ["规则语义", "文本 Ignores（非图标语义）"],
  ignoresProtectionLine: ["规则语义", "文本 Ignores（非图标语义）"],
  readIgnoresGuard: ["规则语义", "文本 Ignores（非图标语义）"],
  ignoresGuardLine: ["规则语义", "文本 Ignores（非图标语义）"],
  readFormChange: ["规则语义", "requiredForm / 文本"],
  formFromLine: ["规则语义", "requiredForm"],
  formRequirementFromLine: ["规则语义", "requiredForm"],
  formRequirementProblem: ["规则语义", "requiredForm"],
  isStanceIcon: ["显示标签", "stance only"],
  selectFace: ["规则语义", "back_face_skill 数据"],
  readsAsSelfTarget: ["规则语义", "rules.self_range"],
  hasCombinedMarker: ["显示标签", "display only"],
  skippedEffects: ["覆盖信号", "coverage：未消费行清单"],
  readStanceMarks: ["显示标签", "stance only"],
  countNamedTargets: ["规则语义", "rules.target_header + stats 目标图标"],
  readTargetIconCounts: ["规则语义", "rules.target_header + stats 目标图标"],
  resolveSkill: ["规则语义", "按各 rules.* 字段；签名改文本 + 族"],
  "(top)": ["类型/文档", "n/a"],
};

const FILE_MAP = {
  "core/heroes/abomination-skills.ts": [
    "规则语义",
    "rules.status_effects（A2 迁移；签名改文本+族）",
  ],
  "shared/battle/battle-attack-trinkets.ts": ["规则语义", "饰品条件：语义族签名 + 结构化效果"],
  "shared/battle/battle-empty-area.ts": ["覆盖信号", "coverage"],
  "shared/battle/battle-fortunate-armlet.ts": [
    "规则语义",
    "饰品条件：rules.target_stress / self_stress",
  ],
  "shared/battle/battle-free-trinkets.ts": ["规则语义", "饰品条件：语义族签名"],
  "shared/battle/battle-hero-targets.ts": ["覆盖信号", "coverage"],
  "shared/battle/battle-skill-status.ts": ["规则语义", "抗性结构化（rules.defence）"],
  "shared/battle/battle-trinket-ability.ts": ["漂移断言", "signature only"],
  "shared/battle/battle.ts": ["覆盖信号", "coverage"],
  "core/bosses/collector/collected-vestal.ts": ["漂移断言", "signature only"],
  "core/bosses/collector/collector-i-combat-runtime.ts": ["规则语义", "抗性结构化"],
  "core/bosses/darkest/darkest-mid-boss-skill-acc-core.ts": ["覆盖信号", "coverage"],
  "core/bosses/fanatic/fanatic-i-combat-runtime.ts": ["规则语义", "抗性结构化"],
  "core/bosses/fanatic/fanatic-i-deploy.ts": ["规则语义", "抗性结构化"],
  "core/bosses/necromancer/necromancer-i-skill.ts": ["规则语义", "boss 技能 rules.*（A2）"],
  "core/bosses/fanatic/pyre-skill.ts": ["漂移断言", "signature only"],
  "core/bosses/threat-passive-runtime.ts": ["规则语义", "抗性结构化"],
  "core/darkest/darkest-monster-support.ts": ["规则语义", "rules.monster_effects / 目标结构"],
  "shared/dungeon/dungeon-battle.ts": ["覆盖信号", "coverage + 抗性结构化"],
  "cove/bosses/siren/siren-i-combat-runtime.ts": ["规则语义", "抗性结构化"],
  "warrens/bosses/swine-prince/swine-prince-i-combat-runtime.ts": ["规则语义", "抗性结构化"],
  "weald/bosses/hag/hag-i-combat-runtime.ts": ["规则语义", "抗性结构化"],
  "weald/bosses/hag/hag-i-into-pot.ts": ["规则语义", "boss 技能 rules.*（A2）"],
  "weald/bosses/hag/hag-i-projection.ts": ["漂移断言", "signature only"],
  "weald/bosses/pounder/pounder-i-projection.ts": ["漂移断言", "signature only"],
  "weald/bosses/shrieker/shrieker-i-projection.ts": ["漂移断言", "signature only"],
  "weald/monsters/crone-catalog.ts": ["漂移断言", "signature only"],
  "weald/monsters/higher-monster-catalog.ts": ["漂移断言", "signature only"],
  "weald/monsters/monster-catalog.ts": ["显示标签", "数据传递/display only"],
  "shared/core/monster-effect-plan.ts": ["规则语义", "rules.monster_effects"],
  "shared/core/monster-self-status.ts": ["规则语义", "rules.monster_effects"],
  "shared/core/monster-skill.ts": ["规则语义", "rules.monster_effects + signature"],
  "shared/core/skill-status.ts": ["漂移断言", "signature only（文本 + 族）"],
  "shared/trinkets/trinket-reactions.ts": ["规则语义", "饰品条件：语义族签名"],
};

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

const classify = (file, fn) => {
  if (file === "core/heroes/hero-skill.ts") {
    return HERO_SKILL_FN[fn] ?? ["规则语义", "待复核"];
  }
  return FILE_MAP[file] ?? ["规则语义", "待分类"];
};

const rows = [];
for (const file of files) {
  const rel = relative(root, file).replaceAll("\\", "/");
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  let fn = "(top)";
  lines.forEach((line, index) => {
    const m = line.match(/^(?:export )?(?:function|const|async function) ([A-Za-z0-9_]+)/);
    if (m) fn = m[1];
    if (!/icon\.key|namedKeys\(|effect_lines/.test(line)) return;
    const [category, target] = classify(relative(base, file).replaceAll("\\", "/"), fn);
    rows.push({
      loc: `${rel}:${index + 1}`,
      snippet: line.trim().slice(0, 160).replaceAll("|", "\\|"),
      category,
      target,
    });
  });
}

const catCount = {};
for (const row of rows) catCount[row.category] = (catCount[row.category] ?? 0) + 1;

const md = [
  "# 图标语义审计（A1）",
  "",
  "> 自动生成。分类是**初分**，A2 前仍需逐行复核。",
  "> 分类：规则语义 / 漂移断言 / 显示标签 / 覆盖信号 / 类型文档。",
  "",
  `总计命中：${rows.length} 行。`,
  "",
  "## 分类汇总",
  "",
  "| 分类 | 行数 |",
  "| --- | --- |",
  ...Object.entries(catCount)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, n]) => `| ${cat} | ${n} |`),
  "",
  "## 逐行清单",
  "",
  "| 文件:行 | 代码片段 | 分类 | 目标字段/处理 |",
  "| --- | --- | --- | --- |",
  ...rows.map((row) => `| ${row.loc} | \`${row.snippet}\` | ${row.category} | ${row.target} |`),
];
const report = md.join("\n") + "\n";
const outIndex = process.argv.indexOf("--out");
if (outIndex === -1) {
  process.stdout.write(report);
} else {
  const output = process.argv[outIndex + 1];
  if (!output) throw new Error("--out requires a path");
  writeFileSync(resolve(root, output), report, "utf8");
}
