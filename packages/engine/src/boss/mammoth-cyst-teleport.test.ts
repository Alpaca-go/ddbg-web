import { describe, expect, it } from "vitest";
import type { BattleEntity } from "../battle";
import { applyCommand, type Command, type GameState } from "../command";
import { nextBattleRoll } from "../encounter";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { MAMMOTH_CYST_WHITE_CELL_SUMMON_CARD_ID } from "./darkest-mammoth-cyst-combat-runtime";
import { ensureDarkestMidBossScriptsRegistered } from "./darkest-mid-boss-scripts";
import {
  chainWhiteCellTeleportAfterMonsterSkill,
  mammothTeleportTargetArea,
  WHITE_CELL_TELEPORT_SKILL_SLOT,
} from "./mammoth-cyst-teleport";

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result;
}

function fighting(): GameState {
  ensureDarkestMidBossScriptsRegistered();
  const game = createCoreDungeonQuest(7, "quest:p018", "radiant", coreParty, coreQuestSources);
  const d = game.dungeon!;
  const room = d.rooms.find((r) => r.kind === "objective")!;
  const prep = ok(
    { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
    { type: "prepareDungeonBattle" },
  );
  const deployed = ok(prep.state, { type: "deployMammothCystI" });
  return ok(deployed.state, { type: "startBattle" }).state;
}

/** R-164 房间：Boss 在 H、四英雄在 K；White Cell 放 L，射程 2 需目标在距离 2（J/H）。 */
function withStalk(state: GameState): GameState {
  const card = state.battle!.monsters!.find(
    (entry) => entry.id === MAMMOTH_CYST_WHITE_CELL_SUMMON_CARD_ID,
  ) as { life?: number; dodge?: number } | undefined;
  const stalk: BattleEntity = {
    id: "stalk",
    side: "monster",
    hero: null,
    monsterCardId: MAMMOTH_CYST_WHITE_CELL_SUMMON_CARD_ID,
    life: card?.life ?? 16,
    dodge: card?.dodge ?? 4,
    areaId: "L",
    stance: "ranged",
    stanceSlots: 1,
    wounds: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  return {
    ...state,
    battle: { ...state.battle!, entities: [...state.battle!.entities, stalk] },
  };
}

function stalkTurn(state: GameState, targetId: string): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      encounter: {
        round: 1,
        deck: [],
        actedIds: [],
        turn: { type: "monster", actorId: "stalk" },
      },
      monsterAction: {
        actorId: "stalk",
        skillSlot: WHITE_CELL_TELEPORT_SKILL_SLOT,
        targetId,
        selectionRoll: null,
      },
    },
  };
}

function teleportCommand(targetId: string): Command {
  return {
    type: "playMonsterSkill",
    actorId: "stalk",
    targetId,
    skillSlot: WHITE_CELL_TELEPORT_SKILL_SLOT,
  };
}

function heroEntities(state: GameState): BattleEntity[] {
  return state.battle!.entities.filter((e) => e.side === "hero" && !e.dead);
}

/** Teleport 射程 2 是「恰好 2 格」；L→K→J 与 L→K→H 都是 2。 */
function moveHeroTo(state: GameState, heroId: string, areaId: string): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((e) => (e.id === heroId ? { ...e, areaId } : e)),
    },
  };
}

function teleportEvent(result: ReturnType<typeof applyCommand>) {
  return result.events.find(
    (e) => e.type === "dungeonUpdated" && e.message.startsWith("White Cell Teleport"),
  ) as { message: string } | undefined;
}

