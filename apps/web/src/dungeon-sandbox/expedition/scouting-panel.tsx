import { useState } from "react";
import {
  canLeaveDungeon,
  canRestDungeon,
  readRoomTile,
  PROVISION_EFFECTS,
  dungeonProvisionWindow,
} from "@ddbg/engine";
import type { PendingChoice } from "@ddbg/engine";
import { readBasicQuest } from "../../../../../packages/data/src/basic-quests";
import { CoreboxPrintCardFace } from "../../card-art/corebox-print-card-face";
import { RoomCardFace } from "../../card-art/room-card-face";
import { DungeonStanceOrder } from "../../dungeon-stance-order";
import { provisionLabels, provisionEffectLabels } from "../../provision-labels";
import { curioEffectLabel } from "../curio-effect-label";
import { FundraiserChoice } from "../fundraiser-choice";
import { QuestSummaryPanel } from "../quest-return/quest-summary-panel";
import type { DungeonViewProps } from "../view-props";
import { isNegativeCurioEffect } from "../../../../../packages/data/src/curio";

export function ScoutingPanel({
  game,
  dispatch,
  events,
  commands,
  formal,
  pendingChoice,
  surface = "exploration",
  showQuestSummary = false,
}: DungeonViewProps & {
  pendingChoice: PendingChoice | null | undefined;
  surface?: "expeditionPrep" | "exploration";
  showQuestSummary?: boolean;
}) {
  const [provisionTarget, setProvisionTarget] = useState("hero-0");
  const d = game.dungeon!;
  const currentRoom = d.rooms.find((r) => r.id === d.position);
  const quest = readBasicQuest(d.questDistribution);
  const shownCurio = d.curio?.active ?? d.curio?.last;
  const card = d.curio?.cards.find((c) => c.id === shownCurio?.cardId);
  const expeditionPrep = surface === "expeditionPrep";
  const exploration = surface === "exploration";
  return (
    <section className="panel scouting-panel">
      <h2>{expeditionPrep ? "出征准备" : "侦察流程"}</h2>
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
      {d.phase === "blockedPressure" && exploration && (
        <button onClick={() => dispatch({ type: "resolveDungeonPressure" })}>恢复意志检定</button>
      )}
      {exploration &&
        d.phase === "awaitingRoom" &&
        !pendingChoice &&
        (currentRoom?.kind === "lair" ||
          currentRoom?.kind === "treasure" ||
          (currentRoom?.kind === "curio" &&
            d.curioRoom?.roomId === d.position &&
            d.curioRoom.stage === "guarded")) &&
        !d.roomCards?.active && (
          <button onClick={() => dispatch({ type: "prepareDungeonBattle" })}>
            抽房间牌并匹配战斗板块
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
      {exploration &&
        d.phase === "awaitingRoom" &&
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
      {exploration && d.roomResolution?.roomId === d.position && (
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
      {exploration && (
        <>
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
          <button
            disabled={!canLeaveDungeon(game)}
            onClick={() => dispatch({ type: "leaveDungeon" })}
          >
            离开地牢
          </button>{" "}
          <button
            disabled={!canRestDungeon(game)}
            onClick={() => dispatch({ type: "restDungeon" })}
          >
            柴火休息
          </button>
          {d.rest && (
            <p className="muted">
              休息时，每名英雄的 Life 和压力按各自分配总量恢复，相关怪癖各触发一次。
            </p>
          )}
          <p className="muted">
            原路返回不掷骰，每条已走过的边全员压力 +1；包含灰点、岔路与起点出入。
          </p>
          {d.phase === "awaitingHazards" && !d.exploration?.rolls && (
            <button
              disabled={!!pendingChoice}
              onClick={() => dispatch({ type: "rollDungeonExploration" })}
            >
              掷探索骰并开始结算
            </button>
          )}
          {quest?.id === "quest:p003" && (
            <p>Fundraiser最低目标：清理一间巢穴；未达目标可提前离开，保留金币并跳过捐献。</p>
          )}
        </>
      )}
      {showQuestSummary && (
        <QuestSummaryPanel
          game={game}
          dispatch={dispatch}
          formal={formal}
          pendingChoice={pendingChoice}
          events={events}
          commands={commands}
          includeHamletEvent={false}
        />
      )}
      {exploration && (
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
                  {provisionLabels[p.face]}（{p.id}）：{provisionEffectLabels[effect]}
                </button>
              )),
            )}
        </fieldset>
      )}
      {exploration &&
        d.explorationSetup!.light < 5 &&
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
              使用 Torch（{p.id}）：光照 +1
            </button>
          ))}
      {exploration && card && shownCurio && (
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
      {exploration && d.exploration?.rolls && (
        <p data-testid="dungeon-rolls">
          {d.exploration.rolls
            .map((r) => `${r.id} ${r.face}${r.resolved ? "（已结算）" : "（待结算）"}`)
            .join(" · ")}
        </p>
      )}
      {exploration && d.campaignFailure && (
        <p>
          {d.campaignFailure === "insufficientWaitingHeroes"
            ? "英雄全灭，驿站等待英雄不足四人，战役失败（R9/R25）。"
            : "等待英雄代币耗尽，战役失败（R33）。"}
        </p>
      )}
      {exploration &&
        d.heroes.some(
          (h) => h.dead && !d.preparedReplacements?.some((p) => p.deadHeroId === h.id),
        ) && (
          <button
            disabled={!!d.deathTrinketChoice || !!d.replacementPreparation || !!d.campaignFailure}
            onClick={() => dispatch({ type: "prepareReplacementHero" })}
          >
            准备驿站替补
          </button>
        )}
      {exploration && !!d.preparedReplacements?.length && (
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
      {pendingChoice && (
        <div>
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
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </section>
  );
}
