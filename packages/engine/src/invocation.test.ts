import { expect, it } from "vitest";
import statsFile from "../../data/normalized/corebox/hero_stat.json";
import skillFile from "../../data/normalized/corebox/hero_skill.json";
import largeFile from "../../data/normalized/corebox/monster_large.json";
import monsterFile from "../../data/normalized/corebox/monster_medium.json";
import quirkFile from "../../data/normalized/corebox/quirk.json";
import diseaseFile from "../../data/normalized/corebox/disease.json";
import resolveFile from "../../data/normalized/corebox/virtue_affliction.json";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import {
  normalizedHeroSkillFileSchema,
  normalizedMonsterMediumFileSchema,
  normalizedQuirkFileSchema,
  normalizedMonsterLargeFileSchema,
} from "../../data/src/normalize/schema";
import { diseaseFileSchema } from "../../data/src/disease";
import { approvedExtraRuinsTiles } from "../../data/src/normalize/approved-ruins-tiles";
import { createBattleState } from "./battle";
import type { BattleEntity, BattleSetup } from "./battle";
import { applyCommand } from "./command";
import type { ApplyResult, GameState } from "./command";
import { roomTileBattleAreas } from "./battle-monster-movement";
import { createConditionPool } from "./conditions";
import type { MonsterCardView } from "./monster-skill";
import type { HeroSkillCardView } from "./hero-skill";
import type { ResolveCard } from "./pressure";

import { endRoundInvocation, isInvokingMonster } from "./battle-invocation";

const clean = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));
const tile = approvedExtraRuinsTiles.find((tile) => tile.number === 8)!;
const stats = normalizedHeroStatFileSchema
  .parse(statsFile)
  .cards.filter(
    (stat) =>
      stat.level === 1 && ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].includes(stat.name),
  );
const skills = clean<(HeroSkillCardView & { level: number })[]>(
  normalizedHeroSkillFileSchema.parse(skillFile).cards,
);
const monsters = clean<MonsterCardView[]>(
  [
    ...normalizedMonsterMediumFileSchema.parse(monsterFile).cards,
    ...normalizedMonsterLargeFileSchema.parse(largeFile).cards,
  ].filter((card) => "skills" in card),
);
const quirks = normalizedQuirkFileSchema.parse(quirkFile).cards;
const diseases = diseaseFileSchema.parse(diseaseFile).cards;

// 局部战斗布置使用获批几何／数值，不是完整任务验收。
function setup(
  hero: Partial<BattleEntity> = {},
  monster: Partial<BattleEntity> = {},
  seed = 1,
  cardId = "monster_medium:p001",
): GameState {
  const card = monsters.find((card) => card.id === cardId)!;
  return createBattleState(seed, {
    heroStats: clean<NonNullable<BattleSetup["heroStats"]>>(stats),
    skills,
    monsters: [card],
    light: 5,
    resolveCards: clean<ResolveCard[]>(resolveFile.cards),
    conditions: createConditionPool(diseases, quirks),
    areas: roomTileBattleAreas(tile),
    entities: [
      ...stats.map((stat, index): BattleEntity => ({
        id: `h${index}`,
        side: "hero",
        hero: stat.name,
        heroStatId: stat.id,
        heroLevel: 1,
        life: stat.life,
        wounds: 0,
        stress: 0,
        areaId: ["I9", "I9", "I10", "I10"][index]!,
        stance: (["aggressive", "defensive", "ranged", "support"] as const)[index]!,
        dodge: stat.dodge,
        skillIds: skills
          .filter((skill) => skill.hero === stat.name && skill.level === 1)
          .slice(0, 3)
          .map((skill) => skill.id),
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
        ...(index ? {} : hero),
      })),
      {
        id: "m",
        side: "monster",
        hero: null,
        monsterCardId: card.id,
        life: card.life,
        wounds: 0,
        areaId: "I1",
        stance: "aggressive",
        stanceSlots: 1,
        dodge: 0,
        skillIds: [],
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
        ...monster,
      },
    ],
  });
}