describe("R-195 White Cell Teleport", () => {
  it("紫星 d10 映射：1–2 A、3–4 C、5–6 B、7–8 G、9–10 I", () => {
    expect(mammothTeleportTargetArea(1)).toBe("A");
    expect(mammothTeleportTargetArea(2)).toBe("A");
    expect(mammothTeleportTargetArea(3)).toBe("C");
    expect(mammothTeleportTargetArea(4)).toBe("C");
    expect(mammothTeleportTargetArea(5)).toBe("B");
    expect(mammothTeleportTargetArea(6)).toBe("B");
    expect(mammothTeleportTargetArea(7)).toBe("G");
    expect(mammothTeleportTargetArea(8)).toBe("G");
    expect(mammothTeleportTargetArea(9)).toBe("I");
    expect(mammothTeleportTargetArea(10)).toBe("I");
    expect(mammothTeleportTargetArea(0)).toBeNull();
    expect(mammothTeleportTargetArea(11)).toBeNull();
  });

  it("命中后 d10 落点：英雄移动到对应紫星区，姿态不变，+2 压力", () => {
    const base = withStalk(fighting());
    const target = heroEntities(base)[0]!;
    const targetStance = target.stance;
    const staged = moveHeroTo(base, target.id, "J");
    for (let cursor = 0; cursor < 400; cursor += 1) {
      const state = stalkTurn(
        { ...staged, battle: { ...staged.battle!, rngCursor: cursor } },
        target.id,
      );
      const result = applyCommand(state, teleportCommand(target.id));
      const event = teleportEvent(result);
      if (!event || event.message.includes("不移动")) continue;
      const roll = nextBattleRoll(state.seed, cursor + 1);
      const areaId = mammothTeleportTargetArea(roll)!;
      expect(event.message).toContain(`d10=${roll}→${areaId}`);
      const hero = result.state.battle!.entities.find((e) => e.id === target.id)!;
      expect(hero.areaId).toBe(areaId);
      expect(hero.stance).toBe(targetStance);
      expect(hero.stress).toBe((target.stress ?? 0) + 2);
      return;
    }
    throw new Error("未找到 Teleport 命中的 RNG 游标");
  });

  it("落点满员时按 §6.7 位移截断：英雄不移动，事件标注满区", () => {
    const base = withStalk(fighting());
    const [target, ...others] = heroEntities(base);
    const staged = moveHeroTo(base, target!.id, "J");
    // 找到命中游标并预先填满会落到的紫星区。
    for (let cursor = 0; cursor < 400; cursor += 1) {
      const state = stalkTurn(
        { ...staged, battle: { ...staged.battle!, rngCursor: cursor } },
        target!.id,
      );
      const result = applyCommand(state, teleportCommand(target!.id));
      const event = teleportEvent(result);
      if (!event || event.message.includes("不移动")) continue;
      const roll = nextBattleRoll(state.seed, cursor + 1);
      const areaId = mammothTeleportTargetArea(roll)!;
      const capacity = state.battle!.areas.find((a) => a.id === areaId)!.capacity!;
      // 用其他英雄填满落点（容量 2/3；目标仍在 K）。
      const fillers = others!.slice(0, capacity);
      const filled: GameState = {
        ...state,
        battle: {
          ...state.battle!,
          entities: state.battle!.entities.map((e) =>
            fillers.some((f) => f.id === e.id) ? { ...e, areaId } : e,
          ),
        },
      };
      const blocked = applyCommand(filled, teleportCommand(target!.id));
      expect(blocked.events.some((e) => e.type === "commandRefused")).toBe(false);
      const blockedEvent = teleportEvent(blocked)!;
      expect(blockedEvent.message).toContain(`d10=${roll}→${areaId}`);
      expect(blockedEvent.message).toContain("满区");
      const hero = blocked.state.battle!.entities.find((e) => e.id === target!.id)!;
      expect(hero.areaId).toBe("J");
      return;
    }
    throw new Error("未找到 Teleport 命中的 RNG 游标");
  });

  it("落空不传送；非生产战斗不触发（链式结算直接返回原状态）", () => {
    const base = withStalk(fighting());
    const target = heroEntities(base)[0]!;
    const staged = moveHeroTo(base, target.id, "J");
    // 先用命中游标取得真实的 monsterSkillResolved 事件，再改写成 miss 走链式结算。
    let hit: ReturnType<typeof applyCommand> | undefined;
    let resolved:
      | Extract<ReturnType<typeof applyCommand>["events"][number], { type: "monsterSkillResolved" }>
      | undefined;
    for (let cursor = 0; cursor < 400 && !hit; cursor += 1) {
      const state = stalkTurn(
        { ...staged, battle: { ...staged.battle!, rngCursor: cursor } },
        target.id,
      );
      const result = applyCommand(state, teleportCommand(target.id));
      if (!teleportEvent(result)) continue;
      hit = result;
      resolved = result.events.find((e) => e.type === "monsterSkillResolved") as typeof resolved;
    }
    expect(hit).toBeDefined();
    expect(resolved).toBeDefined();
    const missResolved = {
      ...resolved!,
      resolution: { ...resolved!.resolution, outcome: "miss" as const },
    };
    const miss = chainWhiteCellTeleportAfterMonsterSkill(hit!, missResolved);
    expect(miss).toBe(hit);
    // 沙盒（非 R-184 生产战斗）不触发 Teleport。
    const sandbox: ReturnType<typeof applyCommand> = {
      ...hit!,
      state: {
        ...hit!.state,
        dungeon: {
          ...hit!.state.dungeon!,
          roomCards: { ...hit!.state.dungeon!.roomCards!, active: null },
        },
      },
    };
    expect(chainWhiteCellTeleportAfterMonsterSkill(sandbox, resolved!)).toBe(sandbox);
  });
});
