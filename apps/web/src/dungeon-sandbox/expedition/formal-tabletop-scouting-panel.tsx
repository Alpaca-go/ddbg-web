import { CoreTrinketActions } from "../../core-trinket-actions";
import { useState } from "react";
import {
  canLeaveDungeon,
  canRestDungeon,
  canSetupForwardCamp,
  readRoomTile,
  PROVISION_EFFECTS,
  dungeonProvisionWindow,
} from "@ddbg/engine";
import type { DungeonState, GameState, PendingChoice } from "@ddbg/engine";
import { readBasicQuest } from "../../../../../packages/data/src/basic-quests";
import { restPoints } from "../../../../../packages/data/src/scout-rest";
import { CoreboxPrintCardFace } from "../../card-art/corebox-print-card-face";
import { MonsterCardFace } from "../../card-art/monster-card-face";
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
import {
  isNegativeCurioEffect,
  type CurioCard,
  type CurioEffect,
} from "../../../../../packages/data/src/curio";
import type { DungeonViewProps } from "../view-props";
import { dungeonFlowStep } from "../../tabletop/phase/dungeon-flow-step";
import { ReplacementHeroActions } from "./replacement-hero-actions";

function provisionTallyLine(d: NonNullable<GameState["dungeon"]>): string {
  const tallies = new Map<string, number>();
  for (const p of d.explorationSetup!.provisions) {
    tallies.set(p.face, (tallies.get(p.face) ?? 0) + 1);
  }
  const parts = [...tallies.entries()].map(([face, count]) =>
    formatProvisionInventoryLine(face, count),
  );
  return parts.join(" · ") || "无";
}

