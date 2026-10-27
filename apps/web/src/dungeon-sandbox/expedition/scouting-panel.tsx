import { useState, type ReactNode } from "react";
import {
  canLeaveDungeon,
  canRestDungeon,
  canSetupForwardCamp,
  readRoomTile,
  PROVISION_EFFECTS,
  dungeonProvisionWindow,
} from "@ddbg/engine";
import type { PendingChoice } from "@ddbg/engine";
import { readBasicQuest } from "../../../../../packages/data/src/basic-quests";
import { restPoints } from "../../../../../packages/data/src/scout-rest";
import { CoreboxPrintCardFace } from "../../card-art/corebox-print-card-face";
import { RoomCardFace } from "../../card-art/room-card-face";
import { DungeonStanceOrder } from "../../dungeon-stance-order";
import {
  formatProvisionInventoryLine,
  formatProvisionUseButton,
  humanizeChoiceOptionLabel,
} from "../../choice-display-label";
import { provisionEffectLabels } from "../../provision-labels";
import { curioEffectLabel } from "../curio-effect-label";
import { FundraiserChoice } from "../fundraiser-choice";
import { HamletEventSection } from "../hamlet/hamlet-event-section";
import { QuestSummaryPanel } from "../quest-return/quest-summary-panel";
import type { DungeonViewProps } from "../view-props";
import type { DungeonState } from "@ddbg/engine";
import { isNegativeCurioEffect } from "../../../../../packages/data/src/curio";
import { QuestCardField } from "../quest-setup/quest-card-field";
import { dungeonFlowStep } from "../../tabletop/phase/dungeon-flow-step";
import { FormalTabletopScoutingPanel } from "./formal-tabletop-scouting-panel";

function FormalPhaseSection({
  testId,
  extraClass,
  layout,
  children,
}: {
  readonly testId: string;
  readonly extraClass?: string;
  readonly layout: "panel" | "tabletop";
  readonly children: ReactNode;
}) {
  if (layout === "tabletop") {
    return (
      <div
        className={["tt-scouting-tabletop", "panel", "tt-formal-phase-center", extraClass]
          .filter(Boolean)
          .join(" ")}
        data-testid={testId}
      >
        <div className="tt-scouting-tabletop__decisions">{children}</div>
      </div>
    );
  }
  return (
    <section className={["panel", extraClass].filter(Boolean).join(" ")} data-testid={testId}>
      {children}
    </section>
  );
}

