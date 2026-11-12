import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "../../command";
import { createBattleState } from "../../battle";
import type { BattleEntity } from "../../battle";
import type { HeroSkillCardView } from "../../hero-skill";
import { buildWealdMonsterCatalog } from "./monster-catalog";
import { mergeWealdBattleMonsters } from "./monster-summon";
import { wealdRoomTileBattleAreas } from "./weald-mechanics";
import { WEALD_APPROVED_ROOM_TILES } from "./room-catalog";

const read = (path: string): unknown =>
  JSON.parse(
    readFileSync(new URL(`../../../../data/normalized/${path}.json`, import.meta.url), "utf8"),
  ) as unknown;
const smite = (read("corebox/hero_skill") as { cards: HeroSkillCardView[] }).cards.find(
  (c) => c.id === "hero_skill:p001",
)!;
const catalog = buildWealdMonsterCatalog(
  read("extension/weald/monster_medium"),
  read("extension/weald/monster_large"),
);
const ectoplasm = catalog.find((c) => c.id === "monster_medium:weald:p001")!;
const large = catalog.find((c) => c.id === "monster_large:weald:p001")!;
const tile = WEALD_APPROVED_ROOM_TILES.find((t) => t.number === 3)!;
const areas = wealdRoomTileBattleAreas(tile, { wealdMechanics: true });
const monsterStanceAreas = {
  aggressive: "E",
  defensive: "F",
  ranged: "G",
  support: "H",
} as const;

