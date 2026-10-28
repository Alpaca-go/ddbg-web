import type { ApplyResult, Command, GameEvent, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { nextProvisionFace, PROVISION_FACES, PROVISION_LABELS } from "./loot";
import type { ProvisionFace } from "./loot";
import { beginTravelingMerchantsChoice } from "./hamlet-traveling-merchants";
import { beginScoutAheadReveal, scoutAheadPlanProblem } from "./hamlet-scout-ahead";
import { applyBossThreatStressOnDungeonEntry } from "./boss/threat-passive-runtime";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

function baseProvisionIds() {
  return STANCES.flatMap((stance) =>
    [0, 1].map((i) => `dungeon-starting-provision:${stance}:${i}`),
  );
}

function bonusProvisionId(heroId: string, index: number) {
  return `dungeon-bonus-provision:${heroId}:${index}`;
}

/** R12/R37：常规八颗；R-087掷前取消两颗。Wild/Radiant自选不消费RNG，R-041奖励逐颗加入至16。 */
export function setupDungeonProvisions(
  state: GameState,
  command: Extract<Command, { type: "rollDungeonProvisions" | "resolveChoice" }>,
): ApplyResult {
  const d = state.dungeon;
  const refuse = (): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message: "地牢开局补给上下文或选择无效（R12）" }],
  });
  if (
    !d ||
    scoutAheadPlanProblem(d.nextQuestRoomReveals) ||
    state.battle ||
    d.phase !== "awaitingProvisions" ||
    !d.explorationSetup ||
    ![4, 5].includes(d.explorationSetup.light) ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    !Number.isSafeInteger(d.cursor + 16) ||
    (d.mode !== "standard" && d.mode !== "radiant") ||
    d.layout.nodes.find((n) => n.id === d.position)?.kind !== "start" ||
    d.heroes.length !== 4 ||
    new Set(d.heroes.map((h) => h.id)).size !== 4 ||
    d.heroes.some((h) => !h.id || h.dead) ||
    STANCES.some((stance) => d.heroes.filter((h) => h.stance === stance).length !== 1) ||
    d.exploration ||
    d.questSummary ||
    d.rooms.some((r) => r.revealed || r.cleared)
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
            phase: "awaitingProvisions",
          },
        },
        events,
        pendingChoice: pending,
      };
    }
    const { startingProvisionOmittedIds: _omitted, ...completed } = next;
    void _omitted;
    if (completed.nextQuestProvisionFaceChoice) {
      const merchant = beginTravelingMerchantsChoice({
        ...state,
        dungeon: { ...completed, pending: null },
      });
      return {
        ...merchant,
        events: [...events, ...merchant.events],
      };
    }
    const ready: ApplyResult = {
      state: {
        ...state,
        dungeon: {
          ...completed,
          pending: null,
          decision: next.decision + 1,
          phase: "ready",
        },
      },
      events: [
        ...events,
        {
          type: "dungeonUpdated" as const,
          message: "开局补给已入公共池，可以开始探索（R12/R-041）",
        },
      ],
    };
    const revealed = beginScoutAheadReveal(ready.state);
    const entryThreat = applyBossThreatStressOnDungeonEntry(revealed.state);
    if (entryThreat.events.some((e) => e.type === "commandRefused")) {
      return {
        ...entryThreat,
        events: [...ready.events, ...revealed.events, ...entryThreat.events],
      };
    }
    return {
      ...entryThreat,
      events: [...ready.events, ...revealed.events, ...entryThreat.events],
    };
  };
  const provisions = d.explorationSetup.provisions;
  if (command.type === "rollDungeonProvisions") {
    if (d.pending || d.startingProvisionChoices || provisions.length) return refuse();
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
