import type { ApplyResult, Command, GameEvent, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { nextProvisionFace, PROVISION_FACES, PROVISION_LABELS } from "./loot";
import type { ProvisionFace } from "./loot";
import { beginTravelingMerchantsChoice } from "./hamlet-traveling-merchants";
import {
  beginWarmUpProvisionTorchChoice,
  finishStartingProvisionsToExploration,
} from "./warm-up-starting-provisions";
import { isQuestProvisionId, questStartingProvisionOverflow } from "./quest-provisions";
import { scoutAheadPlanProblem } from "./hamlet-scout-ahead";
import { readFinalBattlePlanAfterDarkestVictory } from "./boss/darkest-content";
import { rejectBattleCommand } from "./battle";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

function baseProvisionIds() {
  return STANCES.flatMap((stance) =>
    [0, 1].map((i) => `dungeon-starting-provision:${stance}:${i}`),
  );
}

function bonusProvisionId(heroId: string, index: number) {
  return `dungeon-bonus-provision:${heroId}:${index}`;
}

function finishQuestProvisionFlow(state: GameState, events: GameEvent[]): ApplyResult {
  const d = state.dungeon!;
  if (d.nextQuestProvisionFaceChoice) {
    const merchant = beginTravelingMerchantsChoice({ ...state, dungeon: { ...d, pending: null } });
    return { ...merchant, events: [...events, ...merchant.events] };
  }
  if (d.warmUpStartingProvisionTorchChoice) {
    return beginWarmUpProvisionTorchChoice({ ...state, dungeon: { ...d, pending: null } }, events);
  }
  return finishStartingProvisionsToExploration(
    { ...state, dungeon: { ...d, pending: null } },
    events,
    "开局补给已入公共池，可以开始探索（R12/R-041）",
  );
}

function beginProvisionDiscard(state: GameState, events: GameEvent[]): ApplyResult {
  const d = state.dungeon!;
  const info = d.provisionDiscard;
  if (!info) return rejectBattleCommand(state, "缺少待丢弃补给上下文（Q-142 / R-205）");
  const options = d
    .explorationSetup!.provisions.filter((provision) => !isQuestProvisionId(provision.id))
    .map((provision) => ({ id: provision.id, label: PROVISION_LABELS[provision.face] }));
  if (!options.length)
    return rejectBattleCommand(state, "补给池已满但没有可丢弃的既有补给（R-205）");
  const pending = {
    id: `dungeon-provision-discard:${d.decision}`,
    prompt: `补给池将超过 16：选择要丢弃的既有补给（还需 ${info.remaining} 个；任务补给不可丢弃）`,
    options,
  };
  return {
    state: { ...state, dungeon: { ...d, pending, decision: d.decision + 1 } },
    events,
    pendingChoice: pending,
  };
}

/** R-205：任务补给溢出时由玩家选择丢弃哪些既有补给。 */
export function chooseProvisionDiscard(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const d = state.dungeon;
  const info = d?.provisionDiscard;
  if (
    !d ||
    !info ||
    d.pending?.id !== choiceId ||
    !d.pending.options.some((option) => option.id === optionId)
  )
    return rejectBattleCommand(state, "丢弃补给的选择无效（R-205）");
  const provisions = d.explorationSetup!.provisions.filter(
    (provision) => provision.id !== optionId,
  );
  if (provisions.length === d.explorationSetup!.provisions.length)
    return rejectBattleCommand(state, "选择的补给不在公共池中（R-205）");
  const remaining = info.remaining - 1;
  const nextDungeon = {
    ...d,
    explorationSetup: { ...d.explorationSetup!, provisions },
    provisionDiscard: { ...info, remaining },
  };
  const nextState: GameState = { ...state, dungeon: nextDungeon };
  const discardedEvent: GameEvent = {
    type: "dungeonUpdated",
    message: `补给池超过 16：丢弃既有补给 ${optionId}（R-205）`,
  };
  if (remaining > 0) return beginProvisionDiscard(nextState, [discardedEvent]);
  const { provisionDiscard: _finishedDiscard, ...finishedDungeon } = nextDungeon;
  void _finishedDiscard;
  const finalState: GameState = {
    ...nextState,
    dungeon: {
      ...finishedDungeon,
      pending: null,
      explorationSetup: {
        ...nextDungeon.explorationSetup!,
        provisions: [...provisions, ...info.questItems],
      },
    },
  };
  return finishQuestProvisionFlow(finalState, [
    discardedEvent,
    {
      type: "dungeonUpdated",
      message: `补给池已满 16：按玩家选择丢弃既有补给后加入任务补给（R-197 / R-205）`,
    },
  ]);
}

/** R12/R37：常规八颗；R-087掷前取消两颗。Wild/Radiant自选不消费RNG，R-041奖励逐颗加入至16。 */
export function setupDungeonProvisions(
  state: GameState,
  command: Extract<Command, { type: "rollDungeonProvisions" | "resolveChoice" }>,
): ApplyResult {
  const d = state.dungeon;
  const final = d?.finalBattleProvisions === "awaiting";
  const refuse = (): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message: "地牢开局补给上下文或选择无效（R12）" }],
  });
  if (
    !d ||
    (final && !readFinalBattlePlanAfterDarkestVictory(d)) ||
    scoutAheadPlanProblem(d.nextQuestRoomReveals) ||
    state.battle ||
    (final
      ? d.phase !== "inHamlet" ||
        !d.hamlet?.finalPreparation ||
        d.hamlet.phase !== "preparationComplete"
      : d.phase !== "awaitingProvisions") ||
    !d.explorationSetup ||
    ![4, 5].includes(d.explorationSetup.light) ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    !Number.isSafeInteger(d.cursor + 16) ||
    (d.mode !== "standard" && d.mode !== "radiant" && d.mode !== "stygian") ||
    (!final && d.layout.nodes.find((n) => n.id === d.position)?.kind !== "start") ||
    d.heroes.length !== 4 ||
    new Set(d.heroes.map((h) => h.id)).size !== 4 ||
    d.heroes.some((h) => !h.id || h.dead) ||
    STANCES.some((stance) => d.heroes.filter((h) => h.stance === stance).length !== 1) ||
    (!final && (d.exploration || d.questSummary || d.rooms.some((r) => r.revealed || r.cleared)))
  )
    return refuse();
  const omitted = d.startingProvisionOmittedIds ?? [];
  if (d.nextQuestPartyProvisionDice !== undefined && d.nextQuestPartyProvisionDice !== 2)
    return refuse();
  if (
    d.heroes.some(
      (h) =>
        h.nextQuestProvisionDice !== undefined &&
        (!Number.isSafeInteger(h.nextQuestProvisionDice) ||
          h.nextQuestProvisionDice < 0 ||
          !Number.isSafeInteger(h.nextQuestProvisionDice + 8)),
    )
  )
    return refuse();
  if (
    !Array.isArray(omitted) ||
    omitted.length > 2 ||
    new Set(omitted).size !== omitted.length ||
    omitted.some((id) => !baseProvisionIds().includes(id)) ||
    (d.nextQuestLostShipment !== undefined && d.nextQuestLostShipment !== true) ||
    (!d.nextQuestLostShipment && omitted.length !== 0 && omitted.length !== 2)
  )
    return refuse();
  if (d.nextQuestLostShipment) {
    if (
      d.explorationSetup.provisions.length ||
      d.startingProvisionChoices ||
      omitted.length >= 2 ||
      !Number.isSafeInteger(d.decision + 2)
    )
      return refuse();
    let cancelled = omitted;
    let cancelledLabel: string | undefined;
    if (command.type === "rollDungeonProvisions") {
      if (d.pending || omitted.length) return refuse();
    } else {
      if (
        !d.pending?.id.startsWith("dungeon-lost-shipment:") ||
        d.pending.id !== command.choiceId ||
        d.pending.actorId !== "party" ||
        !d.pending.options.some((o) => o.id === command.optionId) ||
        !baseProvisionIds().includes(command.optionId) ||
        omitted.includes(command.optionId)
      )
        return refuse();
      cancelled = [...omitted, command.optionId];
      cancelledLabel = d.pending.options.find((o) => o.id === command.optionId)!.label;
    }
    if (cancelled.length === 2) {
      const { nextQuestLostShipment: _plan, ...remaining } = d;
      void _plan;
      const rolled = setupDungeonProvisions(
        {
          ...state,
          dungeon: { ...remaining, pending: null, startingProvisionOmittedIds: cancelled },
        },
        { type: "rollDungeonProvisions" },
      );
      return rolled.events.some((e) => e.type === "commandRefused")
        ? refuse()
        : {
            ...rolled,
            events: [
              {
                type: "dungeonUpdated",
                message: `Lost Shipment：${cancelledLabel}；两颗取消完成（R-087）`,
              },
              ...rolled.events,
            ],
          };
    }
    const pending = {
      id: `dungeon-lost-shipment:${d.decision}`,
      actorId: "party",
      prompt: `Lost Shipment：掷骰前取消第${cancelled.length + 1}颗常规补给（共2颗，R-087）`,
      options: STANCES.flatMap((stance, i) =>
        [0, 1].flatMap((index) => {
          const id = `dungeon-starting-provision:${stance}:${index}`;
          return cancelled.includes(id)
            ? []
            : [
                {
                  id,
                  label: `取消${["进攻", "防御", "远程", "支援"][i]}姿态英雄的第${index + 1}颗${d.mode === "radiant" && index === 1 ? "自选骰" : "掷出骰"}`,
                },
              ];
        }),
      ),
    };
    return {
      state: {
        ...state,
        dungeon: {
          ...d,
          startingProvisionOmittedIds: cancelled,
          pending,
          decision: d.decision + 1,
        },
      },
      events: [
        {
          type: "dungeonUpdated",
          message: `${cancelledLabel ? `Lost Shipment：${cancelledLabel}；` : ""}${pending.prompt}`,
        },
      ],
      pendingChoice: pending,
    };
  }
  const finish = (next: DungeonState, events: readonly GameEvent[]): ApplyResult => {
    const first = next.startingProvisionChoices?.[0];
    if (first) {
      const pending = {
        id: `dungeon-starting-provisions:${next.decision}`,
        actorId: first.actorId,
        prompt: `开局补给：${first.actorId}选择骰面（Wild / Radiant自选）`,
        options: PROVISION_FACES.map((face) => ({ id: face, label: PROVISION_LABELS[face] })),
      };
      return {
        state: {
          ...state,
          dungeon: {
            ...next,
            pending,
            decision: next.decision + 1,
            phase: final ? "inHamlet" : "awaitingProvisions",
          },
        },
        events,
        pendingChoice: pending,
      };
    }
    const { startingProvisionOmittedIds: _omitted, ...completed } = next;
    void _omitted;
    if (final)
      return {
        state: {
          ...state,
          dungeon: {
            ...completed,
            pending: null,
            phase: "inHamlet",
            finalBattleProvisions: "ready",
            decision: next.decision + 1,
          },
        },
        events: [
          ...events,
          {
            type: "dungeonUpdated",
            message: "最终战补给已入公共池；等待最终战部署，不进入地牢探索（R36）",
          },
        ],
      };
    const questInfo = questStartingProvisionOverflow(completed);
    if (questInfo.overflow > 0) {
      return beginProvisionDiscard(
        {
          ...state,
          dungeon: {
            ...completed,
            pending: null,
            provisionDiscard: {
              questItems: questInfo.questItems,
              remaining: questInfo.overflow,
            },
          },
        },
        [
          ...events,
          {
            type: "dungeonUpdated",
            message: `任务补给（R-197）：将加入 ${questInfo.questItems.length} 个；补给池将超过 16，需要丢弃 ${questInfo.overflow} 个既有补给（R-205）`,
          },
        ],
      );
    }
    const questedDungeon: DungeonState = questInfo.questItems.length
      ? {
          ...completed,
          explorationSetup: {
            ...completed.explorationSetup!,
            provisions: [...questInfo.provisions, ...questInfo.questItems],
          },
        }
      : completed;
    const questEvents: GameEvent[] = questInfo.questItems.length
      ? [
          {
            type: "dungeonUpdated",
            message: `任务补给（R-197）：加入 ${questInfo.questItems.length} 个（不可丢弃）`,
          },
        ]
      : [];
    return finishQuestProvisionFlow({ ...state, dungeon: { ...questedDungeon, pending: null } }, [
      ...events,
      ...questEvents,
    ]);
  };
  const provisions = d.explorationSetup.provisions;
  if (command.type === "rollDungeonProvisions") {
    if (d.pending || (d.startingProvisionChoices?.length ?? 0) || provisions.length)
      return refuse();
    const pool: { id: string; face: ProvisionFace }[] = [];
    const choices: { id: string; actorId: string }[] = [];
    const events: GameEvent[] = [];
    let cursor = d.cursor;
    for (const stance of STANCES) {
      const actorId = d.heroes.find((h) => h.stance === stance)!.id;
      for (let index = 0; index < 2; index++) {
        const id = `dungeon-starting-provision:${stance}:${index}`;
        if (omitted.includes(id)) continue;
        if (d.mode === "radiant" && index === 1) {
          choices.push({ id, actorId });
          continue;
        }
        const face = nextProvisionFace(state.seed, cursor++);
        events.push({
          type: "provisionRolled",
          actorId,
          face,
          message: `地牢开局补给：${face === "wild" ? "Wild，待选面" : PROVISION_LABELS[face]}`,
        });
        if (face === "wild") choices.push({ id, actorId });
        else pool.push({ id, face });
      }
    }
    // R-041：常规每人2颗之后，按姿态顺序逐颗加入奖励骰；满16停，多余作废；奖励不受Radiant自选影响。
    let remainingSlots = 16 - (pool.length + choices.length);
    const heroes = d.heroes.map((hero) => {
      const bonus = hero.nextQuestProvisionDice;
      if (bonus === undefined) return hero;
      for (let index = 0; index < bonus; index++) {
        if (remainingSlots <= 0) break;
        const id = bonusProvisionId(hero.id, index);
        const face = nextProvisionFace(state.seed, cursor++);
        events.push({
          type: "provisionRolled",
          actorId: hero.id,
          face,
          message: `奖励补给骰：${face === "wild" ? "Wild，待选面" : PROVISION_LABELS[face]}（R-041）`,
        });
        if (face === "wild") choices.push({ id, actorId: hero.id });
        else pool.push({ id, face });
        remainingSlots -= 1;
      }
      const { nextQuestProvisionDice: _removed, ...rest } = hero;
      void _removed;
      return rest;
    });
    // Supply Run是队伍奖励，不借用任一英雄身份；Wild由队伍选择，不受Radiant自选影响。
    for (
      let index = 0;
      index < (d.nextQuestPartyProvisionDice ?? 0) && remainingSlots > 0;
      index++
    ) {
      const id = `dungeon-party-provision:${index}`;
      const face = nextProvisionFace(state.seed, cursor++);
      events.push({
        type: "provisionRolled",
        actorId: "party",
        face,
        message: `Supply Run队伍奖励补给骰：${face === "wild" ? "Wild，待选面" : PROVISION_LABELS[face]}（R-085）`,
      });
      if (face === "wild") choices.push({ id, actorId: "party" });
      else pool.push({ id, face });
      remainingSlots--;
    }
    const { nextQuestPartyProvisionDice: _partyDice, ...consumed } = d;
    void _partyDice;
    return finish(
      {
        ...consumed,
        cursor,
        heroes,
        startingProvisionChoices: choices,
        explorationSetup: { ...d.explorationSetup, provisions: pool },
      },
      events,
    );
  }
  const choices = d.startingProvisionChoices;
  const first = choices?.[0];
  const ids = [...provisions.map((p) => p.id), ...(choices ?? []).map((p) => p.id)];
  const expectedBase = baseProvisionIds().filter((id) => !omitted.includes(id));
  const bonusIds = ids.filter((id) => id.startsWith("dungeon-bonus-provision:"));
  const partyIds = ["dungeon-party-provision:0", "dungeon-party-provision:1"];
  if (
    !first ||
    !d.pending ||
    command.choiceId !== d.pending.id ||
    !d.pending.id.startsWith("dungeon-starting-provisions:") ||
    d.pending.actorId !== first.actorId ||
    !PROVISION_FACES.includes(command.optionId as ProvisionFace) ||
    !d.pending.options.some((o) => o.id === command.optionId) ||
    ids.length < expectedBase.length ||
    ids.length > 16 ||
    new Set(ids).size !== ids.length ||
    expectedBase.some((id) => !ids.includes(id)) ||
    ids.some(
      (id) => !expectedBase.includes(id) && !bonusIds.includes(id) && !partyIds.includes(id),
    ) ||
    bonusIds.some((id) => !/^dungeon-bonus-provision:[^:]+:\d+$/.test(id)) ||
    provisions.some((p) => !PROVISION_FACES.includes(p.face)) ||
    choices!.some((c) =>
      partyIds.includes(c.id) ? c.actorId !== "party" : !d.heroes.some((h) => h.id === c.actorId),
    )
  )
    return refuse();
  return finish(
    {
      ...d,
      startingProvisionChoices: choices!.slice(1),
      explorationSetup: {
        ...d.explorationSetup,
        provisions: [...provisions, { id: first.id, face: command.optionId as ProvisionFace }],
      },
    },
    [
      {
        type: "provisionSelected",
        actorId: first.actorId,
        face: command.optionId as ProvisionFace,
        message: "地牢开局补给已选面，未重掷骰",
      },
    ],
  );
}
