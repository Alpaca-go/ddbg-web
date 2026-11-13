import { describe, expect, it } from "vitest";
import resolveFile from "../../data/normalized/corebox/virtue_affliction.json";
import quirkFile from "../../data/normalized/corebox/quirk.json";
import diseaseFile from "../../data/normalized/corebox/disease.json";
import { normalizedQuirkFileSchema } from "../../data/src/normalize/schema";
import { diseaseFileSchema } from "../../data/src/disease";
import { createConditionPool } from "./conditions";
import { applyCommand, type GameState } from "./command";
import { createBattleState, type BattleEntity } from "./battle";
import { coreQuestSources } from "./test-helpers/core-quest";
import type { ResolveCard } from "./pressure";
import { WEALD_APPROVED_ROOM_TILES } from "./expansions/weald/room-catalog";
import { wealdRoomTileBattleAreas } from "./expansions/weald/weald-mechanics";
import { INFECTION_OAK_ROOM_CARD_ID } from "./expansions/weald/disinfection-constants";
import distribution from "../../data/normalized/extension/weald/disinfection_distribution.json";
import {
  disinfectInfectedOak,
  endTurnPoisonousRoots,
  readInfectedOakAction,
} from "./battle-infected-oak";

const tileFive = WEALD_APPROVED_ROOM_TILES.find((t) => t.number === 5)!;
const crusaderStat = coreQuestSources.catalog.heroStats.find(
  (c) => c.name === "CRUSADER" && c.level === 1,
)!;

