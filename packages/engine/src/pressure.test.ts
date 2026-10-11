import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, resolvePressure } from "./index";
import type { BattleEntity, GameState, HeroSkillCardView, ResolveCard } from "./index";
import { resolveBattlePressure } from "./pressure";

const cards: ResolveCard[] = JSON.parse(
  readFileSync(
    new URL("../../data/normalized/corebox/virtue_affliction.json", import.meta.url),
    "utf8",
  ),
).cards;
const skill: HeroSkillCardView = JSON.parse(
  readFileSync(new URL("../../data/normalized/corebox/hero_skill.json", import.meta.url), "utf8"),
).cards.find((card: HeroSkillCardView) => card.id === "hero_skill:p001");
function setup(seed = 0): GameState {
  const heroes: BattleEntity[] = (["aggressive", "defensive", "ranged", "support"] as const).map(
    (stance, index) => ({
      id: `h${index}`,
      side: "hero",
      stance,
      hero: "CRUSADER",
      skillIds: [skill.id],
      areaId: "a",
      wounds: 0,
      stress: 0,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    }),
  );
  return createBattleState(seed, {
    entities: [
      ...heroes,
      {
        id: "m",
        monsterCardId: "neutral",
        side: "monster",
        stance: "aggressive",
        stanceSlots: 1,
        hero: null,
        skillIds: [],
        areaId: "a",
        life: 100,
        wounds: 0,
        dodge: 0,
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
    ],
    areas: [{ id: "a", adjacent: [], elevation: "normal" }],
    skills: [skill],
    monsters: [
      {
        id: "neutral",
        life: 100,
        verification: { unverified: false },
        type_position_tags: ["Beast"],
        skills: [],
      },
    ],
    light: 5,
    resolveCards: cards,
  });
}
function stressed(state: GameState, ids: readonly string[]): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((entity) =>
        ids.includes(entity.id) ? { ...entity, stress: 10 } : entity,
      ),
    },
  };
}
describe("R28 意志 / 心脏病基础接线", () => {
  it("1–2 美德，3–10 苦难；已有卡立即死亡，不走死门；脏值拒绝", () => {
    expect(resolvePressure(9, false, null)).toEqual({ type: "unchanged" });
    expect(resolvePressure(10, false, null)).toEqual({ type: "needsRoll" });
    for (let roll = 1; roll <= 10; roll++)
      expect(resolvePressure(10, false, null, roll)).toEqual({
        type: "draw",
        role: roll <= 2 ? "virtue" : "affliction",
      });
    expect(resolvePressure(10, false, "graveyard-virtue")).toEqual({ type: "heartAttack" });
    expect(resolvePressure(10, true, "card")).toEqual({ type: "heartAttack" });
    for (const stress of [-1, 11, 1.5, NaN])
      expect(resolvePressure(stress, false, null).type).toBe("refused");
    expect(resolvePressure(10, true, null).type).toBe("refused");
  });
  it("完整真实牌堆按种子抽取，取得卡后才归零；同角色后续只掷检定一骰", () => {
    const original = stressed(setup(), ["h0", "h1", "h2", "h3"]);
    const before = structuredClone(original);
    const first = resolveBattlePressure({ state: original, events: [] });
    expect(first).toEqual(resolveBattlePressure({ state: original, events: [] }));
    expect(original).toEqual(before);
    expect(first.events).toHaveLength(4);
    expect(
      new Set(first.state.battle!.entities.slice(0, 4).map((hero) => hero.resolveCardId)).size,
    ).toBe(4);
    expect(
      first.state
        .battle!.entities.slice(0, 4)
        .every((hero) => hero.stress === 0 && hero.resolveTested),
    ).toBe(true);
    const roles = new Set(
      first.events
        .filter((e) => e.type === "resolveTested")
        .map((e) => cards.find((card) => card.id === e.cardId)!.role),
    );
    expect(first.state.battle!.rngCursor).toBe(4 + 4 * roles.size);
    const attacked = resolveBattlePressure({ state: stressed(first.state, ["h0"]), events: [] });
    expect(attacked.events[0]?.type).toBe("heartAttack");
    expect(attacked.state.battle!.rngCursor).toBe(first.state.battle!.rngCursor);
    expect(attacked.state.battle!.entities[0]!.dead).toBe(true);
  });
  it("成功技能后的缺卡拒绝回滚攻击骰、伤口和行动；完成抽牌才扣行动", () => {
    const base = setup();
    const ready: GameState = {
      ...stressed(base, ["h1"]),
      battle: {
        ...stressed(base, ["h1"]).battle!,
        encounter: {
          round: 1,
          deck: ["hero"],
          actedIds: [],
          turn: { type: "hero", actorId: "h0", actions: 2, usedSkillIds: [] },
        },
      },
    };
    const command = {
      type: "playHeroSkill" as const,
      actorId: "h0",
      targetId: "m",
      skillId: skill.id,
    };
    const incomplete = { ...ready, battle: { ...ready.battle!, resolveCards: cards.slice(0, 8) } };
    const refused = applyCommand(incomplete, command);
    expect(refused.events.map((e) => e.type)).toEqual(["commandRefused"]);
    expect(refused.state).toBe(incomplete);
    const done = applyCommand(ready, command);
    expect(done.events.some((e) => e.type === "resolveTested")).toBe(true);
    expect(done.state.battle!.encounter!.turn).toMatchObject({ actions: 1 });
    expect(done).toEqual(applyCommand(ready, command));
  });
});
