import { useEffect, useState, type ReactNode } from "react";
import {
  createCampaignQuest,
  CONTENT_PACKS,
  FORMAL_HERO_NAMES,
  heroHasUnwiredCombatSkills,
  initialQuestDrawModes,
  drawInitialQuestOffers,
} from "@ddbg/engine";
import type { QuestParty, DungeonState, FormalHeroName, ContentPackId } from "@ddbg/engine";
import type { HamletQuestDrawOptionId } from "@ddbg/engine";
import { battleData as questBattleData } from "virtual:quest-battle-data";
import {
  asQuestMapPairingQuest,
  sandboxEmbarkQuestsForPacks,
} from "../../../../../packages/data/src/basic-quests";
import { pickQuestMapLayoutId } from "../../../../../packages/data/src/quest-map-pairing";
import type { BasicQuestId } from "../../../../../packages/data/src/basic-quests";
import { EmbarkPartyRosterBar } from "./embark-party-roster-bar";
import { EmbarkSkillIconPicker } from "./embark-skill-icon-picker";
import { DungeonSandbox } from "../dungeon-sandbox";
import { QuestSaveControls } from "../quest-save-controls";
import { useDungeonStore } from "../store";
import { taskSources } from "../task-sources";
import { TabletopFormalShell } from "../../tabletop/tabletop-formal-shell";
import { projectQuestSetupHeroes } from "../../tabletop/phase/project-quest-setup-heroes";
import {
  EMBARK_BEGIN_BUTTON_HEIGHT_PX,
  EMBARK_BEGIN_BUTTON_WIDTH_PX,
  embarkBeginButtonHoverUrl,
  embarkBeginButtonUrl,
} from "../../card-art/resolve-assets-plus-art";
import { EmbarkHeroToken } from "./embark-hero-picker";
import { ExpeditionPrepSection } from "./expedition-prep-section";
import { moveEmbarkRosterSeatToSlot, type EmbarkRosterSlotIndex } from "@ddbg/engine";
import {
  applyRosterSlotsToParty,
  assignEmbarkRosterSlotForSeat,
  defaultPartyNames,
  formalHeroLevel1Skills,
  formalPartySlot,
  stanceLabels,
  toggleEmbarkSkillIds,
} from "./formal-party";

const DEFAULT_QUEST_SEED = 1;

function resolveQuestSeed(): number {
  const raw = new URLSearchParams(window.location.search).get("seed");
  if (raw === null || raw.trim() === "") return DEFAULT_QUEST_SEED;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) return DEFAULT_QUEST_SEED;
  return n;
}

