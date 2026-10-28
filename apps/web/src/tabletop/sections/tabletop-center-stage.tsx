import type { ReactNode } from "react";
import { ExplorationArtImage } from "../../card-art/exploration-art-image";
import { lookupQuestMapArt } from "../../card-art/resolve-exploration-art";
import {
  cachedPrintHamletBoardUrl,
  lookupHamletBoardArt,
} from "../../card-art/resolve-print-hamlet-board-art";
import {
  cachedPrintExplorationUrl,
  lookupRoomCardArt,
} from "../../card-art/resolve-exploration-art";
import { CoreboxPrintCardFace } from "../../card-art/corebox-print-card-face";
import { AssetPlaceholder } from "../asset-placeholder";
import { TabletopProvisionPlayerAid } from "./tabletop-provision-player-aid";
import { TabletopDungeonPlayerAidRefs } from "./tabletop-dungeon-player-aid-refs";
import { HAMLET_BUILDING_MARKERS } from "../hamlet-building-markers";
import { TabletopRasterImage } from "../tabletop-raster-image";
import { TabletopCardStack } from "../tabletop-card-stack";
import type { TabletopMapNode, TabletopQuestMeta } from "../tabletop-types";

/** hamlet_board TrimBox 841.89×476.22 pt（hamlet-board-print-art-map.json） */
const HAMLET_BOARD_ASPECT = 841.89 / 476.22;

function CenterSlab({
  testId,
  children,
}: {
  readonly testId: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="tt-center-slab tabletop-board-slab" data-testid={testId}>
      {children}
    </div>
  );
}

