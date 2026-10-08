import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createRng, resolveHeroSkill, rollD10 } from "./index";
import type { HeroSkillCardView, HeroSkillResolution, SkillCombatState } from "./index";

const SKILL_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data/normalized/corebox/hero_skill.json",
);

type FixtureCard = HeroSkillCardView & {
  readonly name: string;
  readonly level: number;
};

function isFixtureCard(value: unknown): value is FixtureCard {
  if (typeof value !== "object" || value === null) return false;
  if (!("id" in value) || typeof value.id !== "string") return false;
  if (!("name" in value) || typeof value.name !== "string") return false;
  if (!("level" in value) || typeof value.level !== "number") return false;
  if (!("hero" in value) || (value.hero !== null && typeof value.hero !== "string")) return false;
  if (
    !("verification" in value) ||
    typeof value.verification !== "object" ||
    value.verification === null
  ) {
    return false;
  }
  if (!("unverified" in value.verification) || typeof value.verification.unverified !== "boolean") {
    return false;
  }
  if (!("printed_labels" in value) || !Array.isArray(value.printed_labels)) return false;
  if (!("unlabeled_numbers" in value) || !Array.isArray(value.unlabeled_numbers)) return false;
  if (!("stats_line" in value) || (value.stats_line !== null && !Array.isArray(value.stats_line))) {
    return false;
  }
  if (!("effect_lines" in value) || !Array.isArray(value.effect_lines)) return false;
  return true;
}

const file: unknown = JSON.parse(readFileSync(SKILL_FILE, "utf8"));
if (typeof file !== "object" || file === null || !("cards" in file) || !Array.isArray(file.cards)) {
  throw new Error("hero_skill.json 缺少 cards");
}
if (!("dictionary_version" in file) || file.dictionary_version !== "1.8") {
  throw new Error("测试要用词典 v1.8 的规范化英雄技能");
}

const cards = new Map<string, FixtureCard>();
for (const entry of file.cards) {
  if (!isFixtureCard(entry)) throw new Error("英雄技能卡形状对不上");
  cards.set(entry.id, entry);
}

function card(id: string): FixtureCard {
  const found = cards.get(id);
  if (!found) throw new Error(`缺少 ${id}`);
  return found;
}

function target(
  side: "hero" | "monster",
  wounds: number,
  dodge: number,
  id = side === "monster" ? "monster-1" : "hero-1",
): SkillCombatState {
  return { target: { id, side, wounds, dodge } };
}

function use(id: string, combat: SkillCombatState, roll: number): HeroSkillResolution {
  return resolveHeroSkill(card(id), combat, roll);
}

