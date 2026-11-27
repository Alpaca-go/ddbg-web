import { expect, it } from "vitest";
import { resolveHeroSkill } from "../../../src/core/heroes/hero-skill";
import type { SkillCombatState } from "../../../src/core/heroes/hero-skill";
import { applyCommand } from "../../../src/shared/core/command";
import { trinketBattle } from "../../helpers/trinket-battle";
import { coreQuestSources } from "../../helpers/core-quest";

const reviewed = coreQuestSources.catalog.skills.filter((card) => card.rules?.directAttack);
const basicAttacks = reviewed.filter(({ name }) =>
  ["Wicked Hack", "Iron Swan", "Wicked Slice", "Crush", "Chop", "Hew", "Nervous Stab"].includes(
    name!,
  ),
);

it("七组基础直攻各发布三个等级的独立规则", () => {
  expect(basicAttacks).toHaveLength(21);
  for (const name of new Set(basicAttacks.map((card) => card.name))) {
    expect(basicAttacks.filter((card) => card.name === name).map((card) => card.level)).toEqual([
      1, 2, 3,
    ]);
  }
});

it.each(basicAttacks)("$id 的公开命令只需核准规则，非法规则原子拒绝", (card) => {
  const { directAttack: attack, ...legacyRules } = card.rules!;
  const { state, command } = trinketBattle(
    ["trinket:p001"],
    attack!.stances.at(-1),
    card.id,
    "upright",
    7,
    "monster_medium:p024",
  );
  const battle = state.battle!;
  const stat = coreQuestSources.catalog.heroStats.find(
    (entry) => entry.name === card.hero && entry.level === card.level,
  )!;
  const entities = battle.entities.map((entity) => {
    if (entity.id === command.actorId)
      return { ...entity, heroStatId: stat.id, heroLevel: stat.level, life: stat.life };
    if (entity.side === "monster" && attack!.range === 0) return { ...entity, areaId: "a" };
    if (entity.side === "monster" && attack!.range === 2) return { ...entity, areaId: "c" };
    return entity;
  });
  const areas =
    attack!.range === 2
      ? [
          ...battle.areas.map((area) =>
            area.id === "b" ? { ...area, adjacent: [...area.adjacent, "c"] } : area,
          ),
          { id: "c", adjacent: ["b"], elevation: "normal" as const, capacity: 8 },
        ]
      : battle.areas;
  const fixture = (skill: typeof card) => ({
    ...state,
    battle: {
      ...battle,
      areas,
      entities,
      skills: battle.skills.map((entry) => (entry.id === card.id ? skill : entry)),
    },
  });
  const stripped = {
    ...card,
    rules: { directAttack: attack! },
    printed_labels: [],
    unlabeled_numbers: [],
    stats_line: null,
    effect_lines: [],
    top_row_icons: [],
    name_row_icons: [],
    front_icons: [],
    back_icons: [],
  };
  const play =
    attack!.monsterTargets === 1
      ? command
      : {
          type: "playHeroSkillTargets" as const,
          actorId: command.actorId,
          trinketWindow: command.trinketWindow!,
          skillId: card.id,
          targetIds: ["m", "m2"],
        };
  const legacy = applyCommand(fixture({ ...card, rules: legacyRules }), play);
  const migrated = applyCommand(fixture(stripped), play);
  expect(legacy.events.filter(({ type }) => type === "commandRefused")).toEqual([]);
  expect(legacy.pendingChoice?.options.map(({ id }) => id)).toContain("trinket:p001");
  const compare = (oldResult: typeof legacy, newResult: typeof migrated) =>
    expect(newResult).toEqual({
      ...oldResult,
      state: {
        ...oldResult.state,
        battle: { ...oldResult.state.battle!, skills: fixture(stripped).battle.skills },
      },
    });
  compare(legacy, migrated);
  const choice = {
    type: "resolveChoice",
    choiceId: legacy.pendingChoice!.id,
    optionId: "trinket:p001",
  } as const;
  const resolved = applyCommand(migrated.state, choice);
  compare(applyCommand(legacy.state, choice), resolved);
  expect(resolved.events.some(({ type }) => type === "commandRefused")).toBe(false);
  expect(resolved.state.battle!.rngCursor).toBe(battle.rngCursor + 1);
  const { hit: _hit, ...missingHit } = attack!;
  void _hit;
  for (const directAttack of [missingHit as typeof attack, { ...attack!, range: -1 }]) {
    const invalid = fixture({ ...stripped, rules: { directAttack: directAttack! } });
    const refused = applyCommand(invalid, play);
    expect(refused.events.some(({ type }) => type === "commandRefused")).toBe(true);
    expect(refused.state).toEqual(invalid);
    expect(refused.pendingChoice).toBeUndefined();
  }
});

