import type { ApplyResult, GameEvent, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import type { DungeonState } from "./dungeon";
import { beginScoutAheadReveal } from "./hamlet-scout-ahead";
import { applyBossThreatStressOnDungeonEntry } from "./boss/threat-passive-runtime";
import { heroStartingProvisionIds } from "./starting-provision-hero-ids";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

/** 开局补给与 Wild/Radiant 选面全部完成后，进入探索前调用（QUEST p11 SPECIAL）。 */
export function finishStartingProvisionsToExploration(
  state: GameState,
  priorEvents: readonly GameEvent[],
  message: string,
): ApplyResult {
  const d = state.dungeon!;
  const ready: ApplyResult = {
    state: {
      ...state,
      dungeon: { ...d, pending: null, phase: "ready", decision: d.decision + 1 },
    },
    events: [...priorEvents, { type: "dungeonUpdated", message }],
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
}

/** Merchants / Warm Up 等开局改骰结束后：若仍有 Warm Up 标记则进入改 Torch，否则进探索。 */
export function proceedAfterProvisionFaceChoices(
  state: GameState,
  priorEvents: readonly GameEvent[],
): ApplyResult {
  const d = state.dungeon;
  if (d?.warmUpStartingProvisionTorchChoice)
    return beginWarmUpProvisionTorchChoice(state, priorEvents);
  return finishStartingProvisionsToExploration(
    state,
    priorEvents,
    "开局补给已入公共池，可以开始探索（R12/R-041）",
  );
}

function warmUpTorchOptions(d: DungeonState, heroId: string) {
  const provisions = d.explorationSetup?.provisions ?? [];
  return [
    ...heroStartingProvisionIds(d, heroId)
      .filter((id) => provisions.find((p) => p.id === id)?.face !== "torch")
      .map((id) => ({
        id: `torch:${id}`,
        label: `将开局补给 ${id} 改为 Torch（Warm Up the Halls）`,
      })),
    { id: "skip", label: "不改为 Torch" },
  ];
}

export function beginWarmUpProvisionTorchChoice(
  state: GameState,
  priorEvents: readonly GameEvent[] = [],
): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    d.phase !== "awaitingProvisions" ||
    !d.warmUpStartingProvisionTorchChoice ||
    d.pending ||
    d.startingProvisionChoices?.length ||
    !d.explorationSetup ||
    d.explorationSetup.provisions.length < 8 ||
    d.explorationSetup.provisions.length > 16 ||
    d.heroes.length !== 4
  )
    return rejectBattleCommand(
      state,
      "Warm Up改Torch须在开局补给掷完且Wild/Radiant选面完成后开始（QUEST p11）",
    );
  const order = [...d.heroes]
    .sort((a, b) => STANCES.indexOf(a.stance!) - STANCES.indexOf(b.stance!))
    .map((h) => h.id);
  return continueWarmUpProvisionTorchChoice(
    {
      ...state,
      dungeon: { ...d, warmUpProvisionTorchRemaining: order },
    },
    priorEvents,
  );
}

function continueWarmUpProvisionTorchChoice(
  state: GameState,
  priorEvents: readonly GameEvent[],
): ApplyResult {
  const d = state.dungeon!;
  const heroId = d.warmUpProvisionTorchRemaining?.[0];
  if (!heroId) {
    const {
      warmUpStartingProvisionTorchChoice: _flag,
      warmUpProvisionTorchRemaining: _rem,
      ...rest
    } = d;
    void _flag;
    void _rem;
    return finishStartingProvisionsToExploration(
      { ...state, dungeon: rest },
      priorEvents,
      "Warm Up the Halls：开局改Torch结束，可以开始探索（QUEST p11、R-045）",
    );
  }
  const pending = {
    id: `dungeon-warm-up-provision-torch:${d.decision}`,
    actorId: heroId,
    prompt: `Warm Up the Halls：${heroId} 可将一颗己方开局补给改为 Torch，或跳过（QUEST p11）`,
    options: warmUpTorchOptions(d, heroId),
  };
  return {
    state: { ...state, dungeon: { ...d, pending, decision: d.decision + 1 } },
    events: [...priorEvents, { type: "dungeonUpdated", message: pending.prompt }],
    pendingChoice: pending,
  };
}

export function chooseWarmUpProvisionTorch(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const d = state.dungeon,
    pending = d?.pending,
    order = d?.warmUpProvisionTorchRemaining,
    heroId = order?.[0];
  if (
    !d ||
    d.phase !== "awaitingProvisions" ||
    !d.warmUpStartingProvisionTorchChoice ||
    !pending ||
    pending.id !== choiceId ||
    !pending.id.startsWith("dungeon-warm-up-provision-torch:") ||
    !heroId ||
    pending.actorId !== heroId ||
    !Array.isArray(order) ||
    !order.length ||
    new Set(order).size !== order.length ||
    !pending.options.some((o) => o.id === optionId) ||
    !warmUpTorchOptions(d, heroId).some((o) => o.id === optionId)
  )
    return rejectBattleCommand(
      state,
      "请为当前英雄选择一颗己方开局补给改为 Torch，或跳过（QUEST p11）",
    );
  let provisions = d.explorationSetup!.provisions;
  if (optionId !== "skip") {
    const match = /^torch:(.+)$/.exec(optionId);
    if (!match || !heroStartingProvisionIds(d, heroId).includes(match[1]!))
      return rejectBattleCommand(state, "改Torch目标不是当前英雄的开局补给（QUEST p11）");
    const current = provisions.find((p) => p.id === match[1]);
    if (!current || current.face === "torch")
      return rejectBattleCommand(state, "该补给已是 Torch 或不存在（QUEST p11）");
    provisions = provisions.map((p) => (p.id === match[1] ? { ...p, face: "torch" as const } : p));
  }
  const next = continueWarmUpProvisionTorchChoice(
    {
      ...state,
      dungeon: {
        ...d,
        pending: null,
        explorationSetup: { ...d.explorationSetup!, provisions },
        warmUpProvisionTorchRemaining: order.slice(1),
      },
    },
    [],
  );
  return {
    ...next,
    events: [
      {
        type: "dungeonUpdated",
        message: `${heroId}：${optionId === "skip" ? "跳过改Torch" : `改为 Torch（${optionId.slice(6)}）`}（Warm Up、QUEST p11）`,
      },
      ...next.events,
    ],
  };
}
