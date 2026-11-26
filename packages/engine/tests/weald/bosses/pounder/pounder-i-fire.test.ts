import { expect, it } from "vitest";
import heroStats from "../../../../../data/normalized/corebox/hero_stat.json";
import coreMedium from "../../../../../data/normalized/corebox/monster_medium.json";
import { savedCommandSchema } from "../../../../../data/src/shared/quest-save";
import type { MonsterCardView } from "../../../../src/shared/core/monster-skill";
import { createBattleState, type BattleEntity } from "../../../../src/shared/battle/battle";
import { applyCommand, type GameState } from "../../../../src/shared/core/command";
import {
  ensurePounderIBossScriptRegistered,
  POUNDER_I_SCRIPT_ID,
} from "../../../../src/weald/bosses/pounder/pounder-i";
import {
  pounderIInitialDeployment,
  createPounderIEntity,
} from "../../../../src/weald/bosses/pounder/pounder-i-projection";

function fixture(extra: readonly BattleEntity[] = []): GameState {
  ensurePounderIBossScriptRegistered();
  const setup = pounderIInitialDeployment();
  const hero: BattleEntity = {
    id: "h",
    side: "hero",
    hero: "CRUSADER",
    areaId: "L",
    stance: "aggressive",
    wounds: 0,
    dodge: 0,
    life: 17,
    heroStatId: "hero_stat:core:h01:p001:front",
    stress: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  const initial = createBattleState(17, {
    ...setup,
    heroStats: heroStats.cards as NonNullable<
      import("../../../../src/shared/battle/battle").BattleSetup["heroStats"]
    >,
    monsters: [
      ...setup.monsters,
      coreMedium.cards.find((c) => c.id === "monster_medium:p027")! as MonsterCardView,
    ],
    entities: [
      ...setup.entities,
      hero,
      { ...hero, id: "h2", stance: "defensive" },
      { ...createPounderIEntity("matchman", "m", "defensive"), areaId: "B" },
      ...extra,
    ],
    skills: [],
    light: 5,
    wealdMechanics: true,
  });
  return {
    ...initial,
    dungeon: {
      phase: "inBattle",
      contentPacks: ["core", "weald"],
      campaignLevel: 1,
      mode: "standard",
      heroes: [],
      pounderDungeonThreats: true,
      pounderHamletThreats: true,
      questDistribution: { questId: "quest:p019", campaignLevel: 1 },
      activeBossThreatScriptId: POUNDER_I_SCRIPT_ID,
    } as unknown as NonNullable<GameState["dungeon"]>,
    battle: {
      ...initial.battle!,
      encounter: {
        round: 1,
        deck: ["hero"],
        actedIds: [],
        turn: { type: "monster", actorId: "m" },
      },
    },
  };
}

const command = { type: "applyPounderIFireInTheHole", actorId: "m" } as const;
const refused = (r: ReturnType<typeof applyCommand>) =>
  r.events.filter((e) => e.type === "commandRefused");

it("R-258 同区触发炮击共享一个骰，伤害归本体且只结束 Matchman 回合", () => {
  const state = fixture();
  const before = structuredClone(state);
  const result = applyCommand(state, command);
  expect(refused(result)).toEqual([]);
  const event = result.events.find((e) => e.type === "monsterSkillTargetsResolved");
  expect(event).toMatchObject({ actorId: "boss:pounder", skillSlot: 1 });
  if (event?.type !== "monsterSkillTargetsResolved") throw new Error("缺炮击事件");
  expect(event.resolutions.map((r) => r.targetId)).toEqual(["h", "h2"]);
  expect(event.resolutions.every((r) => r.damageDealt === 9 && r.targetStress === 2)).toBe(true);
  expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 1);
  expect(result.state.battle!.encounter!.actedIds).toContain("m");
  expect(result.state.battle!.encounter!.actedIds).not.toContain("boss:pounder");
  expect(result.state.battle!.pounderFire).toBeUndefined();
  expect(state).toEqual(before);
  expect(applyCommand(state, command)).toEqual(result);
  const repeated = applyCommand(result.state, command);
  expect(refused(repeated)).not.toEqual([]);
  expect(repeated.state).toEqual(result.state);
});

