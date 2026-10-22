import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { GameState } from "@ddbg/engine";
import { battleData } from "virtual:battle-data";
import { useDungeonStore } from "../dungeon-sandbox/store";
import { adaptQuestMetaFromGame } from "./phase/adapt-quest-meta-from-game";
import {
  adaptGameStateToTabletopWorld,
  resolveEffectiveFlowPhase,
  resolveFlowStepText,
} from "./phase/engine-bridge";
import { planForPhase } from "./phase/phase-zone-plan";
import type { FlowPhaseId } from "./phase/flow-phase";
import { TabletopDetailPanel } from "./sections/tabletop-detail-panel";
import { FormalBattleInitiative } from "./sections/formal-battle-initiative";
import { TabletopPartyColumn } from "./sections/tabletop-party-column";
import { TabletopTopBar } from "./sections/tabletop-top-bar";
import { createFormalDisplayState, formalDetailIsValid } from "./phase/formal-display-state";
import type { TabletopDetailTargetKind } from "./tabletop-detail-types";
import type { TabletopHeroState, TabletopQuestMeta, TabletopState } from "./tabletop-types";
import { mergeTabletopDisplayState } from "./use-tabletop-display-state";
import { useTabletopEntityName } from "./use-tabletop-entity-name";
import { TabletopFormalUiProvider } from "./tabletop-formal-ui-context";
import { questObjectiveProgressLine } from "../dungeon-sandbox/formal/quest-objective-line";
import "./tabletop.css";

type FormalUiAction =
  | {
      readonly type: "selectDetail";
      readonly kind: TabletopDetailTargetKind;
      readonly targetId: string;
    }
  | { readonly type: "selectHero"; readonly heroId: string }
  | { readonly type: "closeDetail" }
  | { readonly type: "toggleLog" }
  | { readonly type: "toggleAtmosphere" };

function formalUiReducer(state: TabletopState, action: FormalUiAction): TabletopState {
  switch (action.type) {
    case "selectDetail":
      return {
        ...state,
        ui: {
          ...state.ui,
          detailTargetKind: action.kind,
          detailTargetId: action.targetId,
          ...(action.kind === "hero" ? { activeHeroId: action.targetId } : {}),
        },
      };
    case "selectHero":
      return {
        ...state,
        ui: {
          ...state.ui,
          activeHeroId: action.heroId,
          detailTargetKind: "hero",
          detailTargetId: action.heroId,
        },
      };
    case "closeDetail":
      return { ...state, ui: { ...state.ui, detailTargetId: null } };
    case "toggleLog":
      return { ...state, ui: { ...state.ui, logOpen: !state.ui.logOpen } };
    case "toggleAtmosphere":
      return {
        ...state,
        ui: { ...state.ui, atmosphereEnabled: !state.ui.atmosphereEnabled },
      };
    default:
      return state;
  }
}

function heroDisplayNameFromCatalog(hero: {
  readonly id: string;
  readonly hero?: string | null;
  readonly heroStatId?: string;
}): string {
  if (hero.hero) return hero.hero;
  const stat = battleData.heroStats.find((s) => s.id === hero.heroStatId);
  return stat?.name ?? "—";
}

