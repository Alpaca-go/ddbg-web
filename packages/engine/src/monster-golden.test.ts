import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, resolveMonsterSkill, selectMonsterSkill } from "./index";
import type { BattleEntity, GameState, MonsterCardView, SkillStance } from "./index";
import { nextBattleRoll } from "./encounter";

const readCard = (category: string, page: string): MonsterCardView =>
  JSON.parse(
    readFileSync(
      new URL(`../../data/normalized/corebox/${category}.json`, import.meta.url),
      "utf8",
    ),
  ).cards.find((card: MonsterCardView) => card.id === `${category}:${page}`);
// 官方 R22 明示的分组与 Speed；仅黄金夹具，不开放完整卡池。
const defender: MonsterCardView = {
  ...readCard("monster_medium", "p010"),
  speed: 1,
  stanceGroups: [
    {
      stances: ["aggressive", "defensive"],
      rollTable: [
        { min: 1, max: 5, skill: 2 },
        { min: 6, max: 10, skill: 1 },
      ],
    },
    { stances: ["ranged", "support"], skill: 3 },
  ],
};
// 完整 140x140 印刷正面 p002：命名图标与所有骰表逐项对照。
const bloodletter: MonsterCardView = {
  ...readCard("monster_large", "p002"),
  stanceGroups: [
    {
      stances: ["aggressive"],
      rollTable: [
        { min: 1, max: 4, skill: 1 },
        { min: 5, max: 8, skill: 2 },
        { min: 9, max: 10, skill: 3 },
      ],
    },
    {
      stances: ["defensive"],
      rollTable: [
        { min: 1, max: 5, skill: 1 },
        { min: 6, max: 10, skill: 2 },
      ],
    },
    { stances: ["ranged", "support"], skill: 2 },
  ],
};
const entity = (
  id: string,
  stance: SkillStance,
  areaId: string,
  monster = false,
): BattleEntity => ({
  id,
  stance,
  areaId,
  side: monster ? "monster" : "hero",
  hero: monster ? null : id.toUpperCase(),
  skillIds: [],
  wounds: 0,
  ...(monster ? {} : { stress: 3 }),
  dodge: id === "hellion" ? 1 : 0,
  guard: false,
  dead: false,
  bleed: [],
  blight: [],
  ...(monster ? { stanceSlots: 1 as const } : {}),
});
function setup(seed: number): GameState {
  // 测试几何只保留 R22–23 的距离关系，不冒充正式房间部署。
  const initial = createBattleState(seed, {
    entities: [
      entity("crusader", "aggressive", "b"),
      entity("hellion", "defensive", "a"),
      entity("highwayman", "ranged", "a"),
      entity("vestal", "support", "b"),
      {
        ...entity("defender", "ranged", "c", true),
        monsterCardId: defender.id,
        life: defender.life,
      },
      {
        ...entity("arbalist", "defensive", "c", true),
        life: readCard("monster_medium", "p007").life,
      },
    ],
    areas: [
      { id: "a", capacity: 8, elevation: "normal", adjacent: ["b"] },
      { id: "b", capacity: 8, elevation: "normal", adjacent: ["a", "c"] },
      { id: "c", capacity: 8, elevation: "normal", adjacent: ["b"] },
    ],
    skills: [],
    monsters: [defender],
    light: 4,
  });
  return {
    ...initial,
    battle: {
      ...initial.battle!,
      encounter: {
        round: 1,
        deck: ["hero"],
        actedIds: [],
        turn: { type: "monster", actorId: "defender" },
      },
    },
  };
}
describe("完整官方怪物黄金例子", () => {
  it("G-04 / R22–23：固定选招、最远平局、Speed、Pull 及一次攻击续接", () => {
    // R22 未指定光照，先核对其原始 Acc 5 − Dodge 1 的全部骰面。
    // 命令场景另外显式选光照 4，因此掷 1 按 R-002 暴击 5，不忽略光照。
    for (let roll = 1; roll <= 10; roll++) {
      const baseline = resolveMonsterSkill(
        defender,
        3,
        {
          actor: { id: "defender", wounds: 0 },
          target: { id: "hellion", side: "hero", dodge: 1, wounds: 0, stress: 3 },
          areaDistance: 1,
        },
        roll,
      );
      expect(baseline).toMatchObject({
        status: "resolved",
        resolution: {
          outcome: roll <= 4 ? "hit" : "miss",
          damageDealt: roll <= 4 ? 3 : null,
        },
      });
      let seed = 0;
      while (nextBattleRoll(seed, 0) !== roll) seed++;
      const initial = setup(seed);
      const chosen = applyCommand(initial, { type: "prepareMonsterAction", actorId: "defender" });
      expect(chosen.state.battle!.monsterAction).toMatchObject({
        skillSlot: 3,
        targetId: "hellion",
        selectionRoll: null,
      });
      const positioned = applyCommand(chosen.state, {
        type: "moveMonsterToRange",
        actorId: "defender",
      });
      expect(positioned.events[0]).toMatchObject({
        type: "monsterPositioned",
        from: "c",
        to: "b",
        steps: 1,
      });
      expect(positioned.state.battle!.rngCursor).toBe(0);
      const command = {
        type: "playMonsterSkill" as const,
        actorId: "defender",
        targetId: "hellion",
        skillSlot: 3,
      };
      const rolled = applyCommand(positioned.state, command);
      expect(rolled).toEqual(applyCommand(positioned.state, command));
      const event = rolled.events.find((event) => event.type === "monsterSkillResolved");
      expect(event?.type).toBe("monsterSkillResolved");
      if (event?.type !== "monsterSkillResolved") throw new Error("Defender 黄金攻击拒绝");
      expect(event.resolution).toMatchObject({
        outcome: roll === 1 ? "crit" : roll <= 4 ? "hit" : "miss",
        damageDealt: roll === 1 ? 5 : roll <= 4 ? 3 : null,
      });
      const done = applyCommand(rolled.state, { type: "resolveShuffles" });
      expect(done.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
      expect(done.state.battle!.entities.find((entity) => entity.id === "defender")).toMatchObject({
        stance: "defensive",
        areaId: "a",
      });
      expect(done.state.battle!.entities.find((entity) => entity.id === "arbalist")).toMatchObject({
        stance: "ranged",
      });
      expect(done.state.battle!.entities.find((entity) => entity.id === "hellion")!.wounds).toBe(
        roll === 1 ? 5 : roll <= 4 ? 3 : 0,
      );
      expect(done.state.battle!.rngCursor).toBe(1);
      expect(done.state.battle!.encounter!.actedIds).toEqual(["defender"]);
      expect(applyCommand(done.state, { type: "resolveShuffles" }).state).toBe(done.state);
    }
  });
  it("G-09 / OR24-p7：Large 使用 Aggressive，掷 9 选 Point Blank Shot，光照 4 的全部攻击骰", () => {
    expect(selectMonsterSkill(bloodletter, ["defensive", "aggressive"], 9)).toEqual({
      status: "selected",
      skillSlot: 3,
      roll: 9,
    });
    // 教程明确省略额外效果；这里核对选招与攻击，不能视为 Large 移动 / 全技能 UI 验收。
    for (let roll = 1; roll <= 10; roll++) {
      const result = resolveMonsterSkill(
        bloodletter,
        3,
        {
          actor: { id: "bloodletter", wounds: 0 },
          target: { id: "crusader", side: "hero", dodge: 0, wounds: 0, stress: 3 },
          areaDistance: 1,
          light: 4,
        },
        roll,
      );
      expect(result.status).toBe("resolved");
      if (result.status !== "resolved") throw new Error(result.reason);
      expect(result.resolution).toMatchObject({
        outcome: roll <= 3 ? "crit" : roll <= 9 ? "hit" : "miss",
        damageDealt: roll <= 3 ? 12 : roll <= 9 ? 6 : null,
      });
    }
  });
});