it.each(["area", "dead", "version", "actor", "card"])(
  "拒绝 %s 越界，保留实体、回合和骰序",
  (kind) => {
    let state = fixture();
    if (kind === "area" || kind === "dead")
      state = {
        ...state,
        battle: {
          ...state.battle!,
          entities: state.battle!.entities.map((e) =>
            e.id === "m" ? { ...e, ...(kind === "area" ? { areaId: "D" } : { dead: true }) } : e,
          ),
        },
      };
    if (kind === "version")
      state = {
        ...state,
        dungeon: { ...state.dungeon!, pounderHamletThreats: undefined } as unknown as NonNullable<
          GameState["dungeon"]
        >,
      };
    if (kind === "card")
      state = {
        ...state,
        battle: {
          ...state.battle!,
          monsters: state.battle!.monsters!.map((c) =>
            c.id === "monster_medium:weald:p020" ? { ...c, life: 99 } : c,
          ),
        },
      };
    const result = applyCommand(
      state,
      kind === "actor" ? { ...command, actorId: "boss:pounder" } : command,
    );
    expect(refused(result)).not.toEqual([]);
    expect(result.state).toEqual(state);
  },
);

it("严格命令 schema 不允许指定炮击目标或伪造骰面", () => {
  expect(savedCommandSchema.parse(command)).toEqual(command);
  expect(savedCommandSchema.safeParse({ ...command, targetId: "h" }).success).toBe(false);
  expect(savedCommandSchema.safeParse({ ...command, roll: 1 }).success).toBe(false);
});

it("Crowded 选最多英雄区域；Guard 优先改选单人区域", () => {
  const hero = fixture().battle!.entities.find((e) => e.id === "h")!;
  const initial = fixture([{ ...hero, id: "h3", areaId: "K", stance: "ranged" }]);
  const crowded = applyCommand(initial, command);
  expect(refused(crowded)).toEqual([]);
  const target = crowded.events.find((e) => e.type === "monsterSkillTargetsResolved");
  expect(
    target?.type === "monsterSkillTargetsResolved" && target.resolutions.map((r) => r.targetId),
  ).toEqual(["h", "h2"]);
  // Guard 优先于 Crowded，选择单人英雄区域。
  const guarded = {
    ...initial,
    battle: {
      ...initial.battle!,
      entities: initial.battle!.entities.map((e) =>
        e.id === "h3" ? { ...e, areaId: "J", guard: true } : e,
      ),
    },
  };
  const result = applyCommand(guarded, command);
  expect(refused(result)).toEqual([]);
  const guardedEvent = result.events.find((e) => e.type === "monsterSkillTargetsResolved");
  expect(
    guardedEvent?.type === "monsterSkillTargetsResolved" &&
      guardedEvent.resolutions.map((r) => r.targetId),
  ).toEqual(["h3"]);
});

it.each([16, 17])("炮击承伤（已有伤口%i）进入统一生命／死门结算，不遗留上下文", (wounds) => {
  const initial = fixture();
  const state = {
    ...initial,
    battle: {
      ...initial.battle!,
      entities: initial.battle!.entities.map((e) => (e.id === "h" ? { ...e, wounds } : e)),
    },
  };
  const result = applyCommand(state, command);
  expect(refused(result)).toEqual([]);
  expect(result.events.some((e) => e.type === "heroHealthResolved" && e.entityId === "h")).toBe(
    true,
  );
  expect(result.state.battle!.entities.find((e) => e.id === "h")!.wounds).toBe(17);
  expect(result.state.battle!.pounderFire).toBeUndefined();
});
