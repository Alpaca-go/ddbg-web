import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { ApplyResult, Command, GameState } from "./command";
import { createBattleState } from "./battle";
import type { BattleEntity, PlayHeroSkillCommand } from "./battle";
import { coreQuestSources } from "./test-helpers/core-quest";
import { savedCommandSchema } from "../../data/src/quest-save";

const STONE = "trinket:p006";
// R26 黄金场景：Hellion I 的 Crit 1 + 已有一堆 Buff = Crit 2；seed18 掷出 4。
// 姿态、Buff、持牌和先攻为明示机制夹具；技能、怪物与完整饰品牌池来自正式目录。
function setup(seed = 18, face: "upright" | "inverted" = "upright", skillId = "hero_skill:p022") {
  const catalog = coreQuestSources.catalog;
  const skill = catalog.skills.find((s) => s.id === skillId)!;
  const names = [
    skill.hero!,
    ...["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].filter((n) => n !== skill.hero),
  ].slice(0, 4);
  const heroes: BattleEntity[] = names.map((name, i) => {
    const stat = catalog.heroStats.find((s) => s.name === name && s.level === 1)!;
    return {
      id: `h${i}`,
      hero: name,
      heroStatId: stat.id,
      heroLevel: 1,
      life: stat.life,
      side: "hero",
      stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
      areaId: "a",
      wounds: 0,
      stress: 3,
      dodge: stat.dodge!,
      dead: false,
      guard: false,
      skillIds: i === 0 ? [skillId, "hero_skill:p028"] : [],
      bleed: [],
      blight: [],
      ...(i === 0
        ? { buffStacks: 1, statusStacks: [{ kind: "buff" as const, remaining: 2 }] }
        : {}),
    };
  });
  const monster = catalog.monsters.find((m) => m.id === "monster_medium:p001")!;
  const enemies: BattleEntity[] = ["m1", "m2"].map((id, i) => ({
    id,
    hero: null,
    side: "monster",
    monsterCardId: monster.id,
    life: monster.life,
    wounds: 0,
    dodge: monster.dodge,
    guard: false,
    dead: false,
    stance: i === 0 ? "aggressive" : "defensive",
    stanceSlots: 1,
    areaId: skillId === "hero_skill:p004" ? "b" : "a",
    skillIds: [],
    bleed: [],
    blight: [],
  }));
  const game = createBattleState(seed, {
    ...catalog,
    entities: [...heroes, ...enemies],
    light: 5,
    areas: [
      { id: "a", adjacent: ["b"], capacity: 8, elevation: "normal" },
      { id: "b", adjacent: ["a"], capacity: 8, elevation: "normal" },
    ],
    trinkets: { ...catalog.trinkets!, held: [{ cardId: STONE, heroId: "h0", face }] },
  });
  return {
    ...game,
    battle: {
      ...game.battle!,
      encounter: {
        round: 1,
        deck: ["monster" as const, "hero" as const],
        actedIds: [],
        turn: { type: "hero" as const, actorId: "h0", actions: 2, usedSkillIds: [] },
      },
    },
  };
}
const attack: PlayHeroSkillCommand = {
  type: "playHeroSkill",
  trinketWindow: true,
  actorId: "h0",
  targetId: "m1",
  skillId: "hero_skill:p022",
};
function ok(result: ApplyResult) {
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return result;
}
function choose(window: ApplyResult, optionId = STONE) {
  return ok(
    applyCommand(window.state, {
      type: "resolveChoice",
      choiceId: window.pendingChoice!.id,
      optionId,
    }),
  );
}

it("G-10 / R26：骰4后选择Crit+2成为暴击，翻面、扣一次行动与骰；JSON及命令回放一致", () => {
  const initial = setup(),
    before = structuredClone(initial);
  const window = ok(applyCommand(initial, attack));
  expect(window.pendingChoice!.prompt).toContain("d10=4");
  expect(window.state.battle!.rngCursor).toBe(0);
  expect(window.state.battle!.entities).toEqual(initial.battle.entities);
  expect(window.state.battle!.encounter!.turn).toMatchObject({ actions: 2 });
  for (const command of [
    { type: "drawInitiative" },
    attack,
    { type: "useProvision", provisionId: "missing", targetId: "h0", effect: "heal" },
  ] as Command[])
    expect(applyCommand(window.state, command).state).toBe(window.state);
  const used = choose(window);
  const event = used.events.find((e) => e.type === "heroSkillResolved")!;
  expect(event).toMatchObject({ roll: 4, resolution: { outcome: "crit" } });
  expect(used.events.filter((e) => e.type === "trinketUsed")).toHaveLength(1);
  expect(used.state.battle!.trinkets!.held[0]!.face).toBe("inverted");
  expect(used.state.battle!.usedTrinketIds).toEqual([STONE]);
  expect(used.state.battle!.rngCursor).toBe(1);
  expect(used.state.battle!.encounter!.turn).toMatchObject({ actions: 1 });
  expect(initial).toEqual(before);
  expect(choose({ ...window, state: JSON.parse(JSON.stringify(window.state)) })).toEqual(used);
  const forged: GameState = {
    ...window.state,
    battle: {
      ...window.state.battle!,
      pending: {
        ...window.state.battle!.pending!,
        type: "heroTrinket",
        command: attack,
        roll: 5,
        face: "upright",
      },
    },
  };
  expect(
    applyCommand(forged, {
      type: "resolveChoice",
      choiceId: window.pendingChoice!.id,
      optionId: STONE,
    }).state,
  ).toBe(forged);
  expect(choose(ok(applyCommand(initial, attack)))).toEqual(used);
  expect(
    applyCommand(used.state, {
      type: "resolveChoice",
      choiceId: window.pendingChoice!.id,
      optionId: STONE,
    }).state,
  ).toBe(used.state);
  const declined = choose(window, "continue");
  expect(declined.events.find((e) => e.type === "heroSkillResolved")).toMatchObject({
    roll: 4,
    resolution: { outcome: "hit" },
  });
  expect(declined.state.battle!.trinkets!.held[0]!.face).toBe("upright");
  expect(declined.state.battle!.usedTrinketIds).toBeUndefined();
});

it("反面Acc−2可在骰8后主动使用并翻正，原命中变落空；放弃时不自动生效", () => {
  const window = ok(applyCommand(setup(2, "inverted"), attack));
  expect(window.pendingChoice!.prompt).toContain("d10=8");
  const used = choose(window),
    declined = choose(window, "continue");
  expect(used.events.find((e) => e.type === "heroSkillResolved")).toMatchObject({
    resolution: { outcome: "miss" },
  });
  expect(declined.events.find((e) => e.type === "heroSkillResolved")).toMatchObject({
    resolution: { outcome: "hit" },
  });
  expect(used.state.battle!.trinkets!.held[0]!.face).toBe("upright");
  expect(used.state.battle!.entities.find((e) => e.id === "m1")!.wounds).toBe(0);
  expect(used.state.battle!.rngCursor).toBe(1);
});

it("R-028：同一角色回合第二行动不再开窗，下一怪物回合重置次数", () => {
  const used = choose(ok(applyCommand(setup(), attack)));
  const second = ok(
    applyCommand(used.state, {
      type: "playHeroSkill",
      trinketWindow: true,
      actorId: "h0",
      targetId: "m2",
      skillId: "hero_skill:p028",
    }),
  );
  expect(second.state.battle!.pending).toBeNull();
  expect(second.state.battle!.trinkets!.held[0]!.face).toBe("inverted");
  expect(second.state.battle!.usedTrinketIds).toEqual([STONE]);
  const next = ok(applyCommand(second.state, { type: "drawInitiative" }));
  expect(next.events).toContainEqual(
    expect.objectContaining({ type: "turnStarted", side: "monster" }),
  );
  expect(next.state.battle!.usedTrinketIds).toEqual([]);
});

it("多目标共用一次饰品与骰面，暴击减压不按目标重复；自身位移续接仍保留修正", () => {
  const multi = ok(
    applyCommand(setup(18, "upright", "hero_skill:p004"), {
      type: "playHeroSkillTargets",
      trinketWindow: true,
      actorId: "h0",
      skillId: "hero_skill:p004",
      targetIds: ["m1", "m2"],
    }),
  );
  const result = choose(multi);
  expect(result.events.filter((e) => e.type === "trinketUsed")).toHaveLength(1);
  // Crit0 + Buff1 + 饰品2：骰4仍普通命中，不能把修正按两个目标累加为+4。
  expect(result.events.find((e) => e.type === "heroSkillTargetsResolved")).toMatchObject({
    roll: 4,
    resolutions: [
      expect.objectContaining({ outcome: "hit" }),
      expect.objectContaining({ outcome: "hit" }),
    ],
  });
  expect(result.state.battle!.rngCursor).toBe(1);
  const critical = choose(
    ok(
      applyCommand(setup(0, "upright", "hero_skill:p004"), {
        type: "playHeroSkillTargets",
        trinketWindow: true,
        actorId: "h0",
        skillId: "hero_skill:p004",
        targetIds: ["m1", "m2"],
      }),
    ),
  );
  expect(critical.events.find((e) => e.type === "heroSkillTargetsResolved")).toMatchObject({
    resolutions: [
      expect.objectContaining({ outcome: "crit" }),
      expect.objectContaining({ outcome: "crit" }),
    ],
  });
  expect(
    critical.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress),
  ).toEqual([2, 2, 2, 2]);
  let shifted = choose(
    ok(
      applyCommand(setup(18, "upright", "hero_skill:p070"), {
        ...attack,
        skillId: "hero_skill:p070",
      }),
    ),
  );
  expect(shifted.state.battle!.skillPrefix?.trinketAttack?.modifiers.crit).toBe(2);
  const events = [...shifted.events];
  for (let n = 0; shifted.state.battle!.shuffleIntents.length && n < 8; n++) {
    shifted = ok(applyCommand(shifted.state, { type: "resolveShuffles" }));
    events.push(...shifted.events);
  }
  expect(shifted.state.battle!.skillPrefix).toBeNull();
  expect(
    events.find((e) => e.type === "heroSkillResolved" && e.phase === "afterOwn"),
  ).toMatchObject({ roll: 4, resolution: { outcome: "crit" } });
  expect(shifted.state.battle!.rngCursor).toBe(1);
  expect(events.filter((e) => e.type === "trinketUsed")).toHaveLength(1);
});

