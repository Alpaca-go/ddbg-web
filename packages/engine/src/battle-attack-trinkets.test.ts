import { expect, it } from "vitest";
import rawTrinkets from "../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";
import { HERO_SKILL_TRINKET_IDS } from "../../data/src/hero-skill-trinkets";
import type { HeroSkillTrinketId } from "../../data/src/hero-skill-trinkets";
import { savedCommandSchema } from "../../data/src/quest-save";
import { applyCommand } from "./command";
import type { ApplyResult, GameState } from "./command";
import { createBattleState } from "./battle";
import type { BattleEntity, PlayHeroSkillCommand } from "./battle";
import type { SkillStance } from "./hero-skill";
import { coreQuestSources } from "./test-helpers/core-quest";

const cards = normalizedTrinketFileSchema.parse(rawTrinkets).cards;
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
    areaId: ["hero_skill:p001", "hero_skill:p070", "hero_skill:p028"].includes(skillId) ? "a" : "b",
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
    trinkets: {
      ...catalog.trinkets!,
      cards: [
        ...catalog.trinkets!.cards,
        ...cards.filter((c) => c.level !== 1 && ids.includes(c.id as HeroSkillTrinketId)),
      ],
      held: ids.map((cardId) => ({ cardId, heroId: "h0", face })),
    },
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

const stanceRings = [
  ["trinket:p031", "ranged", "hero_skill:p067", "support", "hero_skill:p088"],
  ["trinket:p032", "aggressive", "hero_skill:p001", "defensive", "hero_skill:p001"],
  ["trinket:p033", "defensive", "hero_skill:p001", "aggressive", "hero_skill:p001"],
  ["trinket:p034", "support", "hero_skill:p088", "ranged", "hero_skill:p067"],
] as const;

it.each(stanceRings)(
  "%s：对应姿态Crit+4，离开该姿态才能用反面Acc−2",
  (id, stance, skill, other, otherSkill) => {
    // Crit0+4 的临界面为4，Crit1+4为5；紧邻更高一面仍须普通命中。
    const baseCrit = coreQuestSources.catalog.skills
      .find((s) => s.id === skill)!
      .printed_labels.find((l) => l.label === "Crit")!.value;
    if (baseCrit === null) throw new Error("技能缺少已核实Crit阈值");
    const critRoll = baseCrit + 4;
    const { state, command } = fixture([id], stance, skill, "upright", baseCrit ? 14 : 18);
    const before = structuredClone(state);
    const opened = ok(applyCommand(state, command));
    expect(opened.pendingChoice!.prompt).toContain(`d10=${critRoll}`);
    expect(opened.pendingChoice!.options[1]!.label).toContain("Crit+4");
    expect(outcome(choose(opened, "continue"))).toMatchObject({ resolution: { outcome: "hit" } });
    const used = choose({ ...opened, state: JSON.parse(JSON.stringify(opened.state)) }, id);
    expect(outcome(used)).toMatchObject({ roll: critRoll, resolution: { outcome: "crit" } });
    expect(used.state.battle!.trinkets!.held[0]!.face).toBe("inverted");
    expect(used.state.battle!.usedTrinketIds).toEqual([id]);
    expect(used.state.battle!.rngCursor).toBe(1);
    expect(used.state.battle!.encounter!.turn).toMatchObject({ actions: 1 });
    expect(state).toEqual(before);
    const above = fixture([id], stance, skill, "upright", baseCrit ? 6 : 14);
    expect(outcome(choose(ok(applyCommand(above.state, above.command)), id))).toMatchObject({
      roll: critRoll + 1,
      resolution: { outcome: "hit" },
    });
    const wrongFront = fixture([id], other, otherSkill);
    expect(ok(applyCommand(wrongFront.state, wrongFront.command)).pendingChoice).toBeUndefined();
    const wrongBack = fixture([id], stance, skill, "inverted");
    const skipped = ok(applyCommand(wrongBack.state, wrongBack.command));
    expect(skipped.pendingChoice).toBeUndefined();
    expect(skipped.state.battle!.trinkets!.held[0]!.face).toBe("inverted");

    // 骰8原本命中，−1仍能命中，精确的−2才会落空。
    const reverse = fixture([id], other, otherSkill, "inverted", 2);
    const reverseWindow = ok(applyCommand(reverse.state, reverse.command));
    expect(reverseWindow.pendingChoice!.options[1]!.label).toContain("Acc-2");
    expect(outcome(choose(reverseWindow, "continue"))).toMatchObject({
      resolution: { outcome: "hit" },
    });
    const flipped = choose(reverseWindow, id);
    expect(outcome(flipped)).toMatchObject({ roll: 8, resolution: { outcome: "miss" } });
    expect(flipped.state.battle!.trinkets!.held[0]!.face).toBe("upright");
  },
);

