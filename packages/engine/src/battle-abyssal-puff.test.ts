import { describe, expect, it } from "vitest";
import { applyCommand, type GameState } from "./command";
import { createBattleState, type BattleEntity } from "./battle";
import { coreQuestSources } from "./test-helpers/core-quest";
import { WEALD_APPROVED_ROOM_TILES } from "./expansions/weald/room-catalog";
import {
  necroticFungusEntitiesForTile,
  NECROTIC_FUNGUS_MONSTER_CARD,
} from "./expansions/weald/necrotic-fungus";
import { wealdRoomTileBattleAreas } from "./expansions/weald/weald-mechanics";
import { withAbyssalPuff } from "./battle-abyssal-puff";
import { savedCommandSchema } from "../../data/src/quest-save";

const tile = WEALD_APPROVED_ROOM_TILES.find((t) => t.number === 8)!;
const stat = coreQuestSources.catalog.heroStats.find(
  (c) => c.name === "CRUSADER" && c.level === 1,
)!;
const smite = coreQuestSources.catalog.skills.find((c) => c.id === "hero_skill:p001")!;
const card = coreQuestSources.catalog.monsters.find((c) => c.id === "monster_medium:p001")!;
function setup(version = true): GameState {
  const stances = ["aggressive", "defensive", "ranged", "support"] as const;
  const entities: BattleEntity[] = stances.map((stance, i) => ({
    id: `h${i}`,
    side: "hero",
    hero: "CRUSADER",
    heroStatId: stat.id,
    heroLevel: 1,
    life: stat.life,
    areaId: i === 0 ? "C" : "A",
    stance,
    skillIds: [smite.id],
    wounds: 0,
    stress: 0,
    dodge: stat.dodge!,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  entities.push(
    ...["B", "F"].map((areaId, i) => ({
      id: `m${i}`,
      side: "monster" as const,
      hero: null,
      monsterCardId: card.id,
      life: card.life,
      areaId,
      stance: stances[i]!,
      stanceSlots: 1 as const,
      skillIds: [],
      wounds: 0,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    })),
    ...necroticFungusEntitiesForTile(tile),
  );
  const base: GameState = {
    ...createBattleState(9, {
      entities,
      monsters: [card, NECROTIC_FUNGUS_MONSTER_CARD],
      heroStats: [stat],
      skills: [smite],
      areas: wealdRoomTileBattleAreas(tile, { wealdMechanics: true }),
      light: 5,
      wealdMechanics: true,
    }),
    dungeon: {
      phase: "inBattle",
      mode: "radiant",
      heroes: [],
      contentPacks: ["core", "weald"],
      roomCards: { active: { roomId: "R1", cardId: "room:weald:p008" } },
    } as unknown as NonNullable<GameState["dungeon"]>,
  };
  const started = applyCommand(base, {
    type: "startBattle",
    ...(version ? { wealdAbyssalPuff: true as const } : {}),
  });
  const refusal = started.events.find((e) => e.type === "commandRefused");
  if (refusal) throw new Error(refusal.message);
  return {
    ...started.state,
    battle: {
      ...started.state.battle!,
      encounter: {
        ...started.state.battle!.encounter!,
        turn: { type: "hero", actorId: "h0", actions: 2, usedSkillIds: [], mustMove: false },
      },
    },
  };
}
function attack(state: GameState) {
  return {
    type: "playHeroSkill",
    actorId: "h0",
    targetId: state.battle!.entities.find((e) => e.necroticFungus && e.areaId === "C")!.id,
    skillId: smite.id,
  } as const;
}
describe("Fungal Overgrowth / Abyssal Puff（R-234／R-236、W-04）", () => {
  it("公开技能摧毁真菌后给全房间怪物增益2t，其他真菌／英雄不受益，旧版本不触发", () => {
    const state = setup();
    const result = applyCommand(state, attack(state));
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(result.state.battle!.entities.find((e) => e.id === attack(state).targetId)!.dead).toBe(
      true,
    );
    for (const e of result.state.battle!.entities) {
      if (e.id.startsWith("m")) expect(e.statusStacks).toEqual([{ kind: "buff", remaining: 2 }]);
      else expect(e.statusStacks?.some((s) => s.kind === "buff") ?? false).toBe(false);
    }
    expect(
      result.events.filter((e) => e.type === "passiveTriggered" && e.trigger === "abyssalPuff"),
    ).toHaveLength(1);
    const legacy = setup(false);
    const oldResult = applyCommand(legacy, attack(legacy));
    expect(
      oldResult.state.battle!.entities.find((e) => e.id === "m0")!.statusStacks,
    ).toBeUndefined();
    expect(oldResult.state.battle!.rngCursor).toBe(result.state.battle!.rngCursor);
    expect(applyCommand(JSON.parse(JSON.stringify(state)), attack(state))).toEqual(result);
    expect(applyCommand(result.state, attack(state)).state).toBe(result.state);
  });
  it("两枚新摧毁真菌各自触发，旧尸体与后续命令不重放", () => {
    const state = setup();
    const destroyed = {
      ...state,
      battle: {
        ...state.battle!,
        entities: state.battle!.entities.map((e) =>
          e.necroticFungus ? { ...e, dead: true, wounds: 1 } : e,
        ),
      },
    };
    const result = withAbyssalPuff(state, { state: destroyed, events: [] });
    expect(result.state.battle!.entities.find((e) => e.id === "m0")!.statusStacks).toEqual([
      { kind: "buff", remaining: 2 },
      { kind: "buff", remaining: 2 },
    ]);
    expect(result.events.filter((e) => e.type === "passiveTriggered")).toHaveLength(2);
    expect(withAbyssalPuff(result.state, { state: result.state, events: [] }).events).toEqual([]);
  });
  it("缺受益怪物防御目录则公开攻击整条原子回滚", () => {
    const base = setup();
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) =>
          e.id === "m1" ? { ...e, monsterCardId: "missing" } : e,
        ),
      },
    };
    const result = applyCommand(state, attack(state));
    expect(result.events[0]!.type).toBe("commandRefused");
    expect(result.state).toBe(state);
  });
  it("非 8 号／未选包／Stygian 不触发，已死怪物不获益", () => {
    for (const kind of ["room", "pack", "stygian"] as const) {
      const base = setup();
      const d = base.dungeon!;
      const state = {
        ...base,
        dungeon: {
          ...d,
          ...(kind === "room"
            ? {
                roomCards: {
                  ...d.roomCards!,
                  active: { ...d.roomCards!.active!, cardId: "room:weald:p003" },
                },
              }
            : {}),
          ...(kind === "pack" ? { contentPacks: ["core" as const] } : {}),
          ...(kind === "stygian" ? { mode: "stygian" as const } : {}),
        },
      };
      expect(
        applyCommand(state, attack(state)).events.some(
          (e) => e.type === "passiveTriggered" && e.trigger === "abyssalPuff",
        ),
      ).toBe(false);
    }
    const base = setup();
    const state = {
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) => (e.id === "m1" ? { ...e, dead: true } : e)),
      },
    };
    expect(
      applyCommand(state, attack(state)).state.battle!.entities.find((e) => e.id === "m1")!
        .statusStacks,
    ).toBeUndefined();
  });
  it("新开始标记严格解析，不接受 false 或数字", () => {
    const command = { type: "startBattle", wealdAbyssalPuff: true };
    expect(savedCommandSchema.parse(command)).toEqual(command);
    for (const flag of [false, 1])
      expect(savedCommandSchema.safeParse({ ...command, wealdAbyssalPuff: flag }).success).toBe(
        false,
      );
  });
});
