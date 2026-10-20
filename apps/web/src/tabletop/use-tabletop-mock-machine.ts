import { useCallback, useReducer } from "react";
import { createTabletopInitialState } from "./tabletop-initial-state";
import type { TabletopBottomTab, TabletopMockDice, TabletopState } from "./tabletop-types";

type Action =
  | { readonly type: "selectHero"; readonly heroId: string }
  | { readonly type: "selectSkill"; readonly skillId: string | null }
  | { readonly type: "selectTarget"; readonly targetId: string }
  | { readonly type: "setTab"; readonly tab: TabletopBottomTab }
  | { readonly type: "confirmAction" }
  | { readonly type: "drawInitiative" }
  | { readonly type: "toggleLog" }
  | { readonly type: "toggleAtmosphere" };

function reducer(state: TabletopState, action: Action): TabletopState {
  switch (action.type) {
    case "selectHero":
      return {
        ...state,
        ui: {
          ...state.ui,
          activeHeroId: action.heroId,
          detailTargetId: action.heroId,
          detailTargetKind: "hero",
          selectedSkillId: null,
          selectedTargetId: null,
          mockDice: null,
        },
      };
    case "selectSkill":
      return {
        ...state,
        ui: {
          ...state.ui,
          selectedSkillId: action.skillId,
          selectedTargetId: null,
          mockDice: null,
        },
      };
    case "selectTarget": {
      const monster = state.monsters.find((m) => m.id === action.targetId);
      return {
        ...state,
        ui: {
          ...state.ui,
          selectedTargetId: action.targetId,
          detailTargetId: action.targetId,
          detailTargetKind: monster ? "monster" : state.ui.detailTargetKind,
          mockDice: null,
        },
      };
    }
    case "setTab":
      return { ...state, ui: { ...state.ui, bottomTab: action.tab } };
    case "confirmAction": {
      if (!state.ui.selectedSkillId || !state.ui.selectedTargetId) return state;
      const mockDice: TabletopMockDice = {
        kind: "battle-skill-d10",
        value: 7,
        label: "mock · d10=7（命中示意，非引擎结算）",
        isMock: true,
      };
      const skillId = state.ui.selectedSkillId;
      const target = state.monsters.find((m) => m.id === state.ui.selectedTargetId);
      return {
        ...state,
        ui: {
          ...state.ui,
          mockDice,
          usedSkillIds: state.ui.usedSkillIds.includes(skillId)
            ? state.ui.usedSkillIds
            : [...state.ui.usedSkillIds, skillId],
        },
        logLines: [
          ...state.logLines,
          {
            id: `log-${state.logLines.length + 1}`,
            text: `确认：${skillId} → ${target?.name ?? state.ui.selectedTargetId} · ${mockDice.label}`,
          },
        ],
      };
    }
    case "drawInitiative": {
      const nextSide = state.battle.initiativeDeckHero > 0 ? "hero" : "monster";
      return {
        ...state,
        battle: {
          ...state.battle,
          initiativeRevealed: [...state.battle.initiativeRevealed, nextSide],
          initiativeDeckHero:
            nextSide === "hero"
              ? Math.max(0, state.battle.initiativeDeckHero - 1)
              : state.battle.initiativeDeckHero,
          initiativeDeckMonster:
            nextSide === "monster"
              ? Math.max(0, state.battle.initiativeDeckMonster - 1)
              : state.battle.initiativeDeckMonster,
        },
        logLines: [
          ...state.logLines,
          {
            id: `log-${state.logLines.length + 1}`,
            text: `（mock）翻开先攻：${nextSide === "hero" ? "英雄" : "怪物"} · V-01 待确认`,
          },
        ],
      };
    }
    case "toggleLog":
      return { ...state, ui: { ...state.ui, logOpen: !state.ui.logOpen } };
    case "toggleAtmosphere":
      return { ...state, ui: { ...state.ui, atmosphereEnabled: !state.ui.atmosphereEnabled } };
    default:
      return state;
  }
}

export function useTabletopMockMachine() {
  const [state, dispatch] = useReducer(reducer, undefined, createTabletopInitialState);

  const selectHero = useCallback((heroId: string) => {
    dispatch({ type: "selectHero", heroId });
  }, []);

  const selectSkill = useCallback((skillId: string | null) => {
    dispatch({ type: "selectSkill", skillId });
  }, []);

  const selectTarget = useCallback((targetId: string) => {
    dispatch({ type: "selectTarget", targetId });
  }, []);

  const setTab = useCallback((tab: TabletopBottomTab) => {
    dispatch({ type: "setTab", tab });
  }, []);

  const confirmAction = useCallback(() => {
    dispatch({ type: "confirmAction" });
  }, []);

  const drawInitiative = useCallback(() => {
    dispatch({ type: "drawInitiative" });
  }, []);

  const toggleLog = useCallback(() => {
    dispatch({ type: "toggleLog" });
  }, []);

  const toggleAtmosphere = useCallback(() => {
    dispatch({ type: "toggleAtmosphere" });
  }, []);

  const activeHero = state.heroes.find((h) => h.id === state.ui.activeHeroId) ?? state.heroes[0]!;
  const canConfirm = Boolean(state.ui.selectedSkillId && state.ui.selectedTargetId);

  return {
    state,
    activeHero,
    canConfirm,
    selectHero,
    selectSkill,
    selectTarget,
    setTab,
    confirmAction,
    drawInitiative,
    toggleLog,
    toggleAtmosphere,
  };
}