it("非法技能与未核实饰品原子拒绝，其它持有人不影响当前技能", () => {
  const state = setup();
  expect(applyCommand(state, { ...attack, skillId: "missing" }).state).toBe(state);
  const broken: GameState = {
    ...state,
    battle: {
      ...state.battle,
      trinkets: {
        ...state.battle.trinkets!,
        cards: state.battle.trinkets!.cards.map((c) =>
          c.id === STONE ? { ...c, verification: { unverified: true, reasons: ["test"] } } : c,
        ),
      },
    },
  };
  expect(applyCommand(broken, attack).state).toBe(broken);
  const other: GameState = {
    ...state,
    battle: {
      ...state.battle,
      trinkets: {
        ...state.battle.trinkets!,
        held: [{ cardId: STONE, heroId: "h1", face: "upright" }],
      },
    },
  };
  expect(ok(applyCommand(other, attack)).state.battle!.pending).toBeNull();
});

it("旧技能日志仍直接结算；新窗口标记可存档且不接受伪造开关", () => {
  const legacy = {
    type: "playHeroSkill" as const,
    actorId: "h0",
    targetId: "m1",
    skillId: "hero_skill:p022",
  };
  const result = ok(applyCommand(setup(), legacy));
  expect(result.state.battle!.pending).toBeNull();
  expect(result.events.find((e) => e.type === "heroSkillResolved")).toMatchObject({
    roll: 4,
    resolution: { outcome: "hit" },
  });
  expect(result.state.battle!.trinkets!.held[0]!.face).toBe("upright");
  expect(savedCommandSchema.parse(legacy)).toEqual(legacy);
  expect(savedCommandSchema.parse(attack)).toEqual(attack);
  expect(savedCommandSchema.safeParse({ ...attack, trinketWindow: false }).success).toBe(false);
});