export function TabletopHamletCenterStage({
  onSelectBuilding,
  selectedBuildingId,
}: {
  readonly onSelectBuilding?: (buildingId: string) => void;
  readonly selectedBuildingId?: string | null;
}) {
  const board = lookupHamletBoardArt();
  const boardUrl = cachedPrintHamletBoardUrl(board);

  return (
    <CenterSlab testId="tabletop-hamlet-stage">
      <div className="tt-center-fill">
        <div
          className="tt-hamlet-board"
          style={{ aspectRatio: String(HAMLET_BOARD_ASPECT) }}
          data-testid="tabletop-hamlet-board"
        >
          <TabletopRasterImage
            src={boardUrl}
            label="村庄版图"
            placeholderLabel="村庄版图"
            assetType="hamlet_board"
            className="tt-hamlet-board__img"
            testId="tabletop-hamlet-board-img"
          />
          <div className="tt-hamlet-board__markers">
            {HAMLET_BUILDING_MARKERS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={[
                  "tt-hamlet-marker",
                  selectedBuildingId === m.id ? "tt-hamlet-marker--selected" : "",
                ].join(" ")}
                style={{ left: `${m.leftPct}%`, top: `${m.topPct}%` }}
                title={`待确认（未核实印刷几何）：${m.label}`}
                data-testid={`tabletop-building-${m.id}`}
                onClick={() => onSelectBuilding?.(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <aside className="tt-hamlet-event" data-testid="tabletop-hamlet-event">
            <AssetPlaceholder assetType="hamlet_board" label="村庄事件卡位" />
          </aside>
        </div>
        <p className="tt-center-caption muted">
          村庄版图 hamlet_board（印刷比例居中）· 建筑板块位 / 事件卡位占位
        </p>
      </div>
      <div className="tt-map__stacks tt-map__stacks--explore">
        <TabletopCardStack
          label="村庄事件"
          count={16}
          aspect="square"
          testId="tabletop-deck-hamlet-event"
        />
      </div>
    </CenterSlab>
  );
}

export function TabletopQuestSetupCenterStage() {
  return (
    <CenterSlab testId="tabletop-roster-stage">
      <div className="tt-center-fill tt-center-fill--roster">
        <AssetPlaceholder assetType="hero_stat" label="英雄卡大图（选席）" />
        <div className="tt-roster-skills">
          {Array.from({ length: 7 }, (_, i) => (
            <AssetPlaceholder key={i} assetType="hero_skill" label={`技能 ${i + 1}`} />
          ))}
        </div>
        <p className="tt-center-caption muted">英雄卡 + 7 张技能（选 3 装备）</p>
      </div>
    </CenterSlab>
  );
}

export function TabletopExpeditionCenterStage({
  quest,
  onSelectQuest,
  selectedQuestId,
}: {
  readonly quest: TabletopQuestMeta;
  readonly onSelectQuest?: (questCardId: string) => void;
  readonly selectedQuestId?: string | null;
}) {
  const mapArt = lookupQuestMapArt(quest.layoutId);
  return (
    <CenterSlab testId="tabletop-embark-stage">
      <div className="tt-center-fill tt-center-fill--embark">
        <div className="tt-embark-quests">
          <button
            type="button"
            className={[
              "tt-embark-quest-pick",
              selectedQuestId === quest.questCardId ? "tt-embark-quest-pick--selected" : "",
            ].join(" ")}
            data-testid="tabletop-quest-candidate-a"
            onClick={() => onSelectQuest?.(quest.questCardId)}
          >
            <CoreboxPrintCardFace
              deck="quest"
              cardId={quest.questCardId}
              label="任务卡候选 A"
              size="sm"
            />
          </button>
          <button
            type="button"
            className="tt-embark-quest-pick"
            data-testid="tabletop-quest-candidate-b"
            onClick={() => onSelectQuest?.("quest:p002")}
          >
            <CoreboxPrintCardFace deck="quest" cardId="quest:p002" label="任务卡候选 B" size="sm" />
          </button>
        </div>
        <div className="tt-embark-map-row">
          <TabletopProvisionPlayerAid testId="tabletop-embark-provision-aid" />
          <div className="tt-embark-map">
            {mapArt ? (
              <ExplorationArtImage
                entry={mapArt}
                alt=""
                className="tt-embark-map__img"
                testId="tabletop-embark-quest-map"
              />
            ) : (
              <AssetPlaceholder assetType="quest_map" label="QuestMap 预览" />
            )}
          </div>
        </div>
        <p className="tt-center-caption muted">
          2 张任务卡并排 · 补给参考卡 · QuestMap 预览
        </p>
      </div>
      <div className="tt-map__stacks tt-map__stacks--explore">
        <TabletopCardStack label="任务" count={8} aspect="room" testId="tabletop-deck-quest" />
      </div>
    </CenterSlab>
  );
}

export function TabletopReturnCenterStage() {
  return (
    <CenterSlab testId="tabletop-return-stage">
      <div className="tt-center-fill tt-center-fill--return">
        <div className="tt-return-convert">
          <AssetPlaceholder assetType="quirk" label="苦难卡 → 怪癖卡" />
          <AssetPlaceholder assetType="dice_net" label="补给骰 → 金币" />
        </div>
        <p className="tt-center-caption muted">回村实物转换（苦难/美德、补给换金）</p>
      </div>
    </CenterSlab>
  );
}

export function TabletopDungeonCenterStage({
  quest,
  mapNodes,
  showDeckStacks,
  centerCaption,
  onSelectRoom,
  selectedRoomCardId,
}: {
  readonly quest: TabletopQuestMeta;
  readonly mapNodes: readonly TabletopMapNode[];
  readonly showDeckStacks: boolean;
  readonly centerCaption: string;
  readonly onSelectRoom?: (roomCardId: string) => void;
  readonly selectedRoomCardId?: string | null;
}) {
  const mapArt = lookupQuestMapArt(quest.layoutId);
  const roomArt = lookupRoomCardArt(quest.currentRoomCardId);
  const roomSrc = roomArt ? cachedPrintExplorationUrl(roomArt) : undefined;
  return (
    <CenterSlab testId="tabletop-dungeon-stage">
      <div className="tt-center-fill">
        <div className="tt-dungeon-map-frame" data-testid="tabletop-dungeon-map-frame">
          {mapArt ? (
            <ExplorationArtImage
              entry={mapArt}
              alt=""
              className="tt-dungeon-map-frame__img"
              testId="tabletop-quest-map"
            />
          ) : (
            <AssetPlaceholder assetType="quest_map" label="QuestMap / 地牢板块" />
          )}
          <div className="tt-map__minimap-dots tt-dungeon-map-frame__dots">
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
          <span className="tt-party-token-ph" data-testid="tabletop-party-token-ph">
            队伍 token
          </span>
        </div>
        <button
          type="button"
          className={[
            "tt-dungeon-room-pick",
            selectedRoomCardId === quest.currentRoomCardId ? "tt-dungeon-room-pick--selected" : "",
          ].join(" ")}
          data-testid="tabletop-current-room-card"
          onClick={() => onSelectRoom?.(quest.currentRoomCardId)}
        >
          <TabletopRasterImage
            {...(roomSrc ? { src: roomSrc } : {})}
            label={roomArt?.name ?? quest.currentRoomCardId}
            assetType="room"
            className="tt-dungeon-room-pick__img"
          />
          <span className="tt-dungeon-room-pick__label">当前房间卡</span>
        </button>
        <p className="tt-center-caption muted">{centerCaption}</p>
      </div>
      {showDeckStacks && (
        <div className="tt-map__stacks tt-map__stacks--explore">
          <TabletopDungeonPlayerAidRefs testIdPrefix="tabletop-dungeon" />
          <TabletopCardStack label="房间" count={12} aspect="room" testId="tabletop-deck-room" />
          <TabletopCardStack
            label="怪物"
            count={14}
            aspect="monster"
            testId="tabletop-deck-monster"
          />
          <TabletopCardStack label="Curio" count={6} aspect="square" testId="tabletop-deck-curio" />
        </div>
      )}
    </CenterSlab>
  );
}
