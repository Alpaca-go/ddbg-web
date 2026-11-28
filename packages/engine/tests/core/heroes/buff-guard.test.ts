import { expect, it } from "vitest";
import { resolveHeroSkill } from "../../../src/core/heroes/hero-skill";
import type { SkillCombatState } from "../../../src/core/heroes/hero-skill";
import { applyCommand } from "../../../src/shared/core/command";
import { trinketBattle } from "../../helpers/trinket-battle";
import { coreQuestSources } from "../../helpers/core-quest";

const reviewed = coreQuestSources.catalog.skills.filter((card) => card.rules?.buffGuard);
const names = [
  "Bulwark of Faith",
  "Adrenaline Rush",
  "Battle Ballad",
  "Emboldening Vapours",
  "Shadow Fade",
  "Toxin Trickery",
  "Withstand",
  "Get Down!",
  "Invigorating Vapours",
  "Protect Me",
  "Defender",
  "Command",
  "Serpent Sway",
  "Guard Dog",
] as const;

it("十四组增益、防护与自我支援各发布三个等级的独立规则", () => {
  expect(reviewed).toHaveLength(42);
  expect(new Set(reviewed.map((card) => card.name))).toEqual(new Set(names));
  for (const name of names) {
    expect(reviewed.filter((card) => card.name === name).map((card) => card.level)).toEqual([
      1, 2, 3,
    ]);
  }
});

function stripPrint<T extends (typeof reviewed)[number]>(
  card: T,
  buffGuard: NonNullable<T["rules"]>["buffGuard"],
) {
  return {
    ...card,
    rules: { buffGuard: buffGuard! },
    printed_labels: [],
    unlabeled_numbers: [],
    stats_line: null,
    effect_lines: [],
    top_row_icons: [],
    name_row_icons: [],
    front_icons: [],
    back_icons: [],
  };
}

