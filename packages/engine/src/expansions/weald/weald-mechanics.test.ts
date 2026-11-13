import { describe, expect, it } from "vitest";
import statsFile from "../../../../data/normalized/corebox/hero_stat.json";
import skillsFile from "../../../../data/normalized/corebox/hero_skill.json";
import resolveFile from "../../../../data/normalized/corebox/virtue_affliction.json";
import { normalizedHeroStatFileSchema } from "../../../../data/src/normalize/hero-stat";
import {
  applyCommand,
  createBattleState,
  type BattleEntity,
  type BattleSetup,
  type HeroSkillCardView,
} from "../../index";
import type { GameState } from "../../command";
import type { ResolveCard } from "../../pressure";
import { healingForbidden } from "../../battle-healing";
import { WEALD_APPROVED_ROOM_TILES, findWealdRoomTile } from "./room-catalog";
import {
  NECROTIC_FUNGUS_MONSTER_CARD,
  isNecroticFungusEntity,
  necroticFungusEntitiesForTile,
} from "./necrotic-fungus";
import { wealdRoomTileBattleAreas, wealdZeroCapacityEndTurnRefusal } from "./weald-mechanics";

const crusaderStat = normalizedHeroStatFileSchema
  .parse(statsFile)
  .cards.find((c) => c.name === "CRUSADER" && c.level === 1 && c.face === "front")!;
const skillCards = (skillsFile as { cards: HeroSkillCardView[] }).cards;
const smite = skillCards.find((c) => c.id === "hero_skill:p001")!;
const bolster = skillCards.find((c) => c.id === "hero_skill:p013")!;

const tileFive = WEALD_APPROVED_ROOM_TILES.find((t) => t.number === 5)!;
const tileThree = WEALD_APPROVED_ROOM_TILES.find((t) => t.number === 3)!;
const tileOne = WEALD_APPROVED_ROOM_TILES.find((t) => t.number === 1)!;

function dungeonStub(packs: readonly ("core" | "weald")[]): GameState["dungeon"] {
  return {
    phase: "inBattle",
    contentPacks: [...packs],
    heroes: [],
  } as unknown as GameState["dungeon"];
}

function battleBase(options: {
  readonly wealdMechanics: boolean;
  readonly tile: typeof tileFive;
  readonly fungus?: boolean;
  readonly heroArea?: string;
}): GameState {
  const areas = wealdRoomTileBattleAreas(options.tile, { wealdMechanics: options.wealdMechanics });
  const hero: BattleEntity = {
    id: "h0",
    side: "hero",
    hero: "CRUSADER",
    heroStatId: crusaderStat.id,
    heroLevel: 1,
    life: crusaderStat.life,
    wounds: 0,
    stress: 0,
    areaId: options.heroArea ?? "B",
    stance: "aggressive",
    skillIds: [smite.id, bolster.id],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    dodge: crusaderStat.dodge,
  };
  const ally: BattleEntity = {
    id: "h1",
    side: "hero",
    hero: "CRUSADER",
    heroStatId: crusaderStat.id,
    heroLevel: 1,
    life: crusaderStat.life,
    wounds: 5,
    stress: 0,
    areaId: "C",
    stance: "defensive",
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    dodge: crusaderStat.dodge,
  };
  const soldier: BattleEntity = {
    id: "m0",
    side: "monster",
    hero: null,
    areaId: "E",
    stance: "aggressive",
    stanceSlots: 1,
    monsterCardId: "fixture-soldier",
    life: 10,
    wounds: 0,
    dodge: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  const fungus =
    options.fungus !== false && options.wealdMechanics
      ? necroticFungusEntitiesForTile(options.tile)
      : [];
  const setup: BattleSetup = {
    areas,
    skills: [smite, bolster],
    light: 5,
    resolveCards: resolveFile.cards as ResolveCard[],
    ...(options.wealdMechanics ? { wealdMechanics: true as const } : {}),
    heroStats: [
      {
        id: crusaderStat.id,
        name: crusaderStat.name,
        life: crusaderStat.life,
        speed: 2,
        attributesVerified: true as const,
        level: 1,
      },
    ],
    entities: [...fungus, hero, ally, soldier],
    monsters: [
      NECROTIC_FUNGUS_MONSTER_CARD,
      {
        id: "fixture-soldier",
        life: 10,
        verification: { unverified: false },
        skills: [],
        stanceGroups: [{ stances: ["aggressive", "defensive", "ranged", "support"], skill: 1 }],
      },
    ],
  };
  return {
    ...createBattleState(42, setup),
    dungeon: dungeonStub(options.wealdMechanics ? ["core", "weald"] : ["core"]),
  } as GameState;
}

function heroTurn(state: GameState, actions = 2, mustMove = false): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      encounter: {
        round: 1,
        deck: ["hero"],
        actedIds: [],
        turn: { type: "hero", actorId: "h0", actions, usedSkillIds: [], mustMove },
      },
    },
  };
}

