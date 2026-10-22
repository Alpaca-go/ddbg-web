import { createTabletopInitialState } from "../tabletop-initial-state";
import type { TabletopState } from "../tabletop-types";

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
