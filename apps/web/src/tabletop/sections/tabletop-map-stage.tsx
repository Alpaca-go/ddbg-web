import { lookupQuestMapArt, lookupRoomCardArt } from "../../card-art/resolve-exploration-art";
import { lookupHeroStandeeArt } from "../../card-art/resolve-print-hero-standee-art";
import { lookupPrintMonsterFace } from "../../card-art/resolve-print-monster-art";
import { PRINT_CARD_ART_PUBLIC_PREFIX } from "../../card-art/resolve-print-hero-skill-art";
import { ExplorationArtImage } from "../../card-art/exploration-art-image";
import { AssetPlaceholder } from "../asset-placeholder";
import type { FlowPhaseId } from "../phase/flow-phase";
import {
  TabletopDungeonCenterStage,
  TabletopExpeditionCenterStage,
  TabletopHamletCenterStage,
  TabletopQuestSetupCenterStage,
  TabletopReturnCenterStage,
} from "./tabletop-center-stage";
import { StandeeToken } from "../standee-token";
import { TabletopCardStack } from "../tabletop-card-stack";
import { TabletopConditionsPlayerAid } from "./tabletop-conditions-player-aid";
import type { TabletopDetailTargetKind } from "../tabletop-detail-types";
import type {
  TabletopHeroState,
  TabletopMapNode,
  TabletopMonsterState,
  TabletopQuestMeta,
} from "../tabletop-types";

export function TabletopMapStage({
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
  const mapArt = lookupQuestMapArt(quest.layoutId);
  const roomArt = lookupRoomCardArt(quest.currentRoomCardId);
  const roomBg = roomArt?.pngRel
    ? `${PRINT_CARD_ART_PUBLIC_PREFIX}/${roomArt.pngRel.replace(/^\//, "")}`
    : undefined;

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
        <div className="tt-map__battle tabletop-board-slab">
          {roomBg && (
            <button
              type="button"
              className="tt-map__room-plate tt-map__room-plate--pick"
              style={{ backgroundImage: `url(${roomBg})` }}
              data-testid="tabletop-battle-room-plate"
              aria-label="当前房间卡"
              onClick={() => onSelectRoom(quest.currentRoomCardId)}
            />
          )}
          {!roomBg && (
            <AssetPlaceholder
              assetType="room"
              label="当前房间板块"
              className="tt-map__room-plate tt-map__room-plate--ph"
            />
          )}

          {showDeckStacks && (
            <div className="tt-map__stacks">
              <TabletopConditionsPlayerAid testId="tabletop-battle-conditions-aid" />
              <TabletopCardStack
                label="房间"
                count={12}
                aspect="room"
                testId="tabletop-deck-room"
              />
              <TabletopCardStack
                label="走廊"
                count={8}
                aspect="room"
                testId="tabletop-deck-corridor"
              />
              <TabletopCardStack
                label="怪物"
                count={14}
                aspect="monster"
                testId="tabletop-deck-monster"
              />
              <TabletopCardStack
                label="战利品"
                count={7}
                aspect="square"
                testId="tabletop-deck-loot"
              />
            </div>
          )}

          <div className="tt-map__minimap" data-testid="tabletop-minimap">
            <span className="tt-map__minimap-label">小地图</span>
            {mapArt ? (
              <ExplorationArtImage
                entry={mapArt}
                alt=""
                className="tt-map__minimap-img"
                testId="tabletop-quest-map"
              />
            ) : (
              <AssetPlaceholder assetType="quest_map" label="QuestMap" />
            )}
            <div className="tt-map__minimap-dots">
              {mapNodes.map((node) => (
                <span
                  key={node.id}
                  className={[
                    "tt-minimap-dot",
                    !node.explored ? "tt-minimap-dot--dark" : "",
                    node.isCurrent ? "tt-minimap-dot--here" : "",
                  ].join(" ")}
                  title={node.label}
                />
              ))}
            </div>
          </div>

          <header className="tt-map__battle-head">
            <h3>当前房间 · {quest.currentRoomCardId}</h3>
            <span className="muted">区域网格占位 U-12</span>
          </header>

          <div className="tt-map__grid">
            {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"].map((areaId) => {
              const hereHeroes = heroes.filter((h) => h.areaId === areaId);
              const hereMonsters = monsters.filter((m) => m.areaId === areaId);
              const occupied = hereHeroes.length + hereMonsters.length > 0;
              return (
                <div
                  key={areaId}
                  className={occupied ? "tt-area tt-area--occupied" : "tt-area"}
                  data-testid={`tabletop-area-${areaId}`}
                >
                  <span className="tt-area__id">{areaId}</span>
                  <div className="tt-area__tokens">
                    {hereHeroes.map((h) => {
                      const standee = lookupHeroStandeeArt(h.hero);
                      return (
                        <StandeeToken
                          key={h.id}
                          label={h.hero}
                          {...(standee?.pngRel ? { pngRel: standee.pngRel } : {})}
                          assetType="hero_standee"
                          wounds={h.wounds}
                          life={h.life}
                          onClick={() => onSelectHeroToken(h.id)}
                          testId={`tabletop-standee-hero-${h.id}`}
                        />
                      );
                    })}
                    {hereMonsters.map((m) => {
                      const art = lookupPrintMonsterFace(m.monsterCardId);
                      return (
                        <StandeeToken
                          key={m.id}
                          label={m.name}
                          {...(art?.pngRel ? { pngRel: art.pngRel } : {})}
                          assetType="monster_medium"
                          wounds={m.wounds}
                          life={m.life}
                          selected={selectedTargetId === m.id}
                          onClick={() => onSelectTarget(m.id)}
                          testId={`tabletop-target-${m.id}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