it.each(reviewed)("$id 的公开命令只需核准规则，非法规则原子拒绝", (card) => {
  const { buffGuard: packed, ...legacyRules } = card.rules!;
  const stance = packed!.stances.at(-1)!;
  const { state, command } = trinketBattle(
    ["trinket:p001"],
    stance,
    card.id,
    "upright",
    7,
    "monster_medium:p024",
  );
  const battle = state.battle!;
  const stat = coreQuestSources.catalog.heroStats.find(
    (entry) => entry.name === card.hero && entry.level === card.level,
  )!;
  const self = packed!.selfRange === true;
  const range = packed!.range ?? 0;
  const min = packed!.rangeMinimum ?? range;
  const targetArea = self || range === 0 || min === 0 ? "a" : range >= 2 ? "c" : "b";
  const targetCount = self ? 1 : Math.max(1, packed!.heroTargets);
  const targetIds = self ? ["h0"] : (["h1", "h2", "h3"] as const).slice(0, targetCount);
  const areas = [
    { id: "a", adjacent: ["b"], elevation: "normal" as const, capacity: 8 },
    { id: "b", adjacent: ["a", "c"], elevation: "normal" as const, capacity: 8 },
    { id: "c", adjacent: ["b"], elevation: "normal" as const, capacity: 8 },
  ];
  const statusFor = (scope: "self" | "target") => {
    const kinds = new Set(
      (packed!.removal ?? []).filter((rule) => rule.scope === scope).flatMap((rule) => rule.kinds),
    );
    return [
      ...(kinds.has("bleed") ? [{ kind: "bleed" as const, remaining: 2, amount: 1 }] : []),
      ...(kinds.has("blight") ? [{ kind: "blight" as const, remaining: 2, amount: 1 }] : []),
    ];
  };
  const entities = battle.entities.map((entity) => {
    if (entity.id === "h0")
      return {
        ...entity,
        heroStatId: stat.id,
        heroLevel: stat.level,
        life: stat.life,
        wounds: 6,
        stress: 6,
        areaId: "a",
        stance,
        statusStacks: statusFor("self"),
        ...(card.hero === "ABOMINATION" ? { form: "human" as const } : {}),
      };
    if (entity.side === "hero")
      return {
        ...entity,
        wounds: 6,
        stress: 6,
        areaId: targetIds.includes(entity.id) ? targetArea : "a",
        statusStacks: targetIds.includes(entity.id)
          ? statusFor("target")
          : (entity.statusStacks ?? []),
      };
    return entity;
  });
  const fixture = (skill: typeof card) => ({
    ...state,
    battle: {
      ...battle,
      areas,
      entities,
      skills: battle.skills.map((entry) => (entry.id === card.id ? skill : entry)),
    },
  });
  const stripped = stripPrint(card, packed);
  const play =
    targetCount === 1
      ? { ...command, targetId: targetIds[0]! }
      : {
          type: "playHeroSkillTargets" as const,
          actorId: command.actorId,
          trinketWindow: command.trinketWindow!,
          skillId: card.id,
          targetIds: [...targetIds],
        };
  const playWithDistance =
    packed!.selfShufflePushOptions !== undefined
      ? { ...play, shufflePushDistance: packed!.selfShufflePushOptions[0]! }
      : play;
  const legacy = applyCommand(fixture({ ...card, rules: legacyRules }), playWithDistance);
  const migrated = applyCommand(fixture(stripped), playWithDistance);
  expect(legacy.events.filter(({ type }) => type === "commandRefused")).toEqual([]);
  const migratedCatalog = fixture(stripped).battle.skills;
  const compare = (oldResult: typeof legacy, newResult: typeof migrated) => {
    const oldBattle = oldResult.state.battle!;
    const prefix = oldBattle.skillPrefix;
    expect(newResult).toEqual({
      ...oldResult,
      state: {
        ...oldResult.state,
        battle: {
          ...oldBattle,
          skills: migratedCatalog,
          ...(prefix
            ? {
                skillPrefix: {
                  ...prefix,
                  original: { ...prefix.original, skills: migratedCatalog },
                },
              }
            : {}),
        },
      },
    });
  };
  compare(legacy, migrated);
  let oldResolved = legacy;
  let resolved = migrated;
  const finishPending = () => {
    for (let step = 0; step < 8; step += 1) {
      const pendingBattle = oldResolved.state.battle;
      const pending = oldResolved.pendingChoice;
      if (
        !pending &&
        !pendingBattle?.shuffleContinuation &&
        !pendingBattle?.shuffleIntents.length &&
        !pendingBattle?.skillPrefix
      )
        return;
      const next = pending
        ? ({
            type: "resolveChoice",
            choiceId: pending.id,
            optionId: pending.options[0]!.id,
          } as const)
        : ({ type: "resolveShuffles" } as const);
      oldResolved = applyCommand(oldResolved.state, next);
      resolved = applyCommand(resolved.state, next);
      expect(resolved.events.some(({ type }) => type === "commandRefused")).toBe(false);
      compare(oldResolved, resolved);
    }
  };
  finishPending();
  expect(resolved.events.some(({ type }) => type === "commandRefused")).toBe(false);
  const invalids: (typeof packed)[] = [
    { ...packed!, range: -1 },
    { ...packed!, rangeMinimum: (packed!.range ?? 0) + 1 },
    { ...packed!, heroTargets: -1 },
    { ...packed!, stances: [] },
  ];
  if (packed!.hit)
    invalids.push((({ hit: _hit, ...rest }) => (void _hit, rest as typeof packed))(packed!));
  if (packed!.onHit)
    invalids.push({ ...packed!, onHit: [{ kind: "bleed" as const, duration: 0 }] });
  for (const buffGuard of invalids) {
    const invalid = fixture(stripPrint(card, buffGuard));
    const refused = applyCommand(invalid, playWithDistance);
    expect(refused.events.some(({ type }) => type === "commandRefused")).toBe(true);
    expect(refused.state).toEqual(invalid);
    expect(refused.pendingChoice).toBeUndefined();
  }
});

it.each(reviewed)("$id 十种骰面沿用旧效果", (card) => {
  const { buffGuard, ...legacyRules } = card.rules!;
  const packed = buffGuard!;
  const legacy = { ...card, rules: legacyRules };
  const onlyRules = stripPrint(card, packed);
  const self = packed.selfRange === true;
  const combat: SkillCombatState = {
    actor: {
      id: "hero",
      stance: packed.stances[0]!,
      wounds: 6,
      stress: 6,
      ...(card.hero === "ABOMINATION" ? { form: "human" } : {}),
    },
    target: {
      id: self ? "hero" : "ally",
      side: "hero",
      wounds: 6,
      dodge: 0,
      stress: 6,
      statusStacks: [],
    },
    areaDistance: self ? 0 : (packed.rangeMinimum ?? packed.range ?? 0),
    targetsInArea: Math.max(1, self ? 1 : packed.heroTargets),
    light: 4,
    ...(packed.selfShufflePushOptions
      ? { shufflePushDistance: packed.selfShufflePushOptions[0] }
      : {}),
  };
  expect(resolveHeroSkill(legacy, combat, 1).status).toBe("resolved");
  for (let roll = 1; roll <= 10; roll += 1) {
    const oldResult = resolveHeroSkill(legacy, combat, roll);
    const newResult = resolveHeroSkill(onlyRules, combat, roll);
    expect(newResult).toEqual({
      ...oldResult,
      skillId: onlyRules.id,
    });
    expect(newResult.status).toBe("resolved");
  }
  const invalid = stripPrint(card, { ...packed, range: -1 });
  expect(resolveHeroSkill(invalid, combat, 1).status).toBe("refused");
  expect(resolveHeroSkill(invalid, combat, 1).reason).toBe("技能效果词条或参数无效");
});
