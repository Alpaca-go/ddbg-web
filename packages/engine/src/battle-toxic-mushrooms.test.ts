import { describe, expect, it } from "vitest";
import { createBattleState, type BattleEntity } from "./battle";
import type { GameState } from "./command";
import { coreQuestSources } from "./test-helpers/core-quest";
import { fixedDamageResolution } from "./battle-spiked-pit";
import { resolveToxicMushrooms } from "./battle-toxic-mushrooms";

const stat = coreQuestSources.catalog.heroStats.find(
  (card) => card.name === "CRUSADER" && card.level === 1,
)!;
function setup(): GameState {
  const entities: BattleEntity[] = ["C", "C", "E", "A", "C"].map((areaId, index) => ({
    id: `h${index}`,
    side: "hero",
    hero: "CRUSADER",
    heroStatId: stat.id,
    heroLevel: 1,
    areaId,
    stance: "aggressive",
    skillIds: [],
    life: stat.life,
    wounds: 0,
    stress: 0,
    dodge: 0,
    guard: false,
    dead: index === 4,
    bleed: [],
    blight: [],
  }));
  entities.push({
    id: "m",
    side: "monster",
    hero: null,
    areaId: "C",
    stance: "aggressive",
    skillIds: [],
    life: 4,
    wounds: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  });
  return {
    ...createBattleState(1, {
      entities,
      skills: [],
      heroStats: [stat],
      light: 5,
      areas: ["A", "C", "E"].map((id) => ({
        id,
        capacity: 10,
        elevation: "normal" as const,
        adjacent: [],
      })),
      wealdMechanics: true,
    }),
    dungeon: {
      contentPacks: ["core", "weald"],
      roomCards: { active: { roomId: "R1", cardId: "room:weald:01" } },
    } as unknown as NonNullable<GameState["dungeon"]>,
  };
}
function miss(state: GameState, id = "h0") {
  return {
    ...fixedDamageResolution(state.battle!.entities.find((e) => e.id === id)!),
    outcome: "miss" as const,
  };
}
describe("Toxic Mushrooms 独立原语（R-234／R-239）", () => {
  it("仅未命中目标所在星区活英雄腐蚀，不伤其他星区、无星区、怪物或死者", () => {
    const state = setup();
    const result = resolveToxicMushrooms(state, "m", [miss(state)])!;
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    for (const entity of result.state.battle!.entities) {
      expect(entity.statusStacks ?? []).toEqual(
        ["h0", "h1"].includes(entity.id) ? [{ kind: "blight", amount: 1, remaining: 2 }] : [],
      );
      expect(entity.wounds).toBe(0);
    }
    expect(state.battle!.entities.every((e) => e.statusStacks === undefined)).toBe(true);
    expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
  });
  it("同区两次未命中分别叠加；JSON 往返保持确定性", () => {
    const state = setup();
    const resolutions = [miss(state), miss(state, "h1")];
    const result = resolveToxicMushrooms(state, "m", resolutions)!;
    expect(result.state.battle!.entities[0]!.statusStacks).toHaveLength(2);
    expect(resolveToxicMushrooms(JSON.parse(JSON.stringify(state)), "m", resolutions)).toEqual(
      result,
    );
  });
  it("命中、无星区、英雄攻击、旧机制或其他房间均不触发", () => {
    const state = setup();
    expect(resolveToxicMushrooms(state, "m", [{ ...miss(state), outcome: "hit" }])).toBeNull();
    expect(resolveToxicMushrooms(state, "m", [miss(state, "h3")])).toBeNull();
    expect(resolveToxicMushrooms(state, "h0", [miss(state)])).toBeNull();
    const oldBattle = { ...state.battle! };
    delete oldBattle.wealdMechanics;
    expect(resolveToxicMushrooms({ ...state, battle: oldBattle }, "m", [miss(state)])).toBeNull();
    const noDungeon = { ...state };
    delete noDungeon.dungeon;
    expect(resolveToxicMushrooms(noDungeon, "m", [miss(state)])).toBeNull();
  });
  it("任一受影响英雄缺抗性目录则整次原子拒绝", () => {
    const state = setup();
    const invalid = {
      ...state,
      battle: {
        ...state.battle!,
        entities: state.battle!.entities.map((e) =>
          e.id === "h1" ? { ...e, heroStatId: "missing" } : e,
        ),
      },
    };
    const result = resolveToxicMushrooms(invalid, "m", [miss(invalid)])!;
    expect(result.state).toBe(invalid);
    expect(result.events[0]!.type).toBe("commandRefused");
  });
});