function hero(
  id: string,
  areaId: string,
  stance: "aggressive" | "defensive" | "ranged" | "support",
): BattleEntity {
  return {
    id,
    side: "hero",
    hero: "CRUSADER",
    areaId,
    stance,
    wounds: 0,
    stress: 0,
    dodge: 0,
    skillIds: [smite.id],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
}

function monster(
  id: string,
  card: typeof ectoplasm,
  stance: "aggressive" | "defensive" | "ranged" | "support",
  areaId: string,
  stanceSlots: 1 | 2 = 1,
): BattleEntity {
  return {
    id,
    side: "monster",
    hero: null,
    monsterCardId: card.id,
    life: card.life,
    dodge: card.dodge,
    areaId,
    stance,
    stanceSlots,
    wounds: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
}

function baseState(extra?: readonly BattleEntity[]): GameState {
  const initial = createBattleState(11, {
    areas,
    skills: [smite],
    light: 5,
    wealdMechanics: true,
    monsterStanceAreas,
    monsters: catalog,
    entities: [
      hero("h0", "B", "aggressive"),
      hero("h1", "C", "defensive"),
      monster("m0", ectoplasm, "defensive", "E"),
      ...(extra ?? []),
    ],
  });
  return mergeWealdBattleMonsters(
    {
      ...initial,
      dungeon: {
        phase: "inBattle",
        contentPacks: ["core", "weald"],
        heroes: [],
      } as unknown as NonNullable<GameState["dungeon"]>,
      battle: {
        ...initial.battle!,
        encounter: {
          round: 1,
          deck: ["monster", "hero"],
          actedIds: [],
          turn: { type: "monster", actorId: "m0" },
        },
      },
    },
    read("extension/weald/monster_medium"),
    read("extension/weald/monster_large"),
  );
}

function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result;
}

function playSkill(state: GameState, skillSlot: number, targetId: string) {
  let result = ok(state, {
    type: "playMonsterSkill",
    actorId: "m0",
    targetId,
    skillSlot,
  });
  if (result.state.battle!.shuffleIntents.length) {
    const resumed = ok(result.state, { type: "resolveShuffles" });
    result = { ...resumed, events: [...result.events, ...resumed.events] };
  }
  return result;
}

describe("Weald R-230 召唤部署（R31、R-034）", () => {
  it("Cytokinesis：命中后召唤 Ectoplasm 到首空姿态并洗入先攻", () => {
    const result = playSkill(baseState(), 2, "h0");
    const summoned = result.state.battle!.entities.filter(
      (e) => e.monsterCardId === ectoplasm.id && e.id !== "m0",
    );
    expect(summoned).toHaveLength(1);
    expect(summoned[0]).toMatchObject({
      stance: "aggressive",
      areaId: "E",
      life: 6,
      dodge: 0,
    });
    expect(
      result.state.battle!.encounter!.deck.filter((s) => s === "monster").length,
    ).toBeGreaterThan(1);
    expect(result.state.battle!.entities.find((e) => e.id === "h0")!.wounds).toBeGreaterThan(0);
  });

  it("Ectoplasmic Profusion：多目标压力 + 召唤 Large Ectoplasm 各一次", () => {
    const packed = baseState([hero("h2", "B", "ranged"), hero("h3", "B", "support")]);
    const result = playSkill(packed, 3, "h0");
    const stress = result.state
      .battle!.entities.filter((e) => e.side === "hero" && e.areaId === "B")
      .every((e) => e.stress! >= 1);
    expect(stress).toBe(true);
    const summoned = result.state.battle!.entities.filter((e) => e.monsterCardId === large.id);
    expect(summoned).toHaveLength(1);
    expect(summoned[0]).toMatchObject({ stanceSlots: 2, stance: "ranged", areaId: "G" });
  });

  it("全部落空不召唤", () => {
    const state = baseState();
    const missed = playSkill(
      {
        ...state,
        battle: {
          ...state.battle!,
          entities: state.battle!.entities.map((e) => (e.id === "h0" ? { ...e, dodge: 100 } : e)),
        },
      },
      2,
      "h0",
    );
    expect(missed.state.battle!.entities.filter((e) => e.side === "monster")).toHaveLength(1);
  });

  it("姿态轨已满则召唤无效但仍结算伤害", () => {
    const full = baseState([
      monster("m1", ectoplasm, "aggressive", "E"),
      monster("m2", ectoplasm, "ranged", "G"),
      monster("m3", ectoplasm, "support", "H"),
    ]);
    const result = playSkill(full, 2, "h0");
    expect(result.state.battle!.entities.filter((e) => e.side === "monster")).toHaveLength(4);
    expect(
      result.events.some((e) => e.type === "dungeonUpdated" && e.message.includes("已满")),
    ).toBe(true);
  });

  it("未选 weald 内容包时拒绝召唤部署", () => {
    const state = {
      ...baseState(),
      dungeon: {
        phase: "inBattle",
        contentPacks: ["core"],
        heroes: [],
      } as unknown as NonNullable<GameState["dungeon"]>,
    };
    const result = applyCommand(state, {
      type: "playMonsterSkill",
      actorId: "m0",
      targetId: "h0",
      skillSlot: 2,
    });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
  });

  it("零容量姿态区不能作为召唤落点", () => {
    const state = createBattleState(12, {
      areas: [
        { id: "E", capacity: 2, elevation: "normal", adjacent: ["B"], zeroCapacity: true },
        { id: "F", capacity: 2, elevation: "normal", adjacent: ["C"] },
        { id: "B", capacity: 4, elevation: "normal", adjacent: ["E"] },
        { id: "C", capacity: 4, elevation: "normal", adjacent: ["F"] },
      ],
      skills: [smite],
      light: 5,
      wealdMechanics: true,
      monsterStanceAreas: { aggressive: "E", defensive: "F", ranged: "F", support: "F" },
      monsters: catalog,
      entities: [hero("h0", "B", "aggressive"), monster("m0", ectoplasm, "defensive", "F")],
    });
    const wired = mergeWealdBattleMonsters(
      {
        ...state,
        dungeon: {
          phase: "inBattle",
          contentPacks: ["core", "weald"],
          heroes: [],
        } as unknown as NonNullable<GameState["dungeon"]>,
        battle: {
          ...state.battle!,
          encounter: {
            round: 1,
            deck: ["monster"],
            actedIds: [],
            turn: { type: "monster", actorId: "m0" },
          },
        },
      },
      read("extension/weald/monster_medium"),
      read("extension/weald/monster_large"),
    );
    const result = applyCommand(wired, {
      type: "playMonsterSkill",
      actorId: "m0",
      targetId: "h0",
      skillSlot: 2,
    });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
  });
});
