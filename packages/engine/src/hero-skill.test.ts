import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createRng, resolveHeroSkill, rollD10 } from "./index";
import type { HeroSkillCardView, HeroSkillResolution, SkillCombatState } from "./index";

const DATA_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data/normalized/corebox",
);
const SKILL_FILE = path.join(DATA_DIR, "hero_skill.json");
const MONSTER_FILE = path.join(DATA_DIR, "monster_medium.json");

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

type MonsterResist = {
  readonly key: string | null;
  readonly naming: string;
};

type MonsterCard = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly life: number;
  /** 心形旁已命名 Dodge 图标里面的整数。读不到恰好一个时为 null。 */
  readonly dodge: number | null;
  readonly unverified: boolean;
  readonly resistances: readonly MonsterResist[];
};

function isMonsterCard(value: unknown): value is {
  id: string;
  name: string;
  level: number;
  life: number;
  verification: { unverified: boolean };
} {
  if (typeof value !== "object" || value === null) return false;
  if (!("id" in value) || typeof value.id !== "string") return false;
  if (!("name" in value) || typeof value.name !== "string") return false;
  if (!("level" in value) || typeof value.level !== "number") return false;
  if (!("life" in value) || typeof value.life !== "number") return false;
  if (
    !("verification" in value) ||
    typeof value.verification !== "object" ||
    value.verification === null ||
    !("unverified" in value.verification) ||
    typeof value.verification.unverified !== "boolean"
  ) {
    return false;
  }
  return true;
}

const monsterFile: unknown = JSON.parse(readFileSync(MONSTER_FILE, "utf8"));
if (
  typeof monsterFile !== "object" ||
  monsterFile === null ||
  !("cards" in monsterFile) ||
  !Array.isArray(monsterFile.cards)
) {
  throw new Error("monster_medium.json 缺少 cards");
}
if (!("dictionary_version" in monsterFile) || monsterFile.dictionary_version !== "1.8") {
  throw new Error("测试要用词典 v1.8 的规范化怪物卡");
}

function monsterResistances(value: unknown): MonsterResist[] {
  if (!Array.isArray(value)) return [];
  const found: MonsterResist[] = [];
  for (const icon of value) {
    if (typeof icon !== "object" || icon === null) continue;
    const key =
      "key" in icon && (icon.key === null || typeof icon.key === "string") ? icon.key : null;
    const naming = "naming" in icon && typeof icon.naming === "string" ? icon.naming : "";
    found.push({ key, naming });
  }
  return found;
}

function monsterDodge(value: unknown): number | null {
  if (!Array.isArray(value)) return null;
  const found: number[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    if (
      !("numeric" in item) ||
      typeof item.numeric !== "number" ||
      !Number.isInteger(item.numeric)
    ) {
      continue;
    }
    if (item.numeric < 0) continue;
    if (!("anchor" in item) || typeof item.anchor !== "object" || item.anchor === null) continue;
    if (!("inside_icon" in item.anchor)) continue;
    const icon = item.anchor.inside_icon;
    if (typeof icon !== "object" || icon === null) continue;
    if (!("key" in icon) || icon.key !== "dodge") continue;
    if (
      !("naming" in icon) ||
      (icon.naming !== "confirmed" && icon.naming !== "confirmed_rulebook")
    ) {
      continue;
    }
    found.push(item.numeric);
  }
  if (found.length !== 1) return null;
  return found[0] ?? null;
}

const monsters = new Map<string, MonsterCard>();
for (const entry of monsterFile.cards) {
  if (!isMonsterCard(entry)) continue;
  const resistances = "resistances" in entry ? monsterResistances(entry.resistances) : [];
  const dodge =
    "header_unlabeled_numbers" in entry ? monsterDodge(entry.header_unlabeled_numbers) : null;
  monsters.set(entry.id, {
    id: entry.id,
    name: entry.name,
    level: entry.level,
    life: entry.life,
    dodge,
    unverified: entry.verification.unverified,
    resistances,
  });
}