describe("resolveHeroSkill", () => {
  it("hero_skill:p022 Wicked Hack I 用已命名的 damage 结算暴击和命中", () => {
    const skill = card("hero_skill:p022");
    expect(skill.name).toBe("Wicked Hack");
    expect(skill.level).toBe(1);
    expect(skill.hero).toBe("HELLION");
    expect(skill.verification.unverified).toBe(false);

    const crit = use("hero_skill:p022", target("monster", 0, 0), 1);
    expect(crit).toEqual({
      skillId: "hero_skill:p022",
      targetId: "monster-1",
      status: "resolved",
      reason: null,
      outcome: "crit",
      effect: "damage",
      printedAmount: 12,
      wounds: 12,
      skipped: [],
    });

    expect(use("hero_skill:p022", target("monster", 2, 0), 2)).toMatchObject({
      outcome: "hit",
      effect: "damage",
      printedAmount: 7,
      wounds: 9,
      skipped: [],
    });
    expect(use("hero_skill:p022", target("monster", 2, 0), 9)).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      wounds: 9,
    });
    expect(use("hero_skill:p022", target("monster", 2, 0), 10)).toMatchObject({
      status: "resolved",
      outcome: "miss",
      effect: "damage",
      printedAmount: null,
      wounds: 2,
    });
  });

  it("暴击不减 Dodge，命中阈值是 Acc 减 Dodge", () => {
    expect(use("hero_skill:p022", target("monster", 0, 20), 1)).toMatchObject({
      outcome: "crit",
      printedAmount: 12,
      wounds: 12,
    });
    expect(use("hero_skill:p022", target("monster", 0, 5), 4)).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      wounds: 7,
    });
    expect(use("hero_skill:p022", target("monster", 3, 5), 5)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      wounds: 3,
    });
  });

  it("同一种子的 d10 得到同一次结算，且不改入参", () => {
    const combat = target("monster", 1, 0, "brigand");
    const frozen = structuredClone(combat);
    const roll = rollD10(createRng(1));
    const first = use("hero_skill:p022", combat, roll);
    const second = use("hero_skill:p022", combat, rollD10(createRng(1)));

    expect(roll).toBe(7);
    expect(second).toEqual(first);
    expect(first).toMatchObject({ outcome: "hit", printedAmount: 7, wounds: 8 });
    expect(combat).toEqual(frozen);
  });

  it("hero_skill:p014 Battle Heal II 用已命名的 heal 移除伤口，不会低于 0", () => {
    const skill = card("hero_skill:p014");
    expect(skill.name).toBe("Battle Heal");
    expect(skill.level).toBe(2);
    expect(skill.hero).toBe("CRUSADER");
    expect(skill.verification.unverified).toBe(false);

    expect(use("hero_skill:p014", target("hero", 6, 0), 2)).toEqual({
      skillId: "hero_skill:p014",
      targetId: "hero-1",
      status: "resolved",
      reason: null,
      outcome: "crit",
      effect: "heal",
      printedAmount: 5,
      wounds: 1,
      skipped: [],
    });
    expect(use("hero_skill:p014", target("hero", 6, 0), 10)).toMatchObject({
      outcome: "hit",
      effect: "heal",
      printedAmount: 3,
      wounds: 3,
    });
    expect(use("hero_skill:p014", target("hero", 1, 0), 2)).toMatchObject({
      outcome: "crit",
      printedAmount: 5,
      wounds: 0,
    });
    expect(use("hero_skill:p014", target("hero", 4, 6), 9)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      wounds: 4,
    });
    expect(use("hero_skill:p014", target("hero", 4, 6), 8)).toMatchObject({
      outcome: "hit",
      printedAmount: 3,
      wounds: 1,
    });
  });

  it("hero_skill:p013 Battle Heal I 只结算 heal，跳过组合标记", () => {
    const skill = card("hero_skill:p013");
    expect(skill.name).toBe("Battle Heal");
    expect(skill.level).toBe(1);
    expect(skill.verification.unverified).toBe(false);

    expect(use("hero_skill:p013", target("hero", 5, 0), 10)).toEqual({
      skillId: "hero_skill:p013",
      targetId: "hero-1",
      status: "resolved",
      reason: null,
      outcome: "hit",
      effect: "heal",
      printedAmount: 2,
      wounds: 3,
      skipped: [{ code: "damage_or_heal_combined_marker" }],
    });
  });

  it("hero_skill:p001 Smite I 命中只加 Acc 旁边的 7，不把 +1 vs Unholy 算进去", () => {
    const skill = card("hero_skill:p001");
    expect(skill.name).toBe("Smite");
    expect(skill.level).toBe(1);
    expect(skill.hero).toBe("CRUSADER");
    expect(skill.verification.unverified).toBe(false);

    expect(use("hero_skill:p001", target("monster", 0, 0), 1)).toEqual({
      skillId: "hero_skill:p001",
      targetId: "monster-1",
      status: "resolved",
      reason: null,
      outcome: "hit",
      effect: "damage",
      printedAmount: 7,
      wounds: 7,
      skipped: [{ code: "effect_lines" }],
    });
    expect(use("hero_skill:p001", target("monster", 4, 0), 10)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      wounds: 4,
      skipped: [{ code: "effect_lines" }],
    });
  });

  it("未验证、读不出 Acc、没有目标图标、阵营不符、Musketeer 都不改伤口", () => {
    const bleed = card("hero_skill:p040");
    expect(bleed.name).toBe("Bleed Out");
    expect(bleed.verification.unverified).toBe(true);
    expect(use("hero_skill:p040", target("monster", 4, 0), 5)).toMatchObject({
      status: "refused",
      reason: "未验证的技能不结算（R-048）",
      outcome: null,
      effect: null,
      printedAmount: null,
      wounds: 4,
      skipped: [],
    });

    const bounty = card("hero_skill:p044");
    expect(bounty.name).toBe("Collect Bounty");
    expect(bounty.level).toBe(2);
    expect(bounty.verification.unverified).toBe(false);
    expect(use("hero_skill:p044", target("monster", 1, 0), 5)).toMatchObject({
      status: "refused",
      reason: "Acc 标签没有非负整数阈值",
      wounds: 1,
      outcome: null,
    });

    const absolution = card("hero_skill:p217");
    expect(absolution.name).toBe("Absolution");
    expect(absolution.level).toBe(1);
    expect(absolution.verification.unverified).toBe(false);
    expect(use("hero_skill:p217", target("hero", 3, 0), 5)).toMatchObject({
      status: "refused",
      reason: "stats_line 没有已命名的 target_hero 或 target_monster",
      wounds: 3,
    });

    expect(use("hero_skill:p022", target("hero", 6, 0), 5)).toMatchObject({
      status: "refused",
      reason: "目标阵营与技能的目标图标不一致",
      wounds: 6,
    });
    expect(use("hero_skill:p014", target("monster", 6, 0), 5)).toMatchObject({
      status: "refused",
      reason: "目标阵营与技能的目标图标不一致",
      wounds: 6,
    });

    const musketeer = resolveHeroSkill(
      { ...card("hero_skill:p022"), hero: "MUSKETEER" },
      target("monster", 2, 0),
      1,
    );
    expect(musketeer).toMatchObject({
      status: "refused",
      reason: "Musketeer 不在首版（R-008）",
      wounds: 2,
      outcome: null,
    });
  });

  it("非法骰面、伤口和 Dodge 不结算", () => {
    expect(use("hero_skill:p022", target("monster", 1, 0), 0).reason).toBe(
      "d10 必须是 1 到 10 的整数",
    );
    expect(use("hero_skill:p022", target("monster", 1, 0), 11).reason).toBe(
      "d10 必须是 1 到 10 的整数",
    );
    expect(use("hero_skill:p022", target("monster", -1, 0), 5)).toMatchObject({
      status: "refused",
      reason: "伤口必须是非负整数",
      wounds: -1,
    });
    expect(use("hero_skill:p022", target("monster", 1, 1.5), 5).reason).toBe(
      "Dodge 必须是非负整数",
    );
  });
});