function disinfectionBattle(): GameState {
  const areas = wealdRoomTileBattleAreas(tileFive, { wealdMechanics: true });
  expect(
    areas
      .filter((a) => a.poisonousRoots)
      .map((a) => a.id)
      .sort(),
  ).toEqual(["B", "D", "E", "G"]);
  const hero: BattleEntity = {
    id: "h0",
    side: "hero",
    hero: "CRUSADER",
    heroStatId: crusaderStat.id,
    heroLevel: 1,
    life: crusaderStat.life,
    wounds: 0,
    stress: 1,
    areaId: "B",
    stance: "aggressive",
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    dodge: crusaderStat.dodge,
  };
  const monster: BattleEntity = {
    id: "m0",
    side: "monster",
    hero: null,
    areaId: "A",
    stance: "aggressive",
    stanceSlots: 1,
    monsterCardId: "monster_medium:weald:p001",
    life: 4,
    wounds: 3,
    dodge: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  const base = createBattleState(9, {
    heroStats: [crusaderStat],
    skills: [],
    entities: [hero, monster],
    areas,
    light: 5,
    resolveCards: resolveFile.cards as ResolveCard[],
    conditions: createConditionPool(
      diseaseFileSchema.parse(diseaseFile).cards,
      normalizedQuirkFileSchema.parse(quirkFile).cards,
    ),
    provisions: [
      { id: "p0", face: "potion" },
      { id: "p1", face: "torch" },
    ],
    provisionWindows: true,
    wealdMechanics: true,
    monsters: [
      {
        id: "monster_medium:weald:p001",
        life: 4,
        verification: { unverified: false },
        skills: [],
        stanceGroups: [{ stances: ["aggressive", "defensive", "ranged", "support"], skill: 1 }],
      },
    ],
  });
  const dungeon = {
    phase: "inBattle",
    contentPacks: ["core", "weald"],
    position: "R1",
    questDistribution: distribution,
    rooms: [{ id: "R1", kind: "objective", revealed: true, cleared: false }],
    roomCards: {
      active: { roomId: "R1", cardId: INFECTION_OAK_ROOM_CARD_ID, blockedReason: "test" },
    },
    heroes: [],
  } as unknown as NonNullable<GameState["dungeon"]>;
  return {
    ...base,
    dungeon,
    battle: {
      ...base.battle!,
      monsterAction: null,
      encounter: {
        round: 1,
        deck: ["hero"],
        actedIds: [],
        turn: { type: "hero", actorId: "h0", actions: 2, usedSkillIds: [], mustMove: false },
      },
    },
  };
}

describe("Infected Oak 消毒与 Poisonous Roots（R-245）", () => {
  it("星区结束回合施加腐蚀 2·2t", () => {
    const base = disinfectionBattle();
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) => (e.id === "h0" ? { ...e, areaId: "B" } : e)),
      },
    };
    const roots = endTurnPoisonousRoots(state, "h0", []);
    if (!roots) throw new Error("Poisonous Roots 未触发");
    const refused = roots.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(refused.message);
    expect(
      roots.events.some(
        (e) => e.type === "passiveTriggered" && "trigger" in e && e.trigger === "poisonousRoots",
      ),
    ).toBe(true);
    const hero = roots.state.battle!.entities.find((e) => e.id === "h0")!;
    expect(
      (hero.blight && hero.blight.length > 0) ||
        hero.statusStacks?.some((s) => s.kind === "blight"),
    ).toBe(true);
  });

  it("1 行动 + 1 Potion 可消毒；末怪死亡后不可再消毒", () => {
    const state = disinfectionBattle();
    const ok = disinfectInfectedOak(state, "h0");
    expect(ok.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(ok.state.battle!.infectedOakDisinfected).toBe(true);
    expect(ok.state.battle!.provisions!.some((p) => p.face === "potion")).toBe(false);

    const deadMonster = {
      ...state,
      battle: {
        ...state.battle!,
        entities: state.battle!.entities.map((e) =>
          e.id === "m0" ? { ...e, dead: true, wounds: e.life! } : e,
        ),
      },
    };
    const refused = applyCommand(deadMonster, { type: "disinfectInfectedOak", actorId: "h0" });
    expect(refused.state).toBe(deadMonster);
  });

  it("消毒用尽最后行动时结算毒根并推进回合；重复使用不再消耗资源", () => {
    const base = disinfectionBattle();
    const turn = base.battle!.encounter!.turn;
    if (turn.type !== "hero") throw new Error("缺少英雄回合");
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        encounter: { ...base.battle!.encounter!, turn: { ...turn, actions: 1 } },
      },
    };
    expect(readInfectedOakAction(state)?.disabledReason).toBeNull();
    const result = applyCommand(state, { type: "disinfectInfectedOak", actorId: "h0" });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(result.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
    expect(
      result.events.some((e) => e.type === "passiveTriggered" && e.trigger === "poisonousRoots"),
    ).toBe(true);
    expect(applyCommand(result.state, { type: "disinfectInfectedOak", actorId: "h0" }).state).toBe(
      result.state,
    );
  });

  it("未选包、无行动、强制移动、无 Potion 或非星区均拒绝且状态不变", () => {
    const base = disinfectionBattle();
    const turn = base.battle!.encounter!.turn;
    if (turn.type !== "hero") throw new Error("缺少英雄回合");
    const variants: GameState[] = [
      { ...base, dungeon: { ...base.dungeon!, contentPacks: ["core"] } },
      {
        ...base,
        battle: {
          ...base.battle!,
          encounter: { ...base.battle!.encounter!, turn: { ...turn, actions: 0 } },
        },
      },
      {
        ...base,
        battle: {
          ...base.battle!,
          encounter: { ...base.battle!.encounter!, turn: { ...turn, mustMove: true } },
        },
      },
      { ...base, battle: { ...base.battle!, provisions: [] } },
      {
        ...base,
        battle: {
          ...base.battle!,
          entities: base.battle!.entities.map((e) => (e.id === "h0" ? { ...e, areaId: "F" } : e)),
        },
      },
    ];
    expect(readInfectedOakAction(variants[0]!)).toBeNull();
    for (const state of variants.slice(1))
      expect(readInfectedOakAction(state)?.disabledReason).toBeTruthy();
    for (const state of variants) {
      expect(applyCommand(state, { type: "disinfectInfectedOak", actorId: "h0" }).state).toBe(
        state,
      );
    }
  });
});
