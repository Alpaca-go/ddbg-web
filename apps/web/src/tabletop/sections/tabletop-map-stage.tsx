import type { FlowPhaseId } from "../phase/flow-phase";
import {
  TabletopDungeonCenterStage,
  TabletopExpeditionCenterStage,
  TabletopHamletCenterStage,
  TabletopQuestSetupCenterStage,
  TabletopReturnCenterStage,
} from "./tabletop-center-stage";
import { TabletopBattleBoard } from "./tabletop-battle-board";
import type { TabletopDetailTargetKind } from "../tabletop-detail-types";
import type {
  TabletopBattleMeta,
  TabletopHeroState,
  TabletopMapNode,
  TabletopMonsterState,
  TabletopQuestMeta,
} from "../tabletop-types";

export function TabletopMapStage({
  battle,
  phase,
  centerCaption,
  showDeckStacks,
  showBattleTokens,
  quest,
  mapNodes,
  heroes,
  monsters,
  selectedTargetId,
  detailTargetKind,
  detailTargetId,
  onSelectTarget,
  onSelectHeroToken,
  onSelectBuilding,
  onSelectRoom,
  onSelectQuest,
}: {
  readonly battle: TabletopBattleMeta;
  readonly phase: FlowPhaseId;
  readonly centerCaption: string;
  readonly showDeckStacks: boolean;
  readonly showBattleTokens: boolean;
  readonly quest: TabletopQuestMeta;
  readonly mapNodes: readonly TabletopMapNode[];
  readonly heroes: readonly TabletopHeroState[];
  readonly monsters: readonly TabletopMonsterState[];
  readonly selectedTargetId: string | null;
  readonly detailTargetKind: TabletopDetailTargetKind;
  readonly detailTargetId: string | null;
  readonly onSelectTarget: (id: string) => void;
  readonly onSelectHeroToken: (id: string) => void;
  readonly onSelectBuilding: (buildingId: string) => void;
  readonly onSelectRoom: (roomCardId: string) => void;
  readonly onSelectQuest: (questCardId: string) => void;
}) {
  const showBattleBoard = phase === "battle" && showBattleTokens;

  return (
    <section className="tt-map tt-phase-surface" aria-label="中央舞台" data-testid="tabletop-stage">
      {phase === "hamlet" && (
        <TabletopHamletCenterStage
          onSelectBuilding={onSelectBuilding}
          selectedBuildingId={detailTargetKind === "building" ? detailTargetId : null}
        />
      )}
      {phase === "questSetup" && <TabletopQuestSetupCenterStage />}
      {phase === "expeditionPrep" && (
        <TabletopExpeditionCenterStage
          quest={quest}
          onSelectQuest={onSelectQuest}
          selectedQuestId={detailTargetKind === "quest" ? detailTargetId : null}
        />
      )}
      {phase === "questReturn" && <TabletopReturnCenterStage />}
      {phase === "dungeonExploration" && (
        <TabletopDungeonCenterStage
          quest={quest}
          mapNodes={mapNodes}
          showDeckStacks={showDeckStacks}
          centerCaption={centerCaption}
          onSelectRoom={onSelectRoom}
          selectedRoomCardId={detailTargetKind === "room" ? detailTargetId : null}
        />
      )}

      {showBattleBoard && (
        <TabletopBattleBoard
          battle={battle}
          heroes={heroes}
          monsters={monsters}
          selectedTargetId={selectedTargetId}
          selectedHeroId={detailTargetKind === "hero" ? detailTargetId : null}
          onSelectTarget={onSelectTarget}
          onSelectHero={onSelectHeroToken}
          onSelectRoom={onSelectRoom}
        />
      )}
    </section>
  );
}
