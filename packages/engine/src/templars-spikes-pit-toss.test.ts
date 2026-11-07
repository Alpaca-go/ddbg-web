import { expect, it, describe } from "vitest";
import geometry from "../../data/normalized/corebox/room_tile_geometry.json";
import { templarsRoomSchema } from "../../data/src/normalize/templars-room";
import { roomTileBattleAreas } from "./battle-monster-movement";
import { applyCommand, type Command, type GameState } from "./command";
import { templarsPitTossTargetArea } from "./boss/templars-pit-toss";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { ensureDarkestMidBossScriptsRegistered } from "./boss/darkest-mid-boss-scripts";
import {
  TEMPLAR_BODY_SLAM_SKILL_SLOT,
  TEMPLAR_IMPALER_MONSTER_CARD_ID,
} from "./boss/darkest-templars-skills-acc";
import { nextBattleRoll } from "./encounter";

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result;
}

function deployed(): GameState {
  ensureDarkestMidBossScriptsRegistered();
  const game = createCoreDungeonQuest(7, "quest:p017", "radiant", coreParty, coreQuestSources);
  const d = game.dungeon!;
  const room = d.rooms.find((r) => r.kind === "objective")!;
  const battlePrep = ok(
    { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
    { type: "prepareDungeonBattle" },
  );
  return ok(battlePrep.state, { type: "deployTemplarsI" }).state;
}

function fighting(): GameState {
  return ok(deployed(), { type: "startBattle" }).state;
}

function monsterByCard(state: GameState, cardId: string) {
  return state.battle!.entities.find((entity) => entity.monsterCardId === cardId)!;
}

function heroTurnOn(state: GameState, heroId: string, areaId?: string): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      encounter: {
        round: 1,
        deck: [],
        actedIds: [],
        turn: { type: "hero", actorId: heroId, actions: 2, usedSkillIds: [] },
      },
      entities: areaId
        ? state.battle!.entities.map((e) => (e.id === heroId ? { ...e, areaId } : e))
        : state.battle!.entities,
    },
  };
}

