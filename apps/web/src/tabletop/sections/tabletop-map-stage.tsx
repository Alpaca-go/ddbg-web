import { ExplorationArtImage } from "../../card-art/exploration-art-image";
import { lookupQuestMapArt, lookupRoomCardArt } from "../../card-art/resolve-exploration-art";
import { lookupHeroStandeeArt } from "../../card-art/resolve-print-hero-standee-art";
import { AssetPlaceholder } from "../asset-placeholder";
import { TabletopCardStack } from "../tabletop-card-stack";
import { TabletopRasterPiece } from "../tabletop-raster-piece";
import type {
  TabletopHeroState,
  TabletopMapNode,
  TabletopMonsterState,
  TabletopQuestMeta,
} from "../tabletop-types";

export function TabletopMapStage({
  quest,
  mapNodes,
  heroes,
  monsters,
  selectedTargetId,
  onSelectTarget,
  onSelectHeroToken,
}: {
  readonly quest: TabletopQuestMeta;
  readonly mapNodes: readonly TabletopMapNode[];
  readonly heroes: readonly TabletopHeroState[];
  readonly monsters: readonly TabletopMonsterState[];
  readonly selectedTargetId: string | null;
  readonly onSelectTarget: (id: string) => void;
  readonly onSelectHeroToken: (id: string) => void;
}) {
  const mapArt = lookupQuestMapArt(quest.layoutId);
  const roomArt = lookupRoomCardArt(quest.currentRoomCardId);

  return (
    <section className="tt-map" aria-label="中央地牢版图" data-testid="tabletop-stage">
      <div className="tt-map__stacks">
        <TabletopCardStack label="房间" count={12} aspect="room" testId="tabletop-deck-room" />
        <TabletopCardStack label="走廊" count={8} aspect="room" testId="tabletop-deck-corridor" />
        <TabletopCardStack
          label="怪物"
          count={14}
          aspect="monster"
          testId="tabletop-deck-monster"
        />
        <TabletopCardStack label="战利品" count={7} aspect="square" testId="tabletop-deck-loot" />
      </div>

      <div className="tt-map__parchment tabletop-board-slab">
        {mapArt ? (
          <ExplorationArtImage
            entry={mapArt}
            alt="QuestMap"
            className="tt-map__map-img"
            testId="tabletop-quest-map"
          />
        ) : (
          <AssetPlaceholder assetType="quest_map" label="地牢版图" className="tt-map__map-img" />
        )}
        <div className="tt-map__nodes">
          {mapNodes.map((node) => (
            <div
              key={node.id}
              className={[
                "tt-map-node",
                !node.explored ? "tt-map-node--dark" : "",
                node.isCurrent ? "tt-map-node--current" : "",
              ].join(" ")}
              style={{
                gridColumn: node.x,
                gridRow: node.y,
              }}
              data-testid={`tabletop-map-node-${node.id}`}
            >
              {node.explored ? node.label : "?"}
            </div>
          ))}
        </div>
      </div>

      <div className="tt-map__battle tabletop-board-slab">
        <h3 className="tt-map__battle-title">房间板块 · 战斗站位（区域网格占位 U-12）</h3>
        <div className="tt-map__room-card">
          {roomArt ? (
            <ExplorationArtImage entry={roomArt} alt="房间卡" className="tt-map__room-img" />
          ) : (
            <AssetPlaceholder assetType="room" label="room 卡" />
          )}
        </div>
        <div className="tt-map__grid">
          {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"].map((areaId) => {
            const hereHeroes = heroes.filter((h) => h.areaId === areaId);
            const hereMonsters = monsters.filter((m) => m.areaId === areaId);
            return (
              <div key={areaId} className="tt-area" data-testid={`tabletop-area-${areaId}`}>
                <span className="tt-area__id">{areaId}</span>
                {hereHeroes.map((h) => {
                  const standee = lookupHeroStandeeArt(h.hero);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      className="tt-standee tt-standee--hero"
                      onClick={() => onSelectHeroToken(h.id)}
                      data-testid={`tabletop-standee-hero-${h.id}`}
                    >
                      {standee?.pngRel ? (
                        <TabletopRasterPiece
                          {...{ pngRel: standee.pngRel }}
                          label={h.hero}
                          aspect="square"
                        />
                      ) : (
                        <AssetPlaceholder assetType="hero_standee" label={h.hero} />
                      )}
                      <span className="tt-standee__wounds">{h.wounds}</span>
                    </button>
                  );
                })}
                {hereMonsters.map((m) => {
                  const selected = selectedTargetId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={[
                        "tt-standee tt-standee--monster",
                        selected ? "tt-standee--selected" : "",
                      ].join(" ")}
                      onClick={() => onSelectTarget(m.id)}
                      data-testid={`tabletop-target-${m.id}`}
                      aria-pressed={selected}
                    >
                      <AssetPlaceholder assetType="monster_medium" label={m.name} />
                      <span className="tt-standee__wounds">
                        {m.wounds}/{m.life}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