it("III级戒指与I级饰品共骰逐件选择，旧五张名单及true标记不新增选项", () => {
  const { state, command } = fixture(
    ["trinket:p032", "trinket:p006"],
    "aggressive",
    "hero_skill:p001",
    "upright",
    18,
  );
  const opened = ok(applyCommand(state, command));
  const planned = choose(opened, "trinket:p032");
  expect(planned.state.battle!.trinkets!.held.every((h) => h.face === "upright")).toBe(true);
  expect(planned.state.battle!.rngCursor).toBe(0);
  const final = choose(planned, "trinket:p006");
  expect(outcome(final)).toMatchObject({ roll: 4, resolution: { outcome: "crit" } });
  expect(final.events.filter((e) => e.type === "trinketUsed")).toHaveLength(2);
  expect(final.state.battle!.trinkets!.held.every((h) => h.face === "inverted")).toBe(true);
  expect(final.state.battle!.usedTrinketIds).toEqual(["trinket:p032", "trinket:p006"]);
  expect(final.state.battle!.rngCursor).toBe(1);
  const oldIds = [
    "trinket:p006",
    "trinket:p001",
    "trinket:p002",
    "trinket:p009",
    "trinket:p014",
  ] as const;
  for (const trinketWindow of [true, oldIds] as const) {
    const legacy = ok(applyCommand(state, { ...command, trinketWindow }));
    expect(legacy.pendingChoice!.options.map((o) => o.id)).toEqual(["continue", "trinket:p006"]);
    expect(savedCommandSchema.parse({ ...command, trinketWindow })).toEqual({
      ...command,
      trinketWindow,
    });
  }
  expect(savedCommandSchema.parse(command)).toEqual(command);
  const second = ok(
    applyCommand(final.state, { ...command, skillId: "hero_skill:p007", targetId: "m2" }),
  );
  expect(second.pendingChoice).toBeUndefined();
  expect(second.state.battle!.usedTrinketIds).toEqual(final.state.battle!.usedTrinketIds);
});

it("姿态戒指多目标共骰，只翻一次且暴击压力不按目标重复", () => {
  const { state } = fixture(["trinket:p033"], "defensive", "hero_skill:p004", "upright", 18);
  const window = ok(
    applyCommand(state, {
      type: "playHeroSkillTargets",
      actorId: "h0",
      skillId: "hero_skill:p004",
      targetIds: ["m", "m2"],
      trinketWindow: HERO_SKILL_TRINKET_IDS,
    }),
  );
  const used = choose(window, "trinket:p033");
  expect(used.events.find((e) => e.type === "heroSkillTargetsResolved")).toMatchObject({
    roll: 4,
    resolutions: [
      expect.objectContaining({ outcome: "crit" }),
      expect.objectContaining({ outcome: "crit" }),
    ],
  });
  expect(used.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress)).toEqual(
    [2, 2, 2, 2],
  );
  expect(used.events.filter((e) => e.type === "trinketUsed")).toHaveLength(1);
  expect(used.state.battle!.rngCursor).toBe(1);
});

it("戒指反面图标漂移与未核实卡面在掷骰和翻面前拒绝", () => {
  const { state, command } = fixture(["trinket:p032"]);
  const ring = state.battle.trinkets!.cards.find((c) => c.id === "trinket:p032")!;
  const glyph = ring.inverted_half.effect_lines[0]![1]!;
  if (glyph.type !== "icon") throw new Error("缺少已核实姿态图标");
  for (const changed of [
    { ...ring, verification: { unverified: true, reasons: ["test"] } },
    {
      ...ring,
      inverted_half: {
        ...ring.inverted_half,
        effect_lines: [
          [
            { type: "text" as const, text: "Acc-2 if not in " },
            { ...glyph, icon: { ...glyph.icon, key: "stance_support_lit" } },
          ],
        ],
      },
    },
  ]) {
    const broken: GameState = {
      ...state,
      battle: {
        ...state.battle,
        trinkets: {
          ...state.battle.trinkets!,
          cards: state.battle.trinkets!.cards.map((c) => (c.id === ring.id ? changed : c)),
        },
      },
    };
    expect(applyCommand(broken, command).state).toBe(broken);
  }
});

it("戒指修正经过Point Blank Shot自身位移续接，只消费一次骰面与饰品", () => {
  const { state, command } = fixture(
    ["trinket:p032"],
    "aggressive",
    "hero_skill:p070",
    "upright",
    14,
  );
  let result = choose(ok(applyCommand(state, command)), "trinket:p032");
  expect(result.state.battle!.skillPrefix?.trinketAttack?.modifiers.crit).toBe(4);
  const events = [...result.events];
  for (let n = 0; result.state.battle!.shuffleIntents.length && n < 8; n++) {
    result = ok(applyCommand(result.state, { type: "resolveShuffles" }));
    events.push(...result.events);
  }
  expect(result.state.battle!.skillPrefix).toBeNull();
  expect(
    events.find((e) => e.type === "heroSkillResolved" && e.phase === "afterOwn"),
  ).toMatchObject({ roll: 5, resolution: { outcome: "crit" } });
  expect(result.state.battle!.rngCursor).toBe(1);
  expect(result.state.battle!.usedTrinketIds).toEqual(["trinket:p032"]);
  expect(events.filter((e) => e.type === "trinketUsed")).toHaveLength(1);
});

it("无Crit栏的技能不提供正面，反面仅要求Acc且姿态适用", () => {
  const front = fixture(["trinket:p033"], "defensive", "hero_skill:p028");
  expect(ok(applyCommand(front.state, front.command)).pendingChoice).toBeUndefined();
  const back = fixture(["trinket:p033"], "aggressive", "hero_skill:p028", "inverted");
  const opened = ok(applyCommand(back.state, back.command));
  expect(opened.pendingChoice!.options.map((o) => o.id)).toContain("trinket:p033");
  expect(choose(opened, "trinket:p033").state.battle!.trinkets!.held[0]!.face).toBe("upright");
});
