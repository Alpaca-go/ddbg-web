import { expect, it } from "vitest";
import { resolveHeroSkill } from "../../../src/core/heroes/hero-skill";
import type { SkillCombatState } from "../../../src/core/heroes/hero-skill";
import { applyCommand } from "../../../src/shared/core/command";
import { trinketBattle } from "../../helpers/trinket-battle";
import { coreQuestSources } from "../../helpers/core-quest";

const reviewed = coreQuestSources.catalog.skills.filter((card) => card.rules?.directAttack);
it("八组已核准的攻击各发布三个等级的独立规则", () => {
  expect(reviewed).toHaveLength(24);
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
    target: { id: "monster", side: "monster", wounds: 0, dodge: 2 },
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