describe("R-193 Templars Spikes & Pit Toss", () => {
  it("d10 落点映射：1–2 B、3–4 E、5–6 H、7–8 K、9–10 N", () => {
    expect(templarsPitTossTargetArea(1)).toBe("B");
    expect(templarsPitTossTargetArea(2)).toBe("B");
    expect(templarsPitTossTargetArea(3)).toBe("E");
    expect(templarsPitTossTargetArea(5)).toBe("H");
    expect(templarsPitTossTargetArea(7)).toBe("K");
    expect(templarsPitTossTargetArea(10)).toBe("N");
  });

  it("room_tile:p013:front 投影 B/E/H/K/N 为 templarsSpikes", () => {
    const raw = geometry.tiles.find((t) => t.id === "room_tile:p013:front");
    const tile = templarsRoomSchema.parse(raw);
    const areas = roomTileBattleAreas(tile);
    for (const id of ["B", "E", "H", "K", "N"] as const) {
      expect(areas.find((a) => a.id === id)?.templarsSpikes).toBe(true);
    }
  });

  it("同一场合同路径去重：连续两次 move F→B 仅第一次结尖刺", () => {
    const base = fighting();
    const hero = base.battle!.entities.find((e) => e.side === "hero")!;
    const first = ok(heroTurnOn(base, hero.id, "F"), {
      type: "moveHero",
      actorId: hero.id,
      path: ["B"],
    });
    const spikeFirst = first.events.filter(
      (e) => e.type === "passiveTriggered" && e.trigger === "templarsSpikes",
    ).length;
    expect(spikeFirst).toBe(1);
    const second = ok(heroTurnOn(first.state, hero.id, "F"), {
      type: "moveHero",
      actorId: hero.id,
      path: ["B"],
    });
    expect(
      second.events.filter((e) => e.type === "passiveTriggered" && e.trigger === "templarsSpikes")
        .length,
    ).toBe(0);
  });

  it("Pit Toss：满区不移动，仍能触发 dungeonUpdated", () => {
    const base = fighting();
    const impaler = monsterByCard(base, TEMPLAR_IMPALER_MONSTER_CARD_ID);
    const heroes = base.battle!.entities.filter((e) => e.side === "hero");
    const target = heroes[0]!;
    const occupied = ["B", "E", "H", "K", "N"];
    let game: GameState = {
      ...base,
      battle: {
        ...base.battle!,
        encounter: {
          round: 1,
          deck: [],
          actedIds: [],
          turn: { type: "monster", actorId: impaler.id },
        },
        monsterAction: {
          actorId: impaler.id,
          skillSlot: TEMPLAR_BODY_SLAM_SKILL_SLOT,
          targetId: target.id,
          selectionRoll: null,
        },
        entities: base.battle!.entities.map((e) => {
          if (e.id === target.id) return { ...e, areaId: "L" };
          if (e.side === "hero" && e.id !== target.id) {
            const idx = heroes.filter((h) => h.id !== target.id).indexOf(e);
            return { ...e, areaId: occupied[idx] ?? e.areaId };
          }
          return e;
        }),
      },
    };
    const seed = game.seed;
    let c = game.battle!.rngCursor;
    let found = -1;
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const rAtk = nextBattleRoll(seed, c);
      const rPit = nextBattleRoll(seed, c + 1);
      if (rAtk >= 2 && rAtk <= 9 && rPit === 1) {
        found = c;
        break;
      }
      c += 1;
    }
    expect(found).toBeGreaterThanOrEqual(0);
    game = { ...game, battle: { ...game.battle!, rngCursor: found } };
    const played = ok(game, {
      type: "playMonsterSkill",
      actorId: impaler.id,
      targetId: target.id,
      skillSlot: TEMPLAR_BODY_SLAM_SKILL_SLOT,
      shuffleChoice: "push",
    });
    expect(
      played.events.some(
        (e) =>
          e.type === "dungeonUpdated" &&
          e.message.includes("满区 ignore") &&
          e.message.includes("d10=1"),
      ),
    ).toBe(true);
    expect(played.state.battle!.entities.find((e) => e.id === target.id)!.areaId).toBe(
      game.battle!.entities.find((e) => e.id === target.id)!.areaId,
    );
  });

  it("英雄移动结束停在尖刺区时结算（可走 F→B）", () => {
    const base = fighting();
    const hero = base.battle!.entities.find((e) => e.side === "hero")!;
    const game = heroTurnOn(base, hero.id, "F");
    const moved = ok(game, { type: "moveHero", actorId: hero.id, path: ["B"] });
    expect(
      moved.events.some(
        (e) =>
          e.type === "passiveTriggered" &&
          e.trigger === "templarsSpikes" &&
          e.message.includes("endHeroMoveTurn"),
      ),
    ).toBe(true);
    const h = moved.state.battle!.entities.find((e) => e.id === hero.id)!;
    expect(h.areaId).toBe("B");
    expect(h.wounds).toBeGreaterThan(0);
  });

  it("Pit Toss 命中且坑区有空位：英雄落入对应尖刺坑，且不结算尖刺伤害", () => {
    const base = fighting();
    const impaler = monsterByCard(base, TEMPLAR_IMPALER_MONSTER_CARD_ID);
    const heroes = base.battle!.entities.filter((e) => e.side === "hero");
    const target = heroes[0]!;
    const away = ["A", "D", "F", "G"];
    let game: GameState = {
      ...base,
      battle: {
        ...base.battle!,
        encounter: {
          round: 1,
          deck: [],
          actedIds: [],
          turn: { type: "monster", actorId: impaler.id },
        },
        monsterAction: {
          actorId: impaler.id,
          skillSlot: TEMPLAR_BODY_SLAM_SKILL_SLOT,
          targetId: target.id,
          selectionRoll: null,
        },
        entities: base.battle!.entities.map((e) => {
          if (e.id === target.id) return { ...e, areaId: "L" };
          if (e.side === "hero") {
            const idx = heroes.filter((h) => h.id !== target.id).indexOf(e);
            return { ...e, areaId: away[idx] ?? e.areaId };
          }
          return e;
        }),
      },
    };
    const seed = game.seed;
    let cursor = game.battle!.rngCursor;
    let found = -1;
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const rAtk = nextBattleRoll(seed, cursor);
      if (rAtk >= 2 && rAtk <= 9) {
        found = cursor;
        break;
      }
      cursor += 1;
    }
    expect(found).toBeGreaterThanOrEqual(0);
    game = { ...game, battle: { ...game.battle!, rngCursor: found } };
    const command = {
      type: "playMonsterSkill",
      actorId: impaler.id,
      targetId: target.id,
      skillSlot: TEMPLAR_BODY_SLAM_SKILL_SLOT,
      shuffleChoice: "push",
    } as const;
    const played = ok(game, command);
    const rPit = nextBattleRoll(seed, found + 1);
    const expectedArea =
      rPit <= 2 ? "B" : rPit <= 4 ? "E" : rPit <= 6 ? "H" : rPit <= 8 ? "K" : "N";
    const after = played.state.battle!.entities.find((e) => e.id === target.id)!;
    expect(after.areaId).toBe(expectedArea);
    expect(
      played.events.some((e) => e.type === "passiveTriggered" && e.trigger === "templarsSpikes"),
    ).toBe(false);
    expect(
      played.events.some(
        (e) => e.type === "dungeonUpdated" && e.message.includes(`d10=${rPit}→${expectedArea}`),
      ),
    ).toBe(true);
    // 同状态同命令可重复得到相同结果（R-193 的 d10 只消费一次种子化战斗骰）。
    expect(ok(game, command).state).toEqual(played.state);
  });
});