it("直接攻击在空区域仍掷骰，且保留 Accuracy Stone 的使用窗口", () => {
  const skillId = "hero_skill:core:h02:p031";
  const { state, command } = trinketBattle(
    ["trinket:p001"],
    "aggressive",
    skillId,
    "upright",
    7,
    "monster_medium:p024",
  );
  const battle = state.battle!;
  const withNoPrint = {
    ...state,
    battle: {
      ...battle,
      skills: battle.skills.map((card) =>
        card.id === skillId
          ? { ...card, printed_labels: [], stats_line: null, effect_lines: [] }
          : card,
      ),
    },
  };
  const expected = applyCommand(state, command);
  expect(expected.pendingChoice?.options.map(({ id }) => id)).toContain("trinket:p001");
  expect(applyCommand(withNoPrint, command).pendingChoice).toEqual(expected.pendingChoice);

  const emptyArea = {
    ...withNoPrint,
    battle: {
      ...withNoPrint.battle,
      areas: [
        ...battle.areas.map((area) =>
          area.id === "a" ? { ...area, adjacent: [...area.adjacent, "c"] } : area,
        ),
        { id: "c", adjacent: ["a"], elevation: "normal" as const, capacity: 4 },
      ],
    },
  };
  const resolved = applyCommand(emptyArea, {
    type: "playHeroSkillEmptyArea",
    actorId: "h0",
    skillId,
    areaId: "c",
  });
  expect(resolved.events.some(({ type }) => type === "commandRefused")).toBe(false);
  expect(resolved.state.battle?.rngCursor).toBe(battle.rngCursor + 1);
});

it.each([
  ["hero_skill:core:h01:p001", ["m"]],
  ["hero_skill:core:h01:p004", ["m", "m2"]],
  ["hero_skill:core:h01:p007", ["m"]],
] as const)("%s 脱离卡面后沿用旧命令的饰品待选、结算和 RNG", (skillId, targetIds) => {
  const { state, command } = trinketBattle(
    ["trinket:p001"],
    "aggressive",
    skillId,
    "upright",
    7,
    "monster_medium:p024",
  );
  const battle = state.battle!;
  const card = battle.skills.find((entry) => entry.id === skillId)!;
  const { directAttack, ...legacyRules } = card.rules!;
  const stripped = {
    ...card,
    rules: { directAttack: directAttack! },
    top_row_icons: [],
    front_icons: [],
    printed_labels: [],
    unlabeled_numbers: [],
    stats_line: null,
    effect_lines: [],
  };
  const entities = battle.entities.map((entity) =>
    entity.id === "m" && targetIds.length === 1 ? { ...entity, areaId: "a" } : entity,
  );
  const oldSkills = battle.skills.map((entry) =>
    entry.id === skillId ? { ...entry, rules: legacyRules } : entry,
  );
  const newSkills = battle.skills.map((entry) => (entry.id === skillId ? stripped : entry));
  const attack =
    targetIds.length === 1
      ? command
      : {
          type: "playHeroSkillTargets" as const,
          actorId: command.actorId,
          trinketWindow: command.trinketWindow!,
          skillId,
          targetIds,
        };
  const original = applyCommand(
    { ...state, battle: { ...battle, entities, skills: oldSkills } },
    attack,
  );
  const migrated = applyCommand(
    { ...state, battle: { ...battle, entities, skills: newSkills } },
    attack,
  );
  expect(original.pendingChoice?.options.map(({ id }) => id)).toContain("trinket:p001");
  expect(migrated.pendingChoice).toEqual(original.pendingChoice);
  const choice = {
    type: "resolveChoice",
    choiceId: original.pendingChoice!.id,
    optionId: "trinket:p001",
  } as const;
  const expected = applyCommand(original.state, choice);
  const resolved = applyCommand(migrated.state, choice);
  expect(expected.events.some(({ type }) => type === "commandRefused")).toBe(false);
  expect(resolved).toEqual({
    ...expected,
    state: { ...expected.state, battle: { ...expected.state.battle!, skills: newSkills } },
  });
  expect(resolved.state.battle!.rngCursor).toBe(battle.rngCursor + 1);
});

