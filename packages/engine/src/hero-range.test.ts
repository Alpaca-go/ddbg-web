import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, resolveHeroSkill } from "./index";
import { readPrintedRange } from "./hero-skill";
import type { BattleEntity, GameState, HeroSkillCardView } from "./index";
import { nextBattleRoll } from "./encounter";
const cards: HeroSkillCardView[] = JSON.parse(
  readFileSync(new URL("../../data/normalized/corebox/hero_skill.json", import.meta.url), "utf8"),
).cards;
const tracking = cards.find((card) => card.id === "hero_skill:p076")!;
const pistol = cards.find((card) => card.id === "hero_skill:p067")!;
const life: number = JSON.parse(
  readFileSync(
    new URL("../../data/normalized/corebox/monster_large.json", import.meta.url),
    "utf8",
  ),
).cards.find((card: { id: string }) => card.id === "monster_large:p002").life;
function ready(seed: number): GameState {
  const heroes: BattleEntity[] = (["ranged", "aggressive", "defensive", "support"] as const).map(
    (stance, index) => ({
      id: `h${index}`,
      hero: index === 0 ? "HIGHWAYMAN" : "TEST",
      side: "hero",
      stance,
      areaId: "a",
      wounds: 0,
      stress: 3,
      dodge: 0,
      guard: false,
      dead: false,
      skillIds: index === 0 ? [tracking.id, pistol.id] : [],
      bleed: [],
      blight: [],
    }),
  );
  const monster: BattleEntity = {
    id: "m",
    hero: null,
    side: "monster",
    stance: "aggressive",
    stanceSlots: 2,
    areaId: "b",
    life,
    wounds: 0,
    dodge: 0,
    guard: false,
    dead: false,
    skillIds: [],
    bleed: [],
    blight: [],
  };
  const initial = createBattleState(seed, {
    entities: [...heroes, monster],
    skills: [tracking, pistol],
    light: 4,
    areas: [
      { id: "a", adjacent: ["b"], elevation: "normal" },
      { id: "b", adjacent: ["a"], elevation: "normal" },
    ],
  });
  return {
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
}
describe("两张逐页复核的英雄区间射程 / G-08", () => {
  it("1–2 都可射击，0 / 3 拒绝；向更低区域的上限 +1（R-022）", () => {
    expect(readPrintedRange(pistol)).toEqual({ kind: "interval", min: 1, max: 2 });
    for (const lower of [false, true])
      for (const distance of [0, 1, 2, 3, 4]) {
        const result = resolveHeroSkill(
          pistol,
          {
            actor: { id: "h", stance: "ranged", wounds: 0, stress: 3 },
            target: { id: "m", side: "monster", wounds: 0, dodge: 0 },
            light: 4,
            areaDistance: distance,
            targetAreaLower: lower,
          },
          4,
        );
        expect(result.status).toBe(
          distance >= 1 && distance <= (lower ? 3 : 2) ? "resolved" : "refused",
        );
      }
    expect(
      readPrintedRange({ ...pistol, verified_range: { min: 0, max: 3, source: "print_front" } }),
    ).toEqual({ kind: "null_numeric" });
    const { verified_range, ...without } = pistol;
    expect(verified_range).toBeDefined();
    expect(readPrintedRange(without)).toEqual({ kind: "null_numeric" });
  });
  it("G-08 / OR24-p7：真实 Tracking I 先放 Buff 3t，再 Pistol I，暴击阈值 3，全骰面续接不额外掷骰", () => {
    for (let roll = 1; roll <= 10; roll++) {
      let seed = 0;
      while (nextBattleRoll(seed, 0) !== 4 || nextBattleRoll(seed, 1) !== roll) seed++;
      const initial = ready(seed);
      const tracked = applyCommand(initial, {
        type: "playHeroSkill",
        actorId: "h0",
        targetId: "m",
        skillId: tracking.id,
      });
      expect(tracked.state.battle!.entities[0]!.statusStacks).toEqual([
        { kind: "buff", remaining: 3 },
      ]);
      expect(tracked.state.battle!.entities[0]!.buffStacks).toBe(1);
      expect(tracked.state.battle!.rngCursor).toBe(1);
      expect(tracked.state.battle!.encounter!.turn).toMatchObject({ actions: 1 });
      const command = {
        type: "playHeroSkill" as const,
        actorId: "h0",
        targetId: "m",
        skillId: pistol.id,
      };
      const shot = applyCommand(tracked.state, command);
      expect(shot).toEqual(applyCommand(tracked.state, command));
      const event = shot.events.find((event) => event.type === "heroSkillResolved");
      if (event?.type !== "heroSkillResolved") throw new Error("黄金 Pistol 续接拒绝");
      expect(event.roll).toBe(roll);
      expect(event.resolution.outcome).toBe(roll <= 3 ? "crit" : roll <= 9 ? "hit" : "miss");
      expect(event.resolution.damageDealt).toBe(roll <= 3 ? 9 : roll <= 9 ? 5 : null);
      expect(shot.state.battle!.rngCursor).toBe(2);
      expect(shot.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
    }
  });
});
