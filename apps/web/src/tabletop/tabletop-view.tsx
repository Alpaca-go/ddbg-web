import { useEffect, useMemo } from "react";
import { FLOW_PHASE_BREADCRUMB, type FlowPhaseId } from "./phase/flow-phase";
import { resolveEffectiveFlowPhase, resolveFlowStepText } from "./phase/engine-bridge";
import { TabletopTopBar } from "./sections/tabletop-top-bar";
import { TabletopPartyColumn } from "./sections/tabletop-party-column";
import { TabletopInitiativePanel } from "./sections/tabletop-initiative-panel";
import { TabletopMapStage } from "./sections/tabletop-map-stage";
import { TabletopDetailPanel } from "./sections/tabletop-detail-panel";
import { TabletopActionDock } from "./sections/tabletop-action-dock";
import { TabletopControlRail } from "./sections/tabletop-control-rail";
import { useTabletopMockMachine } from "./use-tabletop-mock-machine";
import { useTabletopEngineSession } from "./use-tabletop-engine-session";
import { useTabletopDisplayState } from "./use-tabletop-display-state";
import { useTabletopEntityName } from "./use-tabletop-entity-name";
import { TabletopDebugPanel } from "./tabletop-debug-panel";
import { planForPhase } from "./phase/phase-zone-plan";
import "./tabletop.css";

export function TabletopView() {
  const { engineGame, worldPatch, engineMode } = useTabletopEngineSession();
  const {
    state: mockState,
    canConfirm,
    selectHero,
    selectBuilding,
    selectRoom,
    selectQuest,
    selectSkill,
    selectTarget,
    setTab,
    confirmAction,
    drawInitiative,
    toggleLog,
    toggleAtmosphere,
    setDemoPhase,
  } = useTabletopMockMachine();

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("demoPhase");
    if (!raw) return;
    const valid = FLOW_PHASE_BREADCRUMB.some((p) => p.id === raw);
    if (valid) setDemoPhase(raw as FlowPhaseId);
  }, [setDemoPhase]);

  const state = useTabletopDisplayState(mockState, engineGame, worldPatch);
  const entityName = useTabletopEntityName(state.heroes, state.monsters);

  const flowPhase = useMemo(
    () =>
      resolveEffectiveFlowPhase(state.ui.engineBridge, state.ui.demoPhaseOverride, state.ui.phase),
    [state.ui.engineBridge, state.ui.demoPhaseOverride, state.ui.phase],
  );
  const flowStepText = useMemo(
    () => resolveFlowStepText(state.ui.engineBridge, state.ui.demoPhaseOverride, flowPhase),
    [state.ui.engineBridge, state.ui.demoPhaseOverride, flowPhase],
  );
  const activeHero = state.heroes.find((h) => h.id === state.ui.activeHeroId) ?? state.heroes[0]!;

  const plan = planForPhase(flowPhase);
  const turnHero = state.heroes.find((h) => h.id === state.battle.turnActorId) ?? activeHero;
  const showInteractiveBattle = flowPhase === "battle";

  return (
    <>
      <div
        className={[
          "tt-root",
          state.ui.atmosphereEnabled ? "tt-root--atmosphere" : "tt-root--flat",
          `tt-root--phase-${flowPhase}`,
        ].join(" ")}
        data-testid="tabletop-view"
        data-phase={flowPhase}
      >
        <TabletopTopBar
          phase={flowPhase}
          stepText={flowStepText}
          quest={state.quest}
          battle={state.battle}
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
          dataSource={engineMode ? "engine" : "mock"}
          onSelectHero={selectHero}
        />

        <TabletopMapStage
          phase={flowPhase}
          centerCaption={plan.center}
          showDeckStacks={plan.deckStacks}
          showBattleTokens={plan.showBattleTokens}
          quest={state.quest}
          mapNodes={state.mapNodes}
          heroes={state.heroes}
          monsters={state.monsters}
          selectedTargetId={state.ui.selectedTargetId}
          detailTargetKind={state.ui.detailTargetKind}
          detailTargetId={state.ui.detailTargetId}
          onSelectTarget={selectTarget}
          onSelectHeroToken={selectHero}
          onSelectBuilding={selectBuilding}
          onSelectRoom={selectRoom}
          onSelectQuest={selectQuest}
        />

        <TabletopDetailPanel
          detailCaption={plan.detail}
          kind={state.ui.detailTargetKind}
          targetId={state.ui.detailTargetId}
          quest={state.quest}
          heroes={state.heroes}
          monsters={state.monsters}
          entityName={entityName}
        />

        <TabletopInitiativePanel
          phase={flowPhase}
          initiativeCaption={plan.initiative}
          battle={state.battle}
          turnHero={turnHero}
        />

        <TabletopActionDock
          phase={flowPhase}
          dockCaption={plan.dock}
          showSkillHand={showInteractiveBattle}
          tab={state.ui.bottomTab}
          onTab={setTab}
          activeHero={activeHero}
          selectedSkillId={state.ui.selectedSkillId}
          usedSkillIds={state.ui.usedSkillIds}
          onSelectSkill={selectSkill}
        />

        <TabletopControlRail
          phase={flowPhase}
          diceCaption={plan.diceTray}
          primaryActionLabel={plan.primaryAction}
          mockDice={state.ui.mockDice}
          canConfirm={showInteractiveBattle && canConfirm}
          onConfirm={confirmAction}
          onDrawInitiative={drawInitiative}
        />

        <div className={["tt-log", state.ui.logOpen ? "tt-log--open" : ""].join(" ")}>
          <div className="tt-log__panel" role="region" aria-label="日志抽屉">
            <ul>
              {state.logLines.map((line) => (
                <li key={line.id}>{line.text}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <TabletopDebugPanel
        demoPhaseOverride={state.ui.demoPhaseOverride}
        defaultPhase={state.ui.phase}
        onSetDemoPhase={setDemoPhase}
      />
    </>
  );
}