it.each(reviewed)("$id 十种骰面和目标限制沿用旧效果", (card) => {
  const { directAttack, ...legacyRules } = card.rules!;
  const attack = directAttack!;
  const legacy = { ...card, rules: legacyRules };
  const onlyRules = {
    ...card,
    rules: { directAttack: attack },
    printed_labels: [],
    unlabeled_numbers: [],
    stats_line: null,
    effect_lines: [],
    top_row_icons: [],
    front_icons: [],
  };
  const combat: SkillCombatState = {
    actor: { id: "hero", stance: attack.stances[0]!, wounds: 0, stress: 4 },
    target: { id: "monster", side: "monster", wounds: 0, dodge: 2, monsterTypeTags: ["Unholy"] },
    areaDistance: attack.range,
    targetsInArea: attack.monsterTargets,
    light: 4,
  };
  expect(resolveHeroSkill(legacy, combat, 1).status).toBe("resolved");
  const missingAmount = {
    ...onlyRules,
    rules: {
      directAttack: { ...attack, onHit: [{ kind: "bleed" as const, duration: 2 }] },
    },
  };
  expect(resolveHeroSkill(missingAmount, combat, 1).status).toBe("refused");
  for (let roll = 1; roll <= 10; roll += 1)
    expect(resolveHeroSkill(onlyRules, combat, roll)).toEqual(
      resolveHeroSkill(legacy, combat, roll),
    );
  for (const rejected of [
    { ...combat, areaDistance: attack.range + 1 },
    { ...combat, targetsInArea: attack.monsterTargets + 1 },
  ]) {
    expect(resolveHeroSkill(onlyRules, rejected, 1)).toEqual(resolveHeroSkill(legacy, rejected, 1));
    expect(resolveHeroSkill(onlyRules, rejected, 1).status).toBe("refused");
  }
});

it.each(reviewed.filter((card) => card.rules!.directAttack!.damageBonus))(
  "$id 条件伤害沿用目标分类、防护和缺类型拒绝",
  (card) => {
    const { directAttack, ...legacyRules } = card.rules!;
    const attack = directAttack!;
    const legacy = { ...card, rules: legacyRules };
    const stripped = {
      ...card,
      rules: { directAttack: attack },
      printed_labels: [],
      unlabeled_numbers: [],
      stats_line: null,
      effect_lines: [],
      top_row_icons: [],
    };
    const combat: SkillCombatState = {
      actor: { id: "hero", stance: attack.stances[0]!, wounds: 0, stress: 4 },
      target: { id: "monster", side: "monster", wounds: 0, dodge: 0, protection: true },
      areaDistance: attack.range,
      light: 4,
    };
    const resolveAs = (tags: readonly string[]) => {
      const target = { ...combat.target!, monsterTypeTags: tags };
      const context = { ...combat, target };
      const resolved = resolveHeroSkill(stripped, context, 1);
      expect(resolved).toEqual(resolveHeroSkill(legacy, context, 1));
      return resolved;
    };
    expect(resolveAs(["Unholy"]).damageDealt).toBe(
      Math.ceil((attack.critical.damage + attack.damageBonus!.amount) / 2),
    );
    expect(resolveAs(["Human"]).damageDealt).toBe(Math.ceil(attack.critical.damage / 2));
    expect(resolveAs([]).status).toBe("refused");
    const invalid = {
      ...stripped,
      rules: {
        directAttack: { ...attack, damageBonus: { condition: "unholy" as const, amount: 0 } },
      },
    };
    expect(resolveHeroSkill(invalid, combat, 1).reason).toContain("参数无效");
  },
);
