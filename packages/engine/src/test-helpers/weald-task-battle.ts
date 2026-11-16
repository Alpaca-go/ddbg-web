import { applyCommand, type GameState } from "../command";
import { createBattleState } from "../battle";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./core-quest";
import medium from "../../../data/normalized/extension/weald/monster_medium.json";
import large from "../../../data/normalized/extension/weald/monster_large.json";
import curios from "../../../data/normalized/extension/weald/curio.json";
import { wealdCurioFileSchema } from "../../../data/src/curio";
export const wealdTaskSources = {
  ...coreQuestSources,
  weald: { medium, large, curios: wealdCurioFileSchema.parse(curios).cards },
};

/** 已部署机制检查点，不伪装自然任务日志。 */
export function wealdTaskBattleFixture(id: import("../../../data/src/basic-quests").BasicQuestId): GameState {
  let state = createCoreDungeonQuest(
    0,
    id,
    "radiant",
    coreParty,
    wealdTaskSources,
    true,
    "full",
    ["core", "weald"],
    undefined,
    undefined,
    "tasks-v1",
  );
  state = applyCommand(state, { type: "rollDungeonProvisions" }).state;
  for (let i = 0; state.dungeon?.pending && i < 100; i++) {
    const p = state.dungeon.pending;
    state = applyCommand(state, {
      type: "resolveChoice",
      choiceId: p.id,
      optionId: p.options[0]!.id,
    }).state;
  }
  const d = state.dungeon!;
  const heroes = d.heroes.map((h) => ({
    id: h.id,
    side: "hero" as const,
    hero: d.battleCatalog!.heroStats.find((s) => s.id === h.heroStatId)!.name,
    heroStatId: h.heroStatId!,
    life: h.life!,
    wounds: 0,
    stress: 0,
    dodge: 0,
    stance: h.stance!,
    skillIds: h.skillIds!,
    areaId: "a",
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  const battle = createBattleState(0, {
    heroStats: d.battleCatalog!.heroStats,
    entities: [
      ...heroes,
      {
        id: "m",
        side: "monster",
        hero: null,
        monsterCardId: "monster_medium:weald:p018",
        life: 39,
        wounds: 0,
        dodge: 4,
        stance: "support",
        stanceSlots: 1,
        skillIds: [],
        areaId: "a",
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
    ],
    skills: d.battleCatalog!.skills,
    monsters: d.battleCatalog!.monsters,
    light: 5,
    areas: [{ id: "a", elevation: "normal", adjacent: [] }],
    resolveCards: d.resolveCards,
    conditions: d.conditions!,
    provisions: [],
  });
  return {
    ...state,
    battle: { ...battle.battle!, wealdMechanics: true },
    dungeon: {
      ...d,
      phase: "inBattle",
      position: d.rooms[0]!.id,
      rooms: d.rooms.map((r, i) => (i === 0 ? { ...r, kind: "lair", revealed: true } : r)),
    },
  };
}
