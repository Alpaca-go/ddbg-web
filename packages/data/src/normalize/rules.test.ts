import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { normalizedHeroStatFileSchema } from "./hero-stat";
import {
  projectHeroSkillRules,
  projectHeroStatRules,
  projectMonsterCardRules,
  projectMonsterSkillRules,
  projectRules,
  projectVirtueRules,
} from "./rules";
import {
  normalizedHeroSkillFileSchema,
  normalizedMonsterLargeFileSchema,
  normalizedMonsterMediumFileSchema,
  normalizedVirtueAfflictionFileSchema,
} from "./schema";

const ROOT = new URL("../../", import.meta.url);
function read(relative: string): unknown {
  return JSON.parse(readFileSync(new URL(relative, ROOT), "utf8")) as unknown;
}

/** 旧字段 → rules 路径。顺序与 schema 字段一致，便于对表复核。 */
type Mapping = readonly (readonly [string, readonly string[]])[];

const HERO_SKILL: Mapping = [
  ["verified_status_effects", ["statuses"]],
  ["verified_damage_bonus", ["damage"]],
  ["verified_damage_bonuses", ["damageBonuses"]],
  ["verified_actor_damage_bonus", ["actorDamage"]],
  ["verified_range", ["range"]],
  ["verified_self_range", ["self", "range"]],
  ["verified_self_heal", ["self", "heal"]],
  ["verified_self_stress", ["self", "stress"]],
  ["verified_target_header", ["target", "header"]],
  ["verified_target_heal", ["target", "heal"]],
  ["verified_target_stress", ["target", "stress"]],
  ["verified_target_support", ["target", "support"]],
  ["verified_allies_stress", ["alliesStress"]],
  ["verified_rallying_flare", ["rallyingFlare"]],
  ["verified_effect_line_receipts", ["receipts"]],
  ["verified_bleed_blight_transfer", ["transfer"]],
];

const MONSTER_SKILL: Mapping = [
  ["verified_damage_bonus", ["damage"]],
  ["verified_actor_damage_bonus", ["actorDamage"]],
  ["verified_effect_line_receipts", ["receipts"]],
  ["verified_bleed_blight_transfer", ["transfer"]],
  ["verified_range", ["range"]],
  ["verified_self_range", ["self", "range"]],
  ["verified_self_heal", ["self", "heal"]],
  ["verified_self_stress", ["self", "stress"]],
  ["verified_target_header", ["target", "header"]],
  ["verified_target_heal", ["target", "heal"]],
  ["verified_target_stress", ["target", "stress"]],
  ["verified_target_support", ["target", "support"]],
  ["verified_allies_stress", ["alliesStress"]],
  ["verified_monster_effects", ["effects"]],
  ["verified_weald_attack", ["wealdAttack"]],
];

const MONSTER_CARD: Mapping = [["verified_weald_profile", ["wealdProfile"]]];

const HERO_STAT: Mapping = [
  ["verified_buff_defence", ["buffDefence"]],
  ["verified_condition_defence", ["conditionDefence"]],
  ["verified_higher_condition_defence", ["higherConditionDefence"]],
];

const VIRTUE: Mapping = [["verified_turn_start", ["turnStart"]]];

function valueAt(node: unknown, path: readonly string[]): unknown {
  let current = node;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * 1) `projectRules(card)` 必须等于 `card.rules`；
 * 2) 每个存在的 `verified_*` 必须在 `rules` 的对应路径上逐值相等；
 * 3) 不允许出现没进映射表的新 `verified_*` 字段（防止只加旧字段不加 rules）。
 */
