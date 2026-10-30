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
import { fortunateArmletUseProblem } from "./battle-fortunate-armlet";

const cards = normalizedTrinketFileSchema.parse(rawTrinkets).cards;
// 明示战斗机制夹具；完整牌池、技能和属性均来自目录，不冒称自然获得路径。
function fixture(
  ids: readonly HeroSkillTrinketId[],
  stance: SkillStance = "aggressive",
  skillId = "hero_skill:p001",
  face: "upright" | "inverted" = "upright",
  seed = 4,
  monsterId = "monster_medium:p001",
  light = 5,
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
    light,
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

const armlet = "trinket:p025" as const;
const useArmlet = { type: "useTrinket", actorId: "h0", cardId: armlet } as const;
it.each([
  [4, "miss", "hit"], // d10=10：Smite Acc9，+1才命中。
  [7, "hit", "crit"], // d10=1：Smite Crit0，+1才暴击。
] as const)("Fortunate Armlet同时提供Acc+1与Crit+1：seed%s", (seed, before, after) => {
  const { state, command } = fixture([armlet], "aggressive", "hero_skill:p001", "upright", seed);
  const opened = ok(applyCommand(state, command));
  expect(opened.pendingChoice!.options[1]!.label).toContain("Acc+1、Crit+1");
  expect(outcome(choose(opened, "continue"))!.resolution.outcome).toBe(before);
  const used = choose({ ...opened, state: JSON.parse(JSON.stringify(opened.state)) }, armlet);
  expect(outcome(used)!.resolution.outcome).toBe(after);
  expect(used.state.battle!.rngCursor).toBe(1);
  expect(used.state.battle!.trinkets!.held[0]!.face).toBe("inverted");
  expect(used.state.battle!.encounter!.turn).toMatchObject({ actions: 1 });
  expect(applyCommand(used.state, useArmlet).state).toBe(used.state);
});

it("Fortunate Armlet多饰品/多目标共骰，只翻一次，旧十二张名单不新增选项", () => {
  const { state, command } = fixture([armlet, "trinket:p006"], "aggressive", "hero_skill:p004");
  const opened = ok(
    applyCommand(state, { ...command, type: "playHeroSkillTargets", targetIds: ["m", "m2"] }),
  );
  const planned = choose(opened, armlet);
  expect(planned.state.battle!.trinkets!.held.every((h) => h.face === "upright")).toBe(true);
  const used = choose(planned, "trinket:p006");
  expect(used.events.find((e) => e.type === "heroSkillTargetsResolved")).toMatchObject({
    roll: 10,
    resolutions: [
      expect.objectContaining({ outcome: "hit" }),
      expect.objectContaining({ outcome: "hit" }),
    ],
  });
  expect(used.events.filter((e) => e.type === "trinketUsed")).toHaveLength(2);
  expect(used.state.battle!.rngCursor).toBe(1);
  const single = fixture([armlet]);
  const old = HERO_SKILL_TRINKET_IDS.filter((id) => id !== armlet);
  for (const trinketWindow of [undefined, true, old] as const) {
    const { trinketWindow: _window, ...legacy } = single.command;
    void _window;
    expect(
      ok(applyCommand(single.state, { ...legacy, ...(trinketWindow ? { trinketWindow } : {}) }))
        .pendingChoice,
    ).toBeUndefined();
  }
  expect(savedCommandSchema.parse(useArmlet)).toEqual(useArmlet);
  expect(savedCommandSchema.safeParse({ ...useArmlet, cardId: "trinket:p006" }).success).toBe(
    false,
  );
});

it("Fortunate Armlet反面免费加压，不改技能骰/行动，下一角色回合才能再用", () => {
  const { state } = fixture([armlet], "aggressive", "hero_skill:p001", "inverted");
  const before = structuredClone(state);
  const result = ok(applyCommand(state, useArmlet));
  expect(fortunateArmletUseProblem(state, "h0")).toBeNull();
  const parsed = savedCommandSchema.parse(useArmlet);
  if (parsed.type !== "useTrinket") throw new Error("饰品命令类型漂移");
  expect(result).toEqual(applyCommand(JSON.parse(JSON.stringify(state)), parsed));
  expect(result.state.battle!.entities.find((e) => e.id === "h0")!.stress).toBe(4);
  expect(result.state.battle!.trinkets!.held[0]!.face).toBe("upright");
  expect(result.state.battle!.usedTrinketIds).toEqual([armlet]);
  expect(result.state.battle!.rngCursor).toBe(state.battle.rngCursor);
  expect(result.state.battle!.encounter).toEqual(state.battle.encounter);
  expect(result.events.filter((e) => e.type === "trinketUsed")).toHaveLength(1);
  expect(applyCommand(result.state, useArmlet).state).toBe(result.state);
  expect(state).toEqual(before);
  const first = ok(
    applyCommand(result.state, {
      type: "playHeroSkill",
      actorId: "h0",
      targetId: "m",
      skillId: "hero_skill:p001",
      trinketWindow: HERO_SKILL_TRINKET_IDS,
    }),
  );
  const second = ok(
    applyCommand(first.state, {
      type: "playHeroSkill",
      actorId: "h0",
      targetId: "m2",
      skillId: "hero_skill:p007",
      trinketWindow: HERO_SKILL_TRINKET_IDS,
    }),
  );
  expect(first.pendingChoice).toBeUndefined();
  expect(second.state.battle!.encounter!.turn).toEqual({ type: "awaitingInitiative" });
  const next = ok(applyCommand(second.state, { type: "drawInitiative" }));
  expect(next.state.battle!.usedTrinketIds).toEqual([]);
});

it("Fortunate Armlet无Crit栏仍可加Acc；自身位移待选沿用原骰和两项修正", () => {
  const status = fixture([armlet], "aggressive", "hero_skill:p028", "upright", 4);
  const opened = ok(applyCommand(status.state, status.command));
  expect(opened.pendingChoice!.options.map((o) => o.id)).toContain(armlet);
  expect(outcome(choose(opened, armlet))!.resolution.outcome).toBe("hit");
  const { state: initial, command } = fixture(
    [armlet],
    "aggressive",
    "hero_skill:p070",
    "upright",
    18,
  );
  const state: GameState = {
    ...initial,
    battle: {
      ...initial.battle,
      areas: [
        { id: "a", adjacent: ["b", "c"], elevation: "normal", capacity: 8 },
        { id: "b", adjacent: ["a"], elevation: "normal", capacity: 8 },
        { id: "c", adjacent: ["a"], elevation: "normal", capacity: 8 },
      ],
    },
  };
  let result = choose(ok(applyCommand(state, command)), armlet);
  expect(result.state.battle!.skillPrefix?.trinketAttack?.modifiers).toMatchObject({
    accuracy: 1,
    crit: 1,
  });
  const events = [...result.events];
  for (
    let i = 0;
    (result.pendingChoice || result.state.battle!.shuffleIntents.length) && i < 12;
    i++
  ) {
    result = result.pendingChoice
      ? choose(
          { ...result, state: JSON.parse(JSON.stringify(result.state)) },
          result.pendingChoice.options[0]!.id,
        )
      : ok(applyCommand(result.state, { type: "resolveShuffles" }));
    events.push(...result.events);
  }
  expect(result.state.battle!.skillPrefix).toBeNull();
  expect(result.state.battle!.rngCursor).toBe(1);
  expect(events.filter((e) => e.type === "trinketUsed")).toHaveLength(1);
  expect(
    events.find((e) => e.type === "heroSkillResolved" && e.phase === "afterOwn"),
  ).toMatchObject({ roll: 4, resolution: { outcome: "hit" } });
});

it("Fortunate Armlet反面经低光和Nervous加压，意志/心脏病及牌堆缺失沿原收尾", () => {
  const { state } = fixture([armlet], "aggressive", "hero_skill:p001", "inverted");
  const nervous: GameState = {
    ...state,
    battle: {
      ...state.battle,
      light: 2,
      entities: state.battle.entities.map((e) =>
        e.id === "h0" ? { ...e, quirkIds: ["quirk:p028"] } : e,
      ),
    },
  };
  expect(
    ok(applyCommand(nervous, useArmlet)).state.battle!.entities.find((e) => e.id === "h0")!.stress,
  ).toBe(6);
  const atNine: GameState = {
    ...state,
    battle: {
      ...state.battle,
      resolveCards: coreQuestSources.resolveCards,
      entities: state.battle.entities.map((e) => (e.id === "h0" ? { ...e, stress: 9 } : e)),
    },
  };
  const tested = ok(applyCommand(atNine, useArmlet));
  const hero = tested.state.battle!.entities.find((e) => e.id === "h0")!;
  expect(hero).toMatchObject({ stress: 0, resolveTested: true, dead: false });
  expect(tested.events.some((e) => e.type === "resolveTested")).toBe(true);
  const dies: GameState = {
    ...atNine,
    battle: {
      ...tested.state.battle!,
      entities: tested.state.battle!.entities.map((e) => (e.id === "h0" ? { ...e, stress: 9 } : e)),
      trinkets: state.battle.trinkets!,
      usedTrinketIds: [],
    },
  };
  const dead = ok(applyCommand(dies, useArmlet));
  expect(dead.state.battle!.entities.find((e) => e.id === "h0")!.dead).toBe(true);
  expect(dead.events.some((e) => e.type === "heartAttack")).toBe(true);
  expect(dead.state.battle!.encounter!.turn).not.toMatchObject({ type: "hero", actorId: "h0" });
  const targeted: GameState = {
    ...dies,
    battle: {
      ...dies.battle!,
      encounter: { ...dies.battle!.encounter!, turn: { type: "monster", actorId: "m" } },
      monsterAction: {
        actorId: "m",
        targetId: "h0",
        skillSlot: 1,
        selectionRoll: null,
        positioned: true,
      },
    },
  };
  // 不制造已定目标死亡后既不能攻击又不能重新选招的状态；未接续接保持原子停点。
  expect(applyCommand(targeted, useArmlet).state).toBe(targeted);
  const missing: GameState = { ...atNine, battle: { ...atNine.battle!, resolveCards: [] } };
  expect(applyCommand(missing, useArmlet).state).toBe(missing);
});

it("Fortunate Armlet反面可在他人及已定位怪物回合使用，不能插入未完成结算", () => {
  const { state, command } = fixture([armlet], "aggressive", "hero_skill:p001", "inverted");
  const other: GameState = {
    ...state,
    battle: {
      ...state.battle,
      encounter: {
        ...state.battle.encounter,
        turn: { type: "hero", actorId: "h1", actions: 2, usedSkillIds: [] },
      },
    },
  };
  expect(ok(applyCommand(other, useArmlet)).state.battle!.encounter).toEqual(
    other.battle!.encounter,
  );
  const monster: GameState = {
    ...state,
    battle: {
      ...state.battle,
      encounter: { ...state.battle.encounter, turn: { type: "monster", actorId: "m" } },
      monsterAction: {
        actorId: "m",
        skillSlot: 1,
        selectionRoll: null,
        targetId: "h1",
        positioned: true,
      },
    },
  };
  expect(ok(applyCommand(monster, useArmlet)).state.battle!.monsterAction).toEqual(
    monster.battle!.monsterAction,
  );
  const positive = fixture([armlet]);
  const pending = ok(applyCommand(positive.state, positive.command)).state;
  for (const invalid of [
    positive.state,
    pending,
    { ...monster, battle: { ...monster.battle!, monsterAction: null } },
    { ...state, battle: { ...state.battle, usedTrinketIds: [armlet] } },
    {
      ...state,
      battle: {
        ...state.battle,
        shuffleIntents: [
          { entityId: "h0", relativeToId: "m", move: { direction: "push" as const, distance: 1 } },
        ],
      },
    },
    {
      ...state,
      battle: {
        ...state.battle,
        entities: state.battle.entities.map((e) => (e.id === "h0" ? { ...e, dead: true } : e)),
      },
    },
  ])
    expect(applyCommand(invalid, useArmlet).state).toBe(invalid);
  expect(applyCommand(state, { ...useArmlet, actorId: "h1" }).state).toBe(state);
  expect(ok(applyCommand(state, command)).pendingChoice).toBeUndefined();
});

it("Fortunate Armlet正反面卡面漂移均拒绝，不消费骰、翻面或压力", () => {
  for (const face of ["upright", "inverted"] as const) {
    const { state, command } = fixture([armlet], "aggressive", "hero_skill:p001", face);
    const card = state.battle.trinkets!.cards.find((c) => c.id === armlet)!;
    const glyph = card.inverted_half.effect_lines[0]![0]!;
    if (glyph.type !== "icon") throw new Error("缺压力图标");
    for (const changed of [
      {
        ...card,
        upright_half: {
          ...card.upright_half,
          effect_lines: [[{ type: "text" as const, text: "Acc+2 and Crit+1" }]],
        },
      },
      {
        ...card,
        inverted_half: {
          ...card.inverted_half,
          effect_lines: [
            [
              { ...glyph, icon: { ...glyph.icon, key: "damage" } },
              { type: "text" as const, text: " +1" },
            ],
          ],
        },
      },
      {
        ...card,
        inverted_half: {
          ...card.inverted_half,
          effect_lines: [
            [
              { ...glyph, icon: { ...glyph.icon, naming: "unverified" as const } },
              { type: "text" as const, text: " +1" },
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
            cards: state.battle.trinkets!.cards.map((c) => (c.id === armlet ? changed : c)),
          },
        },
      };
      expect(applyCommand(broken, face === "upright" ? command : useArmlet).state).toBe(broken);
    }
  }
});

it.each([
  ["trinket:p001", "aggressive", "hero_skill:p001"],
  ["trinket:p002", "ranged", "hero_skill:p067"],
  ["trinket:p009", "support", "hero_skill:p088"],
  ["trinket:p014", "defensive", "hero_skill:p001"],
  ["trinket:p013", "aggressive", "hero_skill:p001"],
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
  ["trinket:p013", "defensive", "hero_skill:p001"],
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

it.each(["trinket:p001", "trinket:p013"] as const)(
  "%s：新名单多目标技能共骰并只翻一次，两目标均由落空变命中",
  (id) => {
    const { state, command } = fixture([id], "aggressive", "hero_skill:p004");
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
    const used = choose(window, id);
    expect(multi(used)).toMatchObject({
      roll: 10,
      resolutions: [
        expect.objectContaining({ outcome: "hit" }),
        expect.objectContaining({ outcome: "hit" }),
      ],
    });
    expect(used.events.filter((e) => e.type === "trinketUsed")).toHaveLength(1);
    expect(used.state.battle!.usedTrinketIds).toEqual([id]);
    expect(used.state.battle!.rngCursor).toBe(1);
  },
);

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

it.each(["trinket:p001", "trinket:p013"] as const)(
  "%s：每件饰品分别限一次，第二行动仍可用未使用的暴击石",
  (id) => {
    const { state, command } = fixture(["trinket:p006", id]);
    const first = choose(choose(ok(applyCommand(state, command)), id), "continue");
    expect(first.state.battle!.usedTrinketIds).toEqual([id]);
    expect(first.state.battle!.encounter!.turn).toMatchObject({ actions: 1 });
    const second = ok(
      applyCommand(first.state, { ...command, targetId: "m2", skillId: "hero_skill:p007" }),
    );
    expect(second.pendingChoice!.options.map((o) => o.id)).toEqual(["continue", "trinket:p006"]);
    expect(choose(second, "trinket:p006").state.battle!.usedTrinketIds).toEqual([
      id,
      "trinket:p006",
    ]);
  },
);

it("Warrior’s Bracer需要p013的已确认正面图标，缺失、改名、未核实或冲突均拒绝", () => {
  const { state, command } = fixture(["trinket:p013"]);
  const bracer = state.battle.trinkets!.cards.find((c) => c.id === "trinket:p013")!;
  const glyph = bracer.front_icons.find((i) => i.iconId === "fe18ec5b80")!;
  const others = bracer.front_icons.filter((i) => i.iconId !== glyph.iconId);
  for (const front_icons of [
    others,
    [...others, { ...glyph, key: "stance_defensive_lit" }],
    [...others, { ...glyph, iconId: "0000000000" }],
    [...others, { ...glyph, status: "needs_review" as const, naming: "unverified" as const }],
    [...bracer.front_icons, glyph],
  ]) {
    const broken: GameState = {
      ...state,
      battle: {
        ...state.battle,
        trinkets: {
          ...state.battle.trinkets!,
          cards: state.battle.trinkets!.cards.map((c) =>
            c.id === bracer.id ? { ...c, front_icons } : c,
          ),
        },
      },
    };
    expect(applyCommand(broken, command).state).toBe(broken);
  }
});

it("Warrior’s Bracer的新旧能力名单与JSON续接：旧十一张不增窗口，新名单不提前翻面", () => {
  const { state, command } = fixture(["trinket:p013"]);
  const before = structuredClone(state);
  const { trinketWindow: _window, ...unflagged } = command;
  void _window;
  const oldIds = [
    "trinket:p006",
    "trinket:p001",
    "trinket:p002",
    "trinket:p009",
    "trinket:p014",
    "trinket:p031",
    "trinket:p032",
    "trinket:p033",
    "trinket:p034",
    "trinket:p021",
    "trinket:p026",
  ] as const;
  for (const trinketWindow of [undefined, true, oldIds] as const) {
    const legacy = trinketWindow === undefined ? unflagged : { ...command, trinketWindow };
    const skipped = ok(applyCommand(state, legacy));
    expect(skipped.pendingChoice).toBeUndefined();
    expect(outcome(skipped)).toMatchObject({ roll: 10, resolution: { outcome: "miss" } });
    expect(skipped.state.battle!.trinkets!.held[0]!.face).toBe("upright");
    expect(savedCommandSchema.parse(legacy)).toEqual(legacy);
  }
  const opened = ok(applyCommand(state, command));
  expect(opened.state.battle!.trinkets).toEqual(state.battle.trinkets);
  expect(opened.state.battle!.rngCursor).toBe(0);
  expect(
    choose({ ...opened, state: JSON.parse(JSON.stringify(opened.state)) }, "trinket:p013"),
  ).toEqual(choose(opened, "trinket:p013"));
  expect(savedCommandSchema.parse(command)).toEqual(command);
  expect(state).toEqual(before);
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

it.each(["trinket:p021", "trinket:p026"] as const)(
  "%s：光照2/3/4逐面边界，正面Crit+2、反面命中零伤害",
  (id) => {
    for (const light of [2, 3, 4]) {
      for (const face of ["upright", "inverted"] as const) {
        const allowed = (id === "trinket:p021") === (face === "upright") ? light <= 3 : light >= 3;
        const { state, command } = fixture(
          [id],
          "aggressive",
          "hero_skill:p001",
          face,
          0,
          "monster_medium:p001",
          light,
        );
        const initial = structuredClone(state);
        const window = ok(applyCommand(state, command));
        if (!allowed) {
          expect(window.pendingChoice).toBeUndefined();
          expect(window.state.battle!.trinkets!.held[0]!.face).toBe(face);
          continue;
        }
        expect(window.state.battle!.rngCursor).toBe(0);
        expect(window.state.battle!.entities).toEqual(state.battle.entities);
        const skipped = choose(window, "continue");
        expect(outcome(skipped)).toMatchObject({ roll: 3, resolution: { outcome: "hit" } });
        const used = choose({ ...window, state: JSON.parse(JSON.stringify(window.state)) }, id);
        expect(outcome(used)).toMatchObject({
          roll: 3,
          resolution:
            face === "upright"
              ? { outcome: "crit" }
              : { outcome: "hit", damageDealt: 0, riposteDamage: null },
        });
        expect(used.state.battle!.trinkets!.held[0]!.face).toBe(
          face === "upright" ? "inverted" : "upright",
        );
        expect(used.state.battle!.usedTrinketIds).toEqual([id]);
        expect(used.state.battle!.rngCursor).toBe(1);
        expect(used.state.battle!.encounter!.turn).toMatchObject({ actions: 1 });
        expect(used.events.filter((e) => e.type === "trinketUsed")).toHaveLength(1);
        expect(state).toEqual(initial);
        // Crit0 + 光照1 + 饰品2=3，紧邻的骰4仍是普通命中。
        if (face === "upright") {
          const above = fixture(
            [id],
            "aggressive",
            "hero_skill:p001",
            face,
            18,
            "monster_medium:p001",
            light,
          );
          expect(outcome(choose(ok(applyCommand(above.state, above.command)), id))).toMatchObject({
            roll: 4,
            resolution: { outcome: "hit" },
          });
        }
      }
    }
  },
);

it("反面取消含Unholy加成的伤害与反弹，保留命中状态及光照效果", () => {
  const run = fixture(
    ["trinket:p021"],
    "aggressive",
    "hero_skill:p001",
    "inverted",
    18,
    "monster_medium:p001",
    3,
  );
  const state: GameState = {
    ...run.state,
    battle: {
      ...run.state.battle,
      entities: run.state.battle.entities.map((e) =>
        e.id === "m" ? { ...e, protection: true, riposte: true } : e,
      ),
    },
  };
  const window = ok(applyCommand(state, run.command));
  expect(outcome(choose(window, "continue"))).toMatchObject({
    resolution: { damageDealt: 4, riposteDamage: 4 },
  });
  const used = choose(window, "trinket:p021");
  expect(outcome(used)).toMatchObject({
    resolution: { outcome: "hit", damageDealt: 0, riposteDamage: null },
  });
  expect(used.state.battle!.entities.find((e) => e.id === "h0")!.wounds).toBe(0);
  expect(used.state.battle!.entities.find((e) => e.id === "m")!.wounds).toBe(0);
  const status = fixture(
    ["trinket:p021"],
    "support",
    "hero_skill:p091",
    "inverted",
    18,
    "monster_medium:p001",
    3,
  );
  const resolved = choose(ok(applyCommand(status.state, status.command)), "trinket:p021");
  expect(outcome(resolved)).toMatchObject({ resolution: { outcome: "hit", damageDealt: 0 } });
  expect(resolved.state.battle!.entities.find((e) => e.id === "m")!.statusStacks).toContainEqual({
    kind: "stun",
    remaining: 1,
  });
  expect(resolved.state.battle!.light).toBe(4);
});

it("先用命中石将落空改为命中，才提供反面零伤害；选择暂存且JSON续接不重掷", () => {
  const run = fixture(
    ["trinket:p021", "trinket:p001"],
    "aggressive",
    "hero_skill:p001",
    "upright",
    4,
    "monster_medium:p001",
    3,
  );
  const state: GameState = {
    ...run.state,
    battle: {
      ...run.state.battle,
      trinkets: {
        ...run.state.battle.trinkets!,
        held: run.state.battle.trinkets!.held.map((h) =>
          h.cardId === "trinket:p021" ? { ...h, face: "inverted" } : h,
        ),
      },
    },
  };
  const opened = ok(applyCommand(state, run.command));
  expect(opened.pendingChoice!.options.map((o) => o.id)).toEqual(["continue", "trinket:p001"]);
  const planned = choose(opened, "trinket:p001");
  expect(planned.pendingChoice!.options.map((o) => o.id)).toEqual(["continue", "trinket:p021"]);
  expect(planned.state.battle!.trinkets).toEqual(state.battle!.trinkets);
  expect(planned.state.battle!.rngCursor).toBe(0);
  const used = choose(
    { ...planned, state: JSON.parse(JSON.stringify(planned.state)) },
    "trinket:p021",
  );
  expect(outcome(used)).toMatchObject({ roll: 10, resolution: { outcome: "hit", damageDealt: 0 } });
  expect(used.state.battle!.usedTrinketIds).toEqual(["trinket:p001", "trinket:p021"]);
  expect(used.state.battle!.rngCursor).toBe(1);
});

it("若Acc惩罚会令已选零伤害失去命中条件，则不提供该无效组合", () => {
  const { state, command } = fixture(
    ["trinket:p021", "trinket:p006"],
    "aggressive",
    "hero_skill:p001",
    "inverted",
    2,
    "monster_medium:p001",
    3,
  );
  const opened = ok(applyCommand(state, command));
  const zero = choose(opened, "trinket:p021");
  expect(zero.pendingChoice).toBeUndefined();
  expect(outcome(zero)).toMatchObject({ roll: 8, resolution: { outcome: "hit", damageDealt: 0 } });
  expect(zero.state.battle!.usedTrinketIds).toEqual(["trinket:p021"]);
  expect(zero.state.battle!.trinkets!.held.find((h) => h.cardId === "trinket:p006")!.face).toBe(
    "inverted",
  );
  const miss = choose(opened, "trinket:p006");
  expect(miss.pendingChoice).toBeUndefined();
  expect(outcome(miss)).toMatchObject({ roll: 8, resolution: { outcome: "miss" } });
  expect(miss.state.battle!.usedTrinketIds).toEqual(["trinket:p006"]);
});

it("反面多目标共骰仍为暴击、零伤害，只翻一次；纯状态技能不提供零伤害", () => {
  const { state } = fixture(
    ["trinket:p021"],
    "defensive",
    "hero_skill:p004",
    "inverted",
    7,
    "monster_medium:p001",
    3,
  );
  const opened = ok(
    applyCommand(state, {
      type: "playHeroSkillTargets",
      actorId: "h0",
      skillId: "hero_skill:p004",
      targetIds: ["m", "m2"],
      trinketWindow: HERO_SKILL_TRINKET_IDS,
    }),
  );
  const used = choose(opened, "trinket:p021");
  expect(used.events.find((e) => e.type === "heroSkillTargetsResolved")).toMatchObject({
    roll: 1,
    resolutions: [
      expect.objectContaining({ outcome: "crit", damageDealt: 0 }),
      expect.objectContaining({ outcome: "crit", damageDealt: 0 }),
    ],
  });
  expect(
    used.state
      .battle!.entities.filter((e) => e.side === "monster")
      .every((e) => e.wounds === 0 && !e.dead),
  ).toBe(true);
  expect(used.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress)).toEqual(
    [2, 2, 2, 2],
  );
  expect(used.state.battle!.rngCursor).toBe(1);
  expect(used.events.filter((e) => e.type === "trinketUsed")).toHaveLength(1);
  const status = fixture(
    ["trinket:p021"],
    "aggressive",
    "hero_skill:p028",
    "inverted",
    18,
    "monster_medium:p001",
    3,
  );
  expect(ok(applyCommand(status.state, status.command)).pendingChoice).toBeUndefined();
});

it("反面零伤害经过自身位移续接，仍保留目标推离、一次骰与翻面", () => {
  const { state: initial, command } = fixture(
    ["trinket:p026"],
    "aggressive",
    "hero_skill:p070",
    "inverted",
    18,
    "monster_medium:p001",
    3,
  );
  // 同区自身Push先选b，随后目标可从a向远离使用者的c移动。
  const state: GameState = {
    ...initial,
    battle: {
      ...initial.battle,
      areas: [
        { id: "a", adjacent: ["b", "c"], elevation: "normal", capacity: 8 },
        { id: "b", adjacent: ["a"], elevation: "normal", capacity: 8 },
        { id: "c", adjacent: ["a"], elevation: "normal", capacity: 8 },
      ],
    },
  };
  let used = choose(ok(applyCommand(state, command)), "trinket:p026");
  expect(used.state.battle!.skillPrefix?.trinketAttack?.modifiers.dealNoDamage).toBe(true);
  const events = [...used.events];
  for (let n = 0; (used.state.battle!.shuffleIntents.length || used.pendingChoice) && n < 12; n++) {
    used = used.pendingChoice
      ? choose(used, used.pendingChoice.options[0]!.id)
      : ok(applyCommand(used.state, { type: "resolveShuffles" }));
    events.push(...used.events);
  }
  expect(used.state.battle!.skillPrefix).toBeNull();
  expect(
    events.find((e) => e.type === "heroSkillResolved" && e.phase === "afterOwn"),
  ).toMatchObject({ roll: 4, resolution: { outcome: "hit", damageDealt: 0 } });
  expect(used.state.battle!.entities.find((e) => e.id === "h0")!.areaId).toBe("b");
  expect(used.state.battle!.entities.find((e) => e.id === "m")!.areaId).toBe("c");
  expect(used.state.battle!.rngCursor).toBe(1);
  expect(events.filter((e) => e.type === "trinketUsed")).toHaveLength(1);
});

it("多目标中先落空的目标不掩盖后面的命中；按当前共骰结果提供反面", () => {
  const run = fixture(
    ["trinket:p021", "trinket:p001"],
    "defensive",
    "hero_skill:p004",
    "upright",
    4,
    "monster_medium:p001",
    3,
  );
  const courtier = coreQuestSources.catalog.monsters.find((c) => c.id === "monster_medium:p004")!;
  const state: GameState = {
    ...run.state,
    battle: {
      ...run.state.battle,
      entities: run.state.battle.entities.map((e) =>
        e.id === "m2"
          ? { ...e, monsterCardId: courtier.id, life: courtier.life, dodge: courtier.dodge! }
          : e,
      ),
      trinkets: {
        ...run.state.battle.trinkets!,
        held: run.state.battle.trinkets!.held.map((h) =>
          h.cardId === "trinket:p021" ? { ...h, face: "inverted" } : h,
        ),
      },
    },
  };
  const opened = ok(
    applyCommand(state, {
      type: "playHeroSkillTargets",
      actorId: "h0",
      skillId: "hero_skill:p004",
      targetIds: ["m2", "m"],
      trinketWindow: HERO_SKILL_TRINKET_IDS,
    }),
  );
  const planned = choose(opened, "trinket:p001");
  expect(planned.pendingChoice!.options.map((o) => o.id)).toContain("trinket:p021");
  const used = choose(planned, "trinket:p021");
  expect(used.events.find((e) => e.type === "heroSkillTargetsResolved")).toMatchObject({
    roll: 10,
    resolutions: [
      expect.objectContaining({ targetId: "m2", outcome: "miss", damageDealt: null }),
      expect.objectContaining({ targetId: "m", outcome: "hit", damageDealt: 0 }),
    ],
  });
  expect(used.state.battle!.rngCursor).toBe(1);
});

it("旧九张能力名单不启用护腕；比较符漂移、光照篡改的待选原子拒绝", () => {
  const { state, command } = fixture(
    ["trinket:p021"],
    "aggressive",
    "hero_skill:p001",
    "inverted",
    18,
    "monster_medium:p001",
    3,
  );
  const oldIds = [
    "trinket:p006",
    "trinket:p001",
    "trinket:p002",
    "trinket:p009",
    "trinket:p014",
    "trinket:p031",
    "trinket:p032",
    "trinket:p033",
    "trinket:p034",
  ] as const;
  const legacy = { ...command, trinketWindow: oldIds };
  expect(ok(applyCommand(state, legacy)).pendingChoice).toBeUndefined();
  expect(savedCommandSchema.parse(legacy)).toEqual(legacy);
  expect(savedCommandSchema.parse(command)).toEqual(command);
  const broken: GameState = {
    ...state,
    battle: {
      ...state.battle,
      trinkets: {
        ...state.battle.trinkets!,
        cards: state.battle.trinkets!.cards.map((c) =>
          c.id !== "trinket:p021"
            ? c
            : {
                ...c,
                upright_half: {
                  ...c.upright_half,
                  effect_lines: c.upright_half.effect_lines.map((l) =>
                    l.map((s) =>
                      s.type === "icon" && s.icon.key === "compare_lte"
                        ? { ...s, icon: { ...s.icon, key: "compare_gte" } }
                        : s,
                    ),
                  ),
                },
              },
        ),
      },
    },
  };
  expect(applyCommand(broken, command).state).toBe(broken);
  const window = ok(applyCommand(state, command));
  const forged: GameState = { ...window.state, battle: { ...window.state.battle!, light: 2 } };
  expect(
    applyCommand(forged, {
      type: "resolveChoice",
      choiceId: window.pendingChoice!.id,
      optionId: "trinket:p021",
    }).state,
  ).toBe(forged);
});

const damageStone = "trinket:p007" as const;
function withoutTrinkets(command: PlayHeroSkillCommand): PlayHeroSkillCommand {
  const legacy = { ...command };
  delete legacy.trinketWindow;
  return legacy;
}
it.each([false, true])("Damage Stone +3在Protection前相加：protection=%s", (protection) => {
  const { state, command } = fixture([damageStone], "aggressive", "hero_skill:p001", "upright", 7);
  const prepared = {
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((e) =>
        e.side === "monster" ? { ...e, protection } : e,
      ),
    },
  };
  const before = JSON.stringify(prepared);

  const opened = ok(applyCommand(prepared, command));
  expect(opened.pendingChoice!.options.some((o) => o.id === damageStone)).toBe(true);
  const used = choose(opened, damageStone);
  const baseDamage = outcome(ok(applyCommand(state, withoutTrinkets(command))))!.resolution
    .damageDealt!;
  expect(outcome(used)!.resolution.damageDealt).toBe(
    protection ? Math.ceil((baseDamage + 3) / 2) : baseDamage + 3,
  );
  expect(JSON.stringify(prepared)).toBe(before);
  expect(used.state.battle!.trinkets!.held[0]!.face).toBe("inverted");
  expect(used.state.battle!.usedTrinketIds).toContain(damageStone);
  expect(used.state.battle!.rngCursor).toBe(1);
  expect(
    choose({ ...opened, state: JSON.parse(JSON.stringify(opened.state)) }, damageStone),
  ).toEqual(used);
});
it("Damage Stone落空及反面不提供，旧十三张名单无新增选择", () => {
  const miss = fixture([damageStone]);
  expect(ok(applyCommand(miss.state, miss.command)).pendingChoice).toBeUndefined();
  const back = fixture([damageStone], "aggressive", "hero_skill:p001", "inverted", 7);
  expect(ok(applyCommand(back.state, back.command)).pendingChoice).toBeUndefined();
  const old = fixture([damageStone], "aggressive", "hero_skill:p001", "upright", 7);
  expect(
    ok(
      applyCommand(old.state, {
        ...old.command,
        trinketWindow: HERO_SKILL_TRINKET_IDS.filter((id) => id !== damageStone),
      }),
    ).pendingChoice,
  ).toBeUndefined();
});
it("Damage Stone多目标共享同一骰，翻面一次且每目标加3", () => {
  const { state, command } = fixture([damageStone], "aggressive", "hero_skill:p004", "upright", 7);
  const multi = {
    type: "playHeroSkillTargets" as const,
    actorId: "h0",
    skillId: command.skillId,
    targetIds: ["m", "m2"],
    trinketWindow: HERO_SKILL_TRINKET_IDS,
  };
  const opened = ok(applyCommand(state, multi));
  const used = choose(opened, damageStone);
  expect(used.events.filter((e) => e.type === "trinketUsed")).toHaveLength(1);
  expect(
    used.events
      .find((e) => e.type === "heroSkillTargetsResolved")!
      .resolutions.every(
        (r) =>
          r.damageDealt ===
          outcome(ok(applyCommand(state, withoutTrinkets(command))))!.resolution.damageDealt! + 3,
      ),
  ).toBe(true);
});

it("Damage Stone卡面漂移拒绝；与Critical Stone同技能暴击叠加仍限次", () => {
  const { state, command } = fixture(
    [damageStone, "trinket:p006"],
    "aggressive",
    "hero_skill:p001",
    "upright",
    7,
  );
  const opened = ok(applyCommand(state, command));
  const selected = choose(opened, damageStone);
  const done = choose(selected, "trinket:p006");
  expect(outcome(done)!.resolution.outcome).toBe("crit");
  const baseline = choose(ok(applyCommand(state, command)), "trinket:p006");
  const crit = choose(baseline, "continue");
  expect(outcome(done)!.resolution.damageDealt).toBe(outcome(crit)!.resolution.damageDealt! + 3);
  expect(done.events.filter((e) => e.type === "trinketUsed")).toHaveLength(2);
  const pool = state.battle!.trinkets!;
  const drift = {
    ...state,
    battle: {
      ...state.battle!,
      trinkets: {
        ...pool,
        cards: pool.cards.map((c) => (c.id === damageStone ? { ...c, name: "drift" } : c)),
      },
    },
  };
  expect(applyCommand(drift, command).events[0]!.type).toBe("commandRefused");
  expect(applyCommand(drift, command).state).toEqual(drift);
});
