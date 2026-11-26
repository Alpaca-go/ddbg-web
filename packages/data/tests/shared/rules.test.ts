import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { normalizedHeroStatFileSchema } from "../../src/core/heroes/hero-stat";
import { expectedTargetCounts } from "../../src/core/heroes/annotations/target-counts";
import {
  projectHeroSkillRules,
  projectHeroStatRules,
  projectMonsterCardRules,
  projectMonsterSkillRules,
  projectRules,
  projectVirtueRules,
} from "../../src/shared/rules";
import {
  normalizedHeroSkillFileSchema,
  normalizedMonsterLargeFileSchema,
  normalizedMonsterMediumFileSchema,
  normalizedVirtueAfflictionFileSchema,
} from "../../src/shared/schema";

const ROOT = new URL("../../", import.meta.url);
function read(relative: string): unknown {
  return JSON.parse(readFileSync(new URL(relative, ROOT), "utf8")) as unknown;
}

/** 旧字段 → rules 路径。顺序与 schema 字段一致，便于对表复核。 */
type Mapping = readonly (readonly [string, readonly string[]])[];

const HERO_SKILL: Mapping = [
  ["annotation_status_effects", ["statuses"]],
  ["annotation_damage_bonus", ["damage"]],
  ["annotation_damage_bonuses", ["damageBonuses"]],
  ["annotation_actor_damage_bonus", ["actorDamage"]],
  ["annotation_range", ["range"]],
  ["annotation_self_range", ["self", "range"]],
  ["annotation_self_heal", ["self", "heal"]],
  ["annotation_self_stress", ["self", "stress"]],
  ["annotation_target_header", ["target", "header"]],
  ["annotation_target_heal", ["target", "heal"]],
  ["annotation_target_stress", ["target", "stress"]],
  ["annotation_target_support", ["target", "support"]],
  ["annotation_allies_stress", ["alliesStress"]],
  ["annotation_rallying_flare", ["rallyingFlare"]],
  ["annotation_effect_line_receipts", ["receipts"]],
  ["annotation_bleed_blight_transfer", ["transfer"]],
];

const MONSTER_SKILL: Mapping = [
  ["annotation_damage_bonus", ["damage"]],
  ["annotation_actor_damage_bonus", ["actorDamage"]],
  ["annotation_effect_line_receipts", ["receipts"]],
  ["annotation_bleed_blight_transfer", ["transfer"]],
  ["annotation_range", ["range"]],
  ["annotation_self_range", ["self", "range"]],
  ["annotation_self_heal", ["self", "heal"]],
  ["annotation_self_stress", ["self", "stress"]],
  ["annotation_target_header", ["target", "header"]],
  ["annotation_target_heal", ["target", "heal"]],
  ["annotation_target_stress", ["target", "stress"]],
  ["annotation_target_support", ["target", "support"]],
  ["annotation_allies_stress", ["alliesStress"]],
  ["annotation_monster_effects", ["effects"]],
  ["annotation_weald_attack", ["wealdAttack"]],
];

const MONSTER_CARD: Mapping = [["annotation_weald_profile", ["wealdProfile"]]];

const HERO_STAT: Mapping = [
  ["annotation_buff_defence", ["buffDefence"]],
  ["annotation_condition_defence", ["conditionDefence"]],
  ["annotation_higher_condition_defence", ["higherConditionDefence"]],
];

const VIRTUE: Mapping = [["annotation_turn_start", ["turnStart"]]];

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
 * 2) 每个存在的 `annotation_*` 必须在 `rules` 的对应路径上逐值相等；
 * 3) 不允许出现没进映射表的新 `annotation_*` 字段（防止只加旧字段不加 rules）。
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
    if (key.startsWith("annotation_")) expect(known, `${key} 缺少 rules 映射`).toContain(key);
  }
  for (const [verifiedKey, path] of mapping) {
    const value = loose[verifiedKey];
    if (value === undefined) continue;
    expect(
      valueAt(loose.rules, path),
      `${verifiedKey} -> rules.${path.join("../../src/normalize")}`,
    ).toEqual(value);
  }
}