export function ScoutingPanel({
  game,
  dispatch,
  events,
  commands,
  formal,
  reset,
  pendingChoice,
  layout = "panel",
}: DungeonViewProps & {
  reset: (mode: DungeonState["mode"]) => void;
  pendingChoice: PendingChoice | null | undefined;
  layout?: "panel" | "tabletop";
}) {
  const [provisionTarget, setProvisionTarget] = useState("hero-0");
  const d = game.dungeon!;
  const currentRoom = d.rooms.find((r) => r.id === d.position);
  const quest = readBasicQuest(d.questDistribution);
  const shownCurio = d.curio?.active ?? d.curio?.last;
  const card = d.curio?.cards.find((c) => c.id === shownCurio?.cardId);
  const activeQuest = quest
    ? {
        id: quest.id,
        name: quest.name,
        restPoints: quest.restPoints,
        xpKind: quest.xpKind,
        ...(quest.xpKind === "flat"
          ? { flatXp: quest.flatXp }
          : { roomsPerXp: quest.roomsPerXp, maxRooms: quest.maxRooms }),
      }
    : null;

  const pendingBlock = pendingChoice ? (
    <div data-testid="dungeon-pending-choice">
      <p>{pendingChoice.prompt}</p>
      {pendingChoice.id.startsWith("dungeon-fundraiser:") ? (
        <FundraiserChoice
          key={pendingChoice.id}
          choice={pendingChoice}
          choose={(optionId) =>
            dispatch({ type: "resolveChoice", choiceId: pendingChoice!.id, optionId })
          }
        />
      ) : (
        pendingChoice.options.map((o) => (
          <button
            key={o.id}
            onClick={() =>
              dispatch({
                type: "resolveChoice",
                choiceId: pendingChoice!.id,
                optionId: o.id,
              })
            }
          >
            {humanizeChoiceOptionLabel(o.label, o.id)}
          </button>
        ))
      )}
    </div>
  ) : null;

  if (d.hamletReturn || d.phase === "exited") {
    return (
      <FormalPhaseSection
        testId="quest-return-center"
        extraClass="quest-return-center"
        layout={layout}
      >
        <QuestSummaryPanel
          game={game}
          dispatch={dispatch}
          formal={formal}
          pendingChoice={pendingChoice}
          events={events}
          commands={commands}
        />
        <DungeonStanceOrder game={game} dispatch={dispatch} />
        <p data-testid="dungeon-checkpoint">{dungeonFlowStep(game)}</p>
        <p data-testid="dungeon-pressure">
          {d.heroes
            .map(
              (h) =>
                `${h.id} 压力 ${h.stress}${h.dead ? (h.wounds === h.life ? "（死门死亡）" : "（心脏病死亡）") : h.resolveCardId ? ` · 意志卡 ${d.resolveCards.find((c) => c.id === h.resolveCardId)?.name}` : ""} · 伤口 ${h.wounds}/${h.life}`,
            )
            .join(" · ")}
        </p>
        <p data-testid="dungeon-provisions">
          剩余补给：
          {(() => {
            const tallies = new Map<string, number>();
            for (const p of d.explorationSetup!.provisions) {
              tallies.set(p.face, (tallies.get(p.face) ?? 0) + 1);
            }
            const parts = [...tallies.entries()].map(([face, count]) =>
              formatProvisionInventoryLine(face, count),
            );
            return parts.join(" · ") || "无";
          })()}
        </p>
        {pendingBlock}
        <p data-testid="dungeon-provision-count">
          公共补给（{d.explorationSetup?.provisions.length ?? 0}/16）
        </p>
        <p data-testid="dungeon-gold">共享金币：{d.gold}</p>
      </FormalPhaseSection>
    );
  }

  if (d.hamlet) {
    return (
      <FormalPhaseSection
        testId="hamlet-phase-center"
        extraClass="hamlet-phase-center"
        layout={layout}
      >
        <HamletEventSection
          game={game}
          dispatch={dispatch}
          formal={formal}
          pendingChoice={pendingChoice}
          events={events}
          commands={commands}
        />
        <DungeonStanceOrder game={game} dispatch={dispatch} />
        {pendingBlock}
        <p data-testid="dungeon-checkpoint">{dungeonFlowStep(game)}</p>
        <p data-testid="dungeon-provision-count">
          公共补给（{d.explorationSetup?.provisions.length ?? 0}/16）
        </p>
        <p data-testid="dungeon-gold">共享金币：{d.gold}</p>
      </FormalPhaseSection>
    );
  }

  if (formal && d.phase === "awaitingProvisions" && activeQuest) {
    return (
      <FormalPhaseSection
        testId="expedition-prep-center"
        extraClass="expedition-prep-center"
        layout={layout}
      >
        <div
          className="expedition-prep-inline"
          aria-label="出征准备"
          data-testid="expedition-prep-inline"
        >
          <h2>出征准备</h2>
          <QuestCardField quests={[activeQuest]} questId={activeQuest.id} readOnly />
        </div>
        <DungeonStanceOrder game={game} dispatch={dispatch} />
        <button
          disabled={!!pendingChoice}
          onClick={() => dispatch({ type: "rollDungeonProvisions" })}
        >
          掷开局补给骰
        </button>
        {pendingBlock}
        <p data-testid="dungeon-provision-count">
          公共补给（{d.explorationSetup?.provisions.length ?? 0}/16）
        </p>
        <p data-testid="dungeon-gold">共享金币：{d.gold}</p>
      </FormalPhaseSection>
    );
  }

  const tabletop = formal && layout === "tabletop";
  if (tabletop) {
    return (
      <FormalTabletopScoutingPanel
        game={game}
        dispatch={dispatch}
        events={events}
        commands={commands}
        pendingChoice={pendingChoice}
      />
    );
  }
  const PanelTag = "section";
  const panelClass = "panel";

  return (
    <PanelTag className={panelClass}>
      <h2>侦察流程</h2>
      <DungeonStanceOrder game={game} dispatch={dispatch} />
      {d.mustLeaveRoomId === d.position && (
        <p>战斗按逃跑收尾：本房间未清理，须先离开才能再次进入（R25）。</p>
      )}
      <p data-testid="dungeon-pressure">
        {d.heroes
          .map(
            (h) =>
              `${h.id} 压力 ${h.stress}${h.dead ? (h.wounds === h.life ? "（死门死亡）" : "（心脏病死亡）") : h.resolveCardId ? ` · 意志卡 ${d.resolveCards.find((c) => c.id === h.resolveCardId)?.name}` : ""} · 伤口 ${h.wounds}/${h.life}`,
          )
          .join(" · ")}
      </p>
      <p data-testid="dungeon-bonus">
        下一次探索：每人 {(d.mode === "radiant" ? 1 : 2) - (d.scoutBonus ? 1 : 0)} 骰 · {d.mode}
      </p>
      <p data-testid="dungeon-conditions">
        {d.heroes
          .filter((h) => h.diseaseId || h.quirkIds?.length)
          .map(
            (h) =>
              `${h.id} · 疾病：${d.conditions?.diseases.find((c) => c.id === h.diseaseId)?.name ?? "无"} · 怪癖：${h.quirkIds?.map((id) => d.conditions?.quirks.find((q) => q.id === id)?.name ?? id).join("、") || "无"}`,
          )
          .join("；") || "疾病 / 怪癖：无"}
      </p>
      <div data-testid="dungeon-trinkets">
        <p>携带饰品：</p>
        {d.trinkets?.held.length ? (
          <div className="trinket-held-row">
            {d.trinkets.held.map((h) => {
              const trinketCard = d.trinkets!.cards.find((c) => c.id === h.cardId)!;
              return (
                <CoreboxPrintCardFace
                  key={`${h.heroId}-${h.cardId}`}
                  deck="trinket"
                  cardId={h.cardId}
                  face={h.face === "upright" ? "front" : "back"}
                  size="sm"
                  label={`${h.heroId} · ${trinketCard.name}（${h.face === "upright" ? "正面" : "反面"}）`}
                />
              );
            })}
          </div>
        ) : (
          <p>无</p>
        )}
      </div>
      {!formal && (
        <>
          <button onClick={() => reset("standard")}>重置标准模式</button>{" "}
          <button onClick={() => reset("radiant")}>重置 Radiant</button>
        </>
      )}
      {d.phase === "blockedPressure" && (
        <button onClick={() => dispatch({ type: "resolveDungeonPressure" })}>恢复意志检定</button>
      )}
      {d.phase === "awaitingRoom" &&
        !pendingChoice &&
        (currentRoom?.kind === "lair" ||
          currentRoom?.kind === "treasure" ||
          currentRoom?.kind === "objective" ||
          (currentRoom?.kind === "curio" &&
            d.curioRoom?.roomId === d.position &&
            d.curioRoom.stage === "guarded")) &&
        !d.roomCards?.active && (
          <button onClick={() => dispatch({ type: "prepareDungeonBattle" })}>
            抽房间牌并匹配战斗板块
          </button>
        )}
      {d.phase === "awaitingRoom" &&
        !pendingChoice &&
        currentRoom?.kind === "objective" &&
        d.roomResolution?.kind === "objective" &&
        !d.roomResolution.completed && (
          <button onClick={() => dispatch({ type: "resolveDungeonRoom" })}>
            拾取任务目标（骨骸）
          </button>
        )}
      {d.roomCards?.active &&
        (() => {
          const active = d.roomCards.active;
          const roomCard = d.roomCards.cards.find((c) => c.id === active.cardId)!;
          const selectedTile = readRoomTile(roomCard, active.tileId);
          return (
            <div className="panel" data-testid="dungeon-room-card">
              <div className="dungeon-room-card-row">
                <RoomCardFace roomCardId={roomCard.id} label={roomCard.name} />
                <div>
                  <h3>
                    {roomCard.name} · 遗迹 {roomCard.number}
                  </h3>
                  <p>
                    完整遗迹房间牌池 9 张 · 余牌 {d.roomCards.deck!.length} · 已抽 1 张 · 印刷页{" "}
                    {roomCard.source.page}
                  </p>
                  <p>地点与 Boss 分堆；效果栏保留原文和图标 ID，尚未执行。</p>
                </div>
              </div>
              <details>
                <summary>查看卡面转录（含未解释图标）</summary>
                {roomCard.printedLines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </details>
              {active.tileId && selectedTile.status === "matched" && (
                <p>
                  已匹配 {selectedTile.tile.name}（部署已核实），
                  {selectedTile.tile.areas.length} 个区域，英雄部署{" "}
                  {[...new Set(Object.values(selectedTile.deployment.heroes))].join(" / ")}
                  ，怪物部署{" "}
                  {[...new Set(Object.values(selectedTile.deployment.monsters))].join(" / ")}。
                </p>
              )}
              <p role="status">{active.blockedReason}</p>
              {active.tileId && !d.monsterPool?.active && (
                <button onClick={() => dispatch({ type: "prepareDungeonMonsters" })}>
                  从完整 42 张怪物池抽牌并记录部署
                </button>
              )}
              {d.monsterPool?.active && (
                <div data-testid="dungeon-monsters">
                  <button onClick={() => dispatch({ type: "startDungeonBattle" })}>
                    进入房间战斗
                  </button>
                  <p>
                    Common + Ruins I · 完整牌池 42 张 · 余牌 {d.monsterPool.remaining!.length} ·
                    部署 {d.monsterPool.active.monsters.length} · 弃牌{" "}
                    {d.monsterPool.discarded.length}
                  </p>
                  {d.monsterPool.active.monsters.map((m) => (
                    <p key={m.instanceId}>
                      {d.monsterPool!.cards.find((c) => c.combatCardId === m.cardId)!.name} ·{" "}
                      {m.instanceId} ·{" "}
                      {
                        {
                          aggressive: "进攻",
                          defensive: "防御",
                          ranged: "远程",
                          support: "支援",
                        }[m.stance]
                      }{" "}
                      → {m.areaId} · 占 {m.stanceSlots} 格
                    </p>
                  ))}
                  <p>原牌与余牌已保留，等待正式战斗接线。</p>
                </div>
              )}
            </div>
          );
        })()}
      {d.phase === "awaitingRoom" &&
        !pendingChoice &&
        (["trap", "dark"].includes(currentRoom?.kind ?? "") ||
          (currentRoom?.kind === "curio" && d.curioRoom?.roomId !== d.position)) && (
          <button onClick={() => dispatch({ type: "resolveDungeonRoom" })}>
            结算{" "}
            {currentRoom?.kind === "dark"
              ? "Dark"
              : currentRoom?.kind === "curio"
                ? "Curio 守卫骰"
                : "Trap"}{" "}
            房间
          </button>
        )}
      {d.roomResolution?.roomId === d.position && (
        <p data-testid="dungeon-room-resolution">
          {d.roomResolution.kind === "dark"
            ? "Dark 光照降低已支付"
            : `Trap 已分配：${d.roomResolution.resolvedHeroIds.join("、") || "无"}`}
          {d.roomResolution.completed ? "；全员完成，保留代币" : "；仍需完成房间结算"}
          {d.roomResolution.kind !== "dark" && "；先压力，再对存活英雄结算分配伤口"}
          {d.roomResolution.pendingAllocation &&
            `；${d.roomResolution.pendingAllocation.heroId} 尚待 ${d.roomResolution.pendingAllocation.wounds} 伤口`}
        </p>
      )}
      {d.phase === "awaitingProvisions" && (
        <button
          disabled={!!pendingChoice}
          onClick={() => dispatch({ type: "rollDungeonProvisions" })}
        >
          掷开局补给骰
        </button>
      )}
      <button
        disabled={!!pendingChoice || d.phase !== "ready" || d.mustLeaveRoomId === d.position}
        onClick={() => dispatch({ type: "scoutDungeon" })}
      >
        侦察
      </button>{" "}
      <button
        disabled={!!pendingChoice || d.phase !== "ready"}
        onClick={() => dispatch({ type: "beginDungeonExploration" })}
      >
        选择下一段探索
      </button>{" "}
      <button
        disabled={!!pendingChoice || d.phase !== "ready"}
        onClick={() => dispatch({ type: "beginDungeonBacktrack" })}
      >
        原路返回
      </button>{" "}
      <button disabled={!canLeaveDungeon(game)} onClick={() => dispatch({ type: "leaveDungeon" })}>
        离开地牢
      </button>{" "}
      <button disabled={!canRestDungeon(game)} onClick={() => dispatch({ type: "restDungeon" })}>
        柴火休息
      </button>
      {canSetupForwardCamp(game) &&
        d
          .explorationSetup!.provisions.filter((p) => p.face === "torch" || p.face === "tool")
          .map((p) => (
            <button
              key={`forward-camp:${p.id}`}
              type="button"
              onClick={() => dispatch({ type: "setupForwardCamp", provisionId: p.id })}
            >
              设 forward camp（{p.face === "torch" ? "Torch" : "Shovel"}）
            </button>
          ))}
      {quest?.id === "quest:p012" && (
        <p data-testid="forward-camp-count">设营次数：{d.forwardCampSetups ?? 0}</p>
      )}
      <p data-testid="dungeon-firewood">
        {quest?.name ?? "任务"} 柴火：
        {d.rest?.used
          ? "已弃置"
          : d.rest
            ? `可用（${restPoints(d.rest.questId)}点）`
            : "无已核实柴火"}
      </p>
      {d.rest && (
        <p className="muted">
          休息时，每名英雄的 Life 和压力按各自分配总量恢复，相关怪癖各触发一次。
        </p>
      )}
      <p className="muted">原路返回不掷骰，每条已走过的边全员压力 +1；包含灰点、岔路与起点出入。</p>
      {d.phase === "awaitingHazards" && !d.exploration?.rolls && (
        <button
          disabled={!!pendingChoice}
          onClick={() => dispatch({ type: "rollDungeonExploration" })}
        >
          掷探索骰并开始结算
        </button>
      )}
      <p data-testid="dungeon-provision-count">
        公共补给（{d.explorationSetup!.provisions.length}/16）
      </p>
      <p data-testid="dungeon-status-stacks">
        {d.heroes
          .map(
            (h) =>
              `${h.id}：${
                (h.statusStacks ?? h.combat?.statusStacks)
                  ?.map((s) => `${s.kind} ${s.remaining}t`)
                  .join("、") || "无状态"
              }`,
          )
          .join("；")}
      </p>
      <p data-testid="dungeon-provisions">
        剩余补给：
        {(() => {
          const tallies = new Map<string, number>();
          for (const p of d.explorationSetup!.provisions) {
            tallies.set(p.face, (tallies.get(p.face) ?? 0) + 1);
          }
          const parts = [...tallies.entries()].map(([face, count]) =>
            formatProvisionInventoryLine(face, count),
          );
          return parts.join(" · ") || "无";
        })()}
      </p>
      <p data-testid="dungeon-gold">共享金币：{d.gold}</p>
      {quest?.id === "quest:p003" && (
        <p>Fundraiser最低目标：清理一间巢穴；未达目标可提前离开，保留金币并跳过捐献。</p>
      )}
      <QuestSummaryPanel
        game={game}
        dispatch={dispatch}
        formal={formal}
        pendingChoice={pendingChoice}
        events={events}
        commands={commands}
      />
      <fieldset>
        <legend>探索间补给</legend>
        <label>
          补给接收英雄
          <select
            aria-label="探索补给接收英雄"
            value={provisionTarget}
            onChange={(e) => setProvisionTarget(e.target.value)}
          >
            {d.heroes
              .filter((h) => !h.dead)
              .map((h) => (
                <option key={h.id} value={h.id}>
                  {h.id}
                </option>
              ))}
          </select>
        </label>
        {d
          .explorationSetup!.provisions.filter((p) => p.face !== "torch")
          .flatMap((p) =>
            PROVISION_EFFECTS[p.face].map((effect) => (
              <button
                key={`${p.id}:${effect}`}
                disabled={!dungeonProvisionWindow(d)}
                onClick={() =>
                  dispatch({
                    type: "useProvision",
                    provisionId: p.id,
                    targetId: provisionTarget,
                    effect,
                  })
                }
              >
                {formatProvisionUseButton(p.face, provisionEffectLabels[effect])}
              </button>
            )),
          )}
      </fieldset>
      {d.explorationSetup!.light < 5 &&
        d
          .explorationSetup!.provisions.filter((p) => p.face === "torch")
          .map((p) => (
            <button
              key={p.id}
              disabled={!dungeonProvisionWindow(d)}
              onClick={() =>
                dispatch({
                  type: "useProvision",
                  provisionId: p.id,
                  targetId: d.heroes.find((h) => !h.dead)!.id,
                  effect: "raiseLight",
                })
              }
            >
              使用火把：光照 +1
            </button>
          ))}
      {card && shownCurio && (
        <div className="panel" data-testid="dungeon-curio">
          <div className="dungeon-room-card-row">
            <CoreboxPrintCardFace deck="curio" cardId={card.id} label={card.name} />
            <div>
              <h3>
                Curio · {card.name} · p{card.source.page}
              </h3>
              <p>{card.text}</p>
              <p>
                按卡面行序结算，新疾病／怪癖影响后续行；死亡取消剩余效果和未发奖励。行间使用 Torch
                只改变光照。
              </p>
              <p>
                {shownCurio.heroId || "等待选择处理英雄"} · 抽卡前{" "}
                {shownCurio.protected ? "已使用 Torch" : "未使用 Torch"} · 牌池剩余{" "}
                {d.curio!.deck?.length ?? 24} · 弃牌 {d.curio!.discard.length}
              </p>
            </div>
          </div>
          <ul>
            {card.rows.map((r, i) => (
              <li key={i}>
                {r.effect
                  ? `${curioEffectLabel(r.effect)}${shownCurio.protected && isNegativeCurioEffect(r.effect) ? " · Torch 保护" : ""}`
                  : `${r.printed} · 待确认（${r.reason}）`}
              </li>
            ))}
          </ul>
          {d.phase === "awaitingCurio" && (
            <button
              disabled={!!pendingChoice}
              onClick={() => dispatch({ type: "resolveDungeonCurio" })}
            >
              结算当前 Curio
            </button>
          )}
          {d.curio!.active?.blockedReason && <p role="status">{d.curio!.active.blockedReason}</p>}
        </div>
      )}
      {d.exploration?.rolls && (
        <p data-testid="dungeon-rolls">
          {d.exploration.rolls
            .map((r) => `${r.id} ${r.face}${r.resolved ? "（已结算）" : "（待结算）"}`)
            .join(" · ")}
        </p>
      )}
      {d.campaignFailure && (
        <p>
          {d.campaignFailure === "insufficientWaitingHeroes"
            ? "英雄全灭，驿站等待英雄不足四人，战役失败（R9/R25）。"
            : "等待英雄代币耗尽，战役失败（R33）。"}
        </p>
      )}
      {d.heroes.some(
        (h) => h.dead && !d.preparedReplacements?.some((p) => p.deadHeroId === h.id),
      ) && (
        <button
          disabled={!!d.deathTrinketChoice || !!d.replacementPreparation || !!d.campaignFailure}
          onClick={() => dispatch({ type: "prepareReplacementHero" })}
        >
          准备驿站替补
        </button>
      )}
      {!!d.preparedReplacements?.length && (
        <button
          disabled={
            !!d.pending ||
            !!d.deathTrinketChoice ||
            !!d.replacementPreparation ||
            !!d.campaignFailure ||
            d.heroes.filter((h) => h.dead).length !== d.preparedReplacements.length
          }
          onClick={() => dispatch({ type: "joinPreparedReplacements" })}
        >
          让{d.preparedReplacements.length}名替补入队并继续
        </button>
      )}
      {pendingBlock}
      <p data-testid="dungeon-checkpoint">{dungeonFlowStep(game)}</p>
      <p data-testid="dungeon-events">
        {events
          .map((e) =>
            e.type === "resolveTested"
              ? `${e.entityId}：d10 ${e.roll}，${d.resolveCards.find((c) => c.id === e.cardId)?.name}，压力归零`
              : e.message,
          )
          .join("；")}
      </p>
      <p className="muted">
        命令 {commands.length} · 布置 RNG 游标 {d.cursor} · 探索按当前光照结算
      </p>
    </PanelTag>
  );
}
