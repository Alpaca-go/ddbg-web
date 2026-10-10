import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, resolveHeroSkill } from "./index";
import type { BattleEntity, GameState, HeroSkillCardView } from "./index";
import { nextBattleRoll } from "./encounter";
const pistol: HeroSkillCardView = JSON.parse(
  readFileSync(new URL("../../data/normalized/corebox/hero_skill.json", import.meta.url), "utf8"),
).cards.find((card: HeroSkillCardView) => card.id === "hero_skill:p067");
describe("已复核 Pistol I 对 Mark +2（R19–21、R-017、R-019、R-048）", () => {
  it("公共技能命令只消耗一次 RNG / 行动，标记目标受 7 伤口且回放一致", () => {
    let seed = 0;
    while (nextBattleRoll(seed, 0) !== 4) seed++;
    const entities: BattleEntity[] = (
      ["ranged", "aggressive", "defensive", "support"] as const
    ).map((stance, index) => ({
      id: `h${index}`,
      hero: "HIGHWAYMAN",
      side: "hero",
      stance,
      areaId: "a",
      skillIds: index === 0 ? [pistol.id] : [],
      wounds: 0,
      stress: 3,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    }));
    entities.push({
      id: "m",
      hero: null,
      side: "monster",
      stance: "aggressive",
      stanceSlots: 1,
      areaId: "b",
      skillIds: [],
      life: 7,
      wounds: 0,
      dodge: 0,
      markStacks: 1,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    });
    const initial = createBattleState(seed, {
      entities,
      skills: [pistol],
      light: 5,
      areas: [
        { id: "a", adjacent: ["b"], elevation: "normal" },
        { id: "b", adjacent: ["a"], elevation: "normal" },
      ],
    });
    const state: GameState = {
      ...initial,
      battle: {
        ...initial.battle!,
        encounter: {
          round: 1,
          deck: ["monster"],
          actedIds: [],
          turn: { type: "hero", actorId: "h0", actions: 2, usedSkillIds: [] },
        },
      },
    };
    const command = {
      type: "playHeroSkill" as const,
      actorId: "h0",
      targetId: "m",
      skillId: pistol.id,
    };
    const result = applyCommand(state, command);
    expect(result).toEqual(applyCommand(state, command));
    expect(result.state.battle!.rngCursor).toBe(1);
    expect(result.state.battle!.entities.find((entity) => entity.id === "m")).toMatchObject({
      wounds: 7,
      dead: true,
    });
    expect(result.events.filter((event) => event.type === "battleFinished")).toHaveLength(1);
  });
  it("只对标记敌人加一次，命中 / 暴击；Protection 和 Riposte 使用加成后的伤害", () => {
    for (const stacks of [0, 1, 3])
      for (const roll of [1, 4, 10])
        for (const protection of [false, true]) {
          const result = resolveHeroSkill(
            pistol,
            {
              actor: { id: "h", stance: "ranged", wounds: 0, stress: 3 },
              target: {
                id: "m",
                side: "monster",
                wounds: 0,
                dodge: 3,
                markStacks: stacks,
                protection,
                riposte: true,
              },
              light: 5,
              areaDistance: 1,
            },
            roll,
          );
          const before = (roll === 1 ? 9 : 5) + (stacks ? 2 : 0);
          expect(result.status).toBe("resolved");
          expect(result.damageDealt).toBe(
            roll === 10 ? null : protection ? Math.ceil(before / 2) : before,
          );
          expect(result.riposteDamage).toBe(roll === 10 ? null : Math.ceil(before / 2));
          expect(result.printedAmount).toBe(roll === 10 ? null : roll === 1 ? 9 : 5);
          expect(result.skipped).toEqual([]);
        }
  });
  it("无注解仍保留未知效果；伪造注解或印刷语义漂移拒绝整次", () => {
    const combat = {
      target: { id: "m", side: "monster" as const, wounds: 0, dodge: 0, markStacks: 1 },
    };
    const { verified_damage_bonus, ...legacy } = pistol;
    expect(verified_damage_bonus).toBeDefined();
    expect(resolveHeroSkill(legacy, combat, 4)).toMatchObject({
      damageDealt: 5,
      skipped: [{ code: "effect_lines" }],
    });
    for (const amount of [0, 3, NaN])
      expect(
        resolveHeroSkill(
          { ...pistol, verified_damage_bonus: { ...verified_damage_bonus!, amount } },
          combat,
          4,
        ).status,
      ).toBe("refused");
    expect(resolveHeroSkill({ ...pistol, effect_lines: [] }, combat, 4).status).toBe("refused");
  });
});
