import type { SkillStance } from "@ddbg/engine";
import { lookupHeroStandeeArt } from "../../card-art/resolve-print-hero-standee-art";
import { lookupPrintMonsterFace } from "../../card-art/resolve-print-monster-art";
import { StandeeToken } from "../standee-token";
import { stanceLabelZh } from "../tabletop-stance-label";
import type {
  TabletopBattleMeta,
  TabletopHeroState,
  TabletopMonsterState,
} from "../tabletop-types";

const STANCES: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

export function TabletopBattleBoard({
  battle,
  heroes,
  monsters,
  selectedTargetId,
  selectedHeroId,
  onSelectTarget,
  onSelectHero,
  onSelectRoom,
}: {
  readonly battle: TabletopBattleMeta;
  readonly heroes: readonly TabletopHeroState[];
  readonly monsters: readonly TabletopMonsterState[];
  readonly selectedTargetId: string | null;
  readonly selectedHeroId: string | null;
  readonly onSelectTarget: (id: string) => void;
  readonly onSelectHero: (id: string) => void;
  readonly onSelectRoom: (id: string) => void;
}) {
  const living = heroes.filter((h) => !h.dead && !h.isEmpty);
  // Mock 仅列出现有角色所在区域；引擎模式严格使用 battle.areas。
  const areas =
    battle.areas ??
    [...new Set([...living, ...monsters].map((e) => e.areaId))].map((id) => ({ id }));
  const stanceTrack = (side: "hero" | "monster") => (
    <section
      className="tt-battle-stance"
      aria-label={side === "hero" ? "英雄姿态轨" : "怪物姿态轨"}
      data-testid={`tabletop-stance-${side}`}
    >
      <h3>
        {side === "hero" ? "英雄姿态" : "怪物姿态"} <small>进攻 → 支援</small>
      </h3>
      <div className="tt-battle-stance__slots">
        {STANCES.map((stance, index) => {
          const roster = side === "hero" ? living : monsters;
          const occupants = roster.filter((e) => e.stance === stance);
          const covered = roster.some(
            (e) =>
              "stanceSlots" in e &&
              e.stance &&
              STANCES.indexOf(e.stance) < index &&
              STANCES.indexOf(e.stance) + (e.stanceSlots ?? 1) > index,
          );
          if (covered && occupants.length === 0) return null;
          const width = Math.max(
            1,
            ...occupants.map((e) => ("stanceSlots" in e ? (e.stanceSlots ?? 1) : 1)),
          );
          return (
            <div
              className="tt-battle-stance__slot"
              style={{ gridColumn: `${index + 1} / span ${width}` }}
              key={stance}
              data-testid={`tabletop-stance-${side}-${stance}`}
            >
              <span>{stanceLabelZh(stance)}</span>
              {occupants.length === 0 && <small className="muted">空</small>}
              {occupants.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className={battle.turnActorId === e.id ? "tt-battle-stance__actor" : ""}
                  aria-pressed={(side === "hero" ? selectedHeroId : selectedTargetId) === e.id}
                  onClick={() => (side === "hero" ? onSelectHero(e.id) : onSelectTarget(e.id))}
                >
                  {"hero" in e ? e.hero : e.name}
                  <small>
                    区域 {e.areaId}
                    {"stanceSlots" in e && e.stanceSlots ? ` · 占 ${e.stanceSlots} 格` : ""}
                    {battle.turnActorId === e.id ? " · 当前" : e.actedThisRound ? " · 已行动" : ""}
                  </small>
                </button>
              ))}
            </div>
          );
        })}
      </div>
      {side === "monster" && monsters.some((m) => !m.stance) && (
        <small className="muted">
          姿态待确认：
          {monsters
            .filter((m) => !m.stance)
            .map((m) => m.name)
            .join("、")}
        </small>
      )}
    </section>
  );
  return (
    <div className="tt-battle-board tabletop-board-slab" data-testid="tabletop-battle-board">
      <header className="tt-battle-board__heading">
        <h3>战斗区域</h3>
        {battle.roomCardId && (
          <button type="button" onClick={() => onSelectRoom(battle.roomCardId!)}>
            查看房间卡
          </button>
        )}
        <span>区域位置待确认 · 网格不表示相邻关系（U-12 / V-10）</span>
      </header>
      {stanceTrack("monster")}
      <div className="tt-battle-grid" data-testid="tabletop-battle-grid">
        {areas.map((area) => (
          <section
            key={area.id}
            className="tt-battle-area"
            data-testid={`tabletop-area-${area.id}`}
          >
            <header>
              区域 {area.id}
              {"capacity" in area && area.capacity !== undefined ? ` · 容量 ${area.capacity}` : ""}
            </header>
            <div className="tt-battle-area__tokens">
              {living
                .filter((h) => h.areaId === area.id)
                .map((h) => (
                  <StandeeToken
                    key={h.id}
                    label={h.hero}
                    {...(lookupHeroStandeeArt(h.hero)?.pngRel
                      ? { pngRel: lookupHeroStandeeArt(h.hero)!.pngRel }
                      : {})}
                    wounds={h.wounds}
                    selected={selectedHeroId === h.id}
                    onClick={() => onSelectHero(h.id)}
                    testId={`tabletop-standee-hero-${h.id}`}
                  />
                ))}
              {monsters
                .filter((m) => m.areaId === area.id)
                .map((m) => (
                  <StandeeToken
                    key={m.id}
                    label={m.name}
                    {...(lookupPrintMonsterFace(m.monsterCardId)?.pngRel
                      ? { pngRel: lookupPrintMonsterFace(m.monsterCardId)!.pngRel }
                      : {})}
                    assetType="monster"
                    wounds={m.wounds}
                    selected={selectedTargetId === m.id}
                    onClick={() => onSelectTarget(m.id)}
                    testId={`tabletop-target-${m.id}`}
                  />
                ))}
              {!living.some((h) => h.areaId === area.id) &&
                !monsters.some((m) => m.areaId === area.id) && <span className="muted">空</span>}
            </div>
          </section>
        ))}
      </div>
      {stanceTrack("hero")}
    </div>
  );
}
