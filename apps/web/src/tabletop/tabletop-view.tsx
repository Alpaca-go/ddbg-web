import { useMemo, useState } from "react";
import { CardFace } from "../card-art/card-face";
import { CoreboxPrintCardFace } from "../card-art/corebox-print-card-face";
import { ExplorationArtImage } from "../card-art/exploration-art-image";
import { MonsterCardFace } from "../card-art/monster-card-face";
import {
  cachedPrintHamletBoardUrl,
  lookupHamletBoardArt,
} from "../card-art/resolve-print-hamlet-board-art";
import { lookupPrintMonsterFace } from "../card-art/resolve-print-monster-art";
import { lookupQuestMapArt, lookupRoomCardArt } from "../card-art/resolve-exploration-art";
import { lookupPrintQuestFace } from "../card-art/resolve-print-quest-art";
import { lookupHeroStandeeArt } from "../card-art/resolve-print-hero-standee-art";
import { TabletopCardStack } from "./tabletop-card-stack";
import { TabletopRasterPiece } from "./tabletop-raster-piece";
import { TABLETOP_ACTIVE_HERO_DEFAULT, TABLETOP_MOCK } from "./tabletop-mock";
import "./tabletop.css";

function LightTrack({ value }: { readonly value: number }) {
  return (
    <div className="tabletop-light" aria-label="光照轨">
      <span className="tabletop-light__label">光照</span>
      <ol className="tabletop-light__track">
        {[5, 4, 3, 2, 1, 0].map((n) => (
          <li
            key={n}
            className={
              n === value
                ? "tabletop-light__pip tabletop-light__pip--active"
                : "tabletop-light__pip"
            }
            aria-current={n === value ? "step" : undefined}
          >
            {n}
          </li>
        ))}
      </ol>
    </div>
  );
}

function HamletIcon() {
  const board = lookupHamletBoardArt();
  const [failed, setFailed] = useState(false);
  return (
    <button type="button" className="tabletop-hamlet-icon" title={TABLETOP_MOCK.hamletHint}>
      {!failed && board?.pngRel ? (
        <img src={cachedPrintHamletBoardUrl(board)} alt="" onError={() => setFailed(true)} />
      ) : (
        <span className="tabletop-hamlet-icon__fallback">村</span>
      )}
      <span className="tabletop-hamlet-icon__text">村庄</span>
    </button>
  );
}

function HeroStrip({
  hero,
  onSelect,
}: {
  readonly hero: (typeof TABLETOP_MOCK.heroes)[number];
  readonly onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="tabletop-hero-strip"
      onClick={onSelect}
      data-testid={`tabletop-hero-strip-${hero.id}`}
      aria-pressed={false}
    >
      <span className="tabletop-hero-strip__name">{hero.name}</span>
      <span className="tabletop-hero-strip__stat">
        伤口 {hero.wounds}/{hero.life}
      </span>
      <span className="tabletop-hero-strip__stat">压力 {hero.stress}/10</span>
      <span className="tabletop-hero-strip__tokens">
        {hero.statusTokens.length
          ? hero.statusTokens.map((t) => `${t.label}${t.turns ? `/${t.turns}t` : ""}`).join(" · ")
          : "无状态"}
      </span>
    </button>
  );
}