describe("R1：rules 与 annotation_* 双写一致", () => {
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

  it("A2 单元 2：Remove Bleed/Blight 行写在 rules.removal", () => {
    const file = normalizedHeroSkillFileSchema.parse(read("normalized/corebox/hero_skill.json"));
    const expected: Record<string, unknown> = {
      "hero_skill:core:h07:p139": [{ lineIndex: 0, scope: "target", kinds: ["bleed", "blight"] }],
      "hero_skill:core:h07:p140": [
        { lineIndex: 1, scope: "target", kinds: ["bleed", "blight"] },
        { lineIndex: 2, scope: "self", kinds: ["bleed", "blight"] },
      ],
      "hero_skill:core:h07:p141": [
        { lineIndex: 1, scope: "target", kinds: ["bleed", "blight"] },
        { lineIndex: 2, scope: "self", kinds: ["bleed", "blight"] },
      ],
      "hero_skill:core:h09:p187": [{ lineIndex: 2, scope: "self", kinds: ["bleed", "blight"] }],
      "hero_skill:core:h09:p188": [
        { lineIndex: 3, scope: "self", kinds: ["bleed", "blight"] },
        { lineIndex: 4, scope: "target", kinds: ["bleed", "blight"] },
      ],
      "hero_skill:core:h09:p189": [
        { lineIndex: 3, scope: "self", kinds: ["bleed", "blight"] },
        { lineIndex: 4, scope: "target", kinds: ["bleed", "blight"] },
      ],
    };
    for (const [id, removal] of Object.entries(expected)) {
      const card = file.cards.find((entry) => entry.id === id);
      expect(card, id).toBeDefined();
      expect(card?.rules?.removal, id).toEqual(removal);
    }
  });

  it("A2 单元 3：18 名英雄的非特殊目标卡写入 rules.targets", () => {
    const file = normalizedHeroSkillFileSchema.parse(read("normalized/corebox/hero_skill.json"));
    let written = 0;
    let special = 0;
    for (const card of file.cards) {
      if (
        card.rules?.target?.header !== undefined ||
        card.rules?.rallyingFlare !== undefined ||
        card.rules?.target?.support !== undefined
      ) {
        expect(card.rules?.targets, card.id).toBeUndefined();
        special += 1;
        continue;
      }
      expect(card.rules?.targets, card.id).toEqual(expectedTargetCounts(card));
      written += 1;
    }
    expect(written).toBe(346);
    expect(special).toBe(32);
  });

  it("A2 单元 8：怪物抗性 / 免疫写入 rules", () => {
    const medium = normalizedMonsterMediumFileSchema.parse(
      read("normalized/corebox/monster_medium.json"),
    );
    const large = normalizedMonsterLargeFileSchema.parse(
      read("normalized/corebox/monster_large.json"),
    );
    const annotated = [...medium.cards, ...large.cards].filter(
      (card) => "resistances" in card && card.rules?.resistances !== undefined,
    );
    expect(annotated).toHaveLength(69);
    const soldier = medium.cards.find((card) => card.id === "monster_medium:p001");
    expect(soldier && "rules" in soldier ? soldier.rules : undefined).toMatchObject({
      resistances: [],
      immunities: ["bleed"],
      shuffleResist: false,
      shuffleImmune: false,
    });
    const adder = large.cards.find((card) => card.id === "monster_large:p004");
    expect(adder && "rules" in adder ? adder.rules : undefined).toMatchObject({
      resistances: ["stun"],
      immunities: ["debuff"],
      shuffleResist: false,
      shuffleImmune: true,
    });
  });

  it("A2 单元 4a：stats 行主效果写入 rules.effect", () => {
    const file = normalizedHeroSkillFileSchema.parse(read("normalized/corebox/hero_skill.json"));
    const annotated = file.cards.filter((card) => card.rules?.effect !== undefined);
    expect(annotated).toHaveLength(267);
    const smite = file.cards.find((card) => card.id === "hero_skill:core:h01:p001");
    expect(smite?.rules?.effect).toBe("damage");
    const heal = file.cards.find((card) => card.id === "hero_skill:core:h01:p013");
    expect(heal?.rules?.effect).toBe("heal");
  });
});