function monster(id: string): MonsterCard {
  const found = monsters.get(id);
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

function namedTargetIconCount(skill: FixtureCard): number {
  const line = skill.stats_line;
  if (line === null) return 0;
  let count = 0;
  for (const segment of line) {
    if (segment.type !== "icon") continue;
    if (segment.icon.naming !== "confirmed" && segment.icon.naming !== "confirmed_rulebook") {
      continue;
    }
    if (segment.icon.key === "target_hero" || segment.icon.key === "target_monster") count += 1;
  }
  return count;
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
      damageDealt: 12,
      riposteDamage: null,
      wounds: 12,
      actorWounds: null,
      targetDead: false,
      targetBleedCleared: false,
      targetBlightCleared: false,
      targetProtectionIgnored: false,
      actorShuffle: null,
      targetShuffle: null,
      actorForm: null,
      actorStress: null,
      targetStress: null,
      besideActorStress: null,
      untargetedBesideTargetStress: null,
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
      damageDealt: null,
      riposteDamage: null,
      wounds: 1,
      actorWounds: null,
      targetDead: false,
      targetBleedCleared: false,
      targetBlightCleared: false,
      targetProtectionIgnored: false,
      actorShuffle: null,
      targetShuffle: null,
      actorForm: null,
      actorStress: null,
      targetStress: null,
      besideActorStress: null,
      untargetedBesideTargetStress: null,
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
      damageDealt: null,
      riposteDamage: null,
      wounds: 3,
      actorWounds: null,
      targetDead: false,
      targetBleedCleared: false,
      targetBlightCleared: false,
      targetProtectionIgnored: false,
      actorShuffle: null,
      targetShuffle: null,
      actorForm: null,
      actorStress: null,
      targetStress: null,
      besideActorStress: null,
      untargetedBesideTargetStress: null,
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
      damageDealt: 7,
      riposteDamage: null,
      wounds: 7,
      actorWounds: null,
      targetDead: false,
      targetBleedCleared: false,
      targetBlightCleared: false,
      targetProtectionIgnored: false,
      actorShuffle: null,
      targetShuffle: null,
      actorForm: null,
      actorStress: null,
      targetStress: null,
      besideActorStress: null,
      untargetedBesideTargetStress: null,
      skipped: [{ code: "effect_lines" }],
    });
    expect(use("hero_skill:p001", target("monster", 4, 0), 10)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      wounds: 4,
      skipped: [{ code: "effect_lines" }],
    });
  });

  it("未验证、读不出 Acc、Self 没有使用者、阵营不符、Musketeer 都不改伤口", () => {
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
      reason: "技能目标写的是 Self，但没有使用者（规则书第 19 页）",
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

  it("Protection 把攻击伤害减半并向上取整，治疗不减半", () => {
    const soldier = monster("monster_medium:p001");
    expect(soldier).toEqual({
      id: "monster_medium:p001",
      name: "Bone Soldier",
      level: 1,
      life: 7,
      dodge: 0,
      unverified: false,
      resistances: [],
    });
    const arbalist = monster("monster_medium:p007");
    expect(arbalist).toEqual({
      id: "monster_medium:p007",
      name: "Bone Arbalist",
      level: 1,
      life: 11,
      dodge: 1,
      unverified: false,
      resistances: [],
    });

    expect(use("hero_skill:p022", target("monster", 0, 0), 2)).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
    });
    expect(
      use(
        "hero_skill:p022",
        { target: { ...target("monster", 0, 0).target, protection: true } },
        2,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 4,
      wounds: 4,
      targetDead: false,
    });
    expect(
      use(
        "hero_skill:p022",
        { target: { ...target("monster", 1, 0).target, protection: true } },
        1,
      ),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 12,
      damageDealt: 6,
      wounds: 7,
    });
    expect(
      use("hero_skill:p014", { target: { ...target("hero", 6, 0).target, protection: true } }, 10),
    ).toMatchObject({
      outcome: "hit",
      effect: "heal",
      printedAmount: 3,
      damageDealt: null,
      wounds: 3,
    });
  });

  it("怪物伤口达到规范化 Life 时死亡，没传入 Life 就不判断", () => {
    const life = monster("monster_medium:p001").life;
    expect(life).toBe(7);
    expect(
      use("hero_skill:p022", { target: { ...target("monster", 0, 0).target, life } }, 2),
    ).toMatchObject({
      outcome: "hit",
      damageDealt: 7,
      wounds: 7,
      targetDead: true,
    });
    expect(
      use(
        "hero_skill:p022",
        { target: { ...target("monster", 0, 0).target, life, protection: true } },
        2,
      ),
    ).toMatchObject({
      damageDealt: 4,
      wounds: 4,
      targetDead: false,
    });

    const arbalistLife = monster("monster_medium:p007").life;
    expect(arbalistLife).toBe(11);
    expect(
      use(
        "hero_skill:p022",
        { target: { ...target("monster", 0, 0).target, life: arbalistLife } },
        2,
      ),
    ).toMatchObject({ damageDealt: 7, wounds: 7, targetDead: false });
    expect(
      use(
        "hero_skill:p022",
        { target: { ...target("monster", 0, 0).target, life: arbalistLife } },
        1,
      ),
    ).toMatchObject({
      outcome: "crit",
      damageDealt: 12,
      wounds: 12,
      targetDead: true,
    });
    expect(
      use("hero_skill:p022", { target: { ...target("monster", 7, 0).target, life } }, 10),
    ).toMatchObject({
      outcome: "miss",
      damageDealt: null,
      wounds: 7,
      targetDead: true,
    });
    expect(use("hero_skill:p022", target("monster", 0, 0), 2)).toMatchObject({
      wounds: 7,
      targetDead: false,
    });
  });

  it("Riposte 按 Protection 之前的伤害反弹，落空和治疗不反弹", () => {
    const actor = {
      id: "hellion",
      wounds: 2,
      stress: 4,
      protection: true,
      riposte: true,
    };
    const hit = use(
      "hero_skill:p022",
      {
        actor,
        target: { ...target("monster", 0, 0).target, riposte: true, protection: true },
      },
      2,
    );
    expect(hit).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 4,
      riposteDamage: 4,
      wounds: 4,
      actorWounds: 6,
      actorStress: 4,
    });

    const crit = use(
      "hero_skill:p022",
      {
        actor: { id: "hellion", wounds: 0, protection: true, riposte: true },
        target: { ...target("monster", 0, 0).target, riposte: true },
      },
      1,
    );
    expect(crit).toMatchObject({
      outcome: "crit",
      printedAmount: 12,
      damageDealt: 12,
      riposteDamage: 6,
      wounds: 12,
      actorWounds: 6,
    });

    const missed = use(
      "hero_skill:p022",
      {
        actor,
        target: { ...target("monster", 3, 0).target, riposte: true },
      },
      10,
    );
    expect(missed).toMatchObject({
      outcome: "miss",
      riposteDamage: null,
      wounds: 3,
      actorWounds: 2,
    });

    const healed = use(
      "hero_skill:p014",
      {
        actor,
        target: { ...target("hero", 6, 0).target, riposte: true },
      },
      10,
    );
    expect(healed).toMatchObject({
      outcome: "hit",
      effect: "heal",
      riposteDamage: null,
      wounds: 3,
      actorWounds: 2,
    });

    expect(
      use("hero_skill:p022", { target: { ...target("monster", 1, 0).target, riposte: true } }, 2),
    ).toMatchObject({
      status: "refused",
      reason: "目标有 Riposte，但没有攻击者可以承受反弹（R-017）",
      wounds: 1,
      actorWounds: null,
    });
  });

  it("打出暴击时使用者和同区域英雄压力各减 1，治疗暴击也算", () => {
    const dealt = use(
      "hero_skill:p022",
      {
        actor: { id: "hellion", wounds: 0, stress: 4 },
        heroesBesideActor: [
          { id: "crusader", stress: 2 },
          { id: "vestal", stress: 0 },
        ],
        untargetedHeroesBesideTarget: [{ id: "highwayman", stress: 6 }],
        target: { ...target("monster", 0, 0).target },
      },
      1,
    );
    expect(dealt).toMatchObject({
      outcome: "crit",
      actorStress: 3,
      besideActorStress: [
        { id: "crusader", stress: 1 },
        { id: "vestal", stress: 0 },
      ],
      untargetedBesideTargetStress: [{ id: "highwayman", stress: 6 }],
      targetStress: null,
    });

    const atCap = use(
      "hero_skill:p022",
      {
        actor: { id: "hellion", wounds: 0, stress: 10 },
        target: target("monster", 0, 0).target,
      },
      1,
    );
    expect(atCap).toMatchObject({ actorStress: 9, targetDead: false });

    const hit = use(
      "hero_skill:p022",
      {
        actor: { id: "hellion", wounds: 0, stress: 4 },
        heroesBesideActor: [{ id: "crusader", stress: 2 }],
        target: target("monster", 0, 0).target,
      },
      9,
    );
    expect(hit).toMatchObject({
      outcome: "hit",
      actorStress: 4,
      besideActorStress: [{ id: "crusader", stress: 2 }],
    });

    const healCrit = use(
      "hero_skill:p014",
      {
        actor: { id: "crusader", wounds: 0, stress: 1 },
        heroesBesideActor: [{ id: "vestal", stress: 3 }],
        untargetedHeroesBesideTarget: [{ id: "highwayman", stress: 6 }],
        targetInActorArea: true,
        target: { ...target("hero", 6, 0, "patient").target, stress: 4 },
      },
      2,
    );
    expect(healCrit).toMatchObject({
      outcome: "crit",
      effect: "heal",
      wounds: 1,
      actorStress: 0,
      targetStress: 3,
      besideActorStress: [{ id: "vestal", stress: 2 }],
      untargetedBesideTargetStress: [{ id: "highwayman", stress: 6 }],
    });

    const healApart = use(
      "hero_skill:p014",
      {
        actor: { id: "crusader", wounds: 0, stress: 0 },
        target: { ...target("hero", 6, 0).target, stress: 4 },
      },
      2,
    );
    expect(healApart).toMatchObject({
      outcome: "crit",
      actorStress: 0,
      targetStress: 4,
    });

    expect(
      use(
        "hero_skill:p022",
        {
          heroesBesideActor: [{ id: "crusader", stress: 2 }],
          target: target("monster", 0, 0).target,
        },
        1,
      ).reason,
    ).toBe("同区域英雄的暴击压力要和使用者的压力一起结算（R-031）");
  });

  it("英雄 Life、死门和非法的压力或 Life 不结算", () => {
    expect(
      use("hero_skill:p014", { target: { ...target("hero", 4, 0).target, life: 33 } }, 10),
    ).toMatchObject({
      status: "refused",
      reason:
        "英雄 Life 不在这一层结算：规范化数据没有英雄 Life，死门骰哪几面是骷髅也没有命名（R-005）",
      wounds: 4,
    });
    expect(
      use("hero_skill:p022", { target: { ...target("monster", 1, 0).target, life: 0 } }, 2).reason,
    ).toBe("Life 必须是正整数");
    expect(
      use("hero_skill:p022", { target: { ...target("monster", 1, 0).target, stress: 3 } }, 2)
        .reason,
    ).toBe("怪物没有压力轨");
    expect(
      use(
        "hero_skill:p014",
        {
          actor: { id: "crusader", wounds: 0, stress: 11 },
          target: target("hero", 4, 0).target,
        },
        10,
      ).reason,
    ).toBe("攻击者的压力必须是 0 到 10 的整数");
    expect(
      use(
        "hero_skill:p022",
        {
          actor: { id: "hellion", wounds: 0, stress: 1 },
          heroesBesideActor: [
            { id: "crusader", stress: 1 },
            { id: "crusader", stress: 2 },
          ],
          target: target("monster", 0, 0).target,
        },
        1,
      ).reason,
    ).toBe("使用者身边的英雄里有重复的英雄");
  });

  it("hero_skill:p122 Inspiring Tune II 结算自身和目标的压力，落空只改自身", () => {
    const skill = card("hero_skill:p122");
    expect(skill.name).toBe("Inspiring Tune");
    expect(skill.level).toBe(2);
    expect(skill.hero).toBe("JESTER");
    expect(skill.verification.unverified).toBe(false);
    const stressNumerics = skill.unlabeled_numbers
      .filter(
        (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "stress",
      )
      .map((item) => item.numeric);
    expect(stressNumerics).toEqual([-1, -1]);

    const combat: SkillCombatState = {
      actor: { id: "jester", wounds: 1, stress: 4, protection: true, riposte: true },
      heroesBesideActor: [{ id: "crusader", stress: 2 }],
      untargetedHeroesBesideTarget: [{ id: "highwayman", stress: 6 }],
      target: {
        id: "vestal",
        side: "hero",
        wounds: 3,
        dodge: 15,
        stress: 6,
        protection: true,
        riposte: true,
      },
    };
    const frozen = structuredClone(combat);

    const missed = use("hero_skill:p122", combat, 6);
    expect(missed).toEqual({
      skillId: "hero_skill:p122",
      targetId: "vestal",
      status: "resolved",
      reason: null,
      outcome: "miss",
      effect: "stress",
      printedAmount: null,
      damageDealt: null,
      riposteDamage: null,
      wounds: 3,
      actorWounds: 1,
      targetDead: false,
      targetBleedCleared: false,
      targetBlightCleared: false,
      targetProtectionIgnored: false,
      actorShuffle: null,
      targetShuffle: null,
      actorForm: null,
      actorStress: 3,
      targetStress: 6,
      besideActorStress: [{ id: "crusader", stress: 2 }],
      untargetedBesideTargetStress: [{ id: "highwayman", stress: 6 }],
      skipped: [],
    });
    expect(combat).toEqual(frozen);

    expect(use("hero_skill:p122", combat, 5)).toMatchObject({
      outcome: "hit",
      effect: "stress",
      printedAmount: null,
      damageDealt: null,
      riposteDamage: null,
      wounds: 3,
      actorWounds: 1,
      actorStress: 3,
      targetStress: 5,
      besideActorStress: [{ id: "crusader", stress: 2 }],
      untargetedBesideTargetStress: [{ id: "highwayman", stress: 6 }],
      skipped: [],
    });

    expect(use("hero_skill:p122", { ...combat, targetInActorArea: true }, 2)).toMatchObject({
      outcome: "crit",
      effect: "stress",
      wounds: 3,
      actorStress: 2,
      targetStress: 4,
      besideActorStress: [{ id: "crusader", stress: 1 }],
      untargetedBesideTargetStress: [{ id: "highwayman", stress: 6 }],
    });

    expect(
      use("hero_skill:p122", { ...combat, target: { ...combat.target, dodge: 20 } }, 2),
    ).toMatchObject({
      outcome: "crit",
      actorStress: 2,
      targetStress: 5,
      besideActorStress: [{ id: "crusader", stress: 1 }],
    });

    const clamped = use(
      "hero_skill:p122",
      {
        actor: { id: "jester", wounds: 0, stress: 0 },
        target: { ...combat.target, stress: 0, dodge: 0 },
      },
      10,
    );
    expect(clamped).toMatchObject({
      outcome: "hit",
      actorStress: 0,
      targetStress: 0,
      wounds: 3,
    });

    const plainTarget = {
      id: "vestal",
      side: "hero" as const,
      wounds: 3,
      dodge: 0,
      stress: 6,
    };
    expect(use("hero_skill:p122", { target: plainTarget }, 5).reason).toBe(
      "自身效果要改压力，但没有使用者的压力（规则书第 20 页）",
    );
    expect(
      use(
        "hero_skill:p122",
        {
          actor: { id: "jester", wounds: 0, stress: 4 },
          target: { id: "vestal", side: "hero", wounds: 3, dodge: 0 },
        },
        5,
      ).reason,
    ).toBe("目标效果要改压力，但目标没有压力（规则书第 20 页）");
    expect(use("hero_skill:p122", target("monster", 1, 0), 5)).toMatchObject({
      status: "refused",
      reason: "目标阵营与技能的目标图标不一致",
      wounds: 1,
    });
  });

  it("hero_skill:p123 Inspiring Tune III 的暴击阈值是 3，压力仍是各 −1", () => {
    const skill = card("hero_skill:p123");
    expect(skill.name).toBe("Inspiring Tune");
    expect(skill.level).toBe(3);
    expect(skill.verification.unverified).toBe(false);
    const combat: SkillCombatState = {
      actor: { id: "jester", wounds: 0, stress: 5 },
      target: { id: "vestal", side: "hero", wounds: 2, dodge: 0, stress: 5 },
    };
    expect(use("hero_skill:p123", combat, 3)).toMatchObject({
      outcome: "crit",
      effect: "stress",
      printedAmount: null,
      wounds: 2,
      actorStress: 3,
      targetStress: 4,
      skipped: [],
    });
    expect(use("hero_skill:p123", combat, 4)).toMatchObject({
      outcome: "hit",
      actorStress: 4,
      targetStress: 4,
    });
  });

  it("压力数字对不上已命名目标，或 numeric 为 null，或 Self 打到别人身上时不改压力", () => {
    const tune = card("hero_skill:p121");
    expect(tune.name).toBe("Inspiring Tune");
    expect(tune.level).toBe(1);
    expect(tune.verification.unverified).toBe(false);
    expect(
      tune.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "stress",
        )
        .map((item) => item.numeric),
    ).toEqual([-1, -1]);
    expect(
      use(
        "hero_skill:p121",
        {
          actor: { id: "jester", wounds: 0, stress: 4 },
          target: { id: "vestal", side: "hero", wounds: 2, dodge: 0, stress: 4 },
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "stats_line 没有已命名的 target_hero 或 target_monster",
      wounds: 2,
      actorStress: 4,
      targetStress: 4,
      outcome: null,
    });

    const rage = card("hero_skill:p226");
    expect(rage.name).toBe("Rage");
    expect(rage.level).toBe(1);
    expect(rage.hero).toBe("ABOMINATION");
    expect(rage.verification.unverified).toBe(false);
    expect(
      rage.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "stress",
        )
        .map((item) => item.numeric),
    ).toEqual([null]);
    const raging = {
      actor: { id: "abomination", wounds: 0, stress: 4 },
      target: target("monster", 1, 0).target,
    };
    expect(use("hero_skill:p226", raging, 1)).toMatchObject({
      status: "resolved",
      outcome: "crit",
      effect: "damage",
      printedAmount: 12,
      damageDealt: 12,
      wounds: 13,
      actorStress: 3,
      skipped: [{ code: "effect_lines" }],
    });
    expect(use("hero_skill:p226", raging, 9)).toMatchObject({
      outcome: "hit",
      printedAmount: 9,
      damageDealt: 9,
      wounds: 10,
      actorStress: 4,
      skipped: [{ code: "effect_lines" }],
    });
    expect(use("hero_skill:p226", raging, 10)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      wounds: 1,
      actorStress: 4,
    });

    const absolution = card("hero_skill:p217");
    expect(absolution.name).toBe("Absolution");
    expect(absolution.verification.unverified).toBe(false);
    expect(
      use(
        "hero_skill:p217",
        {
          actor: { id: "abomination", wounds: 0, stress: 4 },
          target: { id: "vestal", side: "hero", wounds: 3, dodge: 0, stress: 4 },
        },
        5,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "技能目标写的是 Self，只能结算使用者自己（规则书第 19 页）",
      wounds: 3,
      actorWounds: 0,
      actorStress: 4,
      targetStress: 4,
    });

    const cry = card("hero_skill:p019");
    expect(cry.name).toBe("Inspiring Cry");
    expect(cry.level).toBe(1);
    expect(cry.verification.unverified).toBe(false);
    expect(
      use(
        "hero_skill:p019",
        {
          actor: { id: "crusader", wounds: 4, stress: 4 },
          target: { id: "vestal", side: "hero", wounds: 2, dodge: 0, stress: 4 },
        },
        5,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "stats_line 没有已命名的 damage 或 heal",
      wounds: 2,
      actorWounds: 4,
      actorStress: 4,
      targetStress: 4,
    });
  });

  it("hero_skill:p098 Divine Comfort II 暴击时自身治疗 3，目标治疗 4", () => {
    const skill = card("hero_skill:p098");
    expect(skill.name).toBe("Divine Comfort");
    expect(skill.level).toBe(2);
    expect(skill.hero).toBe("VESTAL");
    expect(skill.verification.unverified).toBe(false);
    const healNumerics = skill.unlabeled_numbers
      .filter(
        (item) =>
          item.anchor.type === "beside_icon" &&
          item.anchor.left_icon === null &&
          item.anchor.inside_icon?.key === "heal",
      )
      .map((item) => item.numeric);
    expect(healNumerics).toEqual([3]);

    const combat: SkillCombatState = {
      actor: { id: "vestal", wounds: 6, stress: 4, protection: true, riposte: true },
      heroesBesideActor: [{ id: "crusader", stress: 2 }],
      untargetedHeroesBesideTarget: [{ id: "highwayman", stress: 6 }],
      target: {
        id: "patient",
        side: "hero",
        wounds: 6,
        dodge: 0,
        stress: 5,
        protection: true,
        riposte: true,
      },
    };
    const frozen = structuredClone(combat);

    expect(use("hero_skill:p098", combat, 2)).toEqual({
      skillId: "hero_skill:p098",
      targetId: "patient",
      status: "resolved",
      reason: null,
      outcome: "crit",
      effect: "heal",
      printedAmount: 4,
      damageDealt: null,
      riposteDamage: null,
      wounds: 2,
      actorWounds: 3,
      targetDead: false,
      targetBleedCleared: false,
      targetBlightCleared: false,
      targetProtectionIgnored: false,
      actorShuffle: null,
      targetShuffle: null,
      actorForm: null,
      actorStress: 3,
      targetStress: 5,
      besideActorStress: [{ id: "crusader", stress: 1 }],
      untargetedBesideTargetStress: [{ id: "highwayman", stress: 6 }],
      skipped: [{ code: "damage_or_heal_combined_marker" }],
    });
    expect(combat).toEqual(frozen);

    expect(use("hero_skill:p098", combat, 4)).toMatchObject({
      outcome: "hit",
      effect: "heal",
      printedAmount: 3,
      wounds: 3,
      actorWounds: 3,
      actorStress: 4,
      besideActorStress: [{ id: "crusader", stress: 2 }],
      riposteDamage: null,
      skipped: [{ code: "damage_or_heal_combined_marker" }],
    });

    const missed = use(
      "hero_skill:p098",
      { ...combat, target: { ...combat.target, dodge: 5 } },
      10,
    );
    expect(missed).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      wounds: 6,
      actorWounds: 3,
      actorStress: 4,
      targetStress: 5,
      besideActorStress: [{ id: "crusader", stress: 2 }],
    });

    expect(
      use("hero_skill:p098", { ...combat, actor: { id: "vestal", wounds: 1, stress: 4 } }, 2),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 4,
      wounds: 2,
      actorWounds: 0,
      actorStress: 3,
    });

    expect(
      use("hero_skill:p098", { target: { ...combat.target, riposte: false } }, 2),
    ).toMatchObject({
      status: "refused",
      reason: "自身效果要治疗，但没有使用者的伤口（规则书第 20 页）",
      wounds: 6,
      actorWounds: null,
    });
  });

  it("hero_skill:p015 Battle Heal III 的自身治疗是 5，不是 Acc 旁边的 4", () => {
    const skill = card("hero_skill:p015");
    expect(skill.name).toBe("Battle Heal");
    expect(skill.level).toBe(3);
    expect(skill.hero).toBe("CRUSADER");
    expect(skill.verification.unverified).toBe(false);

    expect(
      use(
        "hero_skill:p015",
        {
          actor: { id: "crusader", wounds: 9, stress: 1 },
          target: { id: "patient", side: "hero", wounds: 8, dodge: 0, stress: 2 },
        },
        5,
      ),
    ).toMatchObject({
      outcome: "hit",
      effect: "heal",
      printedAmount: 4,
      wounds: 4,
      actorWounds: 4,
      actorStress: 1,
      targetStress: 2,
      skipped: [{ code: "damage_or_heal_combined_marker" }],
    });
    expect(
      use(
        "hero_skill:p015",
        {
          actor: { id: "crusader", wounds: 9, stress: 4 },
          target: { id: "patient", side: "hero", wounds: 8, dodge: 8, stress: 2 },
        },
        10,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      wounds: 8,
      actorWounds: 4,
      actorStress: 4,
    });
  });

  it("hero_skill:p088 Judgement I 先治疗自身，再结算伤害和反弹", () => {
    const skill = card("hero_skill:p088");
    expect(skill.name).toBe("Judgement");
    expect(skill.level).toBe(1);
    expect(skill.hero).toBe("VESTAL");
    expect(skill.verification.unverified).toBe(false);
    expect(
      skill.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "range",
        )
        .map((item) => item.numeric),
    ).toEqual([null]);

    expect(
      use(
        "hero_skill:p088",
        {
          actor: { id: "vestal", wounds: 5, stress: 4 },
          target: target("monster", 0, 0).target,
        },
        2,
      ),
    ).toMatchObject({
      outcome: "hit",
      effect: "damage",
      printedAmount: 4,
      damageDealt: 4,
      riposteDamage: null,
      wounds: 4,
      actorWounds: 3,
      actorStress: 4,
      skipped: [{ code: "damage_or_heal_combined_marker" }],
    });
    expect(
      use(
        "hero_skill:p088",
        {
          actor: { id: "vestal", wounds: 4, stress: 4 },
          target: target("monster", 3, 0).target,
        },
        10,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      riposteDamage: null,
      wounds: 3,
      actorWounds: 2,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p088",
        {
          actor: { id: "vestal", wounds: 4, stress: 4 },
          target: target("monster", 0, 0).target,
        },
        1,
      ),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 8,
      damageDealt: 8,
      wounds: 8,
      actorWounds: 2,
      actorStress: 3,
    });
    expect(
      use(
        "hero_skill:p088",
        {
          actor: { id: "vestal", wounds: 1, stress: 0, protection: true, riposte: true },
          target: { ...target("monster", 0, 0).target, riposte: true, protection: true },
        },
        2,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 4,
      damageDealt: 2,
      riposteDamage: 2,
      wounds: 2,
      actorWounds: 2,
    });
  });

  it("hero_skill:p140 Battlefield Medicine II 治疗自身，并在命中时清掉目标的流血和腐蚀", () => {
    const skill = card("hero_skill:p140");
    expect(skill.name).toBe("Battlefield Medicine");
    expect(skill.level).toBe(2);
    expect(skill.hero).toBe("PLAGUE DOCTOR");
    expect(skill.verification.unverified).toBe(false);
    const unmarked = skill.effect_lines[2];
    expect(
      unmarked?.some(
        (segment) =>
          segment.type === "icon" &&
          (segment.icon.key === "target_effects" || segment.icon.key === "self_effects"),
      ),
    ).toBe(false);

    expect(
      use(
        "hero_skill:p140",
        {
          actor: { id: "doctor", wounds: 6, stress: 2 },
          target: { id: "patient", side: "hero", wounds: 5, dodge: 0, stress: 1 },
        },
        5,
      ),
    ).toMatchObject({
      outcome: "hit",
      effect: "heal",
      printedAmount: 2,
      wounds: 3,
      actorWounds: 3,
      actorStress: 2,
      targetStress: 1,
      targetBleedCleared: true,
      targetBlightCleared: true,
      targetProtectionIgnored: false,
      skipped: [{ code: "damage_or_heal_combined_marker" }, { code: "effect_lines" }],
    });
    expect(
      use(
        "hero_skill:p140",
        {
          actor: { id: "doctor", wounds: 6, stress: 2 },
          target: { id: "patient", side: "hero", wounds: 5, dodge: 11, stress: 1 },
        },
        10,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      wounds: 5,
      actorWounds: 3,
      targetStress: 1,
      targetBleedCleared: false,
      targetBlightCleared: false,
      targetProtectionIgnored: false,
      skipped: [{ code: "damage_or_heal_combined_marker" }, { code: "effect_lines" }],
    });
  });

  it("混在同一行里的治疗不扣伤口，变身卡上的治疗整数也不扣", () => {
    const cry = card("hero_skill:p020");
    expect(cry.name).toBe("Inspiring Cry");
    expect(cry.level).toBe(2);
    expect(cry.verification.unverified).toBe(false);
    expect(
      cry.unlabeled_numbers
        .filter(
          (item) =>
            item.anchor.type === "beside_icon" &&
            item.anchor.left_icon === null &&
            item.anchor.inside_icon?.key === "heal",
        )
        .map((item) => item.numeric),
    ).toEqual([1]);
    expect(
      use(
        "hero_skill:p020",
        {
          actor: { id: "crusader", wounds: 5, stress: 4 },
          target: { id: "vestal", side: "hero", wounds: 2, dodge: 0, stress: 4 },
        },
        5,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "stats_line 没有已命名的 damage 或 heal",
      wounds: 2,
      actorWounds: 5,
      actorStress: 4,
      outcome: null,
    });

    const beast = card("hero_skill:p220");
    expect(beast.name).toBe("Transform to Beast");
    expect(beast.level).toBe(1);
    expect(beast.verification.unverified).toBe(false);
    expect(
      beast.unlabeled_numbers
        .filter(
          (item) =>
            item.anchor.type === "beside_icon" &&
            item.anchor.left_icon === null &&
            item.anchor.inside_icon?.key === "heal",
        )
        .map((item) => item.numeric),
    ).toEqual([4]);
    expect(
      use(
        "hero_skill:p220",
        {
          actor: { id: "abomination", wounds: 5, stress: 4 },
          target: { id: "vestal", side: "hero", wounds: 2, dodge: 0, stress: 4 },
        },
        5,
      ),
    ).toMatchObject({
      status: "resolved",
      reason: null,
      outcome: null,
      effect: null,
      wounds: 2,
      actorWounds: 5,
      actorStress: 4,
      targetStress: 4,
      actorForm: "beast",
    });
  });

  it("hero_skill:p139 Battlefield Medicine I 命中或暴击时治疗，并清掉目标的全部流血和腐蚀", () => {
    const skill = card("hero_skill:p139");
    expect(skill.name).toBe("Battlefield Medicine");
    expect(skill.level).toBe(1);
    expect(skill.hero).toBe("PLAGUE DOCTOR");
    expect(skill.verification.unverified).toBe(false);
    expect(skill.effect_lines).toHaveLength(1);
    expect(skill.unlabeled_numbers.filter((item) => item.numeric === null)).toEqual([]);

    const combat: SkillCombatState = {
      actor: { id: "doctor", wounds: 4, stress: 4, protection: true, riposte: true },
      heroesBesideActor: [{ id: "crusader", stress: 2 }],
      target: {
        id: "patient",
        side: "hero",
        wounds: 5,
        dodge: 0,
        stress: 6,
        protection: true,
        riposte: true,
      },
    };
    const frozen = structuredClone(combat);

    expect(use("hero_skill:p139", combat, 1)).toEqual({
      skillId: "hero_skill:p139",
      targetId: "patient",
      status: "resolved",
      reason: null,
      outcome: "crit",
      effect: "heal",
      printedAmount: 2,
      damageDealt: null,
      riposteDamage: null,
      wounds: 3,
      actorWounds: 4,
      targetDead: false,
      targetBleedCleared: true,
      targetBlightCleared: true,
      targetProtectionIgnored: false,
      actorShuffle: null,
      targetShuffle: null,
      actorForm: null,
      actorStress: 3,
      targetStress: 6,
      besideActorStress: [{ id: "crusader", stress: 1 }],
      untargetedBesideTargetStress: null,
      skipped: [],
    });
    expect(combat).toEqual(frozen);

    expect(use("hero_skill:p139", combat, 10)).toMatchObject({
      outcome: "hit",
      effect: "heal",
      printedAmount: 1,
      wounds: 4,
      actorWounds: 4,
      actorStress: 4,
      targetStress: 6,
      riposteDamage: null,
      targetBleedCleared: true,
      targetBlightCleared: true,
      targetProtectionIgnored: false,
      besideActorStress: [{ id: "crusader", stress: 2 }],
      skipped: [],
    });

    expect(
      use("hero_skill:p139", { ...combat, target: { ...combat.target, dodge: 15 } }, 10),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      wounds: 5,
      actorWounds: 4,
      actorStress: 4,
      targetStress: 6,
      targetBleedCleared: false,
      targetBlightCleared: false,
      targetProtectionIgnored: false,
      skipped: [],
    });

    expect(
      use("hero_skill:p139", { ...combat, target: { ...combat.target, wounds: 1, dodge: 30 } }, 1),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 2,
      wounds: 0,
      targetBleedCleared: true,
      targetBlightCleared: true,
      targetProtectionIgnored: false,
      actorStress: 3,
    });

    expect(use("hero_skill:p139", target("monster", 5, 0), 1)).toMatchObject({
      status: "refused",
      reason: "目标阵营与技能的目标图标不一致",
      wounds: 5,
      targetBleedCleared: false,
      targetBlightCleared: false,
      targetProtectionIgnored: false,
    });
  });

  it("hero_skill:p141 Battlefield Medicine III 先治疗自身 4，命中再治疗目标 3 并清掉两种状态", () => {
    const skill = card("hero_skill:p141");
    expect(skill.name).toBe("Battlefield Medicine");
    expect(skill.level).toBe(3);
    expect(skill.verification.unverified).toBe(false);

    expect(
      use(
        "hero_skill:p141",
        {
          actor: { id: "doctor", wounds: 9, stress: 2 },
          target: { id: "patient", side: "hero", wounds: 8, dodge: 0, stress: 1 },
        },
        5,
      ),
    ).toMatchObject({
      outcome: "hit",
      effect: "heal",
      printedAmount: 3,
      wounds: 5,
      actorWounds: 5,
      actorStress: 2,
      targetStress: 1,
      riposteDamage: null,
      targetBleedCleared: true,
      targetBlightCleared: true,
      targetProtectionIgnored: false,
      skipped: [{ code: "damage_or_heal_combined_marker" }, { code: "effect_lines" }],
    });
    expect(
      use(
        "hero_skill:p141",
        {
          actor: { id: "doctor", wounds: 9, stress: 4 },
          target: { id: "patient", side: "hero", wounds: 8, dodge: 11, stress: 1 },
        },
        10,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      wounds: 8,
      actorWounds: 5,
      actorStress: 4,
      targetBleedCleared: false,
      targetBlightCleared: false,
      targetProtectionIgnored: false,
    });
    expect(
      use(
        "hero_skill:p141",
        {
          actor: { id: "doctor", wounds: 9, stress: 4 },
          target: { id: "patient", side: "hero", wounds: 8, dodge: 0, stress: 1 },
        },
        1,
      ),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 5,
      wounds: 3,
      actorWounds: 5,
      actorStress: 3,
      targetBleedCleared: true,
      targetBlightCleared: true,
      targetProtectionIgnored: false,
    });
  });

  it("回合数 numeric 为 null，或 Remove 行没有目标标记、或和增益混在一行时，不移除状态", () => {
    const stun = card("hero_skill:p007");
    expect(stun.name).toBe("Stunning Blow");
    expect(stun.level).toBe(1);
    expect(stun.hero).toBe("CRUSADER");
    expect(stun.verification.unverified).toBe(false);
    expect(stun.effect_lines).toHaveLength(1);
    expect(
      stun.effect_lines[0]
        ?.filter((segment) => segment.type === "text")
        .map((segment) => segment.text),
    ).toEqual([" ", " 1t"]);
    expect(stun.unlabeled_numbers.filter((item) => item.numeric === null)).toEqual([
      {
        text: "1t",
        numeric: null,
        anchor: { type: "beside_icon", left_icon: null, inside_icon: null },
      },
    ]);
    expect(use("hero_skill:p007", target("monster", 0, 0), 1)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 4,
      damageDealt: 4,
      wounds: 4,
      targetBleedCleared: false,
      targetBlightCleared: false,
      targetProtectionIgnored: false,
      skipped: [{ code: "effect_lines" }],
    });
    expect(use("hero_skill:p007", target("monster", 1, 0), 10)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 1,
      targetBleedCleared: false,
      targetBlightCleared: false,
      targetProtectionIgnored: false,
      skipped: [{ code: "effect_lines" }],
    });

    const trickery = card("hero_skill:p187");
    expect(trickery.name).toBe("Toxin Trickery");
    expect(trickery.level).toBe(1);
    expect(trickery.hero).toBe("GRAVE ROBBER");
    expect(trickery.verification.unverified).toBe(false);
    expect(trickery.stats_line).toBeNull();
    const removeLine = trickery.effect_lines[2];
    expect(
      removeLine?.filter((segment) => segment.type === "icon").map((segment) => segment.icon.key),
    ).toEqual(["bleed", "blight"]);
    expect(
      trickery.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "buff",
        )
        .map((item) => item.numeric),
    ).toEqual([null]);
    expect(
      use(
        "hero_skill:p187",
        {
          actor: { id: "robber", wounds: 2, stress: 3 },
          target: { id: "patient", side: "hero", wounds: 4, dodge: 0, stress: 1 },
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "stats_line 没有已命名的 damage 或 heal",
      outcome: null,
      wounds: 4,
      actorWounds: 2,
      actorStress: 3,
      targetStress: 1,
      targetBleedCleared: false,
      targetBlightCleared: false,
      targetProtectionIgnored: false,
    });

    const rush = card("hero_skill:p037");
    expect(rush.name).toBe("Adrenaline Rush");
    expect(rush.level).toBe(1);
    expect(rush.hero).toBe("HELLION");
    expect(rush.verification.unverified).toBe(false);
    const mixed = rush.effect_lines[1];
    expect(
      mixed?.filter((segment) => segment.type === "icon").map((segment) => segment.icon.key),
    ).toEqual(["self_effects", "bleed", "blight", "buff"]);
    expect(
      mixed?.filter((segment) => segment.type === "text").map((segment) => segment.text),
    ).toEqual([" \u0007 Self Remove ", " ", " , ", " 3t"]);
    expect(
      rush.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "buff",
        )
        .map((item) => item.numeric),
    ).toEqual([null]);
    expect(
      use(
        "hero_skill:p037",
        {
          actor: { id: "hellion", wounds: 3, stress: 2 },
          target: { id: "patient", side: "hero", wounds: 4, dodge: 0, stress: 1 },
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "stats_line 没有已命名的 damage 或 heal",
      wounds: 4,
      actorWounds: 3,
      actorStress: 2,
      targetBleedCleared: false,
      targetBlightCleared: false,
      targetProtectionIgnored: false,
    });
  });

  it("hero_skill:p034 Breakthrough I 落空也把使用者拉近 1，没有使用者则拒绝", () => {
    const skill = card("hero_skill:p034");
    expect(skill.name).toBe("Breakthrough");
    expect(skill.level).toBe(1);
    expect(skill.hero).toBe("HELLION");
    expect(skill.verification.unverified).toBe(false);
    expect(skill.effect_lines).toHaveLength(1);
    expect(
      skill.effect_lines[0]
        ?.filter((segment) => segment.type === "text")
        .map((segment) => segment.text.trim())
        .filter((text) => text !== ""),
    ).toEqual(["Self", "Pull 1"]);

    const combat: SkillCombatState = {
      actor: { id: "hellion", wounds: 2, stress: 3 },
      target: { id: "soldier", side: "monster", wounds: 1, dodge: 0 },
    };
    const frozen = structuredClone(combat);

    expect(use("hero_skill:p034", combat, 8)).toEqual({
      skillId: "hero_skill:p034",
      targetId: "soldier",
      status: "resolved",
      reason: null,
      outcome: "hit",
      effect: "damage",
      printedAmount: 4,
      damageDealt: 4,
      riposteDamage: null,
      wounds: 5,
      actorWounds: 2,
      targetDead: false,
      targetBleedCleared: false,
      targetBlightCleared: false,
      targetProtectionIgnored: false,
      actorShuffle: { direction: "pull", distance: 1 },
      targetShuffle: null,
      actorForm: null,
      actorStress: 3,
      targetStress: null,
      besideActorStress: null,
      untargetedBesideTargetStress: null,
      skipped: [],
    });
    expect(combat).toEqual(frozen);

    expect(use("hero_skill:p034", combat, 9)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 1,
      actorWounds: 2,
      actorStress: 3,
      actorShuffle: { direction: "pull", distance: 1 },
      targetShuffle: null,
    });
    expect(use("hero_skill:p034", combat, 1)).toMatchObject({
      outcome: "hit",
      printedAmount: 4,
      damageDealt: 4,
      actorShuffle: { direction: "pull", distance: 1 },
    });
    expect(use("hero_skill:p034", target("monster", 1, 0), 8)).toMatchObject({
      status: "refused",
      reason: "自身效果要位移，但没有使用者（规则书第 21 页）",
      wounds: 1,
      actorWounds: null,
      actorShuffle: null,
      targetShuffle: null,
    });

    const finale = card("hero_skill:p112");
    expect(finale.name).toBe("Finale");
    expect(finale.level).toBe(1);
    expect(finale.hero).toBe("JESTER");
    expect(finale.verification.unverified).toBe(false);
    const finaleCombat: SkillCombatState = {
      actor: { id: "jester", wounds: 0, stress: 5 },
      target: { id: "soldier", side: "monster", wounds: 2, dodge: 10 },
    };
    expect(use("hero_skill:p112", finaleCombat, 10)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 2,
      actorStress: 5,
      actorShuffle: { direction: "push", distance: 3 },
      targetShuffle: null,
    });
    expect(use("hero_skill:p112", finaleCombat, 4)).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 9,
      actorShuffle: { direction: "push", distance: 3 },
      targetShuffle: null,
    });
    expect(use("hero_skill:p112", finaleCombat, 1)).toMatchObject({
      outcome: "crit",
      printedAmount: 10,
      damageDealt: 10,
      wounds: 12,
      actorStress: 4,
      actorShuffle: { direction: "push", distance: 3 },
      targetShuffle: null,
    });
  });

  it("hero_skill:p070 Point Blank Shot I 自身和目标都推 1，落空只推自身", () => {
    const skill = card("hero_skill:p070");
    expect(skill.name).toBe("Point Blank Shot");
    expect(skill.level).toBe(1);
    expect(skill.hero).toBe("HIGHWAYMAN");
    expect(skill.verification.unverified).toBe(false);
    expect(skill.effect_lines).toHaveLength(2);

    const combat: SkillCombatState = {
      actor: { id: "highwayman", wounds: 0, stress: 4 },
      target: { id: "soldier", side: "monster", wounds: 0, dodge: 0 },
    };
    expect(use("hero_skill:p070", combat, 1)).toMatchObject({
      outcome: "crit",
      effect: "damage",
      printedAmount: 15,
      damageDealt: 15,
      wounds: 15,
      actorWounds: 0,
      actorStress: 3,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: { direction: "push", distance: 1 },
      skipped: [],
    });
    expect(use("hero_skill:p070", combat, 10)).toMatchObject({
      outcome: "hit",
      printedAmount: 9,
      damageDealt: 9,
      wounds: 9,
      actorStress: 4,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: { direction: "push", distance: 1 },
    });
    expect(
      use("hero_skill:p070", { ...combat, target: { ...combat.target, dodge: 5 } }, 10),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorStress: 4,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: null,
    });
    expect(
      use("hero_skill:p070", { ...combat, target: { ...combat.target, protection: true } }, 10),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 9,
      damageDealt: 5,
      wounds: 5,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: { direction: "push", distance: 1 },
    });
    expect(
      use(
        "hero_skill:p070",
        {
          actor: { id: "highwayman", wounds: 1, stress: 4 },
          target: { id: "soldier", side: "monster", wounds: 0, dodge: 0, riposte: true },
        },
        10,
      ),
    ).toMatchObject({
      outcome: "hit",
      damageDealt: 9,
      riposteDamage: 5,
      wounds: 9,
      actorWounds: 6,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: { direction: "push", distance: 1 },
    });
  });

  it("hero_skill:p157 Bola I 自身推 1、目标推 2，暴击不改距离", () => {
    const skill = card("hero_skill:p157");
    expect(skill.name).toBe("Bola");
    expect(skill.level).toBe(1);
    expect(skill.hero).toBe("ARBALEST");
    expect(skill.verification.unverified).toBe(false);

    const combat: SkillCombatState = {
      actor: { id: "arbalist", wounds: 0, stress: 2 },
      target: { id: "soldier", side: "monster", wounds: 4, dodge: 0 },
    };
    expect(use("hero_skill:p157", combat, 5)).toMatchObject({
      outcome: "hit",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 7,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: { direction: "push", distance: 2 },
      skipped: [],
    });
    expect(use("hero_skill:p157", combat, 1)).toMatchObject({
      outcome: "crit",
      printedAmount: 6,
      damageDealt: 6,
      wounds: 10,
      actorStress: 1,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: { direction: "push", distance: 2 },
    });
  });

  it("hero_skill:p208 Daemon’s Pull I 只在命中或暴击时把目标拉近 2", () => {
    const skill = card("hero_skill:p208");
    expect(skill.name).toBe("Daemon’s Pull");
    expect(skill.level).toBe(1);
    expect(skill.hero).toBe("OCCULTIST");
    expect(skill.verification.unverified).toBe(false);
    expect(skill.effect_lines).toHaveLength(1);

    expect(use("hero_skill:p208", target("monster", 2, 0), 5)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 5,
      actorWounds: null,
      actorShuffle: null,
      targetShuffle: { direction: "pull", distance: 2 },
      skipped: [],
    });
    expect(use("hero_skill:p208", target("monster", 2, 0), 1)).toMatchObject({
      outcome: "crit",
      printedAmount: 4,
      damageDealt: 4,
      wounds: 6,
      targetShuffle: { direction: "pull", distance: 2 },
    });
    expect(use("hero_skill:p208", target("monster", 2, 0), 10)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 2,
      actorShuffle: null,
      targetShuffle: null,
    });
  });

  it("hero_skill:p016 Holy Lance I 拉近自身 1，不把 numeric 为 null 的 +1 vs Unholy 算进伤害", () => {
    const skill = card("hero_skill:p016");
    expect(skill.name).toBe("Holy Lance");
    expect(skill.level).toBe(1);
    expect(skill.hero).toBe("CRUSADER");
    expect(skill.verification.unverified).toBe(false);
    expect(
      skill.unlabeled_numbers
        .filter(
          (item) =>
            item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "target_effects",
        )
        .map((item) => item.numeric),
    ).toEqual([null]);

    const combat: SkillCombatState = {
      actor: { id: "crusader", wounds: 1, stress: 2 },
      target: { id: "unholy", side: "monster", wounds: 3, dodge: 0 },
    };
    expect(use("hero_skill:p016", combat, 2)).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 10,
      actorShuffle: { direction: "pull", distance: 1 },
      targetShuffle: null,
      skipped: [{ code: "effect_lines" }],
    });
    expect(use("hero_skill:p016", combat, 10)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 3,
      actorShuffle: { direction: "pull", distance: 1 },
      targetShuffle: null,
    });

    const lunge = card("hero_skill:p172");
    expect(lunge.name).toBe("Lunge");
    expect(lunge.level).toBe(1);
    expect(lunge.hero).toBe("GRAVE ROBBER");
    expect(lunge.verification.unverified).toBe(false);
    expect(
      lunge.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.inside_icon?.key === "damage",
        )
        .map((item) => item.numeric),
    ).toEqual([null]);
    expect(
      use(
        "hero_skill:p172",
        {
          actor: { id: "robber", wounds: 0, stress: 1 },
          target: { id: "blighted", side: "monster", wounds: 2, dodge: 0 },
        },
        5,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 9,
      actorShuffle: { direction: "pull", distance: 2 },
      targetShuffle: null,
      skipped: [{ code: "effect_lines" }],
    });
  });

  it("回合数 numeric 为 null，或印成 Push 或 Pull 时，不从同一行抽出位移", () => {
    const uppercut = card("hero_skill:p052");
    expect(uppercut.name).toBe("Uppercut");
    expect(uppercut.level).toBe(1);
    expect(uppercut.hero).toBe("BOUNTY HUNTER");
    expect(uppercut.verification.unverified).toBe(false);
    expect(
      uppercut.effect_lines[0]
        ?.filter((segment) => segment.type === "icon")
        .map((segment) => segment.icon.key),
    ).toEqual(["target_effects", "stun", "shuffle"]);
    expect(uppercut.unlabeled_numbers.filter((item) => item.numeric === null)).toEqual([
      {
        text: "1t",
        numeric: null,
        anchor: { type: "beside_icon", left_icon: null, inside_icon: null },
      },
    ]);
    expect(
      use(
        "hero_skill:p052",
        {
          actor: { id: "hunter", wounds: 0, stress: 2 },
          target: { id: "soldier", side: "monster", wounds: 1, dodge: 0 },
        },
        5,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 4,
      actorShuffle: null,
      targetShuffle: null,
      skipped: [{ code: "effect_lines" }],
    });

    const advance = card("hero_skill:p079");
    expect(advance.name).toBe("Duelist’s Advance");
    expect(advance.level).toBe(1);
    expect(advance.hero).toBe("HIGHWAYMAN");
    expect(advance.verification.unverified).toBe(false);
    expect(
      advance.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "riposte",
        )
        .map((item) => item.numeric),
    ).toEqual([null]);
    expect(
      use(
        "hero_skill:p079",
        {
          actor: { id: "highwayman", wounds: 1, stress: 2 },
          target: { id: "soldier", side: "monster", wounds: 0, dodge: 0 },
        },
        5,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 4,
      damageDealt: 4,
      wounds: 4,
      actorShuffle: null,
      targetShuffle: null,
      skipped: [{ code: "effect_lines" }],
    });

    const blast = card("hero_skill:p145");
    expect(blast.name).toBe("Disorienting Blast");
    expect(blast.level).toBe(1);
    expect(blast.hero).toBe("PLAGUE DOCTOR");
    expect(blast.verification.unverified).toBe(false);
    expect(
      blast.effect_lines[0]
        ?.filter((segment) => segment.type === "text")
        .map((segment) => segment.text.trim())
        .filter((text) => text !== ""),
    ).toEqual(["Push 2 or Pull 2"]);
    expect(
      use(
        "hero_skill:p145",
        {
          actor: { id: "doctor", wounds: 0, stress: 1 },
          target: { id: "soldier", side: "monster", wounds: 2, dodge: 0 },
        },
        5,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "stats_line 没有已命名的 damage 或 heal",
      wounds: 2,
      actorShuffle: null,
      targetShuffle: null,
      targetProtectionIgnored: false,
    });
  });

  it("hero_skill:p169 Pick to the Face I 命中和暴击都不被 Protection 减半", () => {
    const skill = card("hero_skill:p169");
    expect(skill.name).toBe("Pick to the Face");
    expect(skill.level).toBe(1);
    expect(skill.hero).toBe("GRAVE ROBBER");
    expect(skill.verification.unverified).toBe(false);
    expect(skill.effect_lines).toHaveLength(1);

    const protectedTarget = {
      id: "soldier",
      side: "monster" as const,
      wounds: 0,
      dodge: 0,
      protection: true,
    };
    const hit = use("hero_skill:p169", { target: protectedTarget }, 9);
    expect(hit).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 4,
      damageDealt: 4,
      riposteDamage: null,
      wounds: 4,
      targetDead: false,
      targetProtectionIgnored: true,
      skipped: [],
    });

    const crit = use(
      "hero_skill:p169",
      {
        actor: { id: "robber", wounds: 1, stress: 3 },
        target: { ...protectedTarget, dodge: 20 },
      },
      1,
    );
    expect(crit).toMatchObject({
      outcome: "crit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorStress: 2,
      actorWounds: 1,
      targetProtectionIgnored: true,
      skipped: [],
    });

    const missed = use("hero_skill:p169", { target: protectedTarget }, 10);
    expect(missed).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      targetProtectionIgnored: false,
      skipped: [],
    });

    const life = monster("monster_medium:p001").life;
    expect(life).toBe(7);
    expect(
      use("hero_skill:p169", { target: { ...protectedTarget, wounds: 0, life } }, 1),
    ).toMatchObject({
      outcome: "crit",
      damageDealt: 7,
      wounds: 7,
      targetDead: true,
      targetProtectionIgnored: true,
    });
    expect(
      use("hero_skill:p169", { target: { ...protectedTarget, wounds: 0, life } }, 9),
    ).toMatchObject({
      outcome: "hit",
      damageDealt: 4,
      wounds: 4,
      targetDead: false,
      targetProtectionIgnored: true,
    });

    expect(
      use(
        "hero_skill:p169",
        {
          actor: { id: "robber", wounds: 2, stress: 1 },
          target: { ...protectedTarget, wounds: 1, riposte: true },
        },
        9,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 4,
      damageDealt: 4,
      riposteDamage: 2,
      wounds: 5,
      actorWounds: 4,
      targetProtectionIgnored: true,
    });
  });

  it("hero_skill:p170 与 p171 的无视防护在暴击时仍是印刷伤害", () => {
    const second = card("hero_skill:p170");
    expect(second.name).toBe("Pick to the Face");
    expect(second.level).toBe(2);
    expect(second.verification.unverified).toBe(false);
    const shielded = {
      target: {
        id: "soldier",
        side: "monster" as const,
        wounds: 1,
        dodge: 0,
        protection: true,
      },
    };
    expect(use("hero_skill:p170", shielded, 10)).toMatchObject({
      outcome: "hit",
      printedAmount: 6,
      damageDealt: 6,
      wounds: 7,
      targetProtectionIgnored: true,
      skipped: [],
    });
    expect(
      use(
        "hero_skill:p170",
        {
          actor: { id: "robber", wounds: 0, stress: 4 },
          target: { ...shielded.target, dodge: 8 },
        },
        1,
      ),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 10,
      damageDealt: 10,
      wounds: 11,
      actorStress: 3,
      targetProtectionIgnored: true,
    });
    expect(use("hero_skill:p170", { target: { ...shielded.target, dodge: 1 } }, 10)).toMatchObject({
      outcome: "miss",
      damageDealt: null,
      wounds: 1,
      targetProtectionIgnored: false,
    });

    const third = card("hero_skill:p171");
    expect(third.name).toBe("Pick to the Face");
    expect(third.level).toBe(3);
    expect(third.hero).toBe("GRAVE ROBBER");
    expect(third.verification.unverified).toBe(false);
    expect(use("hero_skill:p171", shielded, 10)).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 8,
      targetProtectionIgnored: true,
      skipped: [],
    });
    expect(use("hero_skill:p171", shielded, 1)).toMatchObject({
      outcome: "crit",
      printedAmount: 12,
      damageDealt: 12,
      wounds: 13,
      targetProtectionIgnored: true,
    });
    expect(use("hero_skill:p171", { target: { ...shielded.target, dodge: 2 } }, 10)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      wounds: 1,
      targetProtectionIgnored: false,
    });
  });

  it("防护回合数是 null，或 Ignores 旁边的图标没命名时，不把这次攻击当成无视防护", () => {
    const bulwark = card("hero_skill:p010");
    expect(bulwark.name).toBe("Bulwark of Faith");
    expect(bulwark.level).toBe(1);
    expect(bulwark.hero).toBe("CRUSADER");
    expect(bulwark.verification.unverified).toBe(false);
    expect(bulwark.stats_line).toBeNull();
    expect(
      bulwark.unlabeled_numbers
        .filter(
          (item) =>
            item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "protection",
        )
        .map((item) => item.numeric),
    ).toEqual([null]);
    expect(
      use(
        "hero_skill:p010",
        { target: { id: "soldier", side: "monster", wounds: 3, dodge: 0, protection: true } },
        5,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "stats_line 没有已命名的 damage 或 heal",
      outcome: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 3,
      targetProtectionIgnored: false,
    });

    const dirk = card("hero_skill:p106");
    expect(dirk.name).toBe("Dirk Stab");
    expect(dirk.level).toBe(1);
    expect(dirk.hero).toBe("JESTER");
    expect(dirk.verification.unverified).toBe(true);
    expect(
      dirk.effect_lines[1]
        ?.filter((segment) => segment.type === "icon")
        .map((segment) => segment.icon.key),
    ).toEqual(["pending_a2e7252e06"]);
    expect(
      use(
        "hero_skill:p106",
        {
          actor: { id: "jester", wounds: 0, stress: 2 },
          target: { id: "soldier", side: "monster", wounds: 4, dodge: 0, protection: true },
        },
        5,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "未验证的技能不结算（R-048）",
      outcome: null,
      effect: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 4,
      targetProtectionIgnored: false,
      actorForm: null,
    });
  });

  it("hero_skill:p220 Transform to Beast I 不掷骰，只记下换成兽形", () => {
    const skill = card("hero_skill:p220");
    expect(skill.name).toBe("Transform to Beast");
    expect(skill.level).toBe(1);
    expect(skill.hero).toBeNull();
    expect(skill.verification.unverified).toBe(false);
    expect(skill.printed_labels).toEqual([]);
    expect(skill.stats_line).toBeNull();
    expect(
      skill.effect_lines
        .map((line) =>
          line
            .map((segment) => (segment.type === "text" ? segment.text.trim() : segment.icon.key))
            .filter((part) => part !== ""),
        )
        .find((line) => line.includes("self_effects")),
    ).toEqual(["self_effects", "Self Change: Beast"]);
    expect(
      skill.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "stress",
        )
        .map((item) => item.numeric),
    ).toEqual([null, null]);
    expect(
      skill.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.inside_icon?.key === "heal",
        )
        .map((item) => item.numeric),
    ).toEqual([4]);
    if (!("back_face_skill" in skill) || typeof skill.back_face_skill !== "object") {
      throw new Error("p220 应带着背面 Transform to Human");
    }
    const back = skill.back_face_skill;
    if (back === null || !("name" in back) || back.name !== "Transform to Human") {
      throw new Error("p220 背面不是 Transform to Human");
    }

    const combat: SkillCombatState = {
      actor: { id: "abomination", wounds: 5, stress: 3 },
      heroesBesideActor: [{ id: "crusader", stress: 2 }],
      target: { id: "vestal", side: "hero", wounds: 4, dodge: 0, stress: 4 },
    };
    const frozen = structuredClone(combat);
    const changed = use("hero_skill:p220", combat, 1);
    expect(changed).toEqual({
      skillId: "hero_skill:p220",
      targetId: "vestal",
      status: "resolved",
      reason: null,
      outcome: null,
      effect: null,
      printedAmount: null,
      damageDealt: null,
      riposteDamage: null,
      wounds: 4,
      actorWounds: 5,
      targetDead: false,
      targetBleedCleared: false,
      targetBlightCleared: false,
      actorShuffle: null,
      targetShuffle: null,
      targetProtectionIgnored: false,
      actorForm: "beast",
      actorStress: 3,
      targetStress: 4,
      besideActorStress: [{ id: "crusader", stress: 2 }],
      untargetedBesideTargetStress: null,
      skipped: [{ code: "effect_lines" }],
    });
    expect(combat).toEqual(frozen);
    expect(use("hero_skill:p220", combat, 10)).toEqual(changed);
    expect(use("hero_skill:p220", target("hero", 4, 0), 1)).toMatchObject({
      status: "refused",
      reason: "自身效果要切换形态，但没有使用者（规则书第 38 页）",
      wounds: 4,
      actorWounds: null,
      actorForm: null,
      actorStress: null,
    });
  });

  it("hero_skill:p221 与 p222 也只换成兽形，不把治疗整数扣掉", () => {
    const second = card("hero_skill:p221");
    expect(second.name).toBe("Transform to Beast");
    expect(second.level).toBe(2);
    expect(second.verification.unverified).toBe(false);
    expect(
      second.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.inside_icon?.key === "heal",
        )
        .map((item) => item.numeric),
    ).toEqual([6]);
    expect(
      second.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "buff",
        )
        .map((item) => item.numeric),
    ).toEqual([null]);
    expect(
      use(
        "hero_skill:p221",
        {
          actor: { id: "abomination", wounds: 6, stress: 1 },
          target: { id: "vestal", side: "hero", wounds: 2, dodge: 0, stress: 8 },
        },
        10,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: null,
      effect: null,
      printedAmount: null,
      wounds: 2,
      actorWounds: 6,
      actorStress: 1,
      targetStress: 8,
      actorForm: "beast",
      skipped: [{ code: "effect_lines" }],
    });

    const third = card("hero_skill:p222");
    expect(third.name).toBe("Transform to Beast");
    expect(third.level).toBe(3);
    expect(third.verification.unverified).toBe(false);
    expect(
      third.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.inside_icon?.key === "heal",
        )
        .map((item) => item.numeric),
    ).toEqual([8]);
    expect(
      use(
        "hero_skill:p222",
        {
          actor: { id: "abomination", wounds: 3, stress: 7 },
          target: { id: "vestal", side: "hero", wounds: 1, dodge: 9, stress: 0 },
        },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: null,
      effect: null,
      wounds: 1,
      actorWounds: 3,
      actorStress: 7,
      targetStress: 0,
      actorForm: "beast",
      skipped: [{ code: "effect_lines" }],
    });
  });

  it("hero_skill:p031 If It Bleeds I 的流血面值是整数，但 2t 为 null，不放流血堆", () => {
    const skill = card("hero_skill:p031");
    expect(skill.name).toBe("If It Bleeds");
    expect(skill.level).toBe(1);
    expect(skill.hero).toBe("HELLION");
    expect(skill.verification.unverified).toBe(false);
    expect(
      skill.unlabeled_numbers
        .filter(
          (item) =>
            item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "target_effects",
        )
        .map((item) => item.numeric),
    ).toEqual([2]);
    expect(
      skill.effect_lines[0]
        ?.filter((segment) => segment.type === "text")
        .map((segment) => segment.text.trim())
        .filter((text) => text !== ""),
    ).toEqual(["2", "2t"]);
    expect(
      skill.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "bleed",
        )
        .map((item) => item.numeric),
    ).toEqual([null]);
    expect(
      use(
        "hero_skill:p031",
        {
          actor: { id: "hellion", wounds: 1, stress: 4 },
          target: { id: "soldier", side: "monster", wounds: 0, dodge: 0 },
        },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
      actorWounds: 1,
      actorStress: 4,
      actorForm: null,
      targetBleedCleared: false,
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      use(
        "hero_skill:p031",
        { target: { id: "soldier", side: "monster", wounds: 0, dodge: 0 } },
        10,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorForm: null,
      skipped: [{ code: "effect_lines" }],
    });
  });

  it("hero_skill:p217 Absolution I 的目标是 Self：治疗自己，并先减 1 点压力", () => {
    const skill = card("hero_skill:p217");
    expect(skill.name).toBe("Absolution");
    expect(skill.level).toBe(1);
    expect(skill.hero).toBe("ABOMINATION");
    expect(skill.verification.unverified).toBe(false);
    expect(skill.printed_labels).toEqual([
      { label: "Crit", raw: "Crit 1", value: 1 },
      { label: "Acc", raw: "Acc 12", value: 12 },
    ]);
    expect(
      skill.stats_line
        ?.filter((segment) => segment.type === "icon")
        .map((segment) => segment.icon.key),
    ).toEqual(["range", "heal", "heal", "heal", "heal"]);
    expect(
      skill.stats_line
        ?.filter((segment) => segment.type === "text")
        .map((segment) => segment.text.trim())
        .filter((text) => text !== ""),
    ).toEqual(["Self Crit 1", "4 Acc 12", "2"]);
    expect(
      skill.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => [
          item.anchor.type === "printed_label" ? item.anchor.label : "",
          item.numeric,
        ]),
    ).toEqual([
      ["Crit", 4],
      ["Acc", 2],
    ]);
    expect(
      skill.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "stress",
        )
        .map((item) => item.numeric),
    ).toEqual([-1]);

    const self = {
      actor: { id: "abomination", wounds: 5, stress: 4 },
      target: {
        id: "abomination",
        side: "hero" as const,
        wounds: 5,
        dodge: 0,
        stress: 4,
        protection: true,
        riposte: true,
      },
      heroesBesideActor: [{ id: "vestal", stress: 2 }],
      targetInActorArea: true,
    };
    const frozen = structuredClone(self);

    expect(use("hero_skill:p217", self, 5)).toEqual({
      skillId: "hero_skill:p217",
      targetId: "abomination",
      status: "resolved",
      reason: null,
      outcome: "hit",
      effect: "heal",
      printedAmount: 2,
      damageDealt: null,
      riposteDamage: null,
      wounds: 3,
      actorWounds: 3,
      targetDead: false,
      targetBleedCleared: false,
      targetBlightCleared: false,
      targetProtectionIgnored: false,
      actorShuffle: null,
      targetShuffle: null,
      actorForm: null,
      actorStress: 3,
      targetStress: 3,
      besideActorStress: [{ id: "vestal", stress: 2 }],
      untargetedBesideTargetStress: null,
      skipped: [],
    });
    expect(self).toEqual(frozen);

    expect(use("hero_skill:p217", self, 1)).toMatchObject({
      outcome: "crit",
      effect: "heal",
      printedAmount: 4,
      damageDealt: null,
      riposteDamage: null,
      wounds: 1,
      actorWounds: 1,
      actorStress: 2,
      targetStress: 2,
      besideActorStress: [{ id: "vestal", stress: 1 }],
      skipped: [],
    });
    expect(
      use(
        "hero_skill:p217",
        {
          actor: { id: "abomination", wounds: 1, stress: 0 },
          target: { id: "abomination", side: "hero", wounds: 1, dodge: 20, stress: 0 },
        },
        1,
      ),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 4,
      wounds: 0,
      actorWounds: 0,
      actorStress: 0,
      targetStress: 0,
    });
    expect(
      use(
        "hero_skill:p217",
        {
          actor: { id: "abomination", wounds: 5, stress: 4 },
          target: { id: "abomination", side: "hero", wounds: 5, dodge: 20, stress: 4 },
        },
        10,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 5,
      actorWounds: 5,
      actorStress: 3,
      targetStress: 3,
      riposteDamage: null,
    });
    expect(
      use(
        "hero_skill:p217",
        {
          actor: { id: "abomination", wounds: 5, stress: 4 },
          target: { id: "abomination", side: "monster", wounds: 5, dodge: 0 },
        },
        5,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "技能目标写的是 Self，只能结算使用者自己（规则书第 19 页）",
      wounds: 5,
      actorWounds: 5,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p217",
        {
          actor: { id: "abomination", wounds: 5, stress: 4 },
          target: { id: "abomination", side: "hero", wounds: 2, dodge: 0, stress: 4 },
        },
        5,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "自身目标的伤口要和使用者是同一份（规则书第 19 页）",
      wounds: 2,
      actorWounds: 5,
      actorStress: 4,
      targetStress: 4,
    });
  });

  it("hero_skill:p218 与 p219 的自身治疗按 Crit / Acc 旁边的整数，不解释组合标记", () => {
    const second = card("hero_skill:p218");
    expect(second.name).toBe("Absolution");
    expect(second.level).toBe(2);
    expect(second.hero).toBe("ABOMINATION");
    expect(second.verification.unverified).toBe(false);
    expect(second.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 1],
      ["Acc", 14],
    ]);
    expect(
      second.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([6, 3]);
    expect(
      use(
        "hero_skill:p218",
        {
          actor: { id: "abomination", wounds: 7, stress: 6 },
          target: { id: "abomination", side: "hero", wounds: 7, dodge: 0, stress: 6 },
        },
        10,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "heal",
      printedAmount: 3,
      wounds: 4,
      actorWounds: 4,
      actorStress: 5,
      targetStress: 5,
      skipped: [{ code: "damage_or_heal_combined_marker" }],
    });
    expect(
      use(
        "hero_skill:p218",
        {
          actor: { id: "abomination", wounds: 7, stress: 6 },
          target: { id: "abomination", side: "hero", wounds: 7, dodge: 20, stress: 6 },
        },
        1,
      ),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 6,
      wounds: 1,
      actorWounds: 1,
      actorStress: 4,
      targetStress: 4,
      skipped: [{ code: "damage_or_heal_combined_marker" }],
    });

    const third = card("hero_skill:p219");
    expect(third.name).toBe("Absolution");
    expect(third.level).toBe(3);
    expect(third.verification.unverified).toBe(false);
    expect(third.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 1],
      ["Acc", 16],
    ]);
    expect(
      third.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([8, 4]);
    expect(
      use(
        "hero_skill:p219",
        {
          actor: { id: "abomination", wounds: 9, stress: 1 },
          target: { id: "abomination", side: "hero", wounds: 9, dodge: 0, stress: 1 },
        },
        10,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 4,
      wounds: 5,
      actorWounds: 5,
      actorStress: 0,
      targetStress: 0,
      skipped: [{ code: "damage_or_heal_combined_marker" }],
    });
    expect(
      use(
        "hero_skill:p219",
        {
          actor: { id: "abomination", wounds: 3, stress: 10 },
          target: { id: "abomination", side: "hero", wounds: 3, dodge: 20, stress: 10 },
        },
        1,
      ),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 8,
      wounds: 0,
      actorWounds: 0,
      actorStress: 8,
      targetStress: 8,
    });
    expect(
      use(
        "hero_skill:p219",
        {
          actor: { id: "abomination", wounds: 3, stress: 10 },
          target: { id: "abomination", side: "hero", wounds: 3, dodge: 20, stress: 10 },
        },
        10,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      wounds: 3,
      actorWounds: 3,
      actorStress: 9,
      targetStress: 9,
    });
  });

  it("hero_skill:p154 Sniper’s Mark I 的标记回合 2t 为 null，不放标记", () => {
    const skill = card("hero_skill:p154");
    expect(skill.name).toBe("Sniper’s Mark");
    expect(skill.level).toBe(1);
    expect(skill.hero).toBe("ARBALEST");
    expect(skill.verification.unverified).toBe(false);
    expect(skill.effect_lines).toHaveLength(1);
    expect(
      skill.effect_lines[0]
        ?.filter((segment) => segment.type === "icon")
        .map((segment) => segment.icon.key),
    ).toEqual(["target_effects", "mark"]);
    expect(
      skill.effect_lines[0]
        ?.filter((segment) => segment.type === "text")
        .map((segment) => segment.text.trim())
        .filter((text) => text !== ""),
    ).toEqual(["2t"]);
    expect(
      skill.unlabeled_numbers.filter(
        (item) =>
          item.numeric === null &&
          item.anchor.type === "beside_icon" &&
          item.anchor.left_icon === null,
      ),
    ).toEqual([
      {
        text: "2t",
        numeric: null,
        anchor: { type: "beside_icon", left_icon: null, inside_icon: null },
      },
    ]);
    expect(
      use(
        "hero_skill:p154",
        {
          actor: { id: "arbalest", wounds: 0, stress: 2 },
          target: { id: "soldier", side: "monster", wounds: 4, dodge: 0 },
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "stats_line 没有已命名的 damage 或 heal",
      outcome: null,
      effect: null,
      printedAmount: null,
      wounds: 4,
      actorWounds: 0,
      actorStress: 2,
      actorForm: null,
    });
  });

  it("hero_skill:p103 Hand of Light I 只在点亮的防御或进攻姿态下造成伤害", () => {
    const skill = card("hero_skill:p103");
    expect(skill.name).toBe("Hand of Light");
    expect(skill.level).toBe(1);
    expect(skill.hero).toBe("VESTAL");
    expect(skill.verification.unverified).toBe(false);
    expect(skill.top_row_icons?.map((icon) => icon.key)).toEqual([
      "stance_support_unlit",
      "stance_ranged_unlit",
      "stance_defensive_lit",
      "stance_aggressive_lit",
    ]);
    expect(
      skill.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([6, 3]);

    const soldier = { id: "soldier", side: "monster" as const, wounds: 0, dodge: 0 };
    expect(
      use(
        "hero_skill:p103",
        { actor: { id: "vestal", wounds: 2, stance: "aggressive" }, target: soldier },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "crit",
      effect: "damage",
      printedAmount: 6,
      damageDealt: 6,
      wounds: 6,
      actorWounds: 2,
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      use(
        "hero_skill:p103",
        {
          actor: { id: "vestal", wounds: 2, stance: "defensive" },
          target: { ...soldier, dodge: 20 },
        },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "crit",
      printedAmount: 6,
      damageDealt: 6,
      wounds: 6,
      actorWounds: 2,
    });
    expect(
      use(
        "hero_skill:p103",
        { actor: { id: "vestal", wounds: 2, stance: "aggressive" }, target: soldier },
        9,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 3,
      actorWounds: 2,
    });
    expect(use("hero_skill:p103", { target: soldier }, 9)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 3,
      actorWounds: null,
    });

    expect(
      use(
        "hero_skill:p103",
        { actor: { id: "vestal", wounds: 2, stance: "support" }, target: soldier },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "当前姿态没有点亮，不能使用这张技能（规则书第 19 页）",
      outcome: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorWounds: 2,
    });
    expect(
      use(
        "hero_skill:p103",
        { actor: { id: "vestal", wounds: 2, stance: "ranged" }, target: { ...soldier, wounds: 4 } },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "当前姿态没有点亮，不能使用这张技能（规则书第 19 页）",
      wounds: 4,
      actorWounds: 2,
    });
    expect(
      use(
        "hero_skill:p103",
        {
          actor: {
            id: "vestal",
            wounds: 2,
            stance: "front",
          } as unknown as NonNullable<SkillCombatState["actor"]>,
          target: soldier,
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "使用者的姿态必须是 support、ranged、defensive 或 aggressive",
      wounds: 0,
      actorWounds: 2,
    });
  });

  it("hero_skill:p025 只有进攻可用，p013 四格都点亮，p122 未点亮时不改压力", () => {
    const swan = card("hero_skill:p025");
    expect(swan.name).toBe("Iron Swan");
    expect(swan.level).toBe(1);
    expect(swan.hero).toBe("HELLION");
    expect(swan.verification.unverified).toBe(false);
    expect(swan.effect_lines).toHaveLength(0);
    expect(swan.top_row_icons?.map((icon) => icon.key)).toEqual([
      "stance_support_unlit",
      "stance_ranged_unlit",
      "stance_defensive_unlit",
      "stance_aggressive_lit",
    ]);
    const soldier = { id: "soldier", side: "monster" as const, wounds: 0, dodge: 0 };
    expect(
      use(
        "hero_skill:p025",
        {
          actor: { id: "hellion", wounds: 1, stance: "aggressive" },
          target: { ...soldier, dodge: 20 },
        },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "crit",
      effect: "damage",
      printedAmount: 12,
      damageDealt: 12,
      wounds: 12,
      actorWounds: 1,
      skipped: [],
    });
    expect(
      use(
        "hero_skill:p025",
        { actor: { id: "hellion", wounds: 1, stance: "aggressive" }, target: soldier },
        9,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
    });
    expect(
      use(
        "hero_skill:p025",
        { actor: { id: "hellion", wounds: 1, stance: "defensive" }, target: soldier },
        9,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "当前姿态没有点亮，不能使用这张技能（规则书第 19 页）",
      wounds: 0,
      actorWounds: 1,
      damageDealt: null,
    });

    const heal = card("hero_skill:p013");
    expect(heal.name).toBe("Battle Heal");
    expect(heal.top_row_icons?.map((icon) => icon.key)).toEqual([
      "stance_support_lit",
      "stance_ranged_lit",
      "stance_defensive_lit",
      "stance_aggressive_lit",
    ]);
    expect(
      use(
        "hero_skill:p013",
        {
          actor: { id: "crusader", wounds: 1, stance: "support" },
          target: { id: "vestal", side: "hero", wounds: 5, dodge: 0 },
        },
        10,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "heal",
      printedAmount: 2,
      wounds: 3,
      actorWounds: 1,
    });

    const tune = card("hero_skill:p122");
    expect(tune.name).toBe("Inspiring Tune");
    expect(tune.level).toBe(2);
    expect(tune.top_row_icons?.map((icon) => icon.key)).toEqual([
      "stance_support_lit",
      "stance_ranged_lit",
      "stance_defensive_unlit",
      "stance_aggressive_unlit",
    ]);
    const beside = {
      actor: { id: "jester", wounds: 0, stress: 4, stance: "aggressive" as const },
      target: { id: "vestal", side: "hero" as const, wounds: 2, dodge: 0, stress: 4 },
    };
    expect(use("hero_skill:p122", beside, 1)).toMatchObject({
      status: "refused",
      reason: "当前姿态没有点亮，不能使用这张技能（规则书第 19 页）",
      wounds: 2,
      actorWounds: 0,
      actorStress: 4,
      targetStress: 4,
    });
    expect(
      use("hero_skill:p122", { ...beside, actor: { ...beside.actor, stance: "support" } }, 10),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "stress",
      actorStress: 3,
      targetStress: 3,
      wounds: 2,
    });
  });

  it("hero_skill:p211 的远程格没有点亮标记，p223 的文字底板不改伤害", () => {
    const manacles = card("hero_skill:p211");
    expect(manacles.name).toBe("Manacles");
    expect(manacles.level).toBe(1);
    expect(manacles.hero).toBe("ABOMINATION");
    expect(manacles.verification.unverified).toBe(false);
    expect(manacles.top_row_icons?.map((icon) => icon.key)).toEqual([
      "text_plate",
      "stance_support_unlit",
      "stance_ranged_abomination_row",
      "stance_defensive_lit",
      "stance_aggressive_unlit",
    ]);
    expect(
      manacles.top_row_icons?.find((icon) => icon.key === "stance_ranged_abomination_row")?.naming,
    ).toBe("confirmed");
    expect(manacles.unlabeled_numbers.filter((item) => item.numeric === null)).toEqual([
      {
        text: "1t",
        numeric: null,
        anchor: { type: "beside_icon", left_icon: null, inside_icon: null },
      },
    ]);
    const soldier = { id: "soldier", side: "monster" as const, wounds: 0, dodge: 0 };
    expect(
      use(
        "hero_skill:p211",
        {
          actor: { id: "abomination", wounds: 1, stress: 3, stance: "defensive" },
          target: soldier,
        },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 4,
      damageDealt: 4,
      wounds: 4,
      actorWounds: 1,
      actorStress: 3,
      actorForm: null,
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      use(
        "hero_skill:p211",
        { actor: { id: "abomination", wounds: 1, stress: 3, stance: "ranged" }, target: soldier },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "这张技能的该姿态没有标明点亮或未点亮，不能当作可用（R-048）",
      outcome: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorWounds: 1,
      actorStress: 3,
      actorForm: null,
    });
    expect(
      use(
        "hero_skill:p211",
        { actor: { id: "abomination", wounds: 1, stress: 3, stance: "support" }, target: soldier },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "当前姿态没有点亮，不能使用这张技能（规则书第 19 页）",
      wounds: 0,
      actorStress: 3,
    });
    expect(
      use(
        "hero_skill:p211",
        {
          actor: { id: "abomination", wounds: 1, stress: 3, stance: "aggressive" },
          target: soldier,
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "当前姿态没有点亮，不能使用这张技能（规则书第 19 页）",
      wounds: 0,
      actorStress: 3,
    });

    const rake = card("hero_skill:p223");
    expect(rake.name).toBe("Rake");
    expect(rake.level).toBe(1);
    expect(rake.hero).toBe("ABOMINATION");
    expect(rake.verification.unverified).toBe(false);
    expect(rake.top_row_icons?.map((icon) => icon.key)).toEqual([
      "text_plate",
      "stance_support_unlit",
      "stance_ranged_unlit",
      "stance_defensive_lit",
      "stance_aggressive_lit",
    ]);
    expect(
      rake.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "stress",
        )
        .map((item) => item.numeric),
    ).toEqual([null]);
    expect(
      use(
        "hero_skill:p223",
        {
          actor: { id: "abomination", wounds: 2, stress: 4, stance: "aggressive" },
          target: soldier,
        },
        5,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
      actorWounds: 2,
      actorStress: 4,
      actorForm: null,
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      use(
        "hero_skill:p223",
        { actor: { id: "abomination", wounds: 2, stress: 4, stance: "support" }, target: soldier },
        5,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "当前姿态没有点亮，不能使用这张技能（规则书第 19 页）",
      wounds: 0,
      actorWounds: 2,
      actorStress: 4,
      actorForm: null,
    });
  });

  it("射程 0、1、2 必须恰好等于卡面那个整数，对不上就不结算", () => {
    const smite = card("hero_skill:p001");
    expect(smite.name).toBe("Smite");
    expect(smite.level).toBe(1);
    expect(
      smite.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "range",
        )
        .map((item) => item.numeric),
    ).toEqual([0]);
    const soldier = { id: "soldier", side: "monster" as const, wounds: 0, dodge: 0 };
    expect(use("hero_skill:p001", { target: soldier, areaDistance: 0 }, 1)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      skipped: [{ code: "effect_lines" }],
    });
    expect(use("hero_skill:p001", { target: soldier }, 1)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
    });
    expect(use("hero_skill:p001", { target: soldier, areaDistance: 1 }, 1)).toMatchObject({
      status: "refused",
      reason: "目标区域与使用者的距离不是卡面印的射程（规则书第 19 页）",
      outcome: null,
      effect: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorWounds: null,
    });

    const bleeds = card("hero_skill:p031");
    expect(bleeds.name).toBe("If It Bleeds");
    expect(
      bleeds.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "range",
        )
        .map((item) => item.numeric),
    ).toEqual([1]);
    expect(
      bleeds.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "bleed",
        )
        .map((item) => item.numeric),
    ).toEqual([null]);
    expect(
      use(
        "hero_skill:p031",
        {
          actor: { id: "hellion", wounds: 1, stress: 4 },
          target: soldier,
          areaDistance: 1,
        },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
      actorWounds: 1,
      actorStress: 4,
      targetBleedCleared: false,
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      use(
        "hero_skill:p031",
        {
          actor: { id: "hellion", wounds: 1, stress: 4 },
          target: { ...soldier, wounds: 2 },
          areaDistance: 0,
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "目标区域与使用者的距离不是卡面印的射程（规则书第 19 页）",
      wounds: 2,
      actorWounds: 1,
      actorStress: 4,
      damageDealt: null,
      targetBleedCleared: false,
    });

    const swan = card("hero_skill:p025");
    expect(swan.name).toBe("Iron Swan");
    expect(swan.level).toBe(1);
    expect(
      swan.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "range",
        )
        .map((item) => item.numeric),
    ).toEqual([2]);
    expect(
      use(
        "hero_skill:p025",
        {
          actor: { id: "hellion", wounds: 1, stance: "aggressive" },
          target: soldier,
          areaDistance: 2,
        },
        9,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorWounds: 1,
    });
    expect(
      use(
        "hero_skill:p025",
        {
          actor: { id: "hellion", wounds: 1, stance: "aggressive" },
          target: soldier,
          areaDistance: 3,
        },
        9,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "目标区域与使用者的距离不是卡面印的射程（规则书第 19 页）",
      wounds: 0,
      actorWounds: 1,
      damageDealt: null,
    });
    expect(
      use(
        "hero_skill:p025",
        {
          actor: { id: "hellion", wounds: 1, stance: "defensive" },
          target: soldier,
          areaDistance: 2,
        },
        9,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "当前姿态没有点亮，不能使用这张技能（规则书第 19 页）",
      wounds: 0,
      actorWounds: 1,
    });
    expect(use("hero_skill:p001", { target: soldier, areaDistance: -1 }, 1)).toMatchObject({
      status: "refused",
      reason: "区域距离必须是非负整数",
      wounds: 0,
      damageDealt: null,
    });
  });

  it("hero_skill:p070 Point Blank Shot I 距离不是 0 时，自身和目标的 Push 1 都不发生", () => {
    const skill = card("hero_skill:p070");
    expect(skill.name).toBe("Point Blank Shot");
    expect(skill.level).toBe(1);
    expect(skill.hero).toBe("HIGHWAYMAN");
    expect(skill.verification.unverified).toBe(false);
    expect(
      skill.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "range",
        )
        .map((item) => item.numeric),
    ).toEqual([0]);
    const combat: SkillCombatState = {
      actor: { id: "highwayman", wounds: 0, stress: 4 },
      target: { id: "soldier", side: "monster", wounds: 0, dodge: 0 },
      areaDistance: 0,
    };
    expect(use("hero_skill:p070", combat, 10)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 9,
      damageDealt: 9,
      wounds: 9,
      actorWounds: 0,
      actorStress: 4,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: { direction: "push", distance: 1 },
    });
    expect(use("hero_skill:p070", { ...combat, areaDistance: 1 }, 10)).toMatchObject({
      status: "refused",
      reason: "目标区域与使用者的距离不是卡面印的射程（规则书第 19 页）",
      outcome: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorWounds: 0,
      actorStress: 4,
      actorShuffle: null,
      targetShuffle: null,
    });
  });

  it("区间、Self 和 All Allies 没有单个射程整数，传入距离就整次拒绝", () => {
    const heal = card("hero_skill:p013");
    expect(heal.name).toBe("Battle Heal");
    expect(heal.level).toBe(1);
    expect(heal.verification.unverified).toBe(false);
    expect(
      heal.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "range",
        )
        .map((item) => [item.text, item.numeric]),
    ).toEqual([["0-1", null]]);
    const ally = { id: "vestal", side: "hero" as const, wounds: 5, dodge: 0 };
    for (const areaDistance of [0, 1]) {
      expect(use("hero_skill:p013", { target: ally, areaDistance }, 10)).toMatchObject({
        status: "refused",
        reason:
          "射程印成区间，旁边数字的 numeric 为 null，不能核对不同距离（规则书第 19 页，R-048）",
        outcome: null,
        effect: null,
        printedAmount: null,
        wounds: 5,
        actorWounds: null,
      });
    }

    const absolution = card("hero_skill:p217");
    expect(absolution.name).toBe("Absolution");
    expect(
      absolution.unlabeled_numbers.filter(
        (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "range",
      ),
    ).toEqual([]);
    const self = {
      actor: { id: "abomination", wounds: 5, stress: 4 },
      target: {
        id: "abomination",
        side: "hero" as const,
        wounds: 5,
        dodge: 0,
        stress: 4,
      },
      areaDistance: 0,
    };
    expect(use("hero_skill:p217", self, 5)).toMatchObject({
      status: "refused",
      reason:
        "卡面没有恰好一个射程整数，不能把 Self 或 All Allies 当成距离 0（规则书第 19 页，R-048）",
      outcome: null,
      effect: null,
      printedAmount: null,
      wounds: 5,
      actorWounds: 5,
      actorStress: 4,
      targetStress: 4,
      actorForm: null,
    });

    const transform = card("hero_skill:p220");
    expect(transform.name).toBe("Transform to Beast");
    expect(transform.level).toBe(1);
    expect(transform.verification.unverified).toBe(false);
    expect(
      transform.effect_lines[0]
        ?.filter((segment) => segment.type === "text")
        .map((segment) => segment.text.trim()),
    ).toEqual(["All Allies"]);
    expect(
      use(
        "hero_skill:p220",
        {
          actor: { id: "abomination", wounds: 2, stress: 3 },
          target: { id: "vestal", side: "hero", wounds: 2, dodge: 0, stress: 1 },
          areaDistance: 0,
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason:
        "卡面没有恰好一个射程整数，不能把 Self 或 All Allies 当成距离 0（规则书第 19 页，R-048）",
      wounds: 2,
      actorWounds: 2,
      actorStress: 3,
      actorForm: null,
    });

    const mark = card("hero_skill:p154");
    expect(mark.name).toBe("Sniper’s Mark");
    expect(mark.level).toBe(1);
    expect(mark.verification.unverified).toBe(false);
    expect(
      mark.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "range",
        )
        .map((item) => [item.text, item.numeric]),
    ).toEqual([["1-2", null]]);
    expect(
      use(
        "hero_skill:p154",
        {
          actor: { id: "arbalest", wounds: 0, stress: 2 },
          target: { id: "soldier", side: "monster", wounds: 3, dodge: 0 },
          areaDistance: 1,
        },
        5,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "射程印成区间，旁边数字的 numeric 为 null，不能核对不同距离（规则书第 19 页，R-048）",
      outcome: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 3,
      actorWounds: 0,
      actorStress: 2,
    });

    const light = card("hero_skill:p103");
    expect(light.name).toBe("Hand of Light");
    expect(
      light.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "range",
        )
        .map((item) => item.numeric),
    ).toEqual([1]);
    expect(
      use(
        "hero_skill:p103",
        {
          actor: { id: "vestal", wounds: 2, stance: "aggressive" },
          target: { id: "soldier", side: "monster", wounds: 0, dodge: 0 },
          areaDistance: 1,
        },
        9,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 3,
      actorWounds: 2,
    });
    // 高地可选射程 +1（规则书第 25 页，R-022）不加：印的是 1，距离 2 仍整次拒绝。
    expect(
      use(
        "hero_skill:p103",
        {
          actor: { id: "vestal", wounds: 2, stance: "aggressive" },
          target: { id: "soldier", side: "monster", wounds: 0, dodge: 0 },
          areaDistance: 2,
        },
        9,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "目标区域与使用者的距离不是卡面印的射程（规则书第 19 页）",
      wounds: 0,
      actorWounds: 2,
      damageDealt: null,
      printedAmount: null,
    });
  });

  it("一个区域内最多选 stats 行上那么多个已命名目标，少选可以，多选整次拒绝", () => {
    const smite = card("hero_skill:p001");
    expect(smite.name).toBe("Smite");
    expect(smite.level).toBe(1);
    expect(smite.verification.unverified).toBe(false);
    expect(namedTargetIconCount(smite)).toBe(1);
    const soldier = { id: "soldier", side: "monster" as const, wounds: 0, dodge: 0 };
    expect(
      use("hero_skill:p001", { target: soldier, areaDistance: 0, targetsInArea: 1 }, 1),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      use("hero_skill:p001", { target: soldier, areaDistance: 0, targetsInArea: 2 }, 1),
    ).toMatchObject({
      status: "refused",
      reason: "一个区域内选中的目标个数必须是 1 到卡面目标图标的个数（规则书第 19 页）",
      outcome: null,
      effect: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
    });
    expect(use("hero_skill:p001", { target: soldier, targetsInArea: 1.5 }, 1)).toMatchObject({
      status: "refused",
      reason: "区域内选中的目标个数必须是非负整数",
      wounds: 0,
      damageDealt: null,
    });
    expect(use("hero_skill:p001", { target: soldier, targetsInArea: -1 }, 1)).toMatchObject({
      status: "refused",
      reason: "区域内选中的目标个数必须是非负整数",
      wounds: 0,
    });
    // 距离先核对。个数在范围内，但距离不是印出来的 0，仍整次拒绝。
    expect(
      use("hero_skill:p001", { target: soldier, areaDistance: 1, targetsInArea: 1 }, 1),
    ).toMatchObject({
      status: "refused",
      reason: "目标区域与使用者的距离不是卡面印的射程（规则书第 19 页）",
      wounds: 0,
      damageDealt: null,
    });

    const grenade = card("hero_skill:p130");
    expect(grenade.name).toBe("Plague Grenade");
    expect(grenade.level).toBe(1);
    expect(grenade.verification.unverified).toBe(false);
    expect(namedTargetIconCount(grenade)).toBe(2);
    expect(
      grenade.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "blight",
        )
        .map((item) => [item.text, item.numeric]),
    ).toEqual([["2t", null]]);
    const grenadeCombat = {
      actor: { id: "doctor", wounds: 1, stress: 3 },
      target: soldier,
      areaDistance: 2,
      targetsInArea: 2,
    };
    expect(use("hero_skill:p130", grenadeCombat, 9)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 1,
      damageDealt: 1,
      wounds: 1,
      actorWounds: 1,
      actorStress: 3,
      targetBlightCleared: false,
      skipped: [{ code: "effect_lines" }],
    });
    expect(use("hero_skill:p130", { ...grenadeCombat, targetsInArea: 1 }, 9)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 1,
      damageDealt: 1,
      wounds: 1,
    });
    expect(
      use(
        "hero_skill:p130",
        { ...grenadeCombat, target: { ...soldier, wounds: 4 }, targetsInArea: 3 },
        9,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "一个区域内选中的目标个数必须是 1 到卡面目标图标的个数（规则书第 19 页）",
      wounds: 4,
      actorWounds: 1,
      actorStress: 3,
      damageDealt: null,
      targetBlightCleared: false,
    });

    const breakthrough = card("hero_skill:p034");
    expect(breakthrough.name).toBe("Breakthrough");
    expect(breakthrough.level).toBe(1);
    expect(breakthrough.verification.unverified).toBe(false);
    expect(namedTargetIconCount(breakthrough)).toBe(3);
    expect(
      use(
        "hero_skill:p034",
        {
          actor: { id: "hellion", wounds: 2, stress: 4 },
          target: soldier,
          areaDistance: 1,
          targetsInArea: 3,
        },
        8,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 4,
      damageDealt: 4,
      wounds: 4,
      actorWounds: 2,
      actorStress: 4,
      actorShuffle: { direction: "pull", distance: 1 },
      targetShuffle: null,
      skipped: [],
    });
    expect(
      use(
        "hero_skill:p034",
        {
          actor: { id: "hellion", wounds: 2, stress: 4 },
          target: { ...soldier, wounds: 1 },
          areaDistance: 1,
          targetsInArea: 4,
        },
        8,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "一个区域内选中的目标个数必须是 1 到卡面目标图标的个数（规则书第 19 页）",
      outcome: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 1,
      actorWounds: 2,
      actorStress: 4,
      actorShuffle: null,
    });

    const comfort = card("hero_skill:p098");
    expect(comfort.name).toBe("Divine Comfort");
    expect(comfort.level).toBe(2);
    expect(comfort.verification.unverified).toBe(false);
    expect(namedTargetIconCount(comfort)).toBe(3);
    const comfortCombat: SkillCombatState = {
      actor: { id: "vestal", wounds: 6, stress: 4 },
      target: { id: "patient", side: "hero", wounds: 6, dodge: 0, stress: 5 },
      areaDistance: 1,
      targetsInArea: 3,
    };
    // 说明书 G-02：对 3 名友方。这一层只结算传入的那一个，不另造另外两名。
    expect(use("hero_skill:p098", comfortCombat, 2)).toMatchObject({
      status: "resolved",
      outcome: "crit",
      effect: "heal",
      printedAmount: 4,
      damageDealt: null,
      riposteDamage: null,
      wounds: 2,
      actorWounds: 3,
      actorStress: 3,
      targetStress: 5,
      skipped: [{ code: "damage_or_heal_combined_marker" }],
    });
    expect(use("hero_skill:p098", { ...comfortCombat, targetsInArea: 4 }, 2)).toMatchObject({
      status: "refused",
      reason: "一个区域内选中的目标个数必须是 1 到卡面目标图标的个数（规则书第 19 页）",
      outcome: null,
      effect: null,
      printedAmount: null,
      wounds: 6,
      actorWounds: 6,
      actorStress: 4,
      targetStress: 5,
      damageDealt: null,
    });

    const grapeshot = card("hero_skill:p073");
    expect(grapeshot.name).toBe("Grapeshot Blast");
    expect(grapeshot.verification.unverified).toBe(false);
    expect(namedTargetIconCount(grapeshot)).toBe(3);
    expect(
      grapeshot.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "range",
        )
        .map((item) => [item.text, item.numeric]),
    ).toEqual([["0-1", null]]);
    expect(
      use(
        "hero_skill:p073",
        { actor: { id: "highwayman", wounds: 0 }, target: soldier, targetsInArea: 3 },
        8,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 3,
      actorWounds: 0,
      skipped: [{ code: "effect_lines" }],
    });
  });

  it("Self、All Allies 和效果行里的目标图标不能当成一个区域内的个数", () => {
    const absolution = card("hero_skill:p217");
    expect(absolution.name).toBe("Absolution");
    expect(absolution.level).toBe(1);
    expect(absolution.verification.unverified).toBe(false);
    expect(namedTargetIconCount(absolution)).toBe(0);
    expect(
      use(
        "hero_skill:p217",
        {
          actor: { id: "abomination", wounds: 5, stress: 4 },
          target: { id: "abomination", side: "hero", wounds: 5, dodge: 0, stress: 4 },
          targetsInArea: 1,
        },
        5,
      ),
    ).toMatchObject({
      status: "refused",
      reason:
        "stats 行没有已命名的目标图标，不能把 Self、All Allies 或效果行里的图标当成区域内能选几个（规则书第 19 页，R-048）",
      outcome: null,
      effect: null,
      printedAmount: null,
      wounds: 5,
      actorWounds: 5,
      actorStress: 4,
      targetStress: 4,
    });

    const transform = card("hero_skill:p220");
    expect(transform.name).toBe("Transform to Beast");
    expect(transform.verification.unverified).toBe(false);
    expect(transform.stats_line).toBeNull();
    expect(namedTargetIconCount(transform)).toBe(0);
    expect(
      use(
        "hero_skill:p220",
        {
          actor: { id: "abomination", wounds: 2, stress: 3 },
          target: { id: "vestal", side: "hero", wounds: 2, dodge: 0, stress: 1 },
          targetsInArea: 1,
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason:
        "stats 行没有已命名的目标图标，不能把 Self、All Allies 或效果行里的图标当成区域内能选几个（规则书第 19 页，R-048）",
      wounds: 2,
      actorWounds: 2,
      actorStress: 3,
      targetStress: 1,
      actorForm: null,
    });

    const ballad = card("hero_skill:p118");
    expect(ballad.name).toBe("Battle Ballad");
    expect(ballad.level).toBe(1);
    expect(ballad.verification.unverified).toBe(false);
    expect(ballad.stats_line).toBeNull();
    expect(namedTargetIconCount(ballad)).toBe(0);
    const helmets = ballad.effect_lines.reduce((count, line) => {
      return (
        count +
        line.filter(
          (segment) =>
            segment.type === "icon" &&
            segment.icon.key === "target_hero" &&
            (segment.icon.naming === "confirmed" || segment.icon.naming === "confirmed_rulebook"),
        ).length
      );
    }, 0);
    expect(helmets).toBe(2);
    expect(
      use(
        "hero_skill:p118",
        {
          actor: { id: "jester", wounds: 1, stress: 3 },
          target: { id: "vestal", side: "hero", wounds: 1, dodge: 0, stress: 2 },
          targetsInArea: 2,
        },
        5,
      ),
    ).toMatchObject({
      status: "refused",
      reason:
        "stats 行没有已命名的目标图标，不能把 Self、All Allies 或效果行里的图标当成区域内能选几个（规则书第 19 页，R-048）",
      outcome: null,
      wounds: 1,
      actorWounds: 1,
      actorStress: 3,
      targetStress: 2,
    });
  });

  it("使用者身上每一堆已有的 Buff 让暴击阈值 +1，不改命中阈值和伤害数字", () => {
    const smite = card("hero_skill:p001");
    expect(smite.name).toBe("Smite");
    expect(smite.level).toBe(1);
    expect(smite.verification.unverified).toBe(false);
    expect(smite.printed_labels).toEqual([
      { label: "Crit", raw: "Crit 0", value: 0 },
      { label: "Acc", raw: "Acc 9", value: 9 },
    ]);
    const soldier = { id: "soldier", side: "monster" as const, wounds: 0, dodge: 0 };
    const crusader = {
      id: "crusader",
      wounds: 0,
      stress: 4,
      buffStacks: 1,
    };
    const beside = [{ id: "vestal", stress: 2 }];
    const oneStack = {
      actor: crusader,
      heroesBesideActor: beside,
      target: soldier,
      areaDistance: 0,
    };
    const frozen = structuredClone(oneStack);
    // Crit 0 + 1 堆。掷 1 变成暴击，伤害仍是 Crit 旁边的 13，不是 13 + 1。
    expect(use("hero_skill:p001", oneStack, 1)).toMatchObject({
      status: "resolved",
      outcome: "crit",
      effect: "damage",
      printedAmount: 13,
      damageDealt: 13,
      wounds: 13,
      actorWounds: 0,
      actorStress: 3,
      besideActorStress: [{ id: "vestal", stress: 1 }],
      riposteDamage: null,
      skipped: [{ code: "effect_lines" }],
    });
    expect(oneStack).toEqual(frozen);
    // 同一堆不把掷 2 变成暴击。命中阈值仍是 Acc 9 − Dodge 0。
    expect(use("hero_skill:p001", oneStack, 2)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorStress: 4,
      besideActorStress: [{ id: "vestal", stress: 2 }],
    });
    expect(
      use("hero_skill:p001", { ...oneStack, actor: { ...crusader, buffStacks: 0 } }, 1),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorStress: 4,
    });
    expect(use("hero_skill:p001", { target: soldier, areaDistance: 0 }, 1)).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorStress: null,
    });
    // Dodge 8 时命中阈值是 1。没有增益，掷 2 落空。两堆把暴击阈值抬到 2，暴击不看 Dodge。
    const dodging = { ...soldier, dodge: 8, wounds: 2 };
    expect(
      use(
        "hero_skill:p001",
        { actor: { ...crusader, buffStacks: 0 }, target: dodging, areaDistance: 0 },
        2,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 2,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p001",
        {
          actor: { ...crusader, buffStacks: 2 },
          target: { ...dodging, protection: true, riposte: true },
          areaDistance: 0,
        },
        2,
      ),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 13,
      damageDealt: 7,
      riposteDamage: 7,
      wounds: 9,
      actorWounds: 7,
      actorStress: 3,
    });

    const pistol = card("hero_skill:p067");
    expect(pistol.name).toBe("Pistol Shot");
    expect(pistol.level).toBe(1);
    expect(pistol.verification.unverified).toBe(false);
    expect(pistol.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 1],
      ["Acc", 9],
    ]);
    // 说明书 G-08 的 Pistol Shot：Crit 1，暴击 9、命中 5。这里只加 1 堆，不加光照 4 的 Crit +1。
    // 所以掷 2 暴击，掷 3 仍是命中。射程 1-2 的 numeric 为 null，不传距离。
    const highwayman = { id: "highwayman", wounds: 1, stress: 5, buffStacks: 1 };
    expect(use("hero_skill:p067", { actor: highwayman, target: soldier }, 2)).toMatchObject({
      status: "resolved",
      outcome: "crit",
      printedAmount: 9,
      damageDealt: 9,
      wounds: 9,
      actorStress: 4,
    });
    expect(use("hero_skill:p067", { actor: highwayman, target: soldier }, 3)).toMatchObject({
      outcome: "hit",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
      actorStress: 5,
    });
    expect(
      use("hero_skill:p067", { actor: { ...highwayman, buffStacks: 0 }, target: soldier }, 2),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
    });

    const heal = card("hero_skill:p013");
    expect(heal.name).toBe("Battle Heal");
    expect(heal.level).toBe(1);
    expect(heal.verification.unverified).toBe(false);
    const vestal = { id: "vestal", wounds: 1, stress: 5, buffStacks: 1 };
    const patient = { id: "patient", side: "hero" as const, wounds: 5, dodge: 0, stress: 3 };
    // Crit 2 + 1 堆。掷 3 暴击，治疗 4。不传距离：射程印的是 0-1，numeric 为 null。
    expect(use("hero_skill:p013", { actor: vestal, target: patient }, 3)).toMatchObject({
      status: "resolved",
      outcome: "crit",
      effect: "heal",
      printedAmount: 4,
      damageDealt: null,
      riposteDamage: null,
      wounds: 1,
      actorWounds: 1,
      actorStress: 4,
      targetStress: 3,
      skipped: [{ code: "damage_or_heal_combined_marker" }],
    });
    expect(
      use("hero_skill:p013", { actor: { ...vestal, buffStacks: 0 }, target: patient }, 3),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 2,
      wounds: 3,
      actorStress: 5,
    });
    // Dodge 11，命中阈值是 1。掷 3 本来落空；一堆增益让它变成暴击，治疗不减半。
    expect(
      use(
        "hero_skill:p013",
        {
          actor: vestal,
          target: { ...patient, dodge: 11, protection: true, riposte: true },
        },
        3,
      ),
    ).toMatchObject({
      outcome: "crit",
      effect: "heal",
      printedAmount: 4,
      damageDealt: null,
      riposteDamage: null,
      wounds: 1,
      actorWounds: 1,
    });

    // 没有 Acc 的变身不掷骰。已有的增益不造出一次暴击，也不改形态结果。
    expect(
      use(
        "hero_skill:p220",
        {
          actor: { id: "abomination", wounds: 5, stress: 3, buffStacks: 2 },
          target: { id: "vestal", side: "hero", wounds: 4, dodge: 0, stress: 4 },
        },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: null,
      effect: null,
      actorForm: "beast",
      wounds: 4,
      actorWounds: 5,
      actorStress: 3,
      targetStress: 4,
    });
  });

  it("增益堆数不是非负整数时整次拒绝；卡面 3t 和 +1 vs 类型仍不读成堆数或伤害", () => {
    const soldier = { id: "soldier", side: "monster" as const, wounds: 0, dodge: 0 };
    expect(
      use(
        "hero_skill:p001",
        {
          actor: { id: "crusader", wounds: 0, stress: 4, buffStacks: -1 },
          target: soldier,
          areaDistance: 0,
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "使用者的增益堆数必须是非负整数",
      outcome: null,
      effect: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorWounds: 0,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p001",
        {
          actor: { id: "crusader", wounds: 2, stress: 4, buffStacks: 1.5 },
          target: { ...soldier, wounds: 3 },
          areaDistance: 0,
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "使用者的增益堆数必须是非负整数",
      wounds: 3,
      actorWounds: 2,
      actorStress: 4,
      damageDealt: null,
    });

    const tracking = card("hero_skill:p076");
    expect(tracking.name).toBe("Tracking Shot");
    expect(tracking.level).toBe(1);
    expect(tracking.verification.unverified).toBe(false);
    expect(
      tracking.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "buff",
        )
        .map((item) => [item.text, item.numeric]),
    ).toEqual([["3t", null]]);
    // Crit 0。若把 3t 读成 3 堆，掷 1 会是暴击、伤害 3。回合数是 null，所以仍是命中、伤害 2。
    expect(
      use(
        "hero_skill:p076",
        { actor: { id: "highwayman", wounds: 1, stress: 4, buffStacks: 0 }, target: soldier },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 2,
      damageDealt: 2,
      wounds: 2,
      actorStress: 4,
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      use(
        "hero_skill:p076",
        {
          actor: { id: "highwayman", wounds: 1, stress: 4 },
          target: { ...soldier, wounds: 6 },
          areaDistance: 1,
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "射程印成区间，旁边数字的 numeric 为 null，不能核对不同距离（规则书第 19 页，R-048）",
      outcome: null,
      wounds: 6,
      actorWounds: 1,
      actorStress: 4,
      damageDealt: null,
    });

    const hand = card("hero_skill:p103");
    expect(hand.name).toBe("Hand of Light");
    expect(hand.level).toBe(1);
    expect(hand.verification.unverified).toBe(false);
    expect(
      hand.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["3t", "+1"]);
    // 调用方的 1 堆把暴击阈值从 1 抬到 2。卡上的 3t 不加，所以掷 3 仍是命中、伤害 3。
    // +1 vs Unholy 的 numeric 为 null，暴击伤害仍是 6。
    expect(
      use(
        "hero_skill:p103",
        {
          actor: { id: "crusader", wounds: 0, stress: 2, buffStacks: 1, stance: "aggressive" },
          target: soldier,
          areaDistance: 1,
        },
        2,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "crit",
      printedAmount: 6,
      damageDealt: 6,
      wounds: 6,
      actorStress: 1,
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      use(
        "hero_skill:p103",
        {
          actor: { id: "crusader", wounds: 0, stress: 2, buffStacks: 1, stance: "aggressive" },
          target: soldier,
          areaDistance: 1,
        },
        3,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 3,
      actorStress: 2,
    });
  });

  it("目标是怪物时，每一堆已有的 Debuff 让暴击阈值 +1，英雄目标不加", () => {
    const grapeshot = card("hero_skill:p073");
    expect(grapeshot.name).toBe("Grapeshot Blast");
    expect(grapeshot.level).toBe(1);
    expect(grapeshot.hero).toBe("HIGHWAYMAN");
    expect(grapeshot.verification.unverified).toBe(false);
    expect(grapeshot.printed_labels).toEqual([
      { label: "Crit", raw: "Crit 0", value: 0 },
      { label: "Acc", raw: "Acc 8", value: 8 },
    ]);
    expect(
      grapeshot.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => [
          item.anchor.type === "printed_label" ? item.anchor.label : "",
          item.numeric,
        ]),
    ).toEqual([
      ["Crit", 5],
      ["Acc", 3],
    ]);
    expect(
      grapeshot.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "debuff",
        )
        .map((item) => [item.text, item.numeric]),
    ).toEqual([["1t", null]]);

    const highwayman = { id: "highwayman", wounds: 0, stress: 4 };
    const soldier = {
      id: "soldier",
      side: "monster" as const,
      wounds: 0,
      dodge: 0,
      debuffStacks: 1,
    };
    const beside = [{ id: "vestal", stress: 2 }];
    // 射程印的是 0-1，numeric 为 null，不传距离。Crit 0 + 1 堆。掷 1 暴击，伤害仍是 5。
    const oneStack = { actor: highwayman, heroesBesideActor: beside, target: soldier };
    const frozen = structuredClone(oneStack);
    expect(use("hero_skill:p073", oneStack, 1)).toMatchObject({
      status: "resolved",
      outcome: "crit",
      effect: "damage",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
      actorWounds: 0,
      actorStress: 3,
      besideActorStress: [{ id: "vestal", stress: 1 }],
      riposteDamage: null,
      skipped: [{ code: "effect_lines" }],
    });
    expect(oneStack).toEqual(frozen);
    // 同一堆不把掷 2 变成暴击。命中阈值仍是 Acc 8 − Dodge 0，伤害仍是 3。
    expect(use("hero_skill:p073", oneStack, 2)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 3,
      actorStress: 4,
      besideActorStress: [{ id: "vestal", stress: 2 }],
    });
    expect(
      use("hero_skill:p073", { ...oneStack, target: { ...soldier, debuffStacks: 0 } }, 1),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 3,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p073",
        {
          actor: highwayman,
          heroesBesideActor: beside,
          target: { id: "soldier", side: "monster", wounds: 0, dodge: 0 },
        },
        1,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 3,
      actorStress: 4,
    });
    // Dodge 8 时命中阈值是 0。没有减益，掷 1 落空。一堆让暴击阈值变成 1，暴击不看 Dodge。
    const dodging = { ...soldier, dodge: 8, wounds: 1, debuffStacks: 0 };
    expect(use("hero_skill:p073", { actor: highwayman, target: dodging }, 1)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 1,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p073",
        {
          actor: highwayman,
          target: { ...dodging, debuffStacks: 1, protection: true, riposte: true },
        },
        1,
      ),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 5,
      damageDealt: 3,
      riposteDamage: 3,
      wounds: 4,
      actorWounds: 3,
      actorStress: 3,
    });
    expect(
      use("hero_skill:p073", { actor: highwayman, target: { ...dodging, debuffStacks: 1 } }, 2),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 1,
      riposteDamage: null,
      actorStress: 4,
    });
    // 两堆把暴击阈值抬到 2。掷 2 暴击、伤害 5；掷 3 仍是命中、伤害 3。
    expect(
      use("hero_skill:p073", { actor: highwayman, target: { ...soldier, debuffStacks: 2 } }, 2),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
      actorStress: 3,
    });
    expect(
      use("hero_skill:p073", { actor: highwayman, target: { ...soldier, debuffStacks: 2 } }, 3),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 3,
      actorStress: 4,
    });

    const second = card("hero_skill:p074");
    expect(second.name).toBe("Grapeshot Blast");
    expect(second.level).toBe(2);
    expect(second.verification.unverified).toBe(false);
    expect(second.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 0],
      ["Acc", 9],
    ]);
    expect(
      second.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([7, 4]);
    expect(use("hero_skill:p074", oneStack, 1)).toMatchObject({
      status: "resolved",
      outcome: "crit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorStress: 3,
      skipped: [{ code: "effect_lines" }],
    });
    expect(use("hero_skill:p074", oneStack, 2)).toMatchObject({
      outcome: "hit",
      printedAmount: 4,
      damageDealt: 4,
      wounds: 4,
      actorStress: 4,
    });

    const third = card("hero_skill:p075");
    expect(third.name).toBe("Grapeshot Blast");
    expect(third.level).toBe(3);
    expect(third.verification.unverified).toBe(false);
    expect(third.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 0],
      ["Acc", 10],
    ]);
    expect(
      third.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([8, 5]);
    expect(use("hero_skill:p075", oneStack, 1)).toMatchObject({
      outcome: "crit",
      printedAmount: 8,
      damageDealt: 8,
      wounds: 8,
    });
    expect(use("hero_skill:p075", oneStack, 2)).toMatchObject({
      outcome: "hit",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
    });

    // Smite：Crit 0。1 堆增益 + 1 堆减益把暴击阈值抬到 2。+1 vs Unholy 仍不加。
    const smiteTarget = { ...soldier, debuffStacks: 1 };
    expect(
      use(
        "hero_skill:p001",
        {
          actor: { id: "crusader", wounds: 0, stress: 4, buffStacks: 1 },
          target: smiteTarget,
          areaDistance: 0,
        },
        2,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "crit",
      printedAmount: 13,
      damageDealt: 13,
      wounds: 13,
      actorStress: 3,
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      use(
        "hero_skill:p001",
        {
          actor: { id: "crusader", wounds: 0, stress: 4, buffStacks: 1 },
          target: smiteTarget,
          areaDistance: 0,
        },
        3,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p001",
        {
          actor: { id: "crusader", wounds: 0, stress: 4, buffStacks: 1 },
          target: { ...soldier, debuffStacks: 0 },
          areaDistance: 0,
        },
        2,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
    });

    // Battle Heal I：Crit 2。友方身上的减益不加，掷 3 仍是命中、治疗 2，不是暴击治疗 4。
    const heal = card("hero_skill:p013");
    expect(heal.name).toBe("Battle Heal");
    expect(heal.level).toBe(1);
    expect(heal.verification.unverified).toBe(false);
    const vestal = { id: "vestal", wounds: 1, stress: 5 };
    const patient = {
      id: "patient",
      side: "hero" as const,
      wounds: 5,
      dodge: 0,
      stress: 3,
      debuffStacks: 1,
      protection: true,
      riposte: true,
    };
    expect(use("hero_skill:p013", { actor: vestal, target: patient }, 3)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "heal",
      printedAmount: 2,
      damageDealt: null,
      riposteDamage: null,
      wounds: 3,
      actorWounds: 1,
      actorStress: 5,
      targetStress: 3,
    });
    expect(
      use("hero_skill:p013", { actor: vestal, target: { ...patient, debuffStacks: 0 } }, 3),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 2,
      wounds: 3,
      actorStress: 5,
    });

    // Inspiring Tune II：Crit 2，自身和目标各 −1。友方有 1 堆时，掷 3 仍不是暴击。
    const tune = card("hero_skill:p122");
    expect(tune.name).toBe("Inspiring Tune");
    expect(tune.level).toBe(2);
    expect(tune.verification.unverified).toBe(false);
    expect(tune.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 2],
      ["Acc", 20],
    ]);
    const jester = { id: "jester", wounds: 0, stress: 5 };
    const ally = {
      id: "crusader",
      side: "hero" as const,
      wounds: 2,
      dodge: 0,
      stress: 6,
      debuffStacks: 1,
    };
    expect(
      use(
        "hero_skill:p122",
        {
          actor: jester,
          heroesBesideActor: [{ id: "vestal", stress: 2 }],
          target: ally,
          areaDistance: 0,
        },
        3,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "stress",
      printedAmount: null,
      damageDealt: null,
      wounds: 2,
      actorStress: 4,
      targetStress: 5,
      besideActorStress: [{ id: "vestal", stress: 2 }],
    });

    // Absolution I：目标是自己。Crit 1。自己身上的减益不加，掷 2 仍是命中治疗 2。
    expect(
      use(
        "hero_skill:p217",
        {
          actor: { id: "abomination", wounds: 5, stress: 4 },
          heroesBesideActor: [{ id: "vestal", stress: 2 }],
          target: {
            id: "abomination",
            side: "hero",
            wounds: 5,
            dodge: 0,
            stress: 4,
            debuffStacks: 1,
          },
        },
        2,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "heal",
      printedAmount: 2,
      damageDealt: null,
      wounds: 3,
      actorWounds: 3,
      actorStress: 3,
      targetStress: 3,
      besideActorStress: [{ id: "vestal", stress: 2 }],
    });

    // 没有 Acc 的变身不掷骰。目标身上的减益不造出一次暴击。
    expect(
      use(
        "hero_skill:p220",
        {
          actor: { id: "abomination", wounds: 5, stress: 3 },
          target: {
            id: "cultist",
            side: "monster",
            wounds: 4,
            dodge: 0,
            debuffStacks: 9,
          },
        },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: null,
      effect: null,
      actorForm: "beast",
      wounds: 4,
      actorWounds: 5,
      actorStress: 3,
    });
  });

  it("减益堆数不是非负整数时整次拒绝；卡面 1t、2t 和光照 +1 不读成堆数或伤害", () => {
    const soldier = { id: "soldier", side: "monster" as const, wounds: 2, dodge: 0 };
    expect(
      use(
        "hero_skill:p073",
        {
          actor: { id: "highwayman", wounds: 1, stress: 4 },
          target: { ...soldier, debuffStacks: -1 },
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "目标的减益堆数必须是非负整数",
      outcome: null,
      effect: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 2,
      actorWounds: 1,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p001",
        {
          actor: { id: "crusader", wounds: 0, stress: 4 },
          target: { ...soldier, wounds: 3, debuffStacks: 1.5 },
          areaDistance: 0,
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "目标的减益堆数必须是非负整数",
      wounds: 3,
      actorWounds: 0,
      actorStress: 4,
      damageDealt: null,
    });
    // 友方身上的非法堆数也不结算，不改治疗。
    expect(
      use(
        "hero_skill:p013",
        {
          actor: { id: "vestal", wounds: 1, stress: 5 },
          target: {
            id: "patient",
            side: "hero",
            wounds: 5,
            dodge: 0,
            stress: 3,
            debuffStacks: -1,
          },
        },
        3,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "目标的减益堆数必须是非负整数",
      wounds: 5,
      actorWounds: 1,
      actorStress: 5,
      targetStress: 3,
      damageDealt: null,
    });

    const grapeshot = card("hero_skill:p073");
    expect(
      grapeshot.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "debuff",
        )
        .map((item) => [item.text, item.numeric]),
    ).toEqual([["1t", null]]);
    // Crit 0。若把 1t 读成 1 堆，掷 1 会是暴击、伤害 5。回合数是 null，所以仍是命中、伤害 3。
    expect(
      use(
        "hero_skill:p073",
        {
          actor: { id: "highwayman", wounds: 0, stress: 4, buffStacks: 0 },
          target: { ...soldier, wounds: 0, debuffStacks: 0 },
        },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 3,
      actorStress: 4,
      skipped: [{ code: "effect_lines" }],
    });

    const curse = card("hero_skill:p196");
    expect(curse.name).toBe("Weakening Curse");
    expect(curse.level).toBe(1);
    expect(curse.hero).toBe("OCCULTIST");
    expect(curse.verification.unverified).toBe(false);
    expect(curse.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 1],
      ["Acc", 10],
    ]);
    expect(
      curse.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([3, 2]);
    expect(
      curse.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "debuff",
        )
        .map((item) => [item.text, item.numeric]),
    ).toEqual([["2t", null]]);
    // 调用方的 1 堆把暴击阈值从 1 抬到 2。卡上的 2t 不加，所以掷 2 暴击、伤害 3，掷 3 仍是命中、伤害 2。
    expect(
      use(
        "hero_skill:p196",
        {
          actor: { id: "occultist", wounds: 0, stress: 2 },
          target: { ...soldier, wounds: 0, debuffStacks: 1 },
        },
        2,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "crit",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 3,
      actorStress: 1,
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      use(
        "hero_skill:p196",
        {
          actor: { id: "occultist", wounds: 0, stress: 2 },
          target: { ...soldier, wounds: 0, debuffStacks: 1 },
        },
        3,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 2,
      damageDealt: 2,
      wounds: 2,
      actorStress: 2,
    });

    const illumination = card("hero_skill:p100");
    expect(illumination.name).toBe("Illumination");
    expect(illumination.level).toBe(1);
    expect(illumination.hero).toBe("VESTAL");
    expect(illumination.verification.unverified).toBe(false);
    expect(illumination.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 0],
      ["Acc", 9],
    ]);
    expect(
      illumination.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([4, 2]);
    expect(
      illumination.unlabeled_numbers
        .filter((item) => item.numeric === null)
        .map((item) => item.text),
    ).toEqual(["1t", "+1", "1-2"]);
    // 1t 和光照 +1 的 numeric 都是 null。没有已有的减益时，掷 1 是命中、伤害 2，不是暴击 4，也不是 3。
    expect(
      use(
        "hero_skill:p100",
        {
          actor: { id: "vestal", wounds: 0, stress: 4 },
          target: { ...soldier, wounds: 0, debuffStacks: 0 },
        },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 2,
      damageDealt: 2,
      wounds: 2,
      actorStress: 4,
      skipped: [{ code: "effect_lines" }],
    });
    // 已有 1 堆时暴击伤害仍是印刷的 4，光照 +1 不加进伤害。
    expect(
      use(
        "hero_skill:p100",
        {
          actor: { id: "vestal", wounds: 0, stress: 4 },
          target: { ...soldier, wounds: 0, debuffStacks: 1 },
        },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "crit",
      printedAmount: 4,
      damageDealt: 4,
      wounds: 4,
      actorStress: 3,
      skipped: [{ code: "effect_lines" }],
    });
  });

  it("目标是怪物时，每一堆已有的 Mark 让命中阈值 +1，英雄目标不加", () => {
    const shot = card("hero_skill:p148");
    expect(shot.name).toBe("Sniper Shot");
    expect(shot.level).toBe(1);
    expect(shot.hero).toBe("ARBALEST");
    expect(shot.verification.unverified).toBe(false);
    expect(shot.printed_labels).toEqual([
      { label: "Crit", raw: "Crit 1", value: 1 },
      { label: "Acc", raw: "Acc 9", value: 9 },
    ]);
    expect(
      shot.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => [
          item.anchor.type === "printed_label" ? item.anchor.label : "",
          item.numeric,
        ]),
    ).toEqual([
      ["Crit", 9],
      ["Acc", 6],
    ]);
    expect(
      shot.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["+3"]);
    expect(
      shot.effect_lines[0]
        ?.filter((segment) => segment.type === "icon")
        .map((segment) => segment.icon.key),
    ).toEqual(["target_effects", "damage", "mark"]);

    const arbalest = { id: "arbalest", wounds: 0, stress: 4 };
    const soldier = {
      id: "soldier",
      side: "monster" as const,
      wounds: 0,
      dodge: 0,
      markStacks: 1,
    };
    const beside = [{ id: "vestal", stress: 2 }];
    // 射程印的是 2。Acc 9 + 1 堆 = 10。掷 10 从落空变成命中，伤害仍是 6，不是 6 + 1，也不是 +3。
    const oneStack = {
      actor: arbalest,
      heroesBesideActor: beside,
      target: soldier,
      areaDistance: 2,
    };
    const frozen = structuredClone(oneStack);
    expect(use("hero_skill:p148", oneStack, 10)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 6,
      damageDealt: 6,
      wounds: 6,
      actorWounds: 0,
      actorStress: 4,
      besideActorStress: [{ id: "vestal", stress: 2 }],
      riposteDamage: null,
      skipped: [{ code: "effect_lines" }],
    });
    expect(oneStack).toEqual(frozen);
    expect(
      use("hero_skill:p148", { ...oneStack, target: { ...soldier, markStacks: 0 } }, 10),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorStress: 4,
      besideActorStress: [{ id: "vestal", stress: 2 }],
    });
    expect(
      use(
        "hero_skill:p148",
        {
          actor: arbalest,
          heroesBesideActor: beside,
          target: { id: "soldier", side: "monster", wounds: 0, dodge: 0 },
          areaDistance: 2,
        },
        10,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
    });
    // 标记不加暴击阈值。Crit 仍是 1：掷 1 暴击、伤害 9；掷 2 是命中、伤害 6。
    expect(use("hero_skill:p148", oneStack, 1)).toMatchObject({
      outcome: "crit",
      printedAmount: 9,
      damageDealt: 9,
      wounds: 9,
      actorStress: 3,
      besideActorStress: [{ id: "vestal", stress: 1 }],
    });
    expect(use("hero_skill:p148", oneStack, 2)).toMatchObject({
      outcome: "hit",
      printedAmount: 6,
      damageDealt: 6,
      wounds: 6,
      actorStress: 4,
      besideActorStress: [{ id: "vestal", stress: 2 }],
    });
    // Dodge 8。两堆把命中阈值抬到 3。掷 3 命中、伤害 6；掷 4 仍落空。暴击阈值仍是 1。
    const dodging = { ...soldier, dodge: 8, wounds: 1, markStacks: 2 };
    expect(
      use("hero_skill:p148", { actor: arbalest, target: dodging, areaDistance: 2 }, 3),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 6,
      damageDealt: 6,
      wounds: 7,
      actorStress: 4,
    });
    expect(
      use("hero_skill:p148", { actor: arbalest, target: dodging, areaDistance: 2 }, 4),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 1,
      riposteDamage: null,
      actorStress: 4,
    });
    // 一堆、Dodge 8：命中阈值是 2。掷 2 命中。防护减半后是 3，反弹按减半前的 6 取一半。
    expect(
      use(
        "hero_skill:p148",
        {
          actor: arbalest,
          target: { ...dodging, markStacks: 1, protection: true, riposte: true },
          areaDistance: 2,
        },
        2,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 6,
      damageDealt: 3,
      riposteDamage: 3,
      wounds: 4,
      actorWounds: 3,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p148",
        {
          actor: arbalest,
          target: { ...dodging, markStacks: 0 },
          areaDistance: 2,
        },
        2,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      riposteDamage: null,
      wounds: 1,
      actorWounds: 0,
    });

    // 增益和减益只抬暴击，标记只抬命中。Crit 0 + 1 + 1 = 2，Acc 9 + 1 = 10。
    const smite = card("hero_skill:p001");
    expect(smite.name).toBe("Smite");
    expect(smite.level).toBe(1);
    expect(smite.verification.unverified).toBe(false);
    const marked = { ...soldier, markStacks: 1, debuffStacks: 1 };
    expect(
      use(
        "hero_skill:p001",
        {
          actor: { id: "crusader", wounds: 0, stress: 4, buffStacks: 1 },
          target: marked,
          areaDistance: 0,
        },
        2,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "crit",
      printedAmount: 13,
      damageDealt: 13,
      wounds: 13,
      actorStress: 3,
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      use(
        "hero_skill:p001",
        {
          actor: { id: "crusader", wounds: 0, stress: 4, buffStacks: 1 },
          target: marked,
          areaDistance: 0,
        },
        3,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p001",
        {
          actor: { id: "crusader", wounds: 0, stress: 4, buffStacks: 1 },
          target: marked,
          areaDistance: 0,
        },
        10,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p001",
        {
          actor: { id: "crusader", wounds: 0, stress: 4, buffStacks: 1 },
          target: { ...marked, markStacks: 0 },
          areaDistance: 0,
        },
        10,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorStress: 4,
    });

    const pistol = card("hero_skill:p067");
    expect(pistol.name).toBe("Pistol Shot");
    expect(pistol.level).toBe(1);
    expect(pistol.verification.unverified).toBe(false);
    expect(
      pistol.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["+2", "1-2"]);
    // 射程是区间，不传距离。+2 vs 已命名标记的 numeric 为 null，命中伤害仍是 5。
    expect(use("hero_skill:p067", { actor: arbalest, target: soldier }, 10)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
      actorStress: 4,
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      use("hero_skill:p067", { actor: arbalest, target: { ...soldier, markStacks: 0 } }, 10),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
    });
    // 五堆只抬命中。Crit 仍是 1，掷 2 是命中、伤害 5，不是暴击 9，也不是 7。
    expect(
      use("hero_skill:p067", { actor: arbalest, target: { ...soldier, markStacks: 5 } }, 2),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
      actorStress: 4,
    });

    const hither = card("hero_skill:p049");
    expect(hither.name).toBe("Come Hither");
    expect(hither.level).toBe(1);
    expect(hither.hero).toBe("BOUNTY HUNTER");
    expect(hither.verification.unverified).toBe(false);
    expect(hither.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 0],
      ["Acc", 9],
    ]);
    expect(
      hither.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([4, 2]);
    expect(
      hither.effect_lines[0]
        ?.filter((segment) => segment.type === "icon")
        .map((segment) => segment.icon.key),
    ).toEqual(["target_effects", "mark", "shuffle"]);
    // Crit 0。标记堆不把掷 1 变成暴击，伤害仍是 2。同一行的 2t 和 Pull 2 不抽出位移。
    expect(
      use(
        "hero_skill:p049",
        { actor: { id: "bounty-hunter", wounds: 0, stress: 3 }, target: soldier, areaDistance: 2 },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 2,
      damageDealt: 2,
      wounds: 2,
      actorStress: 3,
      actorShuffle: null,
      targetShuffle: null,
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      use(
        "hero_skill:p049",
        {
          actor: { id: "bounty-hunter", wounds: 0, stress: 3 },
          target: { ...soldier, markStacks: 0 },
          areaDistance: 2,
        },
        10,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      targetShuffle: null,
      actorStress: 3,
    });
    expect(
      use(
        "hero_skill:p049",
        { actor: { id: "bounty-hunter", wounds: 0, stress: 3 }, target: soldier, areaDistance: 2 },
        10,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 2,
      damageDealt: 2,
      wounds: 2,
      targetShuffle: null,
    });

    // Battle Heal I：Acc 12、Crit 2。友方 3 堆标记不加。Dodge 12 时掷 3 仍落空，不治疗。
    const heal = card("hero_skill:p013");
    expect(heal.name).toBe("Battle Heal");
    expect(heal.level).toBe(1);
    expect(heal.verification.unverified).toBe(false);
    const vestal = { id: "vestal", wounds: 1, stress: 5 };
    const patient = {
      id: "patient",
      side: "hero" as const,
      wounds: 5,
      dodge: 12,
      stress: 3,
      markStacks: 3,
      protection: true,
      riposte: true,
    };
    expect(use("hero_skill:p013", { actor: vestal, target: patient }, 3)).toMatchObject({
      status: "resolved",
      outcome: "miss",
      effect: "heal",
      printedAmount: null,
      damageDealt: null,
      riposteDamage: null,
      wounds: 5,
      actorWounds: 1,
      actorStress: 5,
      targetStress: 3,
    });
    expect(
      use("hero_skill:p013", { actor: vestal, target: { ...patient, markStacks: 0 } }, 3),
    ).toMatchObject({
      outcome: "miss",
      wounds: 5,
      actorStress: 5,
    });

    // Absolution I：目标是自己。Crit 1、Acc 12。自己的标记不加，掷 2 落空，自身压力仍 −1。
    expect(
      use(
        "hero_skill:p217",
        {
          actor: { id: "abomination", wounds: 5, stress: 4 },
          heroesBesideActor: [{ id: "vestal", stress: 2 }],
          target: {
            id: "abomination",
            side: "hero",
            wounds: 5,
            dodge: 12,
            stress: 4,
            markStacks: 5,
          },
        },
        2,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "miss",
      effect: "heal",
      printedAmount: null,
      damageDealt: null,
      wounds: 5,
      actorWounds: 5,
      actorStress: 3,
      targetStress: 3,
      besideActorStress: [{ id: "vestal", stress: 2 }],
    });

    // 没有 Acc 的变身不掷骰。目标身上的标记不造出一次命中或暴击。
    expect(
      use(
        "hero_skill:p220",
        {
          actor: { id: "abomination", wounds: 5, stress: 3 },
          target: {
            id: "cultist",
            side: "monster",
            wounds: 4,
            dodge: 0,
            markStacks: 4,
          },
        },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: null,
      effect: null,
      actorForm: "beast",
      wounds: 4,
      actorWounds: 5,
      actorStress: 3,
    });
  });

  it("标记堆数不是非负整数时整次拒绝；卡面 2t 和 +N vs 标记不读成堆数或伤害", () => {
    const soldier = { id: "soldier", side: "monster" as const, wounds: 2, dodge: 0 };
    expect(
      use(
        "hero_skill:p148",
        {
          actor: { id: "arbalest", wounds: 1, stress: 4 },
          target: { ...soldier, markStacks: -1 },
          areaDistance: 2,
        },
        10,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "目标的标记堆数必须是非负整数",
      outcome: null,
      effect: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 2,
      actorWounds: 1,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p001",
        {
          actor: { id: "crusader", wounds: 0, stress: 4 },
          target: { ...soldier, wounds: 3, markStacks: 1.5 },
          areaDistance: 0,
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "目标的标记堆数必须是非负整数",
      wounds: 3,
      actorWounds: 0,
      actorStress: 4,
      damageDealt: null,
    });
    expect(
      use(
        "hero_skill:p013",
        {
          actor: { id: "vestal", wounds: 1, stress: 5 },
          target: {
            id: "patient",
            side: "hero",
            wounds: 5,
            dodge: 0,
            stress: 3,
            markStacks: -1,
          },
        },
        3,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "目标的标记堆数必须是非负整数",
      wounds: 5,
      actorWounds: 1,
      actorStress: 5,
      targetStress: 3,
      damageDealt: null,
    });

    const hex = card("hero_skill:p202");
    expect(hex.name).toBe("Vulnerability Hex");
    expect(hex.level).toBe(1);
    expect(hex.hero).toBe("OCCULTIST");
    expect(hex.verification.unverified).toBe(false);
    expect(hex.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 1],
      ["Acc", 10],
    ]);
    expect(
      hex.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([2, 1]);
    expect(hex.effect_lines).toHaveLength(1);
    expect(
      hex.effect_lines[0]
        ?.filter((segment) => segment.type === "icon")
        .map((segment) => segment.icon.key),
    ).toEqual(["target_effects", "mark"]);
    expect(
      hex.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["2t", "1-2"]);
    // Dodge 10，没有已有的标记时命中阈值是 0。若把 2t 读成 2 堆，掷 2 会命中、伤害 1。回合数是 null，所以落空。
    expect(
      use(
        "hero_skill:p202",
        {
          actor: { id: "occultist", wounds: 0, stress: 2 },
          target: { ...soldier, wounds: 0, dodge: 10, markStacks: 0 },
        },
        2,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "miss",
      effect: "damage",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorStress: 2,
      skipped: [{ code: "effect_lines" }],
    });
    // 调用方的 1 堆把命中阈值抬到 1，卡上的 2t 不再加一堆，掷 2 仍落空。两堆才命中，伤害仍是 1。
    expect(
      use(
        "hero_skill:p202",
        {
          actor: { id: "occultist", wounds: 0, stress: 2 },
          target: { ...soldier, wounds: 0, dodge: 10, markStacks: 1 },
        },
        2,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorStress: 2,
    });
    expect(
      use(
        "hero_skill:p202",
        {
          actor: { id: "occultist", wounds: 0, stress: 2 },
          target: { ...soldier, wounds: 0, dodge: 10, markStacks: 2 },
        },
        2,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 1,
      damageDealt: 1,
      wounds: 1,
      actorStress: 2,
      skipped: [{ code: "effect_lines" }],
    });

    const mark = card("hero_skill:p154");
    expect(mark.name).toBe("Sniper’s Mark");
    expect(mark.level).toBe(1);
    expect(mark.verification.unverified).toBe(false);
    expect(
      mark.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["2t", "1-2"]);
    // 目标已经有 1 堆。这张卡没有伤害或治疗，2t 仍不放新标记，整次拒绝，伤口不动。
    expect(
      use(
        "hero_skill:p154",
        {
          actor: { id: "arbalest", wounds: 0, stress: 2 },
          target: { id: "soldier", side: "monster", wounds: 4, dodge: 0, markStacks: 1 },
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "stats_line 没有已命名的 damage 或 heal",
      outcome: null,
      effect: null,
      printedAmount: null,
      wounds: 4,
      actorWounds: 0,
      actorStress: 2,
      actorForm: null,
    });
  });

  it("目标区域更低时命中阈值 +1，暴击阈值和印刷伤害不变，友方治疗也加", () => {
    const shot = card("hero_skill:p148");
    expect(shot.name).toBe("Sniper Shot");
    expect(shot.level).toBe(1);
    expect(shot.hero).toBe("ARBALEST");
    expect(shot.verification.unverified).toBe(false);
    expect(shot.printed_labels).toEqual([
      { label: "Crit", raw: "Crit 1", value: 1 },
      { label: "Acc", raw: "Acc 9", value: 9 },
    ]);
    expect(
      shot.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([9, 6]);
    expect(
      shot.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["+3"]);

    const arbalest = { id: "arbalest", wounds: 0, stress: 4 };
    const soldier = { id: "soldier", side: "monster" as const, wounds: 0, dodge: 0 };
    const beside = [{ id: "vestal", stress: 2 }];
    // 射程 2。Acc 9 + 高地 1 = 10。掷 10 从落空变成命中，伤害仍是 6，不是 7，也不是 +3。
    const lower = {
      actor: arbalest,
      heroesBesideActor: beside,
      target: soldier,
      areaDistance: 2,
      targetAreaLower: true,
    };
    const frozen = structuredClone(lower);
    expect(use("hero_skill:p148", lower, 10)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 6,
      damageDealt: 6,
      wounds: 6,
      actorWounds: 0,
      actorStress: 4,
      besideActorStress: [{ id: "vestal", stress: 2 }],
      riposteDamage: null,
      skipped: [{ code: "effect_lines" }],
    });
    expect(lower).toEqual(frozen);
    expect(use("hero_skill:p148", { ...lower, targetAreaLower: false }, 10)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorStress: 4,
      besideActorStress: [{ id: "vestal", stress: 2 }],
    });
    expect(
      use(
        "hero_skill:p148",
        { actor: arbalest, heroesBesideActor: beside, target: soldier, areaDistance: 2 },
        10,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
    });
    // 高地不加暴击。Crit 仍是 1：掷 1 暴击、伤害 9；掷 2 是命中、伤害 6。
    expect(use("hero_skill:p148", lower, 1)).toMatchObject({
      outcome: "crit",
      printedAmount: 9,
      damageDealt: 9,
      wounds: 9,
      actorStress: 3,
      besideActorStress: [{ id: "vestal", stress: 1 }],
    });
    expect(use("hero_skill:p148", lower, 2)).toMatchObject({
      outcome: "hit",
      printedAmount: 6,
      damageDealt: 6,
      wounds: 6,
      actorStress: 4,
      besideActorStress: [{ id: "vestal", stress: 2 }],
    });
    // Dodge 8。高地把命中阈值抬到 2。掷 2 命中、伤害 6；掷 3 仍落空。
    const dodging = { ...soldier, dodge: 8, wounds: 1 };
    expect(
      use(
        "hero_skill:p148",
        { actor: arbalest, target: dodging, areaDistance: 2, targetAreaLower: true },
        2,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 6,
      damageDealt: 6,
      wounds: 7,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p148",
        { actor: arbalest, target: dodging, areaDistance: 2, targetAreaLower: false },
        2,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 1,
      riposteDamage: null,
      actorStress: 4,
    });
    // 同一掷。防护减半后是 3，反弹按减半前的 6 取一半。高地不加进这两边。
    expect(
      use(
        "hero_skill:p148",
        {
          actor: arbalest,
          target: { ...dodging, protection: true, riposte: true },
          areaDistance: 2,
          targetAreaLower: true,
        },
        2,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 6,
      damageDealt: 3,
      riposteDamage: 3,
      wounds: 4,
      actorWounds: 3,
      actorStress: 4,
    });
    // Dodge 9。只有高地或只有 1 堆标记时，命中阈值是 1，掷 2 落空。两样都有才是 2。
    const highDodge = { ...soldier, dodge: 9, wounds: 2, markStacks: 1 };
    expect(
      use(
        "hero_skill:p148",
        {
          actor: arbalest,
          target: highDodge,
          areaDistance: 2,
          targetAreaLower: true,
        },
        2,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 6,
      damageDealt: 6,
      wounds: 8,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p148",
        {
          actor: arbalest,
          target: { ...highDodge, markStacks: 0 },
          areaDistance: 2,
          targetAreaLower: true,
        },
        2,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 2,
    });
    expect(
      use(
        "hero_skill:p148",
        {
          actor: arbalest,
          target: highDodge,
          areaDistance: 2,
          targetAreaLower: false,
        },
        2,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 2,
    });
    // 增益只抬暴击。1 堆增益 + 高地：掷 2 暴击、伤害 9。没有增益时上面已经是命中、伤害 6。
    expect(
      use(
        "hero_skill:p148",
        {
          actor: { ...arbalest, buffStacks: 1 },
          target: soldier,
          areaDistance: 2,
          targetAreaLower: true,
        },
        2,
      ),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 9,
      damageDealt: 9,
      wounds: 9,
      actorStress: 3,
    });

    const lance = card("hero_skill:p016");
    expect(lance.name).toBe("Holy Lance");
    expect(lance.level).toBe(1);
    expect(lance.hero).toBe("CRUSADER");
    expect(lance.verification.unverified).toBe(false);
    expect(lance.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 1],
      ["Acc", 9],
    ]);
    expect(
      lance.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([13, 7]);
    expect(
      lance.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["+1"]);
    expect(
      lance.effect_lines[0]
        ?.filter((segment) => segment.type === "icon")
        .map((segment) => segment.icon.key),
    ).toEqual(["self_effects", "shuffle"]);
    const crusader = { id: "crusader", wounds: 0, stress: 4 };
    // 射程 1。高地让掷 10 命中，伤害 7。+1 vs Unholy 的 numeric 为 null，不加。自身 Pull 1 仍记上。
    expect(
      use(
        "hero_skill:p016",
        {
          actor: crusader,
          target: soldier,
          areaDistance: 1,
          targetAreaLower: true,
        },
        10,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorShuffle: { direction: "pull", distance: 1 },
      targetShuffle: null,
      actorStress: 4,
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      use(
        "hero_skill:p016",
        { actor: crusader, target: soldier, areaDistance: 1, targetAreaLower: false },
        10,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorShuffle: { direction: "pull", distance: 1 },
      actorStress: 4,
    });
    // Dodge 9、高地：命中阈值 1。掷 10 落空，自身 Pull 1 仍发生，伤害不加。
    expect(
      use(
        "hero_skill:p016",
        {
          actor: crusader,
          target: { ...soldier, dodge: 9 },
          areaDistance: 1,
          targetAreaLower: true,
        },
        10,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorShuffle: { direction: "pull", distance: 1 },
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p016",
        { actor: crusader, target: soldier, areaDistance: 1, targetAreaLower: true },
        1,
      ),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 13,
      damageDealt: 13,
      wounds: 13,
      actorShuffle: { direction: "pull", distance: 1 },
      actorStress: 3,
    });

    // Battle Heal I：Acc 12、Crit 2，暴击治疗 4、命中治疗 2。友方也加这 1 点命中。
    const heal = card("hero_skill:p013");
    expect(heal.name).toBe("Battle Heal");
    expect(heal.level).toBe(1);
    expect(heal.verification.unverified).toBe(false);
    expect(heal.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 2],
      ["Acc", 12],
    ]);
    const vestal = { id: "vestal", wounds: 1, stress: 5 };
    const patient = {
      id: "patient",
      side: "hero" as const,
      wounds: 5,
      dodge: 10,
      stress: 3,
      markStacks: 5,
      protection: true,
      riposte: true,
    };
    // Dodge 10。没有高地时命中阈值是 2，掷 3 落空。标记堆对英雄不加。
    expect(use("hero_skill:p013", { actor: vestal, target: patient }, 3)).toMatchObject({
      status: "resolved",
      outcome: "miss",
      effect: "heal",
      printedAmount: null,
      damageDealt: null,
      riposteDamage: null,
      wounds: 5,
      actorWounds: 1,
      actorStress: 5,
      targetStress: 3,
    });
    // 高地把命中阈值抬到 3。掷 3 是命中治疗 2，不减半，不反弹。暴击阈值仍是 2，所以不是治疗 4。
    expect(
      use("hero_skill:p013", { actor: vestal, target: patient, targetAreaLower: true }, 3),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "heal",
      printedAmount: 2,
      damageDealt: null,
      riposteDamage: null,
      wounds: 3,
      actorWounds: 1,
      actorStress: 5,
      targetStress: 3,
      skipped: [{ code: "damage_or_heal_combined_marker" }],
    });
    expect(
      use("hero_skill:p013", { actor: vestal, target: patient, targetAreaLower: true }, 2),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 4,
      wounds: 1,
      actorStress: 4,
      riposteDamage: null,
    });
    expect(
      use("hero_skill:p013", { actor: vestal, target: patient, targetAreaLower: true }, 4),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      wounds: 5,
      actorStress: 5,
    });

    const pistol = card("hero_skill:p067");
    expect(pistol.name).toBe("Pistol Shot");
    expect(pistol.level).toBe(1);
    expect(pistol.verification.unverified).toBe(false);
    expect(
      pistol.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["+2", "1-2"]);
    // 射程是区间，不传距离。+2 vs 标记的 numeric 为 null。高地让掷 10 命中，伤害仍是 5。
    expect(
      use(
        "hero_skill:p067",
        {
          actor: arbalest,
          target: { ...soldier, markStacks: 1 },
          targetAreaLower: true,
        },
        10,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
      actorStress: 4,
      skipped: [{ code: "effect_lines" }],
    });
    expect(use("hero_skill:p067", { actor: arbalest, target: soldier }, 10)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
    });
    // 高地不加暴击。掷 2 仍是命中、伤害 5，不是暴击 9，也不是 7。
    expect(
      use("hero_skill:p067", { actor: arbalest, target: soldier, targetAreaLower: true }, 2),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
      actorStress: 4,
    });

    const light = card("hero_skill:p100");
    expect(light.name).toBe("Illumination");
    expect(light.level).toBe(1);
    expect(light.hero).toBe("VESTAL");
    expect(light.verification.unverified).toBe(false);
    expect(light.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 0],
      ["Acc", 9],
    ]);
    expect(
      light.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([4, 2]);
    expect(
      light.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["1t", "+1", "1-2"]);
    // Dodge 9。高地让掷 1 命中，伤害 2。Crit 仍是 0，所以不是暴击 4。光照 +1 的 numeric 为 null，不是 3。
    expect(
      use(
        "hero_skill:p100",
        {
          actor: { id: "vestal", wounds: 0, stress: 2 },
          target: { ...soldier, dodge: 9 },
          targetAreaLower: true,
        },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 2,
      damageDealt: 2,
      wounds: 2,
      actorStress: 2,
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      use(
        "hero_skill:p100",
        { actor: { id: "vestal", wounds: 0, stress: 2 }, target: { ...soldier, dodge: 9 } },
        1,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorStress: 2,
    });

    // 没有 Acc 的变身不掷骰。目标区域更低也不造出一次命中。
    expect(
      use(
        "hero_skill:p220",
        {
          actor: { id: "abomination", wounds: 5, stress: 3 },
          target: { id: "cultist", side: "monster", wounds: 4, dodge: 0 },
          targetAreaLower: true,
        },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: null,
      effect: null,
      actorForm: "beast",
      wounds: 4,
      actorWounds: 5,
      actorStress: 3,
    });
  });

  it("自身区域不能当成更低；高地不加射程，也不把光照 +1 或区间读成距离", () => {
    const soldier = { id: "soldier", side: "monster" as const, wounds: 2, dodge: 0 };
    // Smite I 射程是 0，目标就在使用者的区域里。
    const smite = card("hero_skill:p001");
    expect(smite.name).toBe("Smite");
    expect(smite.level).toBe(1);
    expect(smite.verification.unverified).toBe(false);
    expect(
      smite.unlabeled_numbers.find(
        (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "range",
      )?.numeric,
    ).toBe(0);
    expect(
      use(
        "hero_skill:p001",
        {
          actor: { id: "crusader", wounds: 0, stress: 4 },
          target: soldier,
          targetAreaLower: true,
        },
        9,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "卡面射程是 0，目标在使用者自己的区域，高地不能让命中阈值 +1（规则书第 19、25 页）",
      outcome: null,
      effect: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 2,
      actorWounds: 0,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p001",
        {
          actor: { id: "crusader", wounds: 0, stress: 4 },
          target: soldier,
          areaDistance: 0,
          targetAreaLower: true,
        },
        9,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "目标与使用者在同一区域，高地不能让命中阈值 +1（规则书第 25 页）",
      wounds: 2,
      actorWounds: 0,
      actorStress: 4,
      damageDealt: null,
    });
    // 同一高度仍按原来的 Acc 9。掷 9 命中、伤害 7，不加 +1 vs Unholy。
    expect(
      use(
        "hero_skill:p001",
        {
          actor: { id: "crusader", wounds: 0, stress: 4 },
          target: soldier,
          areaDistance: 0,
          targetAreaLower: false,
        },
        9,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 9,
      actorStress: 4,
    });

    // Absolution I 的目标是 Self。自身压力 −1 在拒绝时也不发生。
    expect(
      use(
        "hero_skill:p217",
        {
          actor: { id: "abomination", wounds: 5, stress: 4 },
          heroesBesideActor: [{ id: "vestal", stress: 2 }],
          target: {
            id: "abomination",
            side: "hero",
            wounds: 5,
            dodge: 0,
            stress: 4,
          },
          targetAreaLower: true,
        },
        2,
      ),
    ).toMatchObject({
      status: "refused",
      reason:
        "技能目标写的是 Self，与使用者在同一区域，高地不能让命中阈值 +1（规则书第 19、25 页）",
      outcome: null,
      effect: null,
      printedAmount: null,
      wounds: 5,
      actorWounds: 5,
      actorStress: 4,
      targetStress: 4,
      besideActorStress: [{ id: "vestal", stress: 2 }],
    });

    // 射程 2 对上距离 3 仍拒绝。高地不把射程上限再加 1。
    expect(
      use(
        "hero_skill:p148",
        {
          actor: { id: "arbalest", wounds: 0, stress: 4 },
          target: soldier,
          areaDistance: 3,
          targetAreaLower: true,
        },
        9,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "目标区域与使用者的距离不是卡面印的射程（规则书第 19 页）",
      wounds: 2,
      actorWounds: 0,
      actorStress: 4,
      damageDealt: null,
    });
    // Holy Lance 射程是 1。距离 2 同样对不上，即使目标区域更低。
    expect(
      use(
        "hero_skill:p016",
        {
          actor: { id: "crusader", wounds: 1, stress: 4 },
          target: soldier,
          areaDistance: 2,
          targetAreaLower: true,
        },
        9,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "目标区域与使用者的距离不是卡面印的射程（规则书第 19 页）",
      wounds: 2,
      actorWounds: 1,
      actorStress: 4,
      actorShuffle: null,
      damageDealt: null,
    });
    // Pistol Shot 的射程是 1-2，numeric 为 null。传入距离就整次拒绝，高地不把它拆开。
    expect(
      use(
        "hero_skill:p067",
        {
          actor: { id: "highwayman", wounds: 0, stress: 3 },
          target: soldier,
          areaDistance: 2,
          targetAreaLower: true,
        },
        9,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "射程印成区间，旁边数字的 numeric 为 null，不能核对不同距离（规则书第 19 页，R-048）",
      wounds: 2,
      actorWounds: 0,
      actorStress: 3,
      damageDealt: null,
    });
    expect(
      use(
        "hero_skill:p148",
        {
          actor: { id: "arbalest", wounds: 1, stress: 4 },
          target: soldier,
          areaDistance: 2,
          targetAreaLower: 1 as unknown as boolean,
        },
        10,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "目标区域是否比使用者低必须是布尔值",
      wounds: 2,
      actorWounds: 1,
      actorStress: 4,
      damageDealt: null,
    });
  });

  it("光照 0 到 4 让暴击阈值 +1，光照 5 不加，印刷数字不变", () => {
    const smite = card("hero_skill:p001");
    expect(smite.name).toBe("Smite");
    expect(smite.level).toBe(1);
    expect(smite.hero).toBe("CRUSADER");
    expect(smite.verification.unverified).toBe(false);
    expect(smite.printed_labels).toEqual([
      { label: "Crit", raw: "Crit 0", value: 0 },
      { label: "Acc", raw: "Acc 9", value: 9 },
    ]);
    expect(
      smite.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([13, 7]);
    expect(
      smite.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["+1"]);

    const crusader = { id: "crusader", wounds: 0, stress: 5 };
    const soldier = { id: "soldier", side: "monster" as const, wounds: 0, dodge: 0 };
    // Crit 0。不传光照时掷 1 是命中、伤害 7。光照 4 把暴击阈值抬到 1，掷 1 暴击、伤害 13。
    // +1 vs Unholy 的 numeric 为 null，不是 14，也不是 8。
    const lit = { actor: crusader, target: soldier, areaDistance: 0, light: 4 };
    const frozen = structuredClone(lit);
    expect(use("hero_skill:p001", lit, 1)).toMatchObject({
      status: "resolved",
      outcome: "crit",
      effect: "damage",
      printedAmount: 13,
      damageDealt: 13,
      wounds: 13,
      actorWounds: 0,
      actorStress: 4,
      riposteDamage: null,
      skipped: [{ code: "effect_lines" }],
    });
    expect(lit).toEqual(frozen);
    expect(
      use("hero_skill:p001", { actor: crusader, target: soldier, areaDistance: 0 }, 1),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorStress: 5,
    });
    // 4、3、1、0 都有这一项。恰好 5 没有。掷 2 仍是命中：暴击阈值只到 1。
    for (const light of [4, 3, 1, 0]) {
      expect(use("hero_skill:p001", { actor: crusader, target: soldier, light }, 1)).toMatchObject({
        outcome: "crit",
        printedAmount: 13,
        damageDealt: 13,
        wounds: 13,
        actorStress: 4,
      });
    }
    expect(use("hero_skill:p001", { actor: crusader, target: soldier, light: 5 }, 1)).toMatchObject(
      {
        outcome: "hit",
        printedAmount: 7,
        damageDealt: 7,
        wounds: 7,
        actorStress: 5,
      },
    );
    expect(use("hero_skill:p001", { actor: crusader, target: soldier, light: 4 }, 2)).toMatchObject(
      {
        outcome: "hit",
        printedAmount: 7,
        damageDealt: 7,
        wounds: 7,
        actorStress: 5,
      },
    );
    // 光照 4 不改命中阈值，仍是 Acc 9。掷 9 命中、伤害 7。光照 0 的怪物 Dodge 在后面的测试里。
    expect(use("hero_skill:p001", { actor: crusader, target: soldier, light: 4 }, 9)).toMatchObject(
      {
        outcome: "hit",
        printedAmount: 7,
        damageDealt: 7,
        wounds: 7,
        actorStress: 5,
      },
    );
    expect(
      use("hero_skill:p001", { actor: crusader, target: soldier, light: 4 }, 10),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorStress: 5,
    });
    // Dodge 20。暴击仍不减 Dodge。光照没有把这次落空的命中阈值抬上去。
    expect(
      use("hero_skill:p001", { actor: crusader, target: { ...soldier, dodge: 20 }, light: 4 }, 1),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 13,
      damageDealt: 13,
      wounds: 13,
      actorStress: 4,
    });
    expect(
      use("hero_skill:p001", { actor: crusader, target: { ...soldier, dodge: 8 }, light: 4 }, 2),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorStress: 5,
    });
    // 标记抬的是命中，不是暴击。Dodge 8、1 堆标记：掷 2 命中、伤害 7。没有标记则上面已经落空。
    expect(
      use(
        "hero_skill:p001",
        { actor: crusader, target: { ...soldier, dodge: 8, markStacks: 1 }, light: 4 },
        2,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorStress: 5,
    });
    // 1 堆减益再 +1 暴击。掷 2 变成暴击、伤害 13。防护减半后是 7，反弹按减半前的 13 取一半。
    expect(
      use(
        "hero_skill:p001",
        {
          actor: crusader,
          target: { ...soldier, debuffStacks: 1, protection: true, riposte: true },
          light: 4,
        },
        2,
      ),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 13,
      damageDealt: 7,
      riposteDamage: 7,
      wounds: 7,
      actorWounds: 7,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p001",
        { actor: { ...crusader, buffStacks: 1 }, target: soldier, light: 4 },
        2,
      ),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 13,
      damageDealt: 13,
      wounds: 13,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p001",
        { actor: { ...crusader, buffStacks: 1 }, target: soldier, light: 4 },
        3,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorStress: 5,
    });

    // 说明书 G-08（OR24-p7）：Pistol Shot Crit 1，自身已有 1 堆增益，光照 4。
    // 暴击阈值 3。掷 1–3 暴击、伤害 9；4–9 命中、伤害 5；10 落空。+2 vs 标记不加。
    const pistol = card("hero_skill:p067");
    expect(pistol.name).toBe("Pistol Shot");
    expect(pistol.level).toBe(1);
    expect(pistol.hero).toBe("HIGHWAYMAN");
    expect(pistol.verification.unverified).toBe(false);
    expect(pistol.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 1],
      ["Acc", 9],
    ]);
    expect(
      pistol.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([9, 5]);
    expect(
      pistol.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["+2", "1-2"]);
    const highwayman = { id: "highwayman", wounds: 1, stress: 5, buffStacks: 1 };
    const beside = [{ id: "vestal", stress: 2 }];
    const shot = {
      actor: highwayman,
      heroesBesideActor: beside,
      target: soldier,
      light: 4,
    };
    for (const roll of [1, 2, 3]) {
      expect(use("hero_skill:p067", shot, roll)).toMatchObject({
        status: "resolved",
        outcome: "crit",
        printedAmount: 9,
        damageDealt: 9,
        wounds: 9,
        actorStress: 4,
        besideActorStress: [{ id: "vestal", stress: 1 }],
        skipped: [{ code: "effect_lines" }],
      });
    }
    for (const roll of [4, 9]) {
      expect(use("hero_skill:p067", shot, roll)).toMatchObject({
        outcome: "hit",
        printedAmount: 5,
        damageDealt: 5,
        wounds: 5,
        actorStress: 5,
        besideActorStress: [{ id: "vestal", stress: 2 }],
      });
    }
    expect(use("hero_skill:p067", shot, 10)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorStress: 5,
      besideActorStress: [{ id: "vestal", stress: 2 }],
    });
    // 只有增益、没有光照：阈值是 2。掷 3 是命中、伤害 5。
    expect(
      use("hero_skill:p067", { actor: highwayman, heroesBesideActor: beside, target: soldier }, 3),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
      actorStress: 5,
      besideActorStress: [{ id: "vestal", stress: 2 }],
    });
    // 只有光照、没有增益：阈值是 2。掷 2 暴击、伤害 9；掷 3 命中、伤害 5。
    expect(
      use(
        "hero_skill:p067",
        { actor: { ...highwayman, buffStacks: 0 }, target: soldier, light: 4 },
        2,
      ),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 9,
      damageDealt: 9,
      wounds: 9,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p067",
        { actor: { ...highwayman, buffStacks: 0 }, target: soldier, light: 4 },
        3,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
      actorStress: 5,
    });
    // 增益、减益、光照叠在一起。阈值 4。掷 4 暴击、伤害 9；掷 5 命中、伤害 5。
    expect(
      use(
        "hero_skill:p067",
        {
          actor: highwayman,
          target: { ...soldier, debuffStacks: 1 },
          light: 4,
        },
        4,
      ),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 9,
      damageDealt: 9,
      wounds: 9,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p067",
        { actor: highwayman, target: { ...soldier, debuffStacks: 1 }, light: 4 },
        5,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
      actorStress: 5,
    });
    // 2 堆标记不加进暴击伤害。掷 2 仍是 9，不是 13。掷 3 的命中伤害仍是 5，不是 7。
    expect(
      use(
        "hero_skill:p067",
        {
          actor: { ...highwayman, buffStacks: 0 },
          target: { ...soldier, markStacks: 2 },
          light: 4,
        },
        2,
      ),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 9,
      damageDealt: 9,
      wounds: 9,
    });
    expect(
      use(
        "hero_skill:p067",
        {
          actor: { ...highwayman, buffStacks: 0 },
          target: { ...soldier, markStacks: 2 },
          light: 4,
        },
        3,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
    });
    // 光照 5 不再给暴击。1 堆增益时阈值回到 2，掷 3 是命中。
    expect(
      use("hero_skill:p067", { actor: highwayman, target: soldier, light: 5 }, 3),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
      actorStress: 5,
    });
    // 光照不加命中。掷 10 仍落空。高地才把这一掷变成命中，伤害仍是 5。
    expect(
      use("hero_skill:p067", { actor: highwayman, target: soldier, light: 4 }, 10),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorStress: 5,
    });
    expect(
      use(
        "hero_skill:p067",
        { actor: highwayman, target: soldier, light: 4, targetAreaLower: true },
        10,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 5,
      actorStress: 5,
    });

    // Battle Heal I：暴击治疗 4、命中治疗 2。友方也吃光照的暴击 +1。英雄身上的减益不加。
    const heal = card("hero_skill:p013");
    expect(heal.name).toBe("Battle Heal");
    expect(heal.level).toBe(1);
    expect(heal.verification.unverified).toBe(false);
    expect(heal.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 2],
      ["Acc", 12],
    ]);
    const vestal = { id: "vestal", wounds: 1, stress: 5 };
    const patient = {
      id: "patient",
      side: "hero" as const,
      wounds: 6,
      dodge: 11,
      stress: 3,
      debuffStacks: 4,
      markStacks: 5,
      protection: true,
      riposte: true,
    };
    // Dodge 11。没有光照时暴击阈值 2、命中阈值 1，掷 3 落空。
    expect(use("hero_skill:p013", { actor: vestal, target: patient }, 3)).toMatchObject({
      outcome: "miss",
      effect: "heal",
      printedAmount: null,
      wounds: 6,
      actorStress: 5,
      riposteDamage: null,
    });
    // 光照 4 把暴击阈值抬到 3，不看 Dodge。掷 3 暴击治疗 4，不减半，不反弹。
    expect(use("hero_skill:p013", { actor: vestal, target: patient, light: 4 }, 3)).toMatchObject({
      status: "resolved",
      outcome: "crit",
      effect: "heal",
      printedAmount: 4,
      damageDealt: null,
      riposteDamage: null,
      wounds: 2,
      actorWounds: 1,
      actorStress: 4,
      targetStress: 3,
      skipped: [{ code: "damage_or_heal_combined_marker" }],
    });
    // 减益没有把暴击阈值再抬到 4。掷 4 仍落空。
    expect(use("hero_skill:p013", { actor: vestal, target: patient, light: 4 }, 4)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      wounds: 6,
      actorStress: 5,
    });
    // 光照 5 不加暴击。Dodge 9 再 +1，命中阈值是 2。5 堆标记对英雄不加。掷 3 落空，治疗不发生。
    const bright = { ...patient, dodge: 9 };
    expect(use("hero_skill:p013", { actor: vestal, target: bright, light: 5 }, 3)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 6,
      actorStress: 5,
      riposteDamage: null,
    });
    // 暴击仍不减这 1 点 Dodge。掷 2 暴击治疗 4。
    expect(use("hero_skill:p013", { actor: vestal, target: bright, light: 5 }, 2)).toMatchObject({
      outcome: "crit",
      printedAmount: 4,
      wounds: 2,
      actorStress: 4,
    });

    // 光照 2 只抬暴击。压力仍按原来的 −1，不因为「承受压力 +1」再加。
    const tune = card("hero_skill:p122");
    expect(tune.name).toBe("Inspiring Tune");
    expect(tune.level).toBe(2);
    expect(tune.verification.unverified).toBe(false);
    expect(tune.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 2],
      ["Acc", 20],
    ]);
    const jester = { id: "jester", wounds: 1, stress: 4 };
    const ally = { id: "vestal", side: "hero" as const, wounds: 3, dodge: 0, stress: 6 };
    const company = [{ id: "crusader", stress: 2 }];
    expect(
      use(
        "hero_skill:p122",
        {
          actor: jester,
          heroesBesideActor: company,
          target: ally,
          targetInActorArea: true,
          light: 2,
        },
        3,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "crit",
      effect: "stress",
      actorStress: 2,
      targetStress: 4,
      besideActorStress: [{ id: "crusader", stress: 1 }],
      wounds: 3,
      skipped: [],
    });
    expect(
      use(
        "hero_skill:p122",
        {
          actor: jester,
          heroesBesideActor: company,
          target: ally,
          targetInActorArea: true,
        },
        3,
      ),
    ).toMatchObject({
      outcome: "hit",
      actorStress: 3,
      targetStress: 5,
      besideActorStress: [{ id: "crusader", stress: 2 }],
      wounds: 3,
    });
  });

  it("光照恰好为 5 时，英雄目标的 Dodge +1，怪物目标不加", () => {
    // Battlefield Bandage I：Crit 0、Acc 8、暴击治疗 6、命中治疗 4。Crit 0 不会先抢走命中。
    const bandage = card("hero_skill:p163");
    expect(bandage.name).toBe("Battlefield Bandage");
    expect(bandage.level).toBe(1);
    expect(bandage.hero).toBe("ARBALEST");
    expect(bandage.verification.unverified).toBe(false);
    expect(bandage.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 0],
      ["Acc", 8],
    ]);
    expect(
      bandage.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([6, 4]);
    expect(
      bandage.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["2t", "0-1"]);

    const arbalest = { id: "arbalest", wounds: 1, stress: 4, stance: "support" as const };
    const ally = { id: "crusader", side: "hero" as const, wounds: 6, dodge: 0, stress: 2 };
    const bright = { actor: arbalest, target: ally, light: 5 };
    const frozen = structuredClone(bright);
    // Dodge 0 再 +1，命中阈值是 7。掷 8 落空。不传光照时掷 8 命中、治疗 4。
    expect(use("hero_skill:p163", bright, 8)).toMatchObject({
      status: "resolved",
      outcome: "miss",
      effect: "heal",
      printedAmount: null,
      damageDealt: null,
      riposteDamage: null,
      wounds: 6,
      actorWounds: 1,
      actorStress: 4,
      targetStress: 2,
      skipped: [{ code: "damage_or_heal_combined_marker" }, { code: "effect_lines" }],
    });
    expect(bright).toEqual(frozen);
    expect(use("hero_skill:p163", { actor: arbalest, target: ally }, 8)).toMatchObject({
      outcome: "hit",
      printedAmount: 4,
      wounds: 2,
      actorWounds: 1,
      actorStress: 4,
    });
    expect(use("hero_skill:p163", bright, 7)).toMatchObject({
      outcome: "hit",
      printedAmount: 4,
      wounds: 2,
      actorStress: 4,
    });
    // 光照 4 只有暴击 +1，没有英雄 Dodge +1。掷 8 仍命中、治疗 4；掷 1 暴击、治疗 6。
    expect(use("hero_skill:p163", { actor: arbalest, target: ally, light: 4 }, 8)).toMatchObject({
      outcome: "hit",
      printedAmount: 4,
      wounds: 2,
      actorStress: 4,
    });
    expect(use("hero_skill:p163", { actor: arbalest, target: ally, light: 4 }, 1)).toMatchObject({
      outcome: "crit",
      printedAmount: 6,
      wounds: 0,
      actorStress: 3,
    });
    // 光照 0 也不给英雄 Dodge +1。掷 8 命中。2t 增益的 numeric 为 null，不另放堆。
    expect(use("hero_skill:p163", { actor: arbalest, target: ally, light: 0 }, 8)).toMatchObject({
      outcome: "hit",
      printedAmount: 4,
      wounds: 2,
      actorStress: 4,
      skipped: [{ code: "damage_or_heal_combined_marker" }, { code: "effect_lines" }],
    });
    // Dodge 7 再 +1，命中阈值是 0。Crit 0，掷 1 也落空。
    expect(
      use("hero_skill:p163", { actor: arbalest, target: { ...ally, dodge: 7 }, light: 5 }, 1),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      wounds: 6,
      actorStress: 4,
    });

    // Smite I 打的是怪物。光照 5 不加英雄 Dodge，掷 9 仍命中、伤害 7。+1 vs Unholy 不加。
    const smite = card("hero_skill:p001");
    expect(smite.name).toBe("Smite");
    expect(smite.verification.unverified).toBe(false);
    const crusader = { id: "crusader", wounds: 0, stress: 5 };
    const soldier = { id: "soldier", side: "monster" as const, wounds: 0, dodge: 0 };
    expect(use("hero_skill:p001", { actor: crusader, target: soldier, light: 5 }, 9)).toMatchObject(
      {
        status: "resolved",
        outcome: "hit",
        effect: "damage",
        printedAmount: 7,
        damageDealt: 7,
        wounds: 7,
        actorStress: 5,
        skipped: [{ code: "effect_lines" }],
      },
    );
    // 光照 0 才给怪物 Dodge +1。命中阈值是 8。掷 8 命中、伤害 7；掷 9 落空。英雄 Acc 不加。
    expect(use("hero_skill:p001", { actor: crusader, target: soldier, light: 0 }, 8)).toMatchObject(
      {
        outcome: "hit",
        printedAmount: 7,
        damageDealt: 7,
        wounds: 7,
        actorStress: 5,
      },
    );
    expect(use("hero_skill:p001", { actor: crusader, target: soldier, light: 0 }, 9)).toMatchObject(
      {
        outcome: "miss",
        printedAmount: null,
        damageDealt: null,
        wounds: 0,
        actorStress: 5,
      },
    );

    // Divine Comfort I：Crit 3、Acc 12、暴击治疗 3、命中治疗 2。自身治疗 2 落空也扣。
    const comfort = card("hero_skill:p097");
    expect(comfort.name).toBe("Divine Comfort");
    expect(comfort.level).toBe(1);
    expect(comfort.hero).toBe("VESTAL");
    expect(comfort.verification.unverified).toBe(false);
    expect(comfort.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 3],
      ["Acc", 12],
    ]);
    expect(
      comfort.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([3, 2]);
    expect(
      comfort.unlabeled_numbers.filter(
        (item) =>
          item.anchor.type === "beside_icon" &&
          item.anchor.left_icon === null &&
          item.anchor.inside_icon?.key === "heal",
      ),
    ).toEqual([
      expect.objectContaining({
        text: "2",
        numeric: 2,
      }),
    ]);
    expect(namedTargetIconCount(comfort)).toBe(3);
    const vestal = { id: "vestal", wounds: 4, stress: 5, stance: "support" as const };
    const patient = {
      id: "patient",
      side: "hero" as const,
      wounds: 5,
      dodge: 8,
      stress: 3,
      markStacks: 2,
      protection: true,
      riposte: true,
    };
    const comfortBright = {
      actor: vestal,
      target: patient,
      areaDistance: 1,
      targetsInArea: 1,
      light: 5,
    };
    // Dodge 8 再 +1，命中阈值是 3。暴击阈值也是 3，所以掷 4 落空。自身治疗 2 仍扣。
    // 标记、防护、反击对友方治疗都不改这个结果。
    expect(use("hero_skill:p097", comfortBright, 4)).toMatchObject({
      status: "resolved",
      outcome: "miss",
      effect: "heal",
      printedAmount: null,
      damageDealt: null,
      riposteDamage: null,
      wounds: 5,
      actorWounds: 2,
      actorStress: 5,
      targetStress: 3,
      skipped: [{ code: "damage_or_heal_combined_marker" }],
    });
    expect(
      use(
        "hero_skill:p097",
        {
          actor: vestal,
          target: patient,
          areaDistance: 1,
          targetsInArea: 1,
        },
        4,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 2,
      wounds: 3,
      actorWounds: 2,
      actorStress: 5,
      riposteDamage: null,
    });
    // 暴击不减 Dodge +1。掷 3 暴击治疗 3，同区暴击压力 −1。不是命中治疗 2。
    expect(use("hero_skill:p097", comfortBright, 3)).toMatchObject({
      outcome: "crit",
      printedAmount: 3,
      wounds: 2,
      actorWounds: 2,
      actorStress: 4,
    });
    // 1 堆增益把暴击阈值抬到 4。光照 5 不再另加暴击。掷 4 变成暴击治疗 3。
    expect(
      use("hero_skill:p097", { ...comfortBright, actor: { ...vestal, buffStacks: 1 } }, 4),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 3,
      wounds: 2,
      actorWounds: 2,
      actorStress: 4,
    });
    // 高地 +1 与 Dodge +1 叠在一起。Dodge 4：命中阈值是 8。掷 8 命中、治疗 2。没有高地则是 7，掷 8 落空。
    const lower = {
      actor: vestal,
      target: { ...patient, dodge: 4 },
      areaDistance: 1,
      targetsInArea: 2,
      targetAreaLower: true,
      light: 5,
    };
    expect(use("hero_skill:p097", lower, 8)).toMatchObject({
      outcome: "hit",
      printedAmount: 2,
      wounds: 3,
      actorWounds: 2,
      actorStress: 5,
    });
    expect(use("hero_skill:p097", { ...lower, targetAreaLower: false }, 8)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      wounds: 5,
      actorWounds: 2,
      actorStress: 5,
    });

    // Absolution I 的目标是 Self，使用者自己也是英雄。Crit 1、Acc 12、命中治疗 2。
    const absolution = card("hero_skill:p217");
    expect(absolution.name).toBe("Absolution");
    expect(absolution.level).toBe(1);
    expect(absolution.hero).toBe("ABOMINATION");
    expect(absolution.verification.unverified).toBe(false);
    expect(absolution.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 1],
      ["Acc", 12],
    ]);
    const abomination = { id: "abomination", wounds: 5, stress: 4 };
    const self = {
      id: "abomination",
      side: "hero" as const,
      wounds: 5,
      dodge: 9,
      stress: 4,
    };
    // 光照 4 不加 Dodge。命中阈值是 3，暴击阈值是 2。掷 3 命中、治疗 2，自身压力 −1。
    expect(use("hero_skill:p217", { actor: abomination, target: self, light: 4 }, 3)).toMatchObject(
      {
        status: "resolved",
        outcome: "hit",
        effect: "heal",
        printedAmount: 2,
        wounds: 3,
        actorWounds: 3,
        actorStress: 3,
        targetStress: 3,
        skipped: [],
      },
    );
    // 光照 5：Dodge 9 再 +1，命中阈值是 2。掷 3 落空。自身压力 −1 仍在，治疗没有。
    expect(use("hero_skill:p217", { actor: abomination, target: self, light: 5 }, 3)).toMatchObject(
      {
        outcome: "miss",
        printedAmount: null,
        wounds: 5,
        actorWounds: 5,
        actorStress: 3,
        targetStress: 3,
      },
    );
    // 掷 1 仍是暴击治疗 4。暴击压力再 −1，停在 2。不减 Dodge。
    expect(use("hero_skill:p217", { actor: abomination, target: self, light: 5 }, 1)).toMatchObject(
      {
        outcome: "crit",
        printedAmount: 4,
        wounds: 1,
        actorWounds: 1,
        actorStress: 2,
        targetStress: 2,
      },
    );

    // Inspiring Tune II：Acc 20。Dodge 17 再 +1 后，掷 3 落空。自身压力 −1，目标压力不动。
    // 没有「承受压力额外 +1」。不传光照时掷 3 命中，双方各 −1。
    const tune = card("hero_skill:p122");
    expect(tune.name).toBe("Inspiring Tune");
    expect(tune.level).toBe(2);
    expect(tune.verification.unverified).toBe(false);
    const jester = { id: "jester", wounds: 0, stress: 6 };
    const stressed = { id: "vestal", side: "hero" as const, wounds: 1, dodge: 17, stress: 6 };
    expect(
      use("hero_skill:p122", { actor: jester, target: stressed, areaDistance: 0, light: 5 }, 3),
    ).toMatchObject({
      status: "resolved",
      outcome: "miss",
      effect: "stress",
      actorStress: 5,
      targetStress: 6,
      wounds: 1,
      skipped: [],
    });
    expect(
      use("hero_skill:p122", { actor: jester, target: stressed, areaDistance: 0 }, 3),
    ).toMatchObject({
      outcome: "hit",
      actorStress: 5,
      targetStress: 5,
      wounds: 1,
    });
  });

  it("光照 5 不解开缺 stats 行的技能，距离不对也不因为 Dodge 放行", () => {
    const vestal = { id: "vestal", wounds: 4, stress: 5 };
    const patient = { id: "patient", side: "hero" as const, wounds: 5, dodge: 0, stress: 3 };
    // Divine Comfort I 射程是 1。距离 2 整次拒绝，自身治疗 2 也不发生。
    expect(
      use("hero_skill:p097", { actor: vestal, target: patient, areaDistance: 2, light: 5 }, 1),
    ).toMatchObject({
      status: "refused",
      reason: "目标区域与使用者的距离不是卡面印的射程（规则书第 19 页）",
      outcome: null,
      effect: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 5,
      actorWounds: 4,
      actorStress: 5,
      targetStress: 3,
    });

    // Inspiring Cry I 的 stats 行是空的。效果行上的光照「+1」numeric 为 null，不能当成 Dodge 或光照 5。
    const cry = card("hero_skill:p019");
    expect(cry.name).toBe("Inspiring Cry");
    expect(cry.level).toBe(1);
    expect(cry.hero).toBe("CRUSADER");
    expect(cry.verification.unverified).toBe(false);
    expect(cry.stats_line).toBeNull();
    expect(cry.printed_labels).toEqual([]);
    expect(
      cry.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["+1"]);
    expect(
      cry.effect_lines[1]
        ?.filter((segment) => segment.type === "icon")
        .map((segment) => segment.icon.key),
    ).toEqual(["target_effects", "damage_or_heal_combined_marker", "heal", "stress", "light"]);
    expect(
      use(
        "hero_skill:p019",
        {
          actor: { id: "crusader", wounds: 4, stress: 4 },
          target: patient,
          light: 5,
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "stats_line 没有已命名的 damage 或 heal",
      outcome: null,
      effect: null,
      printedAmount: null,
      wounds: 5,
      actorWounds: 4,
      actorStress: 4,
      targetStress: 3,
    });

    // 说明书 G-07 的 Zealous Accusation I 仍不能结算。光照 5 不从技能名猜伤害。
    const zealous = card("hero_skill:p004");
    expect(zealous.name).toBe("Zealous Accusation");
    expect(zealous.level).toBe(1);
    expect(zealous.verification.unverified).toBe(false);
    expect(
      zealous.stats_line
        ?.filter((segment) => segment.type === "text")
        .map((segment) => segment.text.trim()),
    ).toEqual(["Zealous Accusation I"]);
    expect(
      use(
        "hero_skill:p004",
        {
          actor: { id: "crusader", wounds: 1, stress: 4 },
          target: { id: "soldier", side: "monster", wounds: 2, dodge: 0 },
          light: 5,
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "stats_line 没有已命名的 damage 或 heal",
      outcome: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 2,
      actorWounds: 1,
      actorStress: 4,
    });
  });

  it("非法光照整次拒绝；卡面光照 +1、增益回合和缺 stats 行的技能仍不结算", () => {
    const soldier = { id: "soldier", side: "monster" as const, wounds: 2, dodge: 0 };
    const crusader = { id: "crusader", wounds: 1, stress: 4 };
    for (const light of [6, -1, 1.5]) {
      expect(use("hero_skill:p001", { actor: crusader, target: soldier, light }, 1)).toMatchObject({
        status: "refused",
        reason: "光照必须是 0 到 5 的整数",
        outcome: null,
        effect: null,
        printedAmount: null,
        damageDealt: null,
        wounds: 2,
        actorWounds: 1,
        actorStress: 4,
      });
    }
    expect(
      use(
        "hero_skill:p001",
        { actor: crusader, target: soldier, light: null as unknown as number },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "光照必须是 0 到 5 的整数",
      wounds: 2,
      actorWounds: 1,
      actorStress: 4,
      damageDealt: null,
    });

    // Illumination I 的效果行有已命名光照和「+1」，numeric 为 null。不传入光照时，
    // Crit 0 的掷 1 仍是命中、伤害 2，不是暴击 4，也不是 3。
    const illumination = card("hero_skill:p100");
    expect(illumination.name).toBe("Illumination");
    expect(illumination.level).toBe(1);
    expect(illumination.hero).toBe("VESTAL");
    expect(illumination.verification.unverified).toBe(false);
    expect(illumination.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 0],
      ["Acc", 9],
    ]);
    expect(
      illumination.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([4, 2]);
    expect(
      illumination.unlabeled_numbers
        .filter((item) => item.numeric === null)
        .map((item) => item.text),
    ).toEqual(["1t", "+1", "1-2"]);
    expect(
      illumination.effect_lines[0]
        ?.filter((segment) => segment.type === "icon")
        .map((segment) => segment.icon.key),
    ).toEqual(["target_effects", "debuff", "light"]);
    const vestal = { id: "vestal", wounds: 0, stress: 2 };
    expect(use("hero_skill:p100", { actor: vestal, target: soldier }, 1)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 2,
      damageDealt: 2,
      wounds: 4,
      actorStress: 2,
      skipped: [{ code: "effect_lines" }],
    });
    // 传入光照 4 才暴击，伤害是印刷的 4。卡面 +1 不加进伤害，1t 也不放减益。
    expect(use("hero_skill:p100", { actor: vestal, target: soldier, light: 4 }, 1)).toMatchObject({
      outcome: "crit",
      printedAmount: 4,
      damageDealt: 4,
      wounds: 6,
      actorStress: 1,
      skipped: [{ code: "effect_lines" }],
    });
    // 光照 5 不暴击。卡面 +1 不能代替光照 4。
    expect(use("hero_skill:p100", { actor: vestal, target: soldier, light: 5 }, 1)).toMatchObject({
      outcome: "hit",
      printedAmount: 2,
      damageDealt: 2,
      wounds: 4,
      actorStress: 2,
    });
    // Dodge 9。暴击阈值是 1，命中阈值是 0。掷 2 落空。卡面 +1 不加 Acc。
    expect(
      use("hero_skill:p100", { actor: vestal, target: { ...soldier, dodge: 9 }, light: 4 }, 2),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 2,
      actorStress: 2,
    });

    // Tracking Shot 的自身增益是 3t，numeric 为 null，不放新堆。光照仍只改这一次的暴击。
    const tracking = card("hero_skill:p076");
    expect(tracking.name).toBe("Tracking Shot");
    expect(tracking.level).toBe(1);
    expect(tracking.hero).toBe("HIGHWAYMAN");
    expect(tracking.verification.unverified).toBe(false);
    expect(tracking.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 0],
      ["Acc", 10],
    ]);
    expect(
      tracking.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([3, 2]);
    expect(
      tracking.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["3t", "1-2"]);
    expect(use("hero_skill:p076", { actor: vestal, target: soldier, light: 4 }, 1)).toMatchObject({
      status: "resolved",
      outcome: "crit",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 5,
      actorStress: 1,
      skipped: [{ code: "effect_lines" }],
    });
    expect(use("hero_skill:p076", { actor: vestal, target: soldier, light: 4 }, 2)).toMatchObject({
      outcome: "hit",
      printedAmount: 2,
      damageDealt: 2,
      wounds: 4,
      actorStress: 2,
    });
    expect(use("hero_skill:p076", { actor: vestal, target: soldier }, 1)).toMatchObject({
      outcome: "hit",
      printedAmount: 2,
      damageDealt: 2,
      wounds: 4,
      actorStress: 2,
    });

    // 说明书 G-07 的 Zealous Accusation I：Crit 0、Acc 9、暴击 9、命中 5。
    // stats 行只有技能名，没有已命名的伤害或目标图标，不能靠 front_icons 猜，整次拒绝。
    const zealous = card("hero_skill:p004");
    expect(zealous.name).toBe("Zealous Accusation");
    expect(zealous.level).toBe(1);
    expect(zealous.hero).toBe("CRUSADER");
    expect(zealous.verification.unverified).toBe(false);
    expect(zealous.printed_labels).toEqual([
      { label: "Crit", raw: "Crit 0", value: 0 },
      { label: "Acc", raw: "Acc 9", value: 9 },
    ]);
    expect(
      zealous.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([9, 5]);
    expect(
      zealous.stats_line
        ?.filter((segment) => segment.type === "icon")
        .map((segment) => segment.icon.key),
    ).toEqual([]);
    expect(use("hero_skill:p004", { actor: crusader, target: soldier, light: 4 }, 1)).toMatchObject(
      {
        status: "refused",
        reason: "stats_line 没有已命名的 damage 或 heal",
        outcome: null,
        effect: null,
        printedAmount: null,
        damageDealt: null,
        wounds: 2,
        actorWounds: 1,
        actorStress: 4,
        actorForm: null,
      },
    );

    // 没有 Acc 的变身不掷骰。光照 4 不造出暴击。非法光照则形态也不记。
    expect(
      use(
        "hero_skill:p220",
        {
          actor: { id: "abomination", wounds: 5, stress: 3 },
          target: soldier,
          light: 4,
        },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: null,
      effect: null,
      actorForm: "beast",
      wounds: 2,
      actorWounds: 5,
      actorStress: 3,
    });
    expect(
      use(
        "hero_skill:p220",
        {
          actor: { id: "abomination", wounds: 5, stress: 3 },
          target: soldier,
          light: 6,
        },
        1,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "光照必须是 0 到 5 的整数",
      outcome: null,
      actorForm: null,
      wounds: 2,
      actorWounds: 5,
      actorStress: 3,
    });
  });

  it("光照恰好为 0 时，怪物目标的 Dodge +1，英雄目标和英雄 Acc 都不加", () => {
    // Smite I：Crit 0、Acc 9、暴击伤害 13、命中伤害 7。光照 0 还有暴击 +1。
    const smite = card("hero_skill:p001");
    expect(smite.name).toBe("Smite");
    expect(smite.level).toBe(1);
    expect(smite.hero).toBe("CRUSADER");
    expect(smite.verification.unverified).toBe(false);
    expect(smite.printed_labels).toEqual([
      { label: "Crit", raw: "Crit 0", value: 0 },
      { label: "Acc", raw: "Acc 9", value: 9 },
    ]);
    expect(
      smite.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([13, 7]);
    expect(
      smite.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["+1"]);

    const bone = monster("monster_medium:p001");
    expect(bone).toEqual({
      id: "monster_medium:p001",
      name: "Bone Soldier",
      level: 1,
      life: 7,
      dodge: 0,
      unverified: false,
      resistances: [],
    });
    const crusader = { id: "crusader", wounds: 0, stress: 5 };
    const soldier = {
      id: "soldier",
      side: "monster" as const,
      wounds: 0,
      dodge: 0,
      life: bone.life,
    };
    const dark = { actor: crusader, target: soldier, light: 0 };
    const frozen = structuredClone(dark);
    // Dodge 0 再 +1，命中阈值是 8。暴击阈值是 1。掷 8 命中、伤害 7，伤口到 Life 7。
    // 若英雄 Acc 也 +1，阈值会回到 9，这一掷仍是命中，但掷 9 不会落空。
    expect(use("hero_skill:p001", dark, 8)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorWounds: 0,
      actorStress: 5,
      targetDead: true,
      riposteDamage: null,
      skipped: [{ code: "effect_lines" }],
    });
    expect(dark).toEqual(frozen);
    expect(use("hero_skill:p001", dark, 9)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorStress: 5,
      targetDead: false,
    });
    // 不传光照就没有这 1 点 Dodge。掷 9 命中、伤害 7。+1 vs Unholy 的 numeric 为 null，不是 8。
    expect(use("hero_skill:p001", { actor: crusader, target: soldier }, 9)).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorStress: 5,
      targetDead: true,
    });
    // 光照 1 只有暴击 +1，没有怪物 Dodge。掷 9 仍命中。光照 5 也不加怪物 Dodge。
    expect(use("hero_skill:p001", { actor: crusader, target: soldier, light: 1 }, 9)).toMatchObject(
      {
        outcome: "hit",
        printedAmount: 7,
        damageDealt: 7,
        wounds: 7,
        actorStress: 5,
        targetDead: true,
      },
    );
    expect(use("hero_skill:p001", { actor: crusader, target: soldier, light: 5 }, 9)).toMatchObject(
      {
        outcome: "hit",
        printedAmount: 7,
        damageDealt: 7,
        wounds: 7,
        actorStress: 5,
      },
    );
    // 暴击不减这 1 点 Dodge。Dodge 20 时掷 1 仍暴击、伤害 13。没有光照则 Crit 0，掷 1 落空。
    expect(
      use("hero_skill:p001", { actor: crusader, target: { ...soldier, dodge: 20 }, light: 0 }, 1),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 13,
      damageDealt: 13,
      wounds: 13,
      actorStress: 4,
      targetDead: true,
    });
    expect(
      use("hero_skill:p001", { actor: crusader, target: { ...soldier, dodge: 20 } }, 1),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorStress: 5,
      targetDead: false,
    });
    // 防护减半后是 4，不到 Life 7。反弹按减半前的 7 取一半。落空不反弹。
    expect(
      use(
        "hero_skill:p001",
        {
          actor: crusader,
          target: { ...soldier, protection: true, riposte: true },
          light: 0,
        },
        8,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 4,
      riposteDamage: 4,
      wounds: 4,
      actorWounds: 4,
      actorStress: 5,
      targetDead: false,
    });
    expect(
      use(
        "hero_skill:p001",
        {
          actor: crusader,
          target: { ...soldier, protection: true, riposte: true },
          light: 0,
        },
        9,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      riposteDamage: null,
      wounds: 0,
      actorWounds: 0,
      actorStress: 5,
      targetDead: false,
    });
    // 1 堆标记把命中阈值抬回 9。掷 9 命中、伤害仍是 7。没有标记则上面已经落空。
    expect(
      use(
        "hero_skill:p001",
        { actor: crusader, target: { ...soldier, markStacks: 1 }, light: 0 },
        9,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorStress: 5,
      targetDead: true,
    });
    // 1 堆增益只加暴击。掷 2 暴击、伤害 13；掷 9 仍落空，增益不加 Acc。
    expect(
      use(
        "hero_skill:p001",
        { actor: { ...crusader, buffStacks: 1 }, target: soldier, light: 0 },
        2,
      ),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 13,
      damageDealt: 13,
      wounds: 13,
      actorStress: 4,
    });
    expect(
      use(
        "hero_skill:p001",
        { actor: { ...crusader, buffStacks: 1 }, target: soldier, light: 0 },
        9,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorStress: 5,
    });

    // Holy Lance I：Crit 1、Acc 9、射程 1。高地 +1 和怪物 Dodge +1 叠在一起，阈值是 9。
    const lance = card("hero_skill:p016");
    expect(lance.name).toBe("Holy Lance");
    expect(lance.level).toBe(1);
    expect(lance.verification.unverified).toBe(false);
    expect(lance.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 1],
      ["Acc", 9],
    ]);
    expect(
      lance.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["+1"]);
    const lanceDark = {
      actor: crusader,
      target: { id: "soldier", side: "monster" as const, wounds: 0, dodge: 0 },
      areaDistance: 1,
      light: 0,
    };
    expect(use("hero_skill:p016", lanceDark, 9)).toMatchObject({
      status: "resolved",
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorStress: 5,
      actorShuffle: { direction: "pull", distance: 1 },
      targetShuffle: null,
      skipped: [{ code: "effect_lines" }],
    });
    expect(use("hero_skill:p016", { ...lanceDark, targetAreaLower: true }, 9)).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorStress: 5,
      actorShuffle: { direction: "pull", distance: 1 },
    });
    // 高地抵消 Dodge 之后，掷 10 仍落空。标记再 +1 才命中。+1 vs Unholy 不加进 7。
    expect(use("hero_skill:p016", { ...lanceDark, targetAreaLower: true }, 10)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorShuffle: { direction: "pull", distance: 1 },
      actorStress: 5,
    });
    expect(
      use(
        "hero_skill:p016",
        {
          ...lanceDark,
          target: { ...lanceDark.target, markStacks: 1 },
          targetAreaLower: true,
        },
        10,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 7,
      actorStress: 5,
      actorShuffle: { direction: "pull", distance: 1 },
    });
    // 暴击阈值是 2，不减 Dodge。掷 2 暴击、伤害 13。
    expect(
      use("hero_skill:p016", { ...lanceDark, target: { ...lanceDark.target, dodge: 20 } }, 2),
    ).toMatchObject({
      outcome: "crit",
      printedAmount: 13,
      damageDealt: 13,
      wounds: 13,
      actorStress: 4,
      actorShuffle: { direction: "pull", distance: 1 },
    });

    // Battlefield Bandage I 的目标是英雄。光照 0 不加怪物 Dodge。Acc 8，掷 8 命中、治疗 4。
    const bandage = card("hero_skill:p163");
    expect(bandage.name).toBe("Battlefield Bandage");
    expect(bandage.level).toBe(1);
    expect(bandage.hero).toBe("ARBALEST");
    expect(bandage.verification.unverified).toBe(false);
    expect(bandage.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 0],
      ["Acc", 8],
    ]);
    const arbalest = { id: "arbalest", wounds: 1, stress: 4 };
    const ally = { id: "crusader", side: "hero" as const, wounds: 6, dodge: 0, stress: 2 };
    expect(use("hero_skill:p163", { actor: arbalest, target: ally, light: 0 }, 8)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "heal",
      printedAmount: 4,
      wounds: 2,
      actorWounds: 1,
      actorStress: 4,
      targetStress: 2,
    });
    expect(use("hero_skill:p163", { actor: arbalest, target: ally, light: 0 }, 9)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      wounds: 6,
      actorStress: 4,
    });
    // 暴击阈值是 1。掷 1 暴击治疗 6。不是因为怪物 Dodge 把掷 8 变成落空。
    expect(use("hero_skill:p163", { actor: arbalest, target: ally, light: 0 }, 1)).toMatchObject({
      outcome: "crit",
      printedAmount: 6,
      wounds: 0,
      actorStress: 3,
    });

    // Absolution I 的目标是 Self，使用者也是英雄。Dodge 9，命中阈值仍是 3。掷 3 命中、治疗 2。
    const absolution = card("hero_skill:p217");
    expect(absolution.name).toBe("Absolution");
    expect(absolution.level).toBe(1);
    expect(absolution.verification.unverified).toBe(false);
    expect(absolution.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 1],
      ["Acc", 12],
    ]);
    const abomination = { id: "abomination", wounds: 5, stress: 4 };
    const self = {
      id: "abomination",
      side: "hero" as const,
      wounds: 5,
      dodge: 9,
      stress: 4,
    };
    expect(use("hero_skill:p217", { actor: abomination, target: self, light: 0 }, 3)).toMatchObject(
      {
        status: "resolved",
        outcome: "hit",
        effect: "heal",
        printedAmount: 2,
        wounds: 3,
        actorWounds: 3,
        actorStress: 3,
        targetStress: 3,
        skipped: [],
      },
    );
    // 暴击阈值是 2。掷 1 暴击治疗 4，暴击压力再 −1。光照 0 不给减压力再加 1。
    expect(use("hero_skill:p217", { actor: abomination, target: self, light: 0 }, 1)).toMatchObject(
      {
        outcome: "crit",
        printedAmount: 4,
        wounds: 1,
        actorWounds: 1,
        actorStress: 2,
        targetStress: 2,
      },
    );
  });

  it("光照 0 不解开缺 stats 行、区间射程和卡面光照 +1", () => {
    const crusader = { id: "crusader", wounds: 1, stress: 4 };
    const soldier = { id: "soldier", side: "monster" as const, wounds: 2, dodge: 0 };
    // 说明书 G-07 的 Zealous Accusation I。stats 行只有技能名。光照 0 不从技能名猜伤害。
    const zealous = card("hero_skill:p004");
    expect(zealous.name).toBe("Zealous Accusation");
    expect(zealous.level).toBe(1);
    expect(zealous.hero).toBe("CRUSADER");
    expect(zealous.verification.unverified).toBe(false);
    expect(zealous.printed_labels).toEqual([
      { label: "Crit", raw: "Crit 0", value: 0 },
      { label: "Acc", raw: "Acc 9", value: 9 },
    ]);
    expect(
      zealous.unlabeled_numbers
        .filter((item) => item.anchor.type === "printed_label")
        .map((item) => item.numeric),
    ).toEqual([9, 5]);
    expect(
      zealous.stats_line
        ?.filter((segment) => segment.type === "text")
        .map((segment) => segment.text.trim()),
    ).toEqual(["Zealous Accusation I"]);
    expect(use("hero_skill:p004", { actor: crusader, target: soldier, light: 0 }, 1)).toMatchObject(
      {
        status: "refused",
        reason: "stats_line 没有已命名的 damage 或 heal",
        outcome: null,
        effect: null,
        printedAmount: null,
        damageDealt: null,
        wounds: 2,
        actorWounds: 1,
        actorStress: 4,
      },
    );

    // Smite 射程是 0。同一区域不能再低，光照 0 的 Dodge 也不让这次高地放行。
    expect(
      use(
        "hero_skill:p001",
        {
          actor: crusader,
          target: soldier,
          targetAreaLower: true,
          light: 0,
        },
        8,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "卡面射程是 0，目标在使用者自己的区域，高地不能让命中阈值 +1（规则书第 19、25 页）",
      outcome: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 2,
      actorWounds: 1,
      actorStress: 4,
    });

    // Pistol Shot I 的射程是 1-2，numeric 为 null。传入距离就拒绝，光照 0 不把区间拆开。
    const pistol = card("hero_skill:p067");
    expect(pistol.name).toBe("Pistol Shot");
    expect(pistol.level).toBe(1);
    expect(pistol.verification.unverified).toBe(false);
    expect(
      pistol.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["+2", "1-2"]);
    expect(
      use(
        "hero_skill:p067",
        {
          actor: { id: "highwayman", wounds: 0, stress: 3 },
          target: soldier,
          areaDistance: 2,
          light: 0,
        },
        8,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "射程印成区间，旁边数字的 numeric 为 null，不能核对不同距离（规则书第 19 页，R-048）",
      outcome: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 2,
      actorWounds: 0,
      actorStress: 3,
    });
    // 不传距离时可以结算。Crit 1、Acc 9、暴击 9、命中 5。光照 0 的命中阈值是 8。
    // 掷 8 命中、伤害 5；掷 9 落空。+2 vs 标记不加。
    expect(
      use(
        "hero_skill:p067",
        { actor: { id: "highwayman", wounds: 0, stress: 3 }, target: soldier, light: 0 },
        8,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 7,
      actorStress: 3,
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      use(
        "hero_skill:p067",
        { actor: { id: "highwayman", wounds: 0, stress: 3 }, target: soldier, light: 0 },
        9,
      ),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 2,
      actorStress: 3,
    });

    // Illumination I 的效果行有光照「+1」，numeric 为 null。不把它加成英雄 Acc，也不另加 Dodge。
    const illumination = card("hero_skill:p100");
    expect(illumination.name).toBe("Illumination");
    expect(illumination.level).toBe(1);
    expect(illumination.verification.unverified).toBe(false);
    expect(
      illumination.unlabeled_numbers
        .filter((item) => item.numeric === null)
        .map((item) => item.text),
    ).toEqual(["1t", "+1", "1-2"]);
    const vestal = { id: "vestal", wounds: 0, stress: 2 };
    expect(use("hero_skill:p100", { actor: vestal, target: soldier, light: 0 }, 8)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 2,
      damageDealt: 2,
      wounds: 4,
      actorStress: 2,
      skipped: [{ code: "effect_lines" }],
    });
    expect(use("hero_skill:p100", { actor: vestal, target: soldier, light: 0 }, 9)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 2,
      actorStress: 2,
    });
    // 不传光照时，卡面 +1 不会把光照当成 0。掷 9 命中、伤害 2，不是落空，也不是 3。
    expect(use("hero_skill:p100", { actor: vestal, target: soldier }, 9)).toMatchObject({
      outcome: "hit",
      printedAmount: 2,
      damageDealt: 2,
      wounds: 4,
      actorStress: 2,
    });
  });

  it("目标有 Shuffle 抗性时，印出的 Push 和 Pull 少移 1", () => {
    const defender = monster("monster_medium:p010");
    expect(defender.name).toBe("Bone Defender");
    expect(defender.level).toBe(1);
    expect(defender.unverified).toBe(false);
    expect(defender.life).toBe(10);
    expect(defender.dodge).toBe(0);
    expect(defender.resistances).toEqual([{ key: "shuffle_resist", naming: "confirmed" }]);

    const shot = card("hero_skill:p070");
    expect(shot.name).toBe("Point Blank Shot");
    expect(shot.level).toBe(1);
    expect(shot.hero).toBe("HIGHWAYMAN");
    expect(shot.verification.unverified).toBe(false);
    expect(shot.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 1],
      ["Acc", 10],
    ]);
    const highwayman = { id: "highwayman", wounds: 0, stress: 4 };
    const bone = {
      id: defender.id,
      side: "monster" as const,
      wounds: 0,
      dodge: 0,
      life: defender.life,
      shuffleResist: true,
    };
    const pushed = { actor: highwayman, target: bone, areaDistance: 0 };
    const frozen = structuredClone(pushed);
    // 自身 Push 1 不减。目标 Push 1 少 1，记成 0。掷 10 命中、伤害 9，伤口 9，还没到 Life 10。
    expect(use("hero_skill:p070", pushed, 10)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 9,
      damageDealt: 9,
      wounds: 9,
      actorWounds: 0,
      actorStress: 4,
      targetDead: false,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: { direction: "push", distance: 0 },
      skipped: [],
    });
    expect(pushed).toEqual(frozen);
    // 不传抗性时目标仍是印刷的 Push 1。
    expect(
      use(
        "hero_skill:p070",
        {
          actor: highwayman,
          target: { id: defender.id, side: "monster", wounds: 0, dodge: 0, life: defender.life },
          areaDistance: 0,
        },
        10,
      ),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 9,
      damageDealt: 9,
      wounds: 9,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: { direction: "push", distance: 1 },
    });
    // 暴击不把被抗性减掉的 1 加回来。伤害 15，伤口达到 Life，死亡。自身仍是 Push 1。
    expect(use("hero_skill:p070", pushed, 1)).toMatchObject({
      outcome: "crit",
      printedAmount: 15,
      damageDealt: 15,
      wounds: 15,
      actorStress: 3,
      targetDead: true,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: { direction: "push", distance: 0 },
    });
    // 落空没有目标位移。抗性不造出一个距离 0 的 Push。自身 Push 1 仍在。
    expect(use("hero_skill:p070", { ...pushed, target: { ...bone, dodge: 5 } }, 10)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      targetDead: false,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: null,
    });
    // 防护把伤害 9 减半成 5。抗性仍只改距离，不改伤害。
    expect(
      use("hero_skill:p070", { ...pushed, target: { ...bone, protection: true } }, 10),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 9,
      damageDealt: 5,
      wounds: 5,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: { direction: "push", distance: 0 },
    });
    // 光照 0 另给怪物 Dodge +1。掷 9 仍命中、伤害 9，目标距离仍是 0。掷 10 落空，目标位移是 null。
    expect(use("hero_skill:p070", { ...pushed, light: 0 }, 9)).toMatchObject({
      outcome: "hit",
      printedAmount: 9,
      damageDealt: 9,
      wounds: 9,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: { direction: "push", distance: 0 },
    });
    expect(use("hero_skill:p070", { ...pushed, light: 0 }, 10)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: null,
    });

    // Point Blank Shot II 的目标仍是 Push 1，少移后是 0。命中伤害是 12，不是 I 级的 9。
    const shotTwo = card("hero_skill:p071");
    expect(shotTwo.name).toBe("Point Blank Shot");
    expect(shotTwo.level).toBe(2);
    expect(shotTwo.verification.unverified).toBe(false);
    expect(shotTwo.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 1],
      ["Acc", 11],
    ]);
    expect(
      use("hero_skill:p071", { actor: highwayman, target: bone, areaDistance: 0 }, 10),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 12,
      damageDealt: 12,
      wounds: 12,
      targetDead: true,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: { direction: "push", distance: 0 },
    });

    // Bola I：自身 Push 1，目标 Push 2。抗性只把目标减成 1。暴击不改距离。
    const bola = card("hero_skill:p157");
    expect(bola.name).toBe("Bola");
    expect(bola.level).toBe(1);
    expect(bola.hero).toBe("ARBALEST");
    expect(bola.verification.unverified).toBe(false);
    const arbalest = { id: "arbalest", wounds: 0, stress: 2 };
    expect(use("hero_skill:p157", { actor: arbalest, target: bone }, 5)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 3,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: { direction: "push", distance: 1 },
      skipped: [],
    });
    expect(use("hero_skill:p157", { actor: arbalest, target: bone }, 1)).toMatchObject({
      outcome: "crit",
      printedAmount: 6,
      damageDealt: 6,
      wounds: 6,
      actorStress: 1,
      actorShuffle: { direction: "push", distance: 1 },
      targetShuffle: { direction: "push", distance: 1 },
    });

    // Daemon’s Pull I：只有目标 Pull 2。抗性后是 1，不是 0：抗性少移 1，不是免疫。
    const pull = card("hero_skill:p208");
    expect(pull.name).toBe("Daemon’s Pull");
    expect(pull.level).toBe(1);
    expect(pull.hero).toBe("OCCULTIST");
    expect(pull.verification.unverified).toBe(false);
    expect(use("hero_skill:p208", { target: bone }, 5)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 3,
      actorWounds: null,
      actorShuffle: null,
      targetShuffle: { direction: "pull", distance: 1 },
      skipped: [],
    });
    expect(use("hero_skill:p208", { target: bone }, 1)).toMatchObject({
      outcome: "crit",
      printedAmount: 4,
      damageDealt: 4,
      wounds: 4,
      targetShuffle: { direction: "pull", distance: 1 },
    });
    expect(use("hero_skill:p208", { target: bone }, 10)).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 0,
      targetShuffle: null,
    });
    expect(use("hero_skill:p208", { target: { ...bone, shuffleResist: false } }, 5)).toMatchObject({
      outcome: "hit",
      printedAmount: 3,
      damageDealt: 3,
      targetShuffle: { direction: "pull", distance: 2 },
    });

    // Daemon’s Pull II 的目标仍是 Pull 2，少移后是 1。命中伤害是 4。
    const pullTwo = card("hero_skill:p209");
    expect(pullTwo.name).toBe("Daemon’s Pull");
    expect(pullTwo.level).toBe(2);
    expect(pullTwo.verification.unverified).toBe(false);
    expect(pullTwo.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 1],
      ["Acc", 10],
    ]);
    expect(use("hero_skill:p209", { target: bone }, 5)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 4,
      damageDealt: 4,
      wounds: 4,
      actorShuffle: null,
      targetShuffle: { direction: "pull", distance: 1 },
    });
  });

  it("自身位移不吃目标的抗性；和眩晕写在一行的 Push 仍不抽出", () => {
    const defender = monster("monster_medium:p010");
    const bone = {
      id: defender.id,
      side: "monster" as const,
      wounds: 3,
      dodge: 0,
      shuffleResist: true,
    };
    // Holy Lance I 只有自身 Pull 1。目标有抗性也不减这 1，也不造出目标位移。
    // +1 vs Unholy 的 numeric 为 null，伤害仍是 7。
    const lance = card("hero_skill:p016");
    expect(lance.name).toBe("Holy Lance");
    expect(lance.level).toBe(1);
    expect(lance.hero).toBe("CRUSADER");
    expect(lance.verification.unverified).toBe(false);
    expect(
      use(
        "hero_skill:p016",
        { actor: { id: "crusader", wounds: 1, stress: 2 }, target: bone, areaDistance: 1 },
        2,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 10,
      actorWounds: 1,
      actorShuffle: { direction: "pull", distance: 1 },
      targetShuffle: null,
      skipped: [{ code: "effect_lines" }],
    });

    // Uppercut I 的 Push 2 和眩晕 1t 在同一行。1t 的 numeric 为 null，抗性不能把这行拆开。
    const uppercut = card("hero_skill:p052");
    expect(uppercut.name).toBe("Uppercut");
    expect(uppercut.level).toBe(1);
    expect(uppercut.hero).toBe("BOUNTY HUNTER");
    expect(uppercut.verification.unverified).toBe(false);
    expect(uppercut.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 0],
      ["Acc", 9],
    ]);
    expect(
      uppercut.effect_lines[0]
        ?.filter((segment) => segment.type === "icon")
        .map((segment) => segment.icon.key),
    ).toEqual(["target_effects", "stun", "shuffle"]);
    expect(
      uppercut.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["1t"]);
    expect(use("hero_skill:p052", { target: bone, areaDistance: 0 }, 5)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 6,
      actorShuffle: null,
      targetShuffle: null,
      skipped: [{ code: "effect_lines" }],
    });

    // 抗性不是布尔值时整次拒绝，伤口和位移都不改。
    expect(
      use(
        "hero_skill:p070",
        {
          actor: { id: "highwayman", wounds: 0, stress: 4 },
          target: { ...bone, shuffleResist: 1 as unknown as boolean },
          areaDistance: 0,
        },
        10,
      ),
    ).toMatchObject({
      status: "refused",
      reason: "Shuffle 抗性必须是布尔值",
      outcome: null,
      effect: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 3,
      actorWounds: 0,
      actorStress: 4,
      actorShuffle: null,
      targetShuffle: null,
    });
  });

  it("光照 2–1 的额外压力还不加：减压力不是承受压力，加压力的数字是 null", () => {
    // R-002：光照 1 = Crit +1，并且英雄每次承受压力额外 +1。光照 0 把这项累加上去。
    // 减压力不是承受压力。Inspiring Tune II 的自身和目标都是已命名的 −1。
    const tune = card("hero_skill:p122");
    expect(tune.name).toBe("Inspiring Tune");
    expect(tune.level).toBe(2);
    expect(tune.hero).toBe("JESTER");
    expect(tune.verification.unverified).toBe(false);
    expect(tune.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 2],
      ["Acc", 20],
    ]);
    expect(
      tune.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "stress",
        )
        .map((item) => item.numeric),
    ).toEqual([-1, -1]);
    const jester = { id: "jester", wounds: 1, stress: 4 };
    const ally = { id: "vestal", side: "hero" as const, wounds: 3, dodge: 0, stress: 6 };
    const company = [{ id: "crusader", stress: 2 }];
    const tuned = {
      actor: jester,
      heroesBesideActor: company,
      target: ally,
      targetInActorArea: true,
      areaDistance: 0,
      targetsInArea: 1,
    };
    // 光照 1 把暴击阈值抬到 3。掷 3 暴击：自身 −1 再因打出暴击 −1，变成 2。
    // 目标 −1，又在同一区域再 −1，变成 4。身边英雄 2 变成 1。不是再额外 +1。
    expect(use("hero_skill:p122", { ...tuned, light: 1 }, 3)).toMatchObject({
      status: "resolved",
      outcome: "crit",
      effect: "stress",
      printedAmount: null,
      wounds: 3,
      actorWounds: 1,
      actorStress: 2,
      targetStress: 4,
      besideActorStress: [{ id: "crusader", stress: 1 }],
      skipped: [],
    });
    // 掷 4 是命中，不是暴击。只有印刷的 −1：自身 3，目标 5，身边仍是 2。
    // 若把这次减压力当成承受压力再 +1，双方会停在 4 和 6。
    expect(use("hero_skill:p122", { ...tuned, light: 1 }, 4)).toMatchObject({
      outcome: "hit",
      actorStress: 3,
      targetStress: 5,
      besideActorStress: [{ id: "crusader", stress: 2 }],
      wounds: 3,
    });
    // 光照 3 只有 Crit +1，没有「承受压力 +1」。命中时的压力和光照 1 相同。
    expect(use("hero_skill:p122", { ...tuned, light: 3 }, 4)).toMatchObject({
      outcome: "hit",
      actorStress: 3,
      targetStress: 5,
      besideActorStress: [{ id: "crusader", stress: 2 }],
    });
    // 光照 0 仍累加 Crit +1。目标是英雄，怪物 Dodge 不加。掷 4 仍是命中，压力仍只 −1。
    expect(use("hero_skill:p122", { ...tuned, light: 0 }, 4)).toMatchObject({
      outcome: "hit",
      actorStress: 3,
      targetStress: 5,
      besideActorStress: [{ id: "crusader", stress: 2 }],
      wounds: 3,
    });

    // Rage I：自身「+1」压力的 numeric 是 null。不能先加成 5，再在光照 1 加成 6。
    const rage = card("hero_skill:p226");
    expect(rage.name).toBe("Rage");
    expect(rage.level).toBe(1);
    expect(rage.hero).toBe("ABOMINATION");
    expect(rage.verification.unverified).toBe(false);
    expect(rage.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 1],
      ["Acc", 9],
    ]);
    expect(
      rage.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "stress",
        )
        .map((item) => [item.text, item.numeric]),
    ).toEqual([["+1", null]]);
    const abomination = { id: "abomination", wounds: 0, stress: 4 };
    const soldier = { id: "soldier", side: "monster" as const, wounds: 1, dodge: 0 };
    // 光照 1 把暴击阈值抬到 2。掷 2 暴击、伤害 12。压力只因打出暴击变成 3，不是 5。
    expect(
      use("hero_skill:p226", { actor: abomination, target: soldier, light: 1 }, 2),
    ).toMatchObject({
      status: "resolved",
      outcome: "crit",
      effect: "damage",
      printedAmount: 12,
      damageDealt: 12,
      wounds: 13,
      actorWounds: 0,
      actorStress: 3,
      targetStress: null,
      skipped: [{ code: "effect_lines" }],
    });
    // 掷 3 命中、伤害 9。没有承受压力，压力停在 4，不是 5，也不是 6。
    expect(
      use("hero_skill:p226", { actor: abomination, target: soldier, light: 1 }, 3),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 9,
      damageDealt: 9,
      wounds: 10,
      actorStress: 4,
      skipped: [{ code: "effect_lines" }],
    });
    // 光照 0 同样只给暴击和怪物 Dodge。Dodge 0 再 +1，命中阈值是 8。掷 9 落空。
    // 英雄 Acc 不加，所以不是命中。压力仍是 4。怪物没有压力轨。
    expect(
      use("hero_skill:p226", { actor: abomination, target: soldier, light: 0 }, 9),
    ).toMatchObject({
      outcome: "miss",
      printedAmount: null,
      damageDealt: null,
      wounds: 1,
      actorStress: 4,
      targetStress: null,
    });

    // Rage II 的加压力仍是 null。光照 1、掷 2 暴击、伤害 16，压力只减到 3。
    const rageTwo = card("hero_skill:p227");
    expect(rageTwo.name).toBe("Rage");
    expect(rageTwo.level).toBe(2);
    expect(rageTwo.verification.unverified).toBe(false);
    expect(rageTwo.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 1],
      ["Acc", 10],
    ]);
    expect(
      rageTwo.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["+1"]);
    expect(
      use("hero_skill:p227", { actor: abomination, target: soldier, light: 1 }, 2),
    ).toMatchObject({
      status: "resolved",
      outcome: "crit",
      printedAmount: 16,
      damageDealt: 16,
      wounds: 17,
      actorStress: 3,
      skipped: [{ code: "effect_lines" }],
    });

    // Rake I：自身增益 2t 和压力 +1 写在一行，两个 numeric 都是 null。
    // 光照 2 只抬暴击。掷 1 暴击、伤害 9，压力变成 3。掷 2 命中、伤害 5，压力仍是 4。
    const rake = card("hero_skill:p223");
    expect(rake.name).toBe("Rake");
    expect(rake.level).toBe(1);
    expect(rake.verification.unverified).toBe(false);
    expect(
      rake.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["2t", "+1"]);
    expect(
      rake.effect_lines[0]
        ?.filter((segment) => segment.type === "icon")
        .map((segment) => segment.icon.key),
    ).toEqual(["self_effects", "buff", "stress"]);
    const raking = {
      actor: { id: "abomination", wounds: 2, stress: 4, stance: "aggressive" as const },
      target: soldier,
      light: 2,
    };
    expect(use("hero_skill:p223", raking, 1)).toMatchObject({
      status: "resolved",
      outcome: "crit",
      printedAmount: 9,
      damageDealt: 9,
      wounds: 10,
      actorWounds: 2,
      actorStress: 3,
      actorForm: null,
      skipped: [{ code: "effect_lines" }],
    });
    expect(use("hero_skill:p223", raking, 2)).toMatchObject({
      outcome: "hit",
      printedAmount: 5,
      damageDealt: 5,
      wounds: 6,
      actorStress: 4,
    });

    // Slam I：自身 Pull 1 和压力 +1 在一行，目标 Push 2 和减益 1t 在一行。
    // 光照 1 不把 null 的 +1 收成压力，也不把混在一行里的位移抽出来。
    const slam = card("hero_skill:p229");
    expect(slam.name).toBe("Slam");
    expect(slam.level).toBe(1);
    expect(slam.hero).toBe("ABOMINATION");
    expect(slam.verification.unverified).toBe(false);
    expect(slam.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 0],
      ["Acc", 8],
    ]);
    expect(
      slam.unlabeled_numbers.filter((item) => item.numeric === null).map((item) => item.text),
    ).toEqual(["1t", "+1"]);
    expect(
      use("hero_skill:p229", { actor: abomination, target: soldier, areaDistance: 1, light: 1 }, 1),
    ).toMatchObject({
      status: "resolved",
      outcome: "crit",
      printedAmount: 10,
      damageDealt: 10,
      wounds: 11,
      actorStress: 3,
      actorShuffle: null,
      targetShuffle: null,
      skipped: [{ code: "effect_lines" }],
    });
    expect(
      use("hero_skill:p229", { actor: abomination, target: soldier, areaDistance: 1, light: 1 }, 2),
    ).toMatchObject({
      outcome: "hit",
      printedAmount: 7,
      damageDealt: 7,
      wounds: 8,
      actorStress: 4,
      actorShuffle: null,
      targetShuffle: null,
    });

    // Transform to Beast I：目标「+2」压力的 numeric 是 null。光照 1 不加成 5 或 6。
    // 治疗图标里的 4 也不扣伤口。没有 Acc，不掷骰，只记下兽形。
    const beast = card("hero_skill:p220");
    expect(beast.name).toBe("Transform to Beast");
    expect(beast.level).toBe(1);
    expect(beast.verification.unverified).toBe(false);
    expect(
      beast.unlabeled_numbers
        .filter(
          (item) => item.anchor.type === "beside_icon" && item.anchor.left_icon?.key === "stress",
        )
        .map((item) => [item.text, item.numeric]),
    ).toEqual([
      ["+2", null],
      ["+2", null],
    ]);
    expect(
      use(
        "hero_skill:p220",
        {
          actor: { id: "abomination", wounds: 5, stress: 3 },
          target: soldier,
          light: 1,
        },
        1,
      ),
    ).toMatchObject({
      status: "resolved",
      outcome: null,
      effect: null,
      printedAmount: null,
      wounds: 1,
      actorWounds: 5,
      actorStress: 3,
      actorForm: "beast",
      skipped: [{ code: "effect_lines" }],
    });

    // Hands from the Abyss I：光照「-1」的 numeric 是 −1，但没有挂在光照图标上，
    // 并且和眩晕 2t 写在同一行。不改伤害，命中也不改压力，不把传入的光照改成 4。
    const abyss = card("hero_skill:p205");
    expect(abyss.name).toBe("Hands from the Abyss");
    expect(abyss.level).toBe(1);
    expect(abyss.hero).toBe("OCCULTIST");
    expect(abyss.verification.unverified).toBe(false);
    expect(abyss.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 1],
      ["Acc", 9],
    ]);
    const lightDrop = abyss.unlabeled_numbers.find((item) => item.text === "-1");
    expect(lightDrop?.numeric).toBe(-1);
    expect(lightDrop?.anchor.type).toBe("beside_icon");
    if (lightDrop?.anchor.type === "beside_icon") {
      expect(lightDrop.anchor.left_icon).toBeNull();
      expect(lightDrop.anchor.inside_icon).toBeNull();
    }
    expect(
      abyss.effect_lines[0]
        ?.filter((segment) => segment.type === "icon")
        .map((segment) => segment.icon.key),
    ).toEqual(["target_effects", "stun", "light"]);
    const occultist = { id: "occultist", wounds: 0, stress: 4 };
    const dim = {
      actor: occultist,
      target: soldier,
      areaDistance: 1,
      light: 5,
    };
    const frozen = structuredClone(dim);
    expect(use("hero_skill:p205", dim, 2)).toMatchObject({
      status: "resolved",
      outcome: "hit",
      effect: "damage",
      printedAmount: 3,
      damageDealt: 3,
      wounds: 4,
      actorWounds: 0,
      actorStress: 4,
      skipped: [{ code: "effect_lines" }],
    });
    expect(dim).toEqual(frozen);
    // 光照 2 另给暴击。掷 2 暴击、伤害 4。压力只因打出暴击变成 3。卡面 −1 不把光照改掉。
    expect(use("hero_skill:p205", { ...dim, light: 2 }, 2)).toMatchObject({
      outcome: "crit",
      printedAmount: 4,
      damageDealt: 4,
      wounds: 5,
      actorStress: 3,
      skipped: [{ code: "effect_lines" }],
    });

    // 说明书 G-07 的 Zealous Accusation I 在光照 1 仍不能结算。stats 行只有技能名。
    const zealous = card("hero_skill:p004");
    expect(zealous.name).toBe("Zealous Accusation");
    expect(zealous.level).toBe(1);
    expect(zealous.verification.unverified).toBe(false);
    expect(zealous.printed_labels.map((item) => [item.label, item.value])).toEqual([
      ["Crit", 0],
      ["Acc", 9],
    ]);
    expect(
      use("hero_skill:p004", { actor: abomination, target: soldier, light: 1 }, 1),
    ).toMatchObject({
      status: "refused",
      reason: "stats_line 没有已命名的 damage 或 heal",
      outcome: null,
      effect: null,
      printedAmount: null,
      damageDealt: null,
      wounds: 1,
      actorWounds: 0,
      actorStress: 4,
    });
  });
});