export function TabletopFormalShell({
  questSetupActive = false,
  preEmbarkPhase = null,
  setupHeroes,
  setupQuest,
  children,
}: {
  readonly questSetupActive?: boolean;
  readonly preEmbarkPhase?: FlowPhaseId | null;
  readonly setupHeroes?: readonly TabletopHeroState[];
  readonly setupQuest?: Partial<TabletopQuestMeta>;
  readonly children: ReactNode;
}) {
  const storeGame = useDungeonStore((s) => s.game);
  const [battleActionHost, setBattleActionHost] = useState<HTMLDivElement | null>(null);
  const beforeEmbark = questSetupActive || Boolean(preEmbarkPhase);
  const engineGame: GameState | null = beforeEmbark ? null : storeGame;

  const [uiBase, dispatchUi] = useReducer(formalUiReducer, undefined, () =>
    createFormalDisplayState(),
  );

  const worldPatch = useMemo(() => {
    if (beforeEmbark && setupHeroes?.length) {
      return { heroes: [...setupHeroes] };
    }
    if (engineGame) {
      return adaptGameStateToTabletopWorld(engineGame, {
        heroDisplayName: heroDisplayNameFromCatalog,
      });
    }
    return null;
  }, [engineGame, beforeEmbark, setupHeroes]);

  const state = useMemo(() => {
    const bridge = {
      game: engineGame,
      questSetupActive,
      ...(preEmbarkPhase ? { preEmbarkPhase } : {}),
    };
    let merged: TabletopState = {
      ...uiBase,
      ui: {
        ...uiBase.ui,
        engineBridge: bridge,
        demoPhaseOverride: null,
      },
    };
    if (worldPatch) {
      if (engineGame) {
        merged = mergeTabletopDisplayState(merged, engineGame, worldPatch);
      } else if (worldPatch.heroes) {
        merged = { ...merged, heroes: worldPatch.heroes };
      }
      merged = {
        ...merged,
        ui: { ...merged.ui, engineBridge: bridge, demoPhaseOverride: null },
      };
    }
    if (setupQuest) {
      merged = { ...merged, quest: { ...merged.quest, ...setupQuest } };
    }
    if (engineGame) {
      const questPatch = adaptQuestMetaFromGame(engineGame);
      if (questPatch) {
        merged = { ...merged, quest: { ...merged.quest, ...questPatch } };
      }
      const gold = engineGame.dungeon?.gold;
      if (gold !== undefined) {
        merged = { ...merged, battle: { ...merged.battle, gold } };
      }
      const light = engineGame.battle?.light;
      if (light !== undefined) {
        merged = { ...merged, battle: { ...merged.battle, light } };
      }
    }
    return merged;
  }, [uiBase, engineGame, questSetupActive, preEmbarkPhase, worldPatch, setupQuest]);

  const flowPhase = useMemo(
    () => resolveEffectiveFlowPhase(state.ui.engineBridge, null, state.ui.phase),
    [state.ui.engineBridge, state.ui.phase],
  );
  const flowStepText = useMemo(
    () => resolveFlowStepText(state.ui.engineBridge, null, flowPhase),
    [state.ui.engineBridge, flowPhase],
  );
  const entityName = useTabletopEntityName(state.heroes, state.monsters);
  const plan = planForPhase(flowPhase);

  const detailTrigger = useRef<HTMLElement | null>(null);
  const rememberTrigger = useCallback(() => {
    detailTrigger.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, []);
  const selectHero = useCallback(
    (heroId: string) => {
      rememberTrigger();
      dispatchUi({ type: "selectHero", heroId });
    },
    [rememberTrigger],
  );
  const selectQuest = useCallback(
    (questCardId: string) => {
      rememberTrigger();
      dispatchUi({ type: "selectDetail", kind: "quest", targetId: questCardId });
    },
    [rememberTrigger],
  );
  const selectRoomCard = useCallback(
    (roomCardId: string) => {
      rememberTrigger();
      dispatchUi({ type: "selectDetail", kind: "room", targetId: roomCardId });
    },
    [rememberTrigger],
  );
  const selectRoomNode = useCallback(
    (roomNodeId: string) => {
      const active = engineGame?.dungeon?.roomCards?.active;
      const position = engineGame?.dungeon?.position;
      if (active?.cardId && position === roomNodeId) {
        rememberTrigger();
        dispatchUi({ type: "selectDetail", kind: "room", targetId: active.cardId });
      }
    },
    [engineGame, rememberTrigger],
  );
  const closeDetail = useCallback(() => {
    dispatchUi({ type: "closeDetail" });
    const focused = document.activeElement;
    if (focused === detailTrigger.current || focused?.closest('[data-testid="tabletop-detail"]')) {
      if (detailTrigger.current?.isConnected) detailTrigger.current.focus();
    }
  }, []);
  const detailValid = formalDetailIsValid(state, flowPhase);
  const detailOpen = state.ui.detailTargetId !== null && detailValid;
  useEffect(() => {
    if (!detailValid) dispatchUi({ type: "closeDetail" });
  }, [detailValid]);
  useEffect(() => {
    if (!detailOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        closeDetail();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [detailOpen, closeDetail]);
  const toggleLog = useCallback(() => dispatchUi({ type: "toggleLog" }), []);
  const toggleAtmosphere = useCallback(() => dispatchUi({ type: "toggleAtmosphere" }), []);

  const storeEvents = useDungeonStore((s) => s.events);
  const logLines = useMemo(() => {
    if (!engineGame) return [];
    return storeEvents.map((e, index) => {
      const text =
        e.type === "resolveTested"
          ? `${e.entityId}：d10 ${e.roll}，意志检定`
          : ((e as { message?: string }).message ?? e.type);
      return { id: `engine-log-${index}`, text };
    });
  }, [engineGame, storeEvents]);

  const formalUiApi = useMemo(
    () => ({ selectRoomCard, selectRoomNode, battleActionHost }),
    [selectRoomCard, selectRoomNode, battleActionHost],
  );

  const explorationObjective =
    engineGame && flowPhase === "dungeonExploration"
      ? questObjectiveProgressLine(engineGame)
      : null;

  const formalResources = useMemo(() => {
    const base = {
      gold: engineGame?.dungeon?.gold,
      light: engineGame?.battle?.light ?? engineGame?.dungeon?.explorationSetup?.light,
      round: engineGame?.battle?.encounter?.round,
      stagecoachXp: engineGame?.dungeon?.stagecoachXp,
    };
    if (flowPhase !== "dungeonExploration" || !engineGame?.dungeon) return base;
    const d = engineGame.dungeon;
    const firewoodLabel = d.rest
      ? d.rest.used
        ? "柴火已弃"
        : "柴火可用"
      : undefined;
    const provisionCount = d.explorationSetup?.provisions.length;
    return {
      ...base,
      ...(provisionCount !== undefined ? { provisionCount } : {}),
      ...(firewoodLabel ? { firewoodLabel } : {}),
    };
  }, [engineGame, flowPhase]);

  return (
    <TabletopFormalUiProvider value={formalUiApi}>
      <div
        className={[
          "tt-root",
          "tt-root--formal",
          detailOpen ? "tt-root--detail-open" : "",
          state.ui.atmosphereEnabled ? "tt-root--atmosphere" : "tt-root--flat",
          `tt-root--phase-${flowPhase}`,
        ].join(" ")}
        data-testid="tabletop-view"
        data-phase={flowPhase}
        data-formal-flow="1"
      >
        <TabletopTopBar
          formalResources={formalResources}
          phase={flowPhase}
          stepText={flowStepText}
          quest={state.quest}
          battle={state.battle}
          explorationObjective={explorationObjective}
          onToggleLog={toggleLog}
          onToggleAtmosphere={toggleAtmosphere}
          atmosphereEnabled={state.ui.atmosphereEnabled}
          onSelectQuest={() => selectQuest(state.quest.questCardId)}
          questDetailSelected={
            detailOpen &&
            state.ui.detailTargetKind === "quest" &&
            state.ui.detailTargetId === state.quest.questCardId
          }
        />

        <TabletopPartyColumn
          phase={flowPhase}
          phaseCaption={plan.party}
          heroes={state.heroes}
          activeHeroId={state.ui.activeHeroId}
          compact
          dataSource={beforeEmbark ? "setup" : "engine"}
          onSelectHero={selectHero}
        />

        <section
          className="tt-formal-center tt-phase-surface"
          aria-label="正式流程主区"
          data-testid="tabletop-formal-center"
        >
          <div className="tt-formal-center__scroll">{children}</div>
        </section>

        <TabletopDetailPanel
          collapsible
          onClose={closeDetail}
          detailCaption={plan.detail}
          kind={state.ui.detailTargetKind}
          targetId={detailOpen ? state.ui.detailTargetId : null}
          quest={state.quest}
          heroes={state.heroes}
          monsters={state.monsters}
          entityName={entityName}
        />

        {flowPhase === "battle" && engineGame?.battle && (
          <FormalBattleInitiative encounter={engineGame.battle.encounter} entityName={entityName} />
        )}
        {flowPhase === "battle" && (
          <section
            className="tt-dock tt-dock--formal-battle"
            aria-label="行动底栏"
            data-testid="tabletop-action-dock"
          >
            <div ref={setBattleActionHost} className="tt-battle-action-host" />
          </section>
        )}

        <div className={["tt-log", state.ui.logOpen ? "tt-log--open" : ""].join(" ")}>
          <div className="tt-log__panel" role="region" aria-label="日志抽屉">
            {!logLines.length && <p>暂无事件记录</p>}
            {state.ui.logOpen && (
              <ul>
                {logLines.map((line) => (
                  <li key={line.id}>{line.text}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </TabletopFormalUiProvider>
  );
}