describe("Weald W-03 / W-04", () => {
  it("真菌放置仅使用核准 necroticFungusAreas", () => {
    expect(tileThree.necroticFungusAreas).toEqual(["B", "G"]);
    expect(tileOne.necroticFungusAreas).toEqual([]);
    const placed = necroticFungusEntitiesForTile(tileThree);
    expect(placed.map((e) => e.areaId).sort()).toEqual(["B", "G"]);
    expect(findWealdRoomTile("room:weald:p001")?.necroticFungusAreas).toEqual([]);
  });

  it("零容量标记仅在启用 wealdMechanics 时投影", () => {
    const on = wealdRoomTileBattleAreas(tileFive, { wealdMechanics: true });
    const off = wealdRoomTileBattleAreas(tileFive, { wealdMechanics: false });
    expect(on.find((a) => a.id === "I")?.zeroCapacity).toBe(true);
    expect(off.find((a) => a.id === "I")?.zeroCapacity).toBeUndefined();
  });

  it("可穿过零容量区；结束单次移动合法；在零容量区结束回合非法", () => {
    const through = applyCommand(heroTurn(battleBase({ wealdMechanics: true, tile: tileFive })), {
      type: "moveHero",
      actorId: "h0",
      path: ["I", "D"],
    });
    const refused = through.events.find((e) => e.type === "commandRefused");
    expect(refused).toBeUndefined();
    expect(through.state.battle!.entities.find((e) => e.id === "h0")!.areaId).toBe("D");

    const pause = applyCommand(
      heroTurn(battleBase({ wealdMechanics: true, tile: tileFive, heroArea: "B" }), 2),
      { type: "moveHero", actorId: "h0", path: ["I"] },
    );
    expect(pause.state.battle!.entities.find((e) => e.id === "h0")!.areaId).toBe("I");
    const turn = pause.state.battle!.encounter!.turn;
    expect(turn.type === "hero" ? turn.actions : 0).toBe(1);

    const beforeEnd = heroTurn(
      battleBase({ wealdMechanics: true, tile: tileFive, heroArea: "I" }),
      1,
    );
    const endOnZero = applyCommand(beforeEnd, {
      type: "changeStance",
      actorId: "h0",
      direction: "backward",
    });
    expect(endOnZero.state).toBe(beforeEnd);
    expect(endOnZero.events.at(-1)).toMatchObject({ type: "commandRefused" });
  });

  it("未启用 Weald 包时不拒绝零容量结束回合", () => {
    const packed = heroTurn(battleBase({ wealdMechanics: true, tile: tileFive, heroArea: "I" }), 1);
    const coreOnly = { ...packed, dungeon: dungeonStub(["core"]) } as GameState;
    expect(wealdZeroCapacityEndTurnRefusal(coreOnly, "h0")).toBeNull();
    expect(wealdZeroCapacityEndTurnRefusal(packed, "h0")).toContain("零容量");
  });

  it("场上有真菌时全场禁疗", () => {
    const withFungus = heroTurn(battleBase({ wealdMechanics: true, tile: tileThree }));
    expect(healingForbidden(withFungus.battle!, "h0")).toBe(true);
    expect(healingForbidden(withFungus.battle!, "h1")).toBe(true);
    const heal = applyCommand(withFungus, {
      type: "playHeroSkill",
      actorId: "h0",
      targetId: "h1",
      skillId: bolster.id,
    });
    expect(heal.state).toBe(withFungus);
  });

  it("未启用 Weald 时不禁疗", () => {
    const off = heroTurn(battleBase({ wealdMechanics: false, tile: tileThree, fungus: false }));
    expect(off.battle!.entities.some((e) => e.necroticFungus)).toBe(false);
    expect(healingForbidden(off.battle!, "h1")).toBe(false);
  });

  it("命中且至少 1 伤害可摧毁真菌；无伤害效果不能摧毁", () => {
    const fungus = necroticFungusEntitiesForTile(tileThree).find((e) => e.areaId === "B")!;
    const base = battleBase({ wealdMechanics: true, tile: tileThree });
    const moved = heroTurn({
      ...base,
      battle: {
        ...base.battle!,
        entities: base.battle!.entities.map((e) =>
          e.id === "h0" ? { ...e, areaId: fungus.areaId } : e,
        ),
      },
    });
    const noDamage = applyCommand(moved, {
      type: "playHeroSkill",
      actorId: "h0",
      targetId: fungus.id,
      skillId: bolster.id,
    });
    expect(noDamage.state.battle!.entities.find((e) => e.id === fungus.id)!.dead).toBe(false);

    const hit = applyCommand(moved, {
      type: "playHeroSkill",
      actorId: "h0",
      targetId: fungus.id,
      skillId: smite.id,
    });
    expect(hit.events.some((e) => e.type === "commandRefused")).toBe(false);
    const resolved = hit.events.find((e) => e.type === "heroSkillResolved");
    expect(resolved?.resolution?.effect).toBe("damage");
    expect(resolved?.resolution?.outcome).not.toBe("miss");
    const token = hit.state.battle!.entities.find((e) => e.id === fungus.id)!;
    expect(token.dead || token.wounds >= 1).toBe(true);
    // W-04：摧毁真菌不能触发怪物轨补位，也不能挪动另一个真菌的兼容字段。
    for (const before of moved.battle!.entities.filter((e) => e.id !== fungus.id))
      expect(hit.state.battle!.entities.find((e) => e.id === before.id)!.stance).toBe(
        before.stance,
      );
  });

  it("真菌不进入先攻牌堆", () => {
    const state = battleBase({ wealdMechanics: true, tile: tileThree });
    const sides = state
      .battle!.entities.filter((e) => !e.dead && !isNecroticFungusEntity(e))
      .map((e) => e.side);
    expect(sides.filter((s) => s === "monster")).toEqual(["monster"]);
  });
});