const entity = (s: GameState, id = "m") => s.battle!.entities.find((e) => e.id === id)!;
function success(r: ApplyResult) {
  expect(
    r.events.find((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBeUndefined();
  return r;
}
function turn(s: GameState, round = 1): GameState {
  return {
    ...s,
    battle: {
      ...s.battle!,
      encounter: { round, deck: ["hero"], actedIds: [], turn: { type: "monster", actorId: "m" } },
    },
  };
}
const prepare = (s: GameState) => applyCommand(s, { type: "prepareMonsterAction", actorId: "m" });

it("Invocation获批几何，仅I4投影两个效果；关闭时均不泄漏", () => {
  expect(tile.usable).toBe(true);
  expect(
    roomTileBattleAreas(tile)
      .filter((a) => a.invokerGoal || a.invokingAbyss)
      .map((a) => a.id),
  ).toEqual(["I4"]);
  expect(
    roomTileBattleAreas({ ...tile, usable: false }).some((a) => a.invokerGoal || a.invokingAbyss),
  ).toBe(false);
});
it("最后怪物按实际Speed走向I4，替代选招、目标和攻击，回放相同且不耗骰", () => {
  const s = turn(setup({}, { areaId: "I3" })),
    before = structuredClone(s),
    r = success(prepare(s));
  expect(entity(r.state).areaId).toBe("I4");
  expect(r.state.battle!.monsterAction).toBeNull();
  expect(r.state.battle!.rngCursor).toBe(s.battle!.rngCursor);
  expect(
    r.events.some((e) => e.type === "monsterActionPrepared" || e.type === "monsterSkillResolved"),
  ).toBe(false);
  expect(r.state.battle!.encounter!.actedIds).toEqual(["m"]);
  expect(s).toEqual(before);
  expect(prepare(s)).toEqual(r);
  expect(prepare(r.state).state).toBe(r.state);
});
it("已在I4仍替代整个步骤；其他未行动存活怪物存在时正常选招", () => {
  const s = turn(setup({}, { areaId: "I4" }));
  expect(entity(success(prepare(s)).state).areaId).toBe("I4");
  const extra = { ...entity(s), id: "other", areaId: "I2", stance: "support" as const };
  const multiple = { ...s, battle: { ...s.battle!, entities: [...s.battle!.entities, extra] } };
  expect(isInvokingMonster(multiple.battle, "m")).toBe(false);
  expect(success(prepare(multiple)).events.some((e) => e.type === "monsterActionPrepared")).toBe(
    true,
  );
  expect(
    isInvokingMonster(
      { ...multiple.battle, encounter: { ...s.battle!.encounter!, actedIds: ["other"] } },
      "m",
    ),
  ).toBe(true);
  expect(
    isInvokingMonster(
      {
        ...multiple.battle,
        entities: multiple.battle.entities.map((e) =>
          e.id === "other" ? { ...e, dead: true } : e,
        ),
      },
      "m",
    ),
  ).toBe(true);
});
it("Speed不足仅靠近，满员目标仍用于评分；未知Speed原子拒绝", () => {
  const s = turn(setup({}, { areaId: "I10" }));
  const r = success(prepare(s));
  expect(entity(r.state).areaId).toBe("I8"); // Bone Soldier Speed1，距离I4三段。
  const bad = {
    ...s,
    battle: { ...s.battle!, monsters: s.battle!.monsters!.map((m) => ({ ...m, speed: -1 })) },
  };
  expect(prepare(bad).state).toBe(bad);
  const full = {
    ...s,
    battle: {
      ...s.battle!,
      entities: s.battle!.entities.map((e) =>
        e.side === "hero" ? { ...e, areaId: "I4" } : { ...e, areaId: "I3" },
      ),
    },
  };
  const blocked = success(prepare(full));
  expect(entity(blocked.state).areaId).toBe("I3");
});
it("等距落点用PendingChoice，选择不重掷且旧选择不可重用", () => {
  const s = turn(setup());
  const fixture = {
    ...s,
    battle: {
      ...s.battle!,
      areas: [
        { id: "I1", capacity: 4, elevation: "normal" as const, adjacent: ["left", "right"] },
        { id: "left", capacity: 4, elevation: "normal" as const, adjacent: ["I1", "mid"] },
        { id: "right", capacity: 4, elevation: "normal" as const, adjacent: ["I1", "mid"] },
        { id: "mid", capacity: 4, elevation: "normal" as const, adjacent: ["left", "right", "I4"] },
        {
          id: "I4",
          capacity: 4,
          elevation: "normal" as const,
          adjacent: ["mid"],
          invokerGoal: true as const,
        },
        ...s.battle!.areas.filter((a) => a.id === "I9" || a.id === "I10"),
      ],
      monsters: s.battle!.monsters!.map((m) => ({ ...m, speed: 1 })),
    },
  }; // 几何边界夹具，非获批板块改图。
  const r = success(prepare(fixture));
  expect(r.pendingChoice!.options.map((o) => o.id)).toEqual(["left", "right"]);
  const c = { type: "resolveChoice" as const, choiceId: r.pendingChoice!.id, optionId: "left" };
  const done = success(applyCommand(r.state, c));
  expect(entity(done.state).areaId).toBe("left");
  expect(done.state.battle!.rngCursor).toBe(fixture.battle.rngCursor);
  expect(applyCommand(done.state, c).state).toBe(done.state);
  expect(applyCommand(prepare(fixture).state, c)).toEqual(done);
});
it("Large向满员I4移动时只挤出一名，玩家选择去处；没有攻击目标排除", () => {
  const base = turn(setup({}, { stanceSlots: 2, areaId: "I3" }, 1, "monster_large:p002"));
  const s = {
    ...base,
    battle: {
      ...base.battle!,
      entities: base.battle!.entities.map((e) => (e.side === "hero" ? { ...e, areaId: "I4" } : e)),
    },
  };
  const r = success(prepare(s));
  expect(r.state.battle!.pending?.type).toBe("invokerDisplace");
  expect(r.pendingChoice!.options.some((o) => o.id.startsWith("h0->"))).toBe(true);
  const done = success(
    applyCommand(r.state, {
      type: "resolveChoice",
      choiceId: r.pendingChoice!.id,
      optionId: "h0->I7",
    }),
  );
  expect(entity(done.state).areaId).toBe("I4");
  expect(entity(done.state, "h0").areaId).toBe("I7");
  expect(
    done.state.battle!.entities.filter((e) => e.side === "hero" && e.areaId !== "I4"),
  ).toHaveLength(1);
});
it("轮末两怪不倍增、只处理存活英雄；没有红星怪物则不触发", () => {
  const s = turn(setup({}, { areaId: "I4" }));
  const extra = { ...entity(s), id: "other", stance: "defensive" as const };
  const twice = {
    ...s,
    battle: {
      ...s.battle!,
      entities: [
        ...s.battle!.entities.map((e) => (e.id === "h3" ? { ...e, dead: true } : e)),
        extra,
      ],
    },
  };
  const r = success(endRoundInvocation({ state: twice, events: [] }));
  expect(r.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress)).toEqual([
    2, 2, 2, 0,
  ]);
  expect(r.events.filter((e) => e.type === "areaStressResolved")).toHaveLength(3);
  const empty = turn(setup());
  expect(endRoundInvocation({ state: empty, events: [] }).state).toBe(empty);
});
it("第4轮先轮末压力再被迫撤退，下一轮不触发第二次；先攻耗尽后入口同样处理", () => {
  const base = turn(setup({}, { areaId: "I4" }), 4);
  const s = {
    ...base,
    battle: { ...base.battle!, encounter: { ...base.battle!.encounter!, deck: [] } },
  };
  const r = success(prepare(s));
  expect(r.state.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "retreat" });
  expect(entity(r.state, "h0").stress).toBe(2);
  expect(r.events.findIndex((e) => e.type === "areaStressResolved")).toBeLessThan(
    r.events.findIndex((e) => e.type === "battleFinished"),
  );
  const fallback = {
    ...s,
    battle: {
      ...s.battle,
      encounter: { ...s.battle.encounter, turn: { type: "awaitingInitiative" as const } },
    },
  };
  const f = success(applyCommand(fallback, { type: "drawInitiative" }));
  expect(entity(f.state, "h0").stress).toBe(2);
});
it("低光修正单次；Soft伤口先于压力心脏病；全灭停止不发撤退奖励", () => {
  const soft = quirks.find((q) => q.name === "Soft")!.id;
  const base = turn(
    setup(
      {
        stress: 9,
        wounds: 14,
        quirkIds: [soft],
        resolveTested: true,
        resolveCardId: resolveFile.cards[0]!.id,
      },
      { areaId: "I4" },
    ),
    4,
  );
  const s = {
    ...base,
    battle: {
      ...base.battle!,
      light: 0,
      entities: base.battle!.entities.map((e) =>
        e.side === "hero" && e.id !== "h0" ? { ...e, dead: true } : e,
      ),
      encounter: { ...base.battle!.encounter!, deck: [] },
    },
  };
  const r = success(prepare(s));
  expect(entity(r.state, "h0").dead).toBe(true);
  expect(r.state.battle!.encounter!.turn.type).toBe("halted");
  expect(r.events.some((e) => e.type === "battleFinished")).toBe(false);
});
it("Step1流血死亡或Stun先跳过，不执行The Invokers替代移动", () => {
  for (const kind of ["bleed", "stun"] as const) {
    const base = turn(
      setup(
        {},
        {
          areaId: "I1",
          wounds: kind === "bleed" ? 5 : 0,
          statusStacks: [
            kind === "bleed" ? { kind, amount: 3, remaining: 1 } : { kind, remaining: 1 },
          ],
        },
      ),
    );
    const s = {
      ...base,
      battle: {
        ...base.battle!,
        encounter: {
          ...base.battle!.encounter!,
          deck: ["monster" as const],
          turn: { type: "awaitingInitiative" as const },
        },
      },
    };
    const r = success(applyCommand(s, { type: "drawInitiative" }));
    expect(entity(r.state).areaId).toBe("I1");
    expect(r.events.some((e) => e.type === "passiveTriggered" && e.trigger === "theInvokers")).toBe(
      false,
    );
  }
});

it("替代步骤不能用直接攻击或手动跳过绕开；轮末缺意志目录整条命令回滚", () => {
  const s = turn(setup({}, { areaId: "I4" }));
  expect(
    applyCommand(s, { type: "playMonsterSkill", actorId: "m", targetId: "h0", skillSlot: 1 }).state,
  ).toBe(s);
  expect(applyCommand(s, { type: "finishMonsterTurn", actorId: "m" }).state).toBe(s);
  const b = turn(setup({ stress: 9 }, { areaId: "I4" }), 4);
  const broken = {
    ...b,
    battle: { ...b.battle!, resolveCards: [], encounter: { ...b.battle!.encounter!, deck: [] } },
  };
  expect(prepare(broken).state).toBe(broken);
});
it("新一轮先攻洗牌只使用压力后的状态，回合末效果不重复", () => {
  const b = turn(setup({}, { areaId: "I4" }));
  const s = { ...b, battle: { ...b.battle!, encounter: { ...b.battle!.encounter!, deck: [] } } };
  const r = success(prepare(s));
  expect(r.state.battle!.encounter!.round).toBe(2);
  expect(entity(r.state, "h0").stress).toBe(2);
  const next = success(applyCommand(r.state, { type: "drawInitiative" }));
  expect(entity(next.state, "h0").stress).toBe(2);
});