function CurioBlock({
  card,
  curio,
  phase,
  deckLength,
  discardLength,
  pendingChoice,
  dispatch,
  variant,
}: {
  readonly card: CurioCard;
  readonly curio: NonNullable<NonNullable<DungeonState["curio"]>["active"]>;
  readonly phase: DungeonState["phase"];
  readonly deckLength: number;
  readonly discardLength: number;
  readonly pendingChoice: PendingChoice | null | undefined;
  readonly dispatch: DungeonViewProps["dispatch"];
  readonly variant: "active" | "settled";
}) {
  if (!curio) return null;
  const testId = variant === "active" ? "dungeon-curio" : "dungeon-curio-settled";
  return (
    <div className="panel" data-testid={testId} data-curio-variant={variant}>
      <div className="dungeon-room-card-row">
        <CoreboxPrintCardFace deck="curio" cardId={card.id} label={card.name} />
        <div>
          <h3>
            {variant === "settled" ? "已结算 · " : ""}
            Curio · {card.name}
            {variant === "active" ? "" : ` · p${card.source.page}`}
          </h3>
          {variant === "active" && <p className="tt-curio-teaser">{card.text}</p>}
          {variant === "active" && (
            <p className="muted tt-curio-rules-hint">
              按卡面行序结算；死亡取消剩余效果。Torch 仅改变光照。
            </p>
          )}
          <p>
            {curio.heroId || "（无处理英雄记录）"} · 抽卡前{" "}
            {curio.protected ? "已使用 Torch" : "未使用 Torch"}
            {variant === "settled" && (
              <>
                {" "}
                · 牌池剩余 {deckLength} · 弃牌 {discardLength}
              </>
            )}
          </p>
        </div>
      </div>
      {variant === "active" && (
        <ul>
          {card.rows.map((r, i) => (
            <li key={i}>
              {r.effect
                ? `${curioEffectLabel(r.effect as CurioEffect)}${curio.protected && isNegativeCurioEffect(r.effect as CurioEffect) ? " · Torch 保护" : ""}`
                : `${r.printed} · 待确认（${r.reason}）`}
            </li>
          ))}
        </ul>
      )}
      {variant === "active" && phase === "awaitingCurio" && (
        <button
          disabled={!!pendingChoice}
          onClick={() => dispatch({ type: "resolveDungeonCurio" })}
        >
          结算当前 Curio
        </button>
      )}
      {variant === "active" && curio.blockedReason && <p role="status">{curio.blockedReason}</p>}
      {variant === "settled" && (
        <details>
          <summary>查看 Curio 卡面全文与行效果</summary>
          <p>{card.text}</p>
          <ul>
            {card.rows.map((r, i) => (
              <li key={i}>
                {r.effect
                  ? curioEffectLabel(r.effect as CurioEffect)
                  : `${r.printed} · 待确认（${r.reason}）`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function FormalTabletopScoutingPanel({
  game,
  dispatch,
  events,
  commands,
  pendingChoice,
}: Pick<DungeonViewProps, "game" | "dispatch" | "events" | "commands"> & {
  readonly pendingChoice: PendingChoice | null | undefined;
}) {
  const [provisionTarget, setProvisionTarget] = useState("hero-0");
  const d = game.dungeon!;
  const currentRoom = d.rooms.find((r) => r.id === d.position);
  const quest = readBasicQuest(d.questDistribution);

  const activeCurio = d.curio?.active;
  const activeCurioCard = activeCurio
    ? d.curio!.cards.find((c) => c.id === activeCurio.cardId)
    : undefined;
  const lastCurio = d.curio?.last;
  const lastCurioCard = lastCurio
    ? d.curio!.cards.find((c) => c.id === lastCurio.cardId)
    : undefined;

  const pendingRolls =
    d.exploration?.rolls?.filter((r) => !r.resolved).map((r) => `${r.id} ${r.face}（待结算）`) ??
    [];
  const settledRolls =
    d.exploration?.rolls?.filter((r) => r.resolved).map((r) => `${r.id} ${r.face}（已结算）`) ?? [];

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

  const eventLine = events
    .map((e) =>
      e.type === "resolveTested"
        ? `${e.entityId}：d10 ${e.roll}，${d.resolveCards.find((c) => c.id === e.cardId)?.name}，压力归零`
        : e.message,
    )
    .join("；");

  return (
    <div className="tt-scouting-tabletop panel">
      <CoreTrinketActions game={game} send={dispatch} />
      <div className="tt-scouting-tabletop__decisions" data-testid="dungeon-exploration-decisions">
        <DungeonStanceOrder game={game} dispatch={dispatch} />
        {d.mustLeaveRoomId === d.position && (
          <p className="tt-alert" role="status">
            战斗按逃跑收尾：本房间未清理，须先离开才能再次进入（R25）。
          </p>
        )}
        {pendingBlock}
        {d.phase === "blockedPressure" && (
          <button onClick={() => dispatch({ type: "resolveDungeonPressure" })}>恢复意志检定</button>
        )}
        {d.roomResolution?.roomId === d.position && (
          <p data-testid="dungeon-room-resolution" className="tt-alert" role="status">
            {d.roomResolution.kind === "dark"
              ? "Dark 光照降低已支付"
              : `Trap 已分配：${d.roomResolution.resolvedHeroIds.join("、") || "无"}`}
            {d.roomResolution.completed ? "；全员完成，保留代币" : "；仍需完成房间结算"}
            {d.roomResolution.kind !== "dark" && "；先压力，再对存活英雄结算分配伤口"}
            {d.roomResolution.pendingAllocation &&
              `；${d.roomResolution.pendingAllocation.heroId} 尚待 ${d.roomResolution.pendingAllocation.wounds} 伤口`}
          </p>
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
                    <h3>{roomCard.name}</h3>
                    {active.tileId && selectedTile.status === "matched" && (
                      <p>
                        已匹配 {selectedTile.tile.name}，{selectedTile.tile.areas.length} 个区域。
                      </p>
                    )}
                    <p role="status">{active.blockedReason}</p>
                  </div>
                </div>
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
                    {d.monsterPool.active.monsters.map((m) => {
                      const card = d.monsterPool!.cards.find((c) => c.combatCardId === m.cardId)!;
                      return (
                        <div key={m.instanceId} className="dungeon-monster-deploy-row">
                          <MonsterCardFace
                            monsterCardId={card.combatCardId}
                            label={card.name}
                            size="chip"
                          />
                          <p>
                            {card.name} · {m.instanceId} → {m.areaId}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        {activeCurioCard && activeCurio && (
          <CurioBlock
            card={activeCurioCard}
            curio={activeCurio}
            phase={d.phase}
            deckLength={d.curio!.deck?.length ?? 24}
            discardLength={d.curio!.discard.length}
            pendingChoice={pendingChoice}
            dispatch={dispatch}
            variant="active"
          />
        )}
        {pendingRolls.length > 0 && (
          <p data-testid="dungeon-rolls" className="tt-alert" role="status">
            {pendingRolls.join(" · ")}
          </p>
        )}
        <ReplacementHeroActions game={game} dispatch={dispatch} />
      </div>

      <div className="tt-scouting-tabletop__commands" data-testid="dungeon-exploration-commands">
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
        {d.darkest &&
          d.phase === "awaitingRoom" &&
          !pendingChoice &&
          currentRoom?.kind === "empty" &&
          !currentRoom.cleared && (
            <button onClick={() => dispatch({ type: "resolveDungeonRoom" })}>
              结算挖掘点：补给与免费休息
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
        </button>
        <button
          disabled={!!pendingChoice || d.phase !== "ready"}
          onClick={() => dispatch({ type: "beginDungeonExploration" })}
        >
          选择下一段探索
        </button>
        <button
          disabled={!!pendingChoice || d.phase !== "ready"}
          onClick={() => dispatch({ type: "beginDungeonBacktrack" })}
        >
          原路返回
        </button>
        <button
          disabled={!canLeaveDungeon(game)}
          onClick={() => dispatch({ type: "leaveDungeon" })}
        >
          离开地牢
        </button>
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
        {d.phase === "awaitingHazards" && !d.exploration?.rolls && (
          <button
            disabled={!!pendingChoice}
            onClick={() => dispatch({ type: "rollDungeonExploration" })}
          >
            掷探索骰并开始结算
          </button>
        )}
        {quest?.id === "quest:p003" && (
          <p className="muted">Fundraiser：未达巢穴目标可提前离开并跳过捐献。</p>
        )}
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
      </div>

      <details className="tt-scouting-tabletop__archive" data-testid="dungeon-exploration-archive">
        <summary>探索记录与牌池（只读，不代替当前决策）</summary>
        <p data-testid="dungeon-checkpoint">{dungeonFlowStep(game)}</p>
        <p data-testid="dungeon-bonus">
          下一次探索：每人 {(d.mode === "radiant" ? 1 : 2) - (d.scoutBonus ? 1 : 0)} 骰 · {d.mode}
        </p>
        <p data-testid="dungeon-firewood">
          {quest?.name ?? "任务"} 柴火：
          {(d.darkest?.excavation?.originalRest ?? d.rest)?.used
            ? "已弃置"
            : d.rest
              ? `可用（${restPoints(d.rest.questId)}点）`
              : "无已核实柴火"}
        </p>
        <p data-testid="dungeon-provision-count">
          公共补给（{d.explorationSetup!.provisions.length}/16）
        </p>
        <p data-testid="dungeon-provisions">剩余补给：{provisionTallyLine(d)}</p>
        <p data-testid="dungeon-gold">共享金币：{d.gold}</p>
        <p data-testid="dungeon-pressure">
          {d.heroes
            .map(
              (h) =>
                `${h.id} 压力 ${h.stress} · 伤口 ${h.wounds}/${h.life}${h.dead ? "（阵亡）" : ""}`,
            )
            .join(" · ")}
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
        {settledRolls.length > 0 && (
          <p data-testid="dungeon-rolls-settled">{settledRolls.join(" · ")}</p>
        )}
        {lastCurioCard && lastCurio && (
          <CurioBlock
            card={lastCurioCard}
            curio={lastCurio}
            phase={d.phase}
            deckLength={d.curio!.deck?.length ?? 24}
            discardLength={d.curio!.discard.length}
            pendingChoice={pendingChoice}
            dispatch={dispatch}
            variant="settled"
          />
        )}
        {d.roomCards?.active &&
          (() => {
            const active = d.roomCards.active;
            const roomCard = d.roomCards.cards.find((c) => c.id === active.cardId)!;
            const selectedTile = readRoomTile(roomCard, active.tileId);
            return (
              <details>
                <summary>房间牌池与印刷转录（{roomCard.name}）</summary>
                <p>
                  完整遗迹房间牌池 9 张 · 余牌 {d.roomCards.deck!.length} · 印刷页{" "}
                  {roomCard.source.page}
                </p>
                {active.tileId && selectedTile.status === "matched" && (
                  <p>
                    部署：英雄{" "}
                    {[...new Set(Object.values(selectedTile.deployment.heroes))].join(" / ")}；怪物{" "}
                    {[...new Set(Object.values(selectedTile.deployment.monsters))].join(" / ")}
                  </p>
                )}
                {roomCard.printedLines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </details>
            );
          })()}
        {d.monsterPool?.active && (
          <p>
            怪物池余牌 {d.monsterPool.remaining!.length} · 弃牌 {d.monsterPool.discarded.length}
          </p>
        )}
        {eventLine ? (
          <p data-testid="dungeon-events">{eventLine}</p>
        ) : (
          <p data-testid="dungeon-events" className="muted">
            暂无本回合事件文本（完整记录见顶栏「日志」）。
          </p>
        )}
        <p className="muted">
          命令 {commands.length} · 布置 RNG 游标 {d.cursor} · 探索按当前光照结算
        </p>
      </details>
    </div>
  );
}