export function DungeonQuest() {
  const beginTask = useDungeonStore((s) => s.beginTask);
  useEffect(() => {
    for (const src of [embarkBeginButtonUrl(), embarkBeginButtonHoverUrl()]) {
      const img = new Image();
      img.src = src;
    }
  }, []);
  const [started, setStarted] = useState(false),
    [prepStep, setPrepStep] = useState<"party" | "expedition">("party"),
    [questId, setQuestId] = useState<BasicQuestId>("quest:p001"),
    [mode, setMode] = useState<DungeonState["mode"]>("standard"),
    [error, setError] = useState("");
  const [contentPacks, setContentPacks] = useState<ContentPackId[]>(["core"]);
  const [drawMode, setDrawMode] = useState<HamletQuestDrawOptionId>("hamlet-quest-draw:ruins-two");
  const [drawnMode, setDrawnMode] = useState<HamletQuestDrawOptionId | null>(null);
  const [party, setParty] = useState<QuestParty>(() =>
    defaultPartyNames.map((name, index) => formalPartySlot(name, index)),
  );
  const [skillsConfirmedBySeat, setSkillsConfirmedBySeat] = useState(() => [
    false,
    false,
    false,
    false,
  ]);
  const [rosterSlotBySeat, setRosterSlotBySeat] = useState<(number | null)[]>(() => [
    null,
    null,
    null,
    null,
  ]);
  const partyNames = party.map(
    (hero) =>
      questBattleData.heroStats.find((s) => s.id === hero.heroStatId)!.name as FormalHeroName,
  );
  const moveRosterSeat = (fromSeat: number, toSlot: EmbarkRosterSlotIndex) => {
    setRosterSlotBySeat((prev) => {
      const next = moveEmbarkRosterSeatToSlot(prev, fromSeat, toSlot);
      setParty((partyState) => applyRosterSlotsToParty(partyState, next, skillsConfirmedBySeat));
      return next;
    });
  };
  if (started) return <DungeonSandbox formal />;

  const drawModes = initialQuestDrawModes(contentPacks);
  const drawEnabled = drawModes.length > 0;
  const initialDraw =
    drawEnabled && drawnMode
      ? drawInitialQuestOffers(resolveQuestSeed(), contentPacks, drawnMode)
      : null;
  const availableQuests = sandboxEmbarkQuestsForPacks(contentPacks);
  const startQuests = initialDraw
    ? initialDraw.pendingChoice.options.map((option) =>
        availableQuests.find((q) => q.id === option.id)!,
      )
    : availableQuests;
  const selectedQuest = startQuests.find((q) => q.id === questId) ?? startQuests[0]!;
  const setupHeroes = projectQuestSetupHeroes(party, partyNames);
  const setupSeed = resolveQuestSeed();
  const setupQuest = {
    questCardId: selectedQuest.id,
    questLabel: selectedQuest.name,
    dungeonLevel: "DL I",
    locationLabel: "—",
    actLabel: "—",
    xpProgress: "—",
    layoutId: pickQuestMapLayoutId(asQuestMapPairingQuest(selectedQuest), setupSeed, 0),
  };
  const preEmbarkPhase = prepStep === "expedition" ? "expeditionPrep" : "questSetup";

  const embark = () => {
    setError("");
    if (drawEnabled && !initialDraw) {
      setError("请先抽取首趟任务");
      return;
    }
    const seed = resolveQuestSeed();
    try {
      const game = createCampaignQuest(
        seed,
        selectedQuest.id,
        mode,
        party,
        taskSources,
        contentPacks,
        drawEnabled && drawnMode ? drawnMode : undefined,
      );
      beginTask(game, {
        seed,
        contentPacks,
        ...(drawEnabled && drawnMode ? { initialQuestDrawMode: drawnMode } : {}),
        questId: selectedQuest.id,
        bossEdgeRooms: true,
        mode,
        ...(game.dungeon?.stygianRoomRules
          ? { stygianRoomRules: game.dungeon.stygianRoomRules }
          : {}),
        party: party.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
      });
      setStarted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const shell = (children: ReactNode) => (
    <TabletopFormalShell
      questSetupActive={prepStep === "party"}
      preEmbarkPhase={preEmbarkPhase}
      setupHeroes={setupHeroes}
      setupQuest={
        drawEnabled && !initialDraw
          ? { questLabel: "待抽选首趟任务", questCardId: "", layoutId: "" }
          : setupQuest
      }
    >
      {children}
    </TabletopFormalShell>
  );

  if (prepStep === "expedition") {
    return shell(
      <>
        <ExpeditionPrepSection
          quests={startQuests}
          questId={selectedQuest.id}
          awaitingDraw={drawEnabled && !initialDraw}
          drawControls={
            drawEnabled ? (
              <fieldset>
                <legend>首趟任务抽选</legend>
                <label>
                  首趟任务抽法
                  <select
                    aria-label="首趟任务抽法"
                    value={drawMode}
                    disabled={drawnMode !== null}
                    onChange={(event) => setDrawMode(event.target.value as HamletQuestDrawOptionId)}
                  >
                    {drawModes.map((plan) => (
                      <option key={plan.optionId} value={plan.optionId}>
                        {plan.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={drawnMode !== null}
                  onClick={() => setDrawnMode(drawMode)}
                >
                  抽取首趟任务
                </button>
                <p>
                  {initialDraw
                    ? "从抽出的两张任务中选择一张，另一张永久弃置。"
                    : "按地点选择抽法，再抽取两张任务。"}
                </p>
              </fieldset>
            ) : undefined
          }
          onQuestIdChange={setQuestId}
          onBack={() => {
            setError("");
            setPrepStep("party");
          }}
          onEmbark={embark}
          error={error}
          embarking={false}
        />
        <QuestSaveControls onLoad={() => setStarted(true)} />
      </>,
    );
  }

  return shell(
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">DDBG · PHASE 4</p>
          <h1>开局建队</h1>
          <p>正式十八英雄开局四人 · I级任务 · 单设备1–4人轮流操作</p>
          <p className="embark-roster-hint">
            可选身份共 {FORMAL_HERO_NAMES.length} 名（与替补白名单一致）。十八名属性与 I–III
            级战斗技能均已核实接线（R-200）。缺 token/icon 不阻塞建队；未核实效果按 R-048
            拒绝，不发明数值。
          </p>
          <a href="/?view=battle">打开战斗沙盒</a>
        </div>
        <div className="embark-mode-toggle" role="group" aria-label="任务模式">
          <button
            type="button"
            data-testid="embark-mode-standard"
            aria-pressed={mode === "standard"}
            onClick={() => setMode("standard")}
          >
            标准模式
          </button>
          <button
            type="button"
            data-testid="embark-mode-radiant"
            aria-pressed={mode === "radiant"}
            onClick={() => setMode("radiant")}
          >
            Radiant
          </button>
          <button
            type="button"
            data-testid="embark-mode-stygian"
            aria-pressed={mode === "stygian"}
            onClick={() => setMode("stygian")}
            title="Stygian：起始 0 金、Boss +1 Crit，使用 17 张 Stygian 房间卡"
          >
            Stygian
          </button>
        </div>
        {mode === "stygian" && (
          <p className="embark-roster-hint" data-testid="embark-stygian-warning">
            Stygian：起始 0 金，Boss +1 Crit，17 张普通房间使用 Stygian 卡。
          </p>
        )}
      </header>
      <section className="panel">
        <fieldset aria-label="战役内容包" data-testid="campaign-content-packs">
          <legend>战役内容包（可多选）</legend>
          <p>英雄及英雄技能始终全部开放。未选包的其他内容不会加入本次战役；开始后不可更改。</p>
          {CONTENT_PACKS.map((pack) => (
            <label key={pack.id} style={{ display: "block" }}>
              <input
                type="checkbox"
                data-testid={`content-pack-${pack.id}`}
                checked={contentPacks.includes(pack.id)}
                disabled={pack.id === "core"}
                onChange={(event) => {
                  setDrawnMode(null);
                  setContentPacks((previous) =>
                    event.target.checked
                      ? [...previous, pack.id]
                      : previous.filter((id) => id !== pack.id),
                  );
                }}
              />
              {pack.name} · {pack.description}
            </label>
          ))}
        </fieldset>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            setPrepStep("expedition");
          }}
        >
          <div className="embark-party-grid" data-testid="embark-party-grid">
            {party.map((hero, index) => {
              const name = partyNames[index]!;
              const gapLabel = heroHasUnwiredCombatSkills(name) ? "技能效果未接线" : "";
              return (
                <fieldset
                  key={index}
                  className="embark-seat-column"
                  aria-label={[`席位 ${index + 1} · ${stanceLabels[hero.stance]}`, gapLabel]
                    .filter(Boolean)
                    .join(" · ")}
                >
                  <div className="embark-seat">
                    <EmbarkHeroToken
                      seatIndex={index}
                      heroName={name}
                      heroStatId={hero.heroStatId}
                      partyNames={partyNames}
                      heroLocked={skillsConfirmedBySeat[index]!}
                      onSelect={(next) => {
                        setSkillsConfirmedBySeat((prev) =>
                          prev.map((confirmed, i) => (i === index ? false : confirmed)),
                        );
                        setRosterSlotBySeat((prev) =>
                          prev.map((slot, i) => (i === index ? null : slot)),
                        );
                        setParty(
                          party.map((h, i) => (i === index ? formalPartySlot(next, index) : h)),
                        );
                      }}
                    />
                    <div
                      className="embark-seat-skills"
                      role="group"
                      aria-label={`${name} 起始技能（已选 ${hero.skillIds.length}/3）`}
                    >
                      <EmbarkSkillIconPicker
                        seatIndex={index}
                        heroName={name}
                        skills={formalHeroLevel1Skills(name)}
                        selectedSkillIds={hero.skillIds}
                        skillsConfirmed={skillsConfirmedBySeat[index]!}
                        onSkillsConfirmedChange={(confirmed) => {
                          if (confirmed) {
                            const { rosterSlot, stance } = assignEmbarkRosterSlotForSeat(
                              index,
                              hero.skillIds,
                              rosterSlotBySeat,
                              skillsConfirmedBySeat,
                            );
                            setRosterSlotBySeat((prev) =>
                              prev.map((value, i) => (i === index ? rosterSlot : value)),
                            );
                            setParty((prev) =>
                              prev.map((h, i) => (i === index ? { ...h, stance } : h)),
                            );
                          } else {
                            setRosterSlotBySeat((prev) =>
                              prev.map((value, i) => (i === index ? null : value)),
                            );
                            setParty((prev) =>
                              prev.map((h, i) =>
                                i === index
                                  ? {
                                      ...h,
                                      stance: formalPartySlot(partyNames[index]!, index).stance,
                                    }
                                  : h,
                              ),
                            );
                          }
                          setSkillsConfirmedBySeat((prev) =>
                            prev.map((value, i) => (i === index ? confirmed : value)),
                          );
                        }}
                        onToggleSkill={(skillId) =>
                          setParty(
                            party.map((h, i) =>
                              i !== index
                                ? h
                                : {
                                    ...h,
                                    skillIds: toggleEmbarkSkillIds(h.skillIds, skillId),
                                  },
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                </fieldset>
              );
            })}
          </div>
          <div className="embark-party-footer">
            <button
              type="submit"
              className="embark-begin-btn"
              data-testid="embark-begin-btn"
              aria-label="前往出征准备"
            >
              <span className="embark-begin-btn__stack">
                <span className="embark-begin-btn__art">
                  <img
                    src={embarkBeginButtonUrl()}
                    alt=""
                    width={EMBARK_BEGIN_BUTTON_WIDTH_PX}
                    height={EMBARK_BEGIN_BUTTON_HEIGHT_PX}
                    className="embark-begin-btn__img embark-begin-btn__img--default"
                  />
                  <img
                    src={embarkBeginButtonHoverUrl()}
                    alt=""
                    width={EMBARK_BEGIN_BUTTON_WIDTH_PX}
                    height={EMBARK_BEGIN_BUTTON_HEIGHT_PX}
                    className="embark-begin-btn__img embark-begin-btn__img--hover"
                  />
                </span>
                <span className="embark-begin-btn__label" aria-hidden="true">
                  Begin
                </span>
              </span>
            </button>
            <EmbarkPartyRosterBar
              partyNames={partyNames}
              portraitRevealedBySeat={skillsConfirmedBySeat}
              rosterSlotBySeat={rosterSlotBySeat}
              onMoveRosterSeat={moveRosterSeat}
            />
          </div>
          {error && <p role="alert">{error}</p>}
        </form>
      </section>
      <QuestSaveControls onLoad={() => setStarted(true)} />
    </main>,
  );
}
