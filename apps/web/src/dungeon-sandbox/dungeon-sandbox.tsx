import { readBasicQuest } from "../../../../packages/data/src/basic-quests";
import { BattleView } from "../battle-view";
import { battleStep } from "../battle-step";
import { QuestSaveControls } from "./quest-save-controls";
import { useDungeonStore } from "./store";
import { QuestMapPanel } from "./dungeon-map/quest-map-panel";
import { QuestMapDebugControls } from "./dungeon-map/quest-map-debug-controls";
import { ScoutingPanel } from "./expedition/scouting-panel";
import { DungeonDecksZone } from "./expedition/dungeon-decks-zone";
import { fixtureDescription } from "./expedition/dungeon-header-copy";
import { HamletPhaseView } from "./hamlet/hamlet-phase-view";
import { QuestSummaryPanel } from "./quest-return/quest-summary-panel";
import { DebugDrawer } from "./phase-shell/debug-drawer";
import { dungeonFlowStep } from "./phase-shell/dungeon-flow-step";
import { PhaseShell } from "./phase-shell/phase-shell";
import { resolveFlowPhase } from "./phase-shell/flow-phase";

export function DungeonSandbox({ formal = false }: { formal?: boolean } = {}) {
  const { game, events, commands, dispatch, reset, select, page, fixture, preview } =
    useDungeonStore();
  const d = game.dungeon!;
  const pendingChoice = d.deathTrinketChoice ?? d.replacementPreparation?.choice ?? d.pending;
  const flowPhase = resolveFlowPhase({ game });
  const stepText = dungeonFlowStep(game);
  const quest = readBasicQuest(d.questDistribution);

  const subtitle = formal
    ? `QuestMap p1 ${d.layout.review === "confirmed" ? "已批准" : "标注待批准"} · ${quest?.name ?? "任务"} · 光照 ${d.explorationSetup?.light ?? "—"}、DL ${d.explorationSetup!.dungeonLevel}`
    : `QuestMap p${page} · 固定种子 ${game.seed}`;

  const title = formal ? quest!.name : "地牢布局与侦察";
  const headerExtra = (
    <>
      {formal && <QuestSaveControls />}
      <a href="/">返回战斗沙盒</a>
    </>
  );

  const debugDrawer = !formal ? (
    <DebugDrawer>
      <QuestMapDebugControls page={page} fixture={fixture} select={select} />
      <p className="muted">{fixtureDescription(fixture, preview)}</p>
      <button type="button" onClick={() => reset("standard")}>
        重置标准模式
      </button>{" "}
      <button type="button" onClick={() => reset("radiant")}>
        重置 Radiant
      </button>
      <p className="muted">
        命令 {commands.length} · 布置 RNG 游标 {d.cursor} · 探索按当前光照结算
      </p>
    </DebugDrawer>
  ) : null;

  const eventsFooter = (
    <p data-testid="dungeon-events">
      {events
        .map((e) =>
          e.type === "resolveTested"
            ? `${e.entityId}：d10 ${e.roll}，${d.resolveCards.find((c) => c.id === e.cardId)?.name}，压力归零`
            : e.message,
        )
        .join("；")}
    </p>
  );

  const mapPanel = (
    <QuestMapPanel
      game={game}
      formal={formal}
      page={page}
      fixture={fixture}
      preview={preview}
      select={select}
    />
  );

  const decks = <DungeonDecksZone game={game} withTestIds />;

  if (game.battle) {
    const battle = game.battle;
    const battleStepInfo = game.dungeon?.campaignFailure
      ? { label: "战役失败", hint: "驿站等待英雄不足，无法补齐队伍（R9/R25/R33）。" }
      : battleStep(battle);
    return (
      <>
        <PhaseShell
          phase="battle"
          stepText={`${battleStepInfo.label}：${battleStepInfo.hint}`}
          title={formal ? quest!.name : "地牢战斗"}
          subtitle={subtitle}
          headerExtra={headerExtra}
        >
          <div className="phase-battle-fill">
            <BattleView
              game={game}
              dispatch={dispatch}
              events={events}
              commands={commands}
              layout="dungeon"
              notice={events.map((e) => e.message).join("；")}
            />
          </div>
        </PhaseShell>
        {debugDrawer}
      </>
    );
  }

  if (flowPhase === "hamlet") {
    return (
      <>
        <PhaseShell
          phase={flowPhase}
          stepText={stepText}
          title={title}
          subtitle={subtitle}
          headerExtra={headerExtra}
          table={
            <HamletPhaseView
              game={game}
              dispatch={dispatch}
              events={events}
              commands={commands}
              formal={formal}
              pendingChoice={pendingChoice}
            />
          }
          player={decks}
          footer={eventsFooter}
        />
        {debugDrawer}
      </>
    );
  }

  if (flowPhase === "questReturn") {
    return (
      <>
        <PhaseShell
          phase={flowPhase}
          stepText={stepText}
          title={title}
          subtitle={subtitle}
          headerExtra={headerExtra}
          player={
            <QuestSummaryPanel
              game={game}
              dispatch={dispatch}
              formal={formal}
              pendingChoice={pendingChoice}
              events={events}
              commands={commands}
              includeHamletEvent={false}
            />
          }
          table={mapPanel}
          decks={decks}
          footer={eventsFooter}
        />
        {debugDrawer}
      </>
    );
  }

  const scouting = !preview ? (
    <ScoutingPanel
      game={game}
      dispatch={dispatch}
      events={events}
      commands={commands}
      formal={formal}
      pendingChoice={pendingChoice}
      surface={flowPhase === "expeditionPrep" ? "expeditionPrep" : "exploration"}
    />
  ) : (
    <p className="muted">地图预览模式：未加载侦察面板。</p>
  );

  return (
    <>
      <PhaseShell
        phase={flowPhase}
        stepText={stepText}
        title={title}
        subtitle={subtitle}
        headerExtra={headerExtra}
        player={scouting}
        table={mapPanel}
        decks={decks}
        footer={eventsFooter}
      />
      {debugDrawer}
    </>
  );
}
