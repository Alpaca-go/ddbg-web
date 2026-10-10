import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, resolveHeroSkill } from "./index";
import type { BattleEntity, GameState, HeroSkillCardView } from "./index";
import { nextBattleRoll } from "./encounter";
const cards: HeroSkillCardView[] = JSON.parse(
  readFileSync(new URL("../../data/normalized/corebox/hero_skill.json", import.meta.url), "utf8"),
).cards;
const card = (id: string) => cards.find((card) => card.id === `hero_skill:${id}`)!;
const monsterLife = (file: string, id: string): number =>
  JSON.parse(
    readFileSync(new URL(`../../data/normalized/corebox/${file}.json`, import.meta.url), "utf8"),
  ).cards.find((card: { id: string }) => card.id === id).life;
describe("真实印刷卡的官方黄金例子", () => {
  it("G-01 / R20：Iron Swan I 对 Bone Arbalist Dodge 1，掷 2 命中造成 7", () => {
    const result = resolveHeroSkill(
      card("p025"),
      {
        actor: { id: "hellion", stance: "aggressive", wounds: 0, stress: 3 },
        target: { id: "arbalist", side: "monster", dodge: 1, wounds: 0 },
        light: 5,
      },
      2,
    );
    expect(result).toMatchObject({ status: "resolved", outcome: "hit", damageDealt: 7, wounds: 7 });
  });
  it("G-07 / OR24-p6：光照 4，Zealous I 的两目标共用一骰，全部骰面与教程一致", () => {
    const skill = card("p004");
    const heroes: BattleEntity[] = (["aggressive", "defensive", "ranged", "support"] as const).map(
      (stance, index) => ({
        id: `h${index}`,
        side: "hero",
        hero: "CRUSADER",
        stance,
        areaId: "a",
        wounds: 0,
        stress: 3,
        dodge: 0,
        guard: false,
        dead: false,
        skillIds: index === 0 ? [skill.id] : [],
        bleed: [],
        blight: [],
      }),
    );
    // Life 取已命名印刷字段，Dodge 0 / 1 取教程；不开放尚未核实的整卡。
    const monsters: BattleEntity[] = ["bloodletter", "fusilier"].map((id, index) => ({
      id,
      side: "monster",
      hero: null,
      stance: index === 0 ? "aggressive" : "ranged",
      stanceSlots: index === 0 ? 2 : 1,
      areaId: "b",
      life:
        index === 0
          ? monsterLife("monster_large", "monster_large:p002")
          : monsterLife("monster_medium", "monster_medium:p027"),
      wounds: 0,
      dodge: index,
      guard: false,
      dead: false,
      skillIds: [],
      bleed: [],
      blight: [],
    }));
    for (let roll = 1; roll <= 10; roll++) {
      let seed = 0;
      while (nextBattleRoll(seed, 0) !== roll) seed++;
      const initial = createBattleState(seed, {
        entities: [...heroes, ...monsters],
        skills: [skill],
        light: 4,
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
        type: "playHeroSkillTargets" as const,
        actorId: "h0",
        skillId: skill.id,
        targetIds: ["bloodletter", "fusilier"],
      };
      const result = applyCommand(state, command);
      expect(result).toEqual(applyCommand(state, command));
      const event = result.events.find((event) => event.type === "heroSkillTargetsResolved");
      expect(event?.type).toBe("heroSkillTargetsResolved");
      if (event?.type !== "heroSkillTargetsResolved") throw new Error("黄金技能拒绝");
      expect(event.roll).toBe(roll);
      expect(event.resolutions.map((resolution) => resolution.damageDealt)).toEqual([
        roll === 1 ? 9 : roll <= 9 ? 5 : null,
        roll === 1 ? 9 : roll <= 8 ? 5 : null,
      ]);
      expect(event.resolutions.map((resolution) => resolution.outcome)).toEqual([
        roll === 1 ? "crit" : roll <= 9 ? "hit" : "miss",
        roll === 1 ? "crit" : roll <= 8 ? "hit" : "miss",
      ]);
      expect(result.state.battle!.rngCursor).toBe(1);
      expect(result.state.battle!.encounter!.turn).toMatchObject({ actions: 1 });
    }
  });
});