function ActiveHeroMat({ hero }: { readonly hero: (typeof TABLETOP_MOCK.heroes)[number] }) {
  const standee = lookupHeroStandeeArt(hero.name);
  return (
    <section
      className="tabletop-hero-mat"
      aria-label={`${hero.name} 玩家垫`}
      data-testid="tabletop-active-mat"
    >
      <header className="tabletop-hero-mat__header">
        <h2>{hero.name}</h2>
        <p className="muted">
          {hero.stance} · 区域 {hero.area} · 伤口 {hero.wounds}/{hero.life} · 压力 {hero.stress}/10
        </p>
      </header>
      <div className="tabletop-hero-mat__body">
        <TabletopRasterPiece
          {...(standee?.pngRel ? { pngRel: standee.pngRel } : {})}
          label={hero.name}
          aspect="square"
          testId={`tabletop-standee-${hero.id}`}
        />
        <div className="tabletop-hero-mat__skills">
          <h3>技能槽（印刷稿）</h3>
          <div className="tabletop-hero-mat__skill-row">
            {hero.skillIds.map((id) => (
              <CardFace key={id} skillId={id} size="sm" />
            ))}
          </div>
        </div>
        <div className="tabletop-hero-mat__extras">
          <h3>饰品 / 标记位（占位）</h3>
          <div className="tabletop-token-slots">
            {Array.from({ length: hero.trinketSlots }, (_, i) => (
              <div key={i} className="tabletop-token-slot tabletop-token-slot--trinket">
                饰品 {i + 1}
              </div>
            ))}
            <div className="tabletop-token-slot">伤口代币</div>
            <div className="tabletop-token-slot">压力轨</div>
            {hero.statusTokens.map((t, i) => (
              <div key={i} className="tabletop-token-slot tabletop-token-slot--status">
                {t.label}
                {t.turns ? ` · ${t.turns}t` : ""}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CentralStage() {
  const mapArt = lookupQuestMapArt(TABLETOP_MOCK.dungeonLayoutId);
  const roomArt = lookupRoomCardArt(TABLETOP_MOCK.currentRoomCardId);

  return (
    <section className="tabletop-stage" aria-label="中央主舞台" data-testid="tabletop-stage">
      <div className="tabletop-stage__map-board tabletop-board-slab">
        {mapArt ? (
          <ExplorationArtImage
            entry={mapArt}
            alt="地牢版图"
            className="tabletop-stage__map-img"
            testId="tabletop-quest-map"
          />
        ) : (
          <TabletopRasterPiece label="地牢版图" aspect="quest-map" />
        )}
      </div>
      <div className="tabletop-stage__room-focus">
        <h3 className="tabletop-stage__room-title">{TABLETOP_MOCK.currentRoomLabel}</h3>
        <div className="tabletop-stage__room-card">
          {roomArt ? (
            <ExplorationArtImage
              entry={roomArt}
              alt={TABLETOP_MOCK.currentRoomLabel}
              className="tabletop-stage__room-img"
              testId="tabletop-room-card"
            />
          ) : (
            <TabletopRasterPiece label={TABLETOP_MOCK.currentRoomLabel} aspect="room" />
          )}
        </div>
        <div className="tabletop-stage__battle-grid" aria-label="战斗站位示意（占位）">
          {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"].map((area) => {
            const heroesHere = TABLETOP_MOCK.heroes.filter((h) => h.area === area);
            const monstersHere = TABLETOP_MOCK.stageMonsters.filter((m) => m.area === area);
            return (
              <div key={area} className="tabletop-area-cell" data-testid={`tabletop-area-${area}`}>
                <span className="tabletop-area-cell__label">{area}</span>
                {heroesHere.map((h) => (
                  <span key={h.id} className="tabletop-area-chip tabletop-area-chip--hero">
                    {h.name.slice(0, 3)}
                  </span>
                ))}
                {monstersHere.map((m) => (
                  <span key={m.id} className="tabletop-area-chip tabletop-area-chip--monster">
                    {m.name.split(" ")[0]}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
        <div className="tabletop-stage__monsters">
          {TABLETOP_MOCK.stageMonsters.map((m) => (
            <MonsterCardFace key={m.id} monsterCardId={m.cardId} size="chip" />
          ))}
        </div>
      </div>
    </section>
  );
}

function DeckRail() {
  const room = TABLETOP_MOCK.deckStacks.room;
  const monster = TABLETOP_MOCK.deckStacks.monster;
  const roomTop = lookupRoomCardArt(room.topRoomCardId);
  const monsterTop = lookupPrintMonsterFace(monster.topMonsterCardId);

  return (
    <aside className="tabletop-deck-rail" aria-label="抽牌堆" data-testid="tabletop-deck-rail">
      <TabletopCardStack
        label={room.label}
        count={room.count}
        {...(roomTop?.pngRel ? { pngRel: roomTop.pngRel } : {})}
        aspect="room"
        testId="tabletop-deck-room"
      />
      <TabletopCardStack
        label={TABLETOP_MOCK.deckStacks.corridor.label}
        count={TABLETOP_MOCK.deckStacks.corridor.count}
        aspect="room"
        testId="tabletop-deck-corridor"
      />
      <TabletopCardStack
        label={monster.label}
        count={monster.count}
        {...(monsterTop?.pngRel ? { pngRel: monsterTop.pngRel } : {})}
        aspect="monster"
        testId="tabletop-deck-monster"
      />
      <TabletopCardStack
        label={TABLETOP_MOCK.deckStacks.loot.label}
        count={TABLETOP_MOCK.deckStacks.loot.count}
        aspect="square"
        testId="tabletop-deck-loot"
      />
      <p className="tabletop-deck-rail__note muted">
        弃牌 / 移除区默认收起（原型未展示）。走廊 / 战利品堆无已核实顶牌映射时用占位块。
      </p>
    </aside>
  );
}

function LogDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <div className={["tabletop-log", open ? "tabletop-log--open" : ""].join(" ")}>
      <button
        type="button"
        className="tabletop-log__handle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "收起日志" : "拉出日志"}
      </button>
      {open && (
        <div className="tabletop-log__panel" role="region" aria-label="事件日志（原型）">
          <ul>
            {TABLETOP_MOCK.logLines.map((line) => (
              <li key={line.id}>{line.text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function TabletopView() {
  const [activeIndex, setActiveIndex] = useState(TABLETOP_ACTIVE_HERO_DEFAULT);
  const activeHero =
    TABLETOP_MOCK.heroes[activeIndex] ?? TABLETOP_MOCK.heroes[TABLETOP_ACTIVE_HERO_DEFAULT];

  const questFace = useMemo(() => lookupPrintQuestFace(TABLETOP_MOCK.questCardId, "front"), []);

  return (
    <div className="tabletop-root" data-testid="tabletop-view">
      <header className="tabletop-topbar">
        <div className="tabletop-topbar__quest">
          <CoreboxPrintCardFace
            deck="quest"
            cardId={TABLETOP_MOCK.questCardId}
            label={TABLETOP_MOCK.questLabel}
            size="sm"
          />
          {!questFace && (
            <span className="muted tabletop-topbar__quest-fallback">
              {TABLETOP_MOCK.questLabel}
            </span>
          )}
        </div>
        <LightTrack value={TABLETOP_MOCK.light} />
        <div className="tabletop-topbar__turn">
          <span className="eyebrow">回合</span>
          <strong data-testid="tabletop-turn-label">
            第 {TABLETOP_MOCK.round} 轮 · {TABLETOP_MOCK.turnLabel}
          </strong>
        </div>
        <HamletIcon />
      </header>

      <div className="tabletop-main">
        <nav className="tabletop-side-strips" aria-label="其他英雄">
          {TABLETOP_MOCK.heroes.map((hero, i) =>
            i === activeIndex ? null : (
              <HeroStrip key={hero.id} hero={hero} onSelect={() => setActiveIndex(i)} />
            ),
          )}
        </nav>

        <CentralStage />
        <DeckRail />
      </div>

      <ActiveHeroMat hero={activeHero} />
      <LogDrawer />

      <p className="tabletop-prototype-banner muted">
        静态桌面版式原型 · <code>?view=tabletop</code> · 不接规则引擎 · 疾病 / 怪癖 / 美德 /
        折磨牌堆与完整村庄版图不在桌面常驻
      </p>
    </div>
  );
}