function assertDualWrite(
  card: { readonly rules?: unknown },
  mapping: Mapping,
  project: () => object | undefined,
): void {
  const loose = card as unknown as Record<string, unknown>;
  expect(project()).toEqual(loose.rules);
  const known = new Set(mapping.map(([key]) => key));
  for (const key of Object.keys(loose)) {
    if (key.startsWith("verified_")) expect(known, `${key} 缺少 rules 映射`).toContain(key);
  }
  for (const [verifiedKey, path] of mapping) {
    const value = loose[verifiedKey];
    if (value === undefined) continue;
    expect(valueAt(loose.rules, path), `${verifiedKey} -> rules.${path.join(".")}`).toEqual(value);
  }
}

describe("R1：rules 与 verified_* 双写一致", () => {
  it("hero_skill：16 个字段全部投影到 rules", () => {
    const file = normalizedHeroSkillFileSchema.parse(read("normalized/corebox/hero_skill.json"));
    expect(file.cards).toHaveLength(378);
    for (const card of file.cards) {
      assertDualWrite(card, HERO_SKILL, () => projectHeroSkillRules(card));
      expect(card.rules).toEqual(projectRules(card));
    }
    expect(file.cards.filter((card) => card.rules !== undefined).length).toBeGreaterThan(300);
  });

  it("hero_stat：核心盒与四个扩展包的防御字段投影到 rules", () => {
    const file = normalizedHeroStatFileSchema.parse(read("normalized/corebox/hero_stat.json"));
    expect(file.cards.length).toBeGreaterThan(0);
    for (const card of file.cards) {
      assertDualWrite(card, HERO_STAT, () => projectHeroStatRules(card));
      expect(card.rules).toEqual(projectRules(card));
    }
    expect(file.cards.some((card) => card.rules !== undefined)).toBe(true);
  });

  it("monster：卡级 wealdProfile 与技能级规则分别投影", () => {
    const medium = normalizedMonsterMediumFileSchema.parse(
      read("normalized/corebox/monster_medium.json"),
    );
    for (const card of medium.cards) {
      if (!("skills" in card)) continue;
      assertDualWrite(card, MONSTER_CARD, () => projectMonsterCardRules(card));
      expect(card.rules).toEqual(projectRules(card));
      for (const skill of card.skills) {
        assertDualWrite(skill, MONSTER_SKILL, () => projectMonsterSkillRules(skill));
      }
    }
    const large = normalizedMonsterLargeFileSchema.parse(
      read("normalized/corebox/monster_large.json"),
    );
    for (const card of large.cards) {
      for (const skill of card.skills) {
        assertDualWrite(skill, MONSTER_SKILL, () => projectMonsterSkillRules(skill));
      }
    }
    expect(large.cards.some((card) => card.skills.some((skill) => skill.rules))).toBe(true);
  });

  it("weald：R-230 / R-232 核准字段进入 rules", () => {
    const medium = normalizedMonsterMediumFileSchema.parse(
      read("normalized/extension/weald/monster_medium.json"),
    );
    for (const card of medium.cards) {
      if (!("skills" in card)) continue;
      assertDualWrite(card, MONSTER_CARD, () => projectMonsterCardRules(card));
      for (const skill of card.skills) {
        assertDualWrite(skill, MONSTER_SKILL, () => projectMonsterSkillRules(skill));
      }
    }
    const large = normalizedMonsterLargeFileSchema.parse(
      read("normalized/extension/weald/monster_large.json"),
    );
    for (const card of large.cards) {
      for (const skill of card.skills) {
        assertDualWrite(skill, MONSTER_SKILL, () => projectMonsterSkillRules(skill));
      }
    }
  });

  it("virtue_affliction：回合开始触发表进入 rules", () => {
    const file = normalizedVirtueAfflictionFileSchema.parse(
      read("normalized/corebox/virtue_affliction.json"),
    );
    expect(file.cards).toHaveLength(10);
    for (const card of file.cards) {
      assertDualWrite(card, VIRTUE, () => projectVirtueRules(card));
      expect(card.rules).toEqual(projectRules(card));
    }
    expect(file.cards.every((card) => card.rules?.turnStart !== undefined)).toBe(true);
  });
});
