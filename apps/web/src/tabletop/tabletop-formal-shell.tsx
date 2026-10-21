import { useCallback, useMemo, useReducer, useState, type ReactNode } from "react";
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
import { TabletopActionDock } from "./sections/tabletop-action-dock";
import { TabletopControlRail } from "./sections/tabletop-control-rail";
import { TabletopDetailPanel } from "./sections/tabletop-detail-panel";
import { TabletopInitiativePanel } from "./sections/tabletop-initiative-panel";
import { FormalBattleInitiative } from "./sections/formal-battle-initiative";
import { TabletopPartyColumn } from "./sections/tabletop-party-column";
import { TabletopTopBar } from "./sections/tabletop-top-bar";
import { createTabletopInitialState } from "./tabletop-initial-state";
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
    createTabletopInitialState(),
  );

  const worldPatch = useMemo(() => {
    if (questSetupActive && setupHeroes?.length) {
      return { heroes: [...setupHeroes] };
    }
    if (engineGame) {
      return adaptGameStateToTabletopWorld(engineGame, {
        heroDisplayName: heroDisplayNameFromCatalog,
      });
    }
    return null;
  }, [engineGame, questSetupActive, setupHeroes]);

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
  const activeHero = state.heroes.find((h) => h.id === state.ui.activeHeroId) ?? state.heroes[0]!;
  const turnHero = state.heroes.find((h) => h.id === state.battle.turnActorId) ?? activeHero;
  const hasEngineParty = Boolean(worldPatch?.heroes?.length);

  const selectHero = useCallback((heroId: string) => {
    dispatchUi({ type: "selectHero", heroId });
  }, []);
  const selectQuest = useCallback((questCardId: string) => {
    dispatchUi({ type: "selectDetail", kind: "quest", targetId: questCardId });
  }, []);
  const selectRoomCard = useCallback((roomCardId: string) => {
    dispatchUi({ type: "selectDetail", kind: "room", targetId: roomCardId });
  }, []);
  const selectRoomNode = useCallback(
    (roomNodeId: string) => {
      const active = engineGame?.dungeon?.roomCards?.active;
      const position = engineGame?.dungeon?.position;
      if (active?.cardId && position === roomNodeId) {
        dispatchUi({ type: "selectDetail", kind: "room", targetId: active.cardId });
      }
    },
    [engineGame],
  );
  const toggleLog = useCallback(() => dispatchUi({ type: "toggleLog" }), []);
  const toggleAtmosphere = useCallback(() => dispatchUi({ type: "toggleAtmosphere" }), []);

  const storeEvents = useDungeonStore((s) => s.events);
  const logLines = useMemo(() => {
    if (!engineGame || !storeEvents.length) return state.logLines;
    return storeEvents.map((e, index) => {
      const text =
        e.type === "resolveTested"
          ? `${e.entityId}：d10 ${e.roll}，意志检定`
          : ((e as { message?: string }).message ?? e.type);
      return { id: `engine-log-${index}`, text };
    });
  }, [engineGame, storeEvents, state.logLines]);

  const formalUiApi = useMemo(
    () => ({ selectRoomCard, selectRoomNode, battleActionHost }),
    [selectRoomCard, selectRoomNode, battleActionHost],
  );

  const explorationObjective =
    engineGame && flowPhase === "dungeonExploration"
      ? questObjectiveProgressLine(engineGame)
      : null;

  return (
    <TabletopFormalUiProvider value={formalUiApi}>
      <div
        className={[
          "tt-root",
          "tt-root--formal",
          state.ui.atmosphereEnabled ? "tt-root--atmosphere" : "tt-root--flat",
          `tt-root--phase-${flowPhase}`,
        ].join(" ")}
        data-testid="tabletop-view"
        data-phase={flowPhase}
        data-formal-flow="1"
      >
        <TabletopTopBar
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
            state.ui.detailTargetKind === "quest" &&
            state.ui.detailTargetId === state.quest.questCardId
          }
        />

        <TabletopPartyColumn
          phase={flowPhase}
          phaseCaption={plan.party}
          heroes={state.heroes}
          activeHeroId={state.ui.activeHeroId}
          dataSource={hasEngineParty ? "engine" : "mock"}
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
          detailCaption={plan.detail}
          kind={state.ui.detailTargetKind}
          targetId={state.ui.detailTargetId}
          quest={state.quest}
          heroes={state.heroes}
          monsters={state.monsters}
          entityName={entityName}
        />

        {flowPhase === "battle" && engineGame?.battle ? (
          <FormalBattleInitiative encounter={engineGame.battle.encounter} entityName={entityName} />
        ) : (
          <TabletopInitiativePanel
            phase={flowPhase}
            initiativeCaption={plan.initiative}
            battle={state.battle}
            turnHero={turnHero}
          />
        )}

        {flowPhase === "battle" ? (
          <section
            className="tt-dock tt-dock--formal-battle"
            aria-label="行动底栏"
            data-testid="tabletop-action-dock"
          >
            <div ref={setBattleActionHost} className="tt-battle-action-host" />
          </section>
        ) : (
          <TabletopActionDock
            phase={flowPhase}
            dockCaption={plan.dock}
            showSkillHand={false}
            tab={state.ui.bottomTab}
            onTab={() => {}}
            activeHero={activeHero}
            selectedSkillId={null}
            usedSkillIds={[]}
            onSelectSkill={() => {}}
          />
        )}

        <TabletopControlRail
          actionsInDock={flowPhase === "battle"}
          phase={flowPhase}
          diceCaption={plan.diceTray}
          primaryActionLabel={
            flowPhase === "questSetup" || flowPhase === "expeditionPrep" ? null : plan.primaryAction
          }
          mockDice={null}
          canConfirm={false}
          onConfirm={() => {}}
          onDrawInitiative={() => {}}
        />

        <div className={["tt-log", state.ui.logOpen ? "tt-log--open" : ""].join(" ")}>
          <div className="tt-log__panel" role="region" aria-label="日志抽屉">
            <ul>
              {logLines.map((line) => (
                <li key={line.id}>{line.text}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </TabletopFormalUiProvider>
  );
}
