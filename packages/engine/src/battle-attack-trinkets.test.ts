import { expect, it } from "vitest";
import { HERO_SKILL_TRINKET_IDS } from "../../data/src/hero-skill-trinkets";
import type { HeroSkillTrinketId } from "../../data/src/hero-skill-trinkets";
import { savedCommandSchema } from "../../data/src/quest-save";
import { applyCommand } from "./command";
import type { ApplyResult, GameState } from "./command";
import { createBattleState } from "./battle";
import type { BattleEntity, PlayHeroSkillCommand } from "./battle";
import type { SkillStance } from "./hero-skill";
import { coreQuestSources } from "./test-helpers/core-quest";

// 明示战斗机制夹具；完整牌池、技能和属性均来自目录，不冒称自然获得路径。
function fixture(
  ids: readonly HeroSkillTrinketId[],
  stance: SkillStance = "aggressive",
  skillId = "hero_skill:p001",
  face: "upright" | "inverted" = "upright",
  seed = 4,
  monsterId = "monster_medium:p001",
) {
  const catalog = coreQuestSources.catalog,
    skill = catalog.skills.find((s) => s.id === skillId)!;
  const level = ids.length > 1 ? 3 : 1;
  const names = [
    skill.hero!,
    ...["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].filter((n) => n !== skill.hero),
  ].slice(0, 4);
  const stances = [
    stance,
    ...(["aggressive", "defensive", "ranged", "support"] as const).filter((s) => s !== stance),
  ];
  const entities: BattleEntity[] = names.map((name, i) => {
    const stat = catalog.heroStats.find((s) => s.name === name && s.level === (i ? 1 : level))!;
    return {
      id: `h${i}`,
      side: "hero",
      hero: name,
      heroStatId: stat.id,
      heroLevel: stat.level,
      life: stat.life,
      stance: stances[i]!,
      areaId: "a",
      skillIds: i ? [] : [skillId, ...(name === "CRUSADER" ? ["hero_skill:p007"] : [])],
      wounds: 0,
      stress: 3,
      dodge: stat.dodge!,
      dead: false,
      guard: false,
      bleed: [],
      blight: [],
    };
  });
  const monster = catalog.monsters.find((m) => m.id === monsterId)!;
  entities.push({
    id: "m",
    side: "monster",
    hero: null,
    monsterCardId: monster.id,
    life: monster.life,
    stance: "aggressive",
    stanceSlots: 1,
    areaId: skillId === "hero_skill:p001" ? "a" : "b",
    skillIds: [],
    wounds: 0,
    dodge: monster.dodge,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  });
  entities.push({ ...entities[entities.length - 1]!, id: "m2", stance: "defensive" });
  const initial = createBattleState(seed, {
    ...catalog,
    entities,
    light: 5,
    areas: [
      { id: "a", adjacent: ["b"], elevation: "normal", capacity: 8 },
      { id: "b", adjacent: ["a"], elevation: "normal", capacity: 8 },
    ],
    trinkets: { ...catalog.trinkets!, held: ids.map((cardId) => ({ cardId, heroId: "h0", face })) },
  });
  const state = {
    ...initial,
    battle: {
      ...initial.battle!,
      encounter: {
        round: 1,
        deck: ["monster" as const],
        actedIds: [],
        turn: { type: "hero" as const, actorId: "h0", actions: 2, usedSkillIds: [] },
      },
    },
  };
  const command: PlayHeroSkillCommand = {
    type: "playHeroSkill",
    actorId: "h0",
    targetId: "m",
    skillId,
    trinketWindow: HERO_SKILL_TRINKET_IDS,
  };
  return { state, command };
}
function ok(result: ApplyResult) {
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return result;
}
const choose = (window: ApplyResult, optionId: string) =>
  ok(
    applyCommand(window.state, {
      type: "resolveChoice",
      choiceId: window.pendingChoice!.id,
      optionId,
    }),
  );
const outcome = (result: ApplyResult) => result.events.find((e) => e.type === "heroSkillResolved");

it.each([
  ["trinket:p001", "aggressive", "hero_skill:p001"],
  ["trinket:p002", "ranged", "hero_skill:p067"],
  ["trinket:p009", "support", "hero_skill:p088"],
  ["trinket:p014", "defensive", "hero_skill:p001"],
] as const)("%s：正面精确补足命中差值，反面−1令原命中变落空", (id, stance, skill) => {
  // 骰10：命中石对 Dodge0 的骷髅士兵补1；其余对 Dodge1 的骷髅廷臣须补足2。
  const { state, command } = fixture(
    [id],
    stance,
    skill,
    "upright",
    4,
    id === "trinket:p001" ? "monster_medium:p001" : "monster_medium:p004",
  );
  const window = ok(applyCommand(state, command));
  expect(window.pendingChoice!.prompt).toContain("d10=10");
  expect(outcome(choose(window, "continue"))).toMatchObject({ resolution: { outcome: "miss" } });
  const used = choose(window, id);
  expect(outcome(used)).toMatchObject({ roll: 10, resolution: { outcome: "hit" } });
  expect(used.state.battle!.trinkets!.held[0]!.face).toBe("inverted");
  expect(used.state.battle!.rngCursor).toBe(1);
  const reverse = fixture([id], stance, skill, "inverted", 30);
  const reverseWindow = ok(applyCommand(reverse.state, reverse.command));
  expect(reverseWindow.pendingChoice!.prompt).toContain("d10=9");
  expect(outcome(choose(reverseWindow, "continue"))).toMatchObject({
    resolution: { outcome: "hit" },
  });
  const flipped = choose(reverseWindow, id);
  expect(outcome(flipped)).toMatchObject({ resolution: { outcome: "miss" } });
  expect(flipped.state.battle!.trinkets!.held[0]!.face).toBe("upright");
});

it.each([
  ["trinket:p002", "support", "hero_skill:p067"],
  ["trinket:p009", "ranged", "hero_skill:p088"],
  ["trinket:p014", "aggressive", "hero_skill:p001"],
] as const)("%s：姿态不符不提供正面，反面不额外要求姿态", (id, stance, skill) => {
  const { state, command } = fixture([id], stance, skill);
  const result = ok(applyCommand(state, command));
  expect(result.state.battle!.pending).toBeNull();
  expect(result.state.battle!.trinkets!.held[0]!.face).toBe("upright");
  const reverse = fixture([id], stance, skill, "inverted");
  expect(
    ok(applyCommand(reverse.state, reverse.command)).pendingChoice!.options.map((o) => o.id),
  ).toContain(id);
});

it("新名单多目标技能共骰并只翻一次：两目标均由落空变命中", () => {
  const { state, command } = fixture(["trinket:p001"], "aggressive", "hero_skill:p004");
  const window = ok(
    applyCommand(state, {
      type: "playHeroSkillTargets",
      actorId: command.actorId,
      skillId: command.skillId,
      trinketWindow: HERO_SKILL_TRINKET_IDS,
      targetIds: ["m", "m2"],
    }),
  );
  const multi = (result: ApplyResult) =>
    result.events.find((e) => e.type === "heroSkillTargetsResolved");
  expect(multi(choose(window, "continue"))).toMatchObject({
    roll: 10,
    resolutions: [
      expect.objectContaining({ outcome: "miss" }),
      expect.objectContaining({ outcome: "miss" }),
    ],
  });
  const used = choose(window, "trinket:p001");
  expect(multi(used)).toMatchObject({
    roll: 10,
    resolutions: [
      expect.objectContaining({ outcome: "hit" }),
      expect.objectContaining({ outcome: "hit" }),
    ],
  });
  expect(used.events.filter((e) => e.type === "trinketUsed")).toHaveLength(1);
  expect(used.state.battle!.usedTrinketIds).toEqual(["trinket:p001"]);
  expect(used.state.battle!.rngCursor).toBe(1);
});

it("三件饰品逐件选择并一次提交，停点JSON续接不重掷，顺序不改变技能效果", () => {
  const ids = ["trinket:p006", "trinket:p001", "trinket:p014"] as const;
  const { state, command } = fixture(ids, "defensive");
  const initial = structuredClone(state),
    opened = ok(applyCommand(state, command));
  const first = choose(opened, ids[0]);
  expect(first.state.battle!.trinkets).toEqual(state.battle.trinkets);
  expect(first.state.battle!.usedTrinketIds).toBeUndefined();
  expect(first.state.battle!.rngCursor).toBe(0);
  expect(first.pendingChoice!.options.map((o) => o.id)).not.toContain(ids[0]);
  const frozen = {
    type: "resolveChoice" as const,
    choiceId: first.pendingChoice!.id,
    optionId: ids[0],
  };
  expect(applyCommand(first.state, frozen).state).toBe(first.state);
  const second = choose({ ...first, state: JSON.parse(JSON.stringify(first.state)) }, ids[1]);
  const final = choose(second, ids[2]);
  expect(outcome(final)).toMatchObject({ roll: 10, resolution: { outcome: "hit" } });
  expect(final.events.filter((e) => e.type === "trinketUsed")).toHaveLength(3);
  expect(final.state.battle!.trinkets!.held.every((h) => h.face === "inverted")).toBe(true);
  expect(final.state.battle!.usedTrinketIds).toEqual(ids);
  expect(final.state.battle!.rngCursor).toBe(1);
  expect(state).toEqual(initial);
  const reversed = choose(choose(choose(opened, ids[2]), ids[1]), ids[0]);
  expect(reversed.state.battle!.entities).toEqual(final.state.battle!.entities);
  expect(reversed.state.battle!.trinkets).toEqual(final.state.battle!.trinkets);
  const stopEarly = choose(first, "continue");
  expect(stopEarly.state.battle!.trinkets!.held.map((h) => h.face)).toEqual([
    "inverted",
    "upright",
    "upright",
  ]);
  expect(stopEarly.state.battle!.usedTrinketIds).toEqual([ids[0]]);
});

it("能力名单固定日志行为；未知、重复、空名单与卡面漂移拒绝", () => {
  const { state, command } = fixture(["trinket:p001"]);
  const legacy = ok(applyCommand(state, { ...command, trinketWindow: true }));
  expect(legacy.state.battle!.pending).toBeNull();
  expect(outcome(legacy)).toMatchObject({ resolution: { outcome: "miss" } });
  const limited = ok(applyCommand(state, { ...command, trinketWindow: ["trinket:p006"] }));
  expect(limited.state.battle!.pending).toBeNull();
  expect(savedCommandSchema.parse(command)).toEqual(command);
  for (const trinketWindow of [[], ["trinket:p001", "trinket:p001"], ["trinket:p999"]])
    expect(savedCommandSchema.safeParse({ ...command, trinketWindow }).success).toBe(false);
  const broken: GameState = {
    ...state,
    battle: {
      ...state.battle,
      trinkets: {
        ...state.battle.trinkets!,
        cards: state.battle.trinkets!.cards.map((c) =>
          c.id === "trinket:p001"
            ? {
                ...c,
                upright_half: {
                  ...c.upright_half,
                  effect_lines: [[{ type: "text", text: "Acc+9" }]],
                },
              }
            : c,
        ),
      },
    },
  };
  expect(applyCommand(broken, command).state).toBe(broken);
  const window = ok(applyCommand(state, command));
  if (window.state.battle!.pending?.type !== "heroAttackTrinkets") throw new Error("缺少使用计划");
  const forged: GameState = {
    ...window.state,
    battle: {
      ...window.state.battle!,
      pending: { ...window.state.battle!.pending, selected: ["trinket:p001", "trinket:p001"] },
    },
  };
  expect(
    applyCommand(forged, {
      type: "resolveChoice",
      choiceId: window.pendingChoice!.id,
      optionId: "continue",
    }).state,
  ).toBe(forged);
});

it("每件饰品分别限一次：第一行动用命中石，第二行动仍可用未使用的暴击石", () => {
  const { state, command } = fixture(["trinket:p006", "trinket:p001"]);
  const first = choose(choose(ok(applyCommand(state, command)), "trinket:p001"), "continue");
  expect(first.state.battle!.usedTrinketIds).toEqual(["trinket:p001"]);
  expect(first.state.battle!.encounter!.turn).toMatchObject({ actions: 1 });
  const second = ok(
    applyCommand(first.state, { ...command, targetId: "m2", skillId: "hero_skill:p007" }),
  );
  expect(second.pendingChoice!.options.map((o) => o.id)).toEqual(["continue", "trinket:p006"]);
  expect(choose(second, "trinket:p006").state.battle!.usedTrinketIds).toEqual([
    "trinket:p001",
    "trinket:p006",
  ]);
});
