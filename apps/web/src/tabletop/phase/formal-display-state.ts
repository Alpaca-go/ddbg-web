import { createTabletopInitialState } from "../tabletop-initial-state";
import type { TabletopState } from "../tabletop-types";
import type { FlowPhaseId } from "./flow-phase";
import { HAMLET_BUILDING_MARKERS } from "../hamlet-building-markers";

/** 仅校验详情 UI 对象；不改当前英雄、战斗选择或引擎状态。 */
export function formalDetailIsValid(state: TabletopState, phase: FlowPhaseId): boolean {
  const { detailTargetId: id, detailTargetKind: kind } = state.ui;
  if (id === null) return true;
  switch (kind) {
    case "hero":
      return state.heroes.some((hero) => hero.id === id && !hero.isEmpty);
    case "monster":
      return phase === "battle" && state.monsters.some((monster) => monster.id === id);
    case "room":
      return (
        (phase === "dungeonExploration" || phase === "battle") &&
        state.quest.currentRoomCardId === id
      );
    case "quest":
      return phase !== "hamlet" && state.quest.questCardId === id;
    case "building":
      return phase === "hamlet" && HAMLET_BUILDING_MARKERS.some((building) => building.id === id);
  }
}

/** 正式外壳仅复用 UI 偏好，所有样例世界数据清空；未知资源由宿主标记。 */
export function createFormalDisplayState(): TabletopState {
  const base = createTabletopInitialState();
  return {
    ...base,
    heroes: [],
    monsters: [],
    mapNodes: [],
    logLines: [],
    quest: {
      questCardId: "",
      locationLabel: "—",
      questLabel: "—",
      dungeonLevel: "—",
      actLabel: "—",
      xpProgress: "—",
      roomsCleared: 0,
      roomTotal: 0,
      layoutId: "",
      currentRoomCardId: "",
    },
    battle: {
      light: 0,
      gold: 0,
      round: 0,
      actionsRemaining: 0,
      turnActorId: "",
      initiativeDeckHero: 0,
      initiativeDeckMonster: 0,
      initiativeRevealed: [],
    },
    ui: { ...base.ui, phase: "questSetup", activeHeroId: "hero-0" },
  };
}
