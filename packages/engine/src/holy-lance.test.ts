import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, resolveHeroSkill } from "./index";
import type { BattleEntity, GameState, HeroSkillCardView, MonsterCardView } from "./index";
import { nextBattleRoll } from "./encounter";
const skills = JSON.parse(
  readFileSync(new URL("../../data/normalized/corebox/hero_skill.json", import.meta.url), "utf8"),
).cards as HeroSkillCardView[];
const lance = skills.find((c) => c.id === "hero_skill:p016")!;
const monsters = JSON.parse(
  readFileSync(
    new URL("../../data/normalized/corebox/monster_medium.json", import.meta.url),
    "utf8",
  ),
).cards as MonsterCardView[];
const soldier = monsters.find((c) => c.id === "monster_medium:p001")!;
function ready(roll = 2): GameState {
  let seed = 0;
  while (nextBattleRoll(seed, 0) !== roll) seed++;
  const actor: BattleEntity = {
    id: "c",
    hero: "CRUSADER",
    side: "hero",
    areaId: "a",
    stance: "ranged",
    skillIds: [lance.id],
    wounds: 0,
    stress: 3,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  const initial = createBattleState(seed, {
    skills: [lance],
    monsters: [soldier],
    light: 5,
    areas: [
      { id: "a", adjacent: ["b"], capacity: 4, elevation: "normal" },
      { id: "b", adjacent: ["a"], capacity: 4, elevation: "normal" },
    ],
    entities: [
      actor,
      ...(["aggressive", "defensive", "support"] as const).map((stance, i) => ({
        ...actor,
        id: `h${i}`,
        stance,
        skillIds: [],
      })),
      {
        id: "m",
        side: "monster",
        hero: null,
        areaId: "b",
        stance: "aggressive",
        stanceSlots: 1,
        monsterCardId: soldier.id,
        life: soldier.life,
        wounds: 0,
        dodge: 0,
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
        skillIds: [],
      },
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
        turn: { type: "hero", actorId: "c", actions: 2, usedSkillIds: [] },
      },
    },
  };
}
const play = { type: "playHeroSkill", actorId: "c", targetId: "m", skillId: lance.id } as const;

describe("Holy Lance I 完整效果（SKILLS_FRONT p16、R20–21、R-017 / R-020 / R-026 / R-048）", () => {
  it("对 Unholy 命中 / 暴击只加一次，其他类型不加；先加伤再防护和反击", () => {
    for (const tags of [["Unholy"], ["Unholy", "Unholy"], ["Human"]])
      for (let roll = 1; roll <= 10; roll++)
        for (const protection of [false, true]) {
          const result = resolveHeroSkill(
            lance,
            {
              actor: { id: "c", stance: "ranged", wounds: 0, stress: 3 },
              target: {
                id: "m",
                side: "monster",
                wounds: 0,
                dodge: 1,
                protection,
                riposte: true,
                monsterTypeTags: tags,
              },
              areaDistance: 1,
              light: 5,
            },
            roll,
          );
          const base = roll === 1 ? 13 : 7;
          const damage = base + (tags.includes("Unholy") ? 1 : 0);
          expect(result).toMatchObject({
            status: "resolved",
            outcome: roll === 1 ? "crit" : roll <= 8 ? "hit" : "miss",
            actorShuffle: { direction: "pull", distance: 1 },
            skipped: [],
          });
          expect(result.damageDealt).toBe(
            roll > 8 ? null : protection ? Math.ceil(damage / 2) : damage,
          );
          expect(result.riposteDamage).toBe(roll > 8 ? null : Math.ceil(damage / 2));
          expect(result.printedAmount).toBe(roll > 8 ? null : base);
        }
  });

  it("公共命令全部骰面：一次 RNG，先完成自身 Pull / 姿态交换才扣行动和胜利收尾", () => {
    for (let roll = 1; roll <= 10; roll++) {
      const state = ready(roll);
      const before = structuredClone(state);
      const attacked = applyCommand(state, play);
      expect(attacked.events[0]).toMatchObject({
        type: "heroSkillResolved",
        roll,
        resolution: { damageDealt: roll === 1 ? 14 : roll <= 9 ? 8 : null },
      });
      expect(attacked.state.battle!.rngCursor).toBe(1);
      expect(attacked.state.battle!.entities[0]!.areaId).toBe("a");
      expect(attacked.state.battle!.encounter!.turn).toMatchObject({
        actions: 2,
        usedSkillIds: [],
      });
      expect(
        applyCommand(attacked.state, { type: "changeStance", actorId: "c", direction: "forward" })
          .state,
      ).toBe(attacked.state);
      const moved = applyCommand(attacked.state, { type: "resolveShuffles" });
      expect(moved.state.battle!.entities[0]).toMatchObject({ areaId: "b", stance: "defensive" });
      expect(moved.state.battle!.entities.find((e) => e.id === "h1")!.stance).toBe("ranged");
      expect(moved.state.battle!.rngCursor).toBe(1);
      expect(moved.events.filter((e) => e.type === "battleFinished")).toHaveLength(
        roll <= 9 ? 1 : 0,
      );
      if (roll === 10)
        expect(moved.state.battle!.encounter!.turn).toMatchObject({ actions: 1, usedSkillIds: [] });
      else expect(moved.state.battle!.encounter!.turn.type).toBe("finished");
      const replay = applyCommand(applyCommand(state, play).state, { type: "resolveShuffles" });
      expect(replay).toEqual(moved);
      expect(state).toEqual(before);
    }
  });

  it("单目标多选入口读取同一卡牌类型；空区只自身 Pull，不造目标伤害", () => {
    const state = ready(2);
    const selected = applyCommand(state, {
      type: "playHeroSkillTargets",
      actorId: "c",
      targetIds: ["m"],
      skillId: lance.id,
    });
    expect(selected.events[0]).toMatchObject({
      type: "heroSkillTargetsResolved",
      resolutions: [{ damageDealt: 8 }],
    });
    expect(applyCommand(selected.state, { type: "resolveShuffles" }).state).toEqual(
      applyCommand(applyCommand(state, play).state, { type: "resolveShuffles" }).state,
    );
    const emptyState = {
      ...state,
      battle: {
        ...state.battle!,
        entities: state.battle!.entities.map((e) => (e.id === "m" ? { ...e, areaId: "a" } : e)),
      },
    };
    const empty = applyCommand(emptyState, {
      type: "playHeroSkillEmptyArea",
      actorId: "c",
      areaId: "b",
      skillId: lance.id,
    });
    expect(empty.events[0]).toMatchObject({ type: "heroSkillEmptyAreaResolved", roll: 2 });
    const moved = applyCommand(empty.state, { type: "resolveShuffles" });
    expect(moved.state.battle!.entities[0]).toMatchObject({
      areaId: "b",
      stance: "defensive",
      stress: 3,
    });
    expect(moved.state.battle!.entities.find((e) => e.id === "m")!.wounds).toBe(0);
    expect(moved.state.battle!.encounter!.turn).toMatchObject({
      actions: 1,
      usedSkillIds: [lance.id],
    });
    expect(moved.state.battle!.rngCursor).toBe(1);
  });

  it("公共命令以卡牌类型为准，非 Unholy 不因实体标签伪造加伤；缺注解保留旧纯函数跳过", () => {
    const state = ready(2);
    const human = {
      ...state,
      battle: {
        ...state.battle!,
        monsters: [{ ...soldier, type_position_tags: ["Human", "Front"] }],
        entities: state.battle!.entities.map((e) =>
          e.id === "m" ? { ...e, monsterTypeTags: ["Unholy"] } : e,
        ),
      },
    };
    expect(applyCommand(human, play).events[0]).toMatchObject({ resolution: { damageDealt: 7 } });
    const { verified_damage_bonus, ...legacy } = lance;
    expect(verified_damage_bonus).toBeDefined();
    expect(
      resolveHeroSkill(
        legacy,
        {
          actor: { id: "c", stance: "ranged", wounds: 0 },
          target: { id: "m", side: "monster", wounds: 0, dodge: 0, monsterTypeTags: ["Unholy"] },
        },
        2,
      ),
    ).toMatchObject({ damageDealt: 7, skipped: [{ code: "effect_lines" }] });
  });

  it("缺类型 / 未验证来源 / 未知关联 / 伪造实体类型、姿态和注解漂移在 RNG 前拒绝", () => {
    const state = ready();
    const card = state.battle!.monsters![0]!;
    const { type_position_tags: _tags, ...without } = card;
    void _tags;
    for (const changed of [
      without,
      { ...card, verification: { unverified: true } },
      { ...card, type_position_tags: [] },
      { ...card, type_position_tags: ["Front"] },
    ]) {
      const blocked = {
        ...state,
        battle: {
          ...state.battle!,
          monsters: [changed],
          entities: state.battle!.entities.map((e) =>
            e.id === "m" ? { ...e, monsterTypeTags: ["Unholy"] } : e,
          ),
        },
      };
      expect(applyCommand(blocked, play).state).toBe(blocked);
    }
    for (const entities of [
      state.battle!.entities.map((e) => (e.id === "m" ? { ...e, monsterCardId: "unknown" } : e)),
      state.battle!.entities.map((e) =>
        e.id === "c" ? { ...e, stance: "aggressive" as const } : e,
      ),
    ]) {
      const blocked = { ...state, battle: { ...state.battle!, entities } };
      expect(applyCommand(blocked, play).state).toBe(blocked);
    }
    const combat = {
      actor: { id: "c", stance: "ranged" as const, wounds: 0 },
      target: { id: "m", side: "monster" as const, wounds: 0, dodge: 0 },
    };
    expect(resolveHeroSkill(lance, combat, 2).status).toBe("refused");
    for (const amount of [0, 2, NaN])
      expect(
        resolveHeroSkill(
          { ...lance, verified_damage_bonus: { ...lance.verified_damage_bonus!, amount } },
          { ...combat, target: { ...combat.target, monsterTypeTags: ["Unholy"] } },
          2,
        ).status,
      ).toBe("refused");
  });
});
