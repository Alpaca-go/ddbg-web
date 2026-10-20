import { TabletopTopBar } from "./sections/tabletop-top-bar";
import { TabletopPartyColumn } from "./sections/tabletop-party-column";
import { TabletopInitiativePanel } from "./sections/tabletop-initiative-panel";
import { TabletopMapStage } from "./sections/tabletop-map-stage";
import { TabletopDetailPanel } from "./sections/tabletop-detail-panel";
import { TabletopActionDock } from "./sections/tabletop-action-dock";
import { TabletopControlRail } from "./sections/tabletop-control-rail";
import { useTabletopMockMachine } from "./use-tabletop-mock-machine";
import "./tabletop.css";

export function TabletopView() {
  const {
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
  } = useTabletopMockMachine();

  const turnHero = state.heroes.find((h) => h.id === state.battle.turnActorId) ?? activeHero;

  return (
    <div
      className={[
        "tt-root",
        state.ui.atmosphereEnabled ? "tt-root--atmosphere" : "tt-root--flat",
      ].join(" ")}
      data-testid="tabletop-view"
    >
      <TabletopTopBar
        phase={state.ui.phase}
        quest={state.quest}
        battle={state.battle}
        onToggleLog={toggleLog}
        onToggleAtmosphere={toggleAtmosphere}
        atmosphereEnabled={state.ui.atmosphereEnabled}
      />

      <TabletopPartyColumn
        heroes={state.heroes}
        activeHeroId={state.ui.activeHeroId}
        onSelectHero={selectHero}
      />

      <TabletopMapStage
        quest={state.quest}
        mapNodes={state.mapNodes}
        heroes={state.heroes}
        monsters={state.monsters}
        selectedTargetId={state.ui.selectedTargetId}
        onSelectTarget={selectTarget}
        onSelectHeroToken={selectHero}
      />

      <TabletopDetailPanel
        kind={state.ui.detailTargetKind}
        targetId={state.ui.detailTargetId}
        heroes={state.heroes}
        monsters={state.monsters}
        quest={state.quest}
      />

      <TabletopInitiativePanel battle={state.battle} turnHero={turnHero} />

      <TabletopActionDock
        tab={state.ui.bottomTab}
        onTab={setTab}
        activeHero={activeHero}
        selectedSkillId={state.ui.selectedSkillId}
        usedSkillIds={state.ui.usedSkillIds}
        onSelectSkill={selectSkill}
      />

      <TabletopControlRail
        mockDice={state.ui.mockDice}
        canConfirm={canConfirm}
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
  );
}
