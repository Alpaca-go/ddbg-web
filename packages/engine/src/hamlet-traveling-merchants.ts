import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { completeHamletEvent, hamletEventCompletionProblem } from "./hamlet-event";
import { PROVISION_FACES, PROVISION_LABELS } from "./loot";
import type { ProvisionFace } from "./loot";
import type { DungeonState } from "./dungeon";
import { heroStartingProvisionIds } from "./starting-provision-hero-ids";
import { proceedAfterProvisionFaceChoices } from "./warm-up-starting-provisions";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

/** 卡面p8、R32/33：标记下次开局补给后每名英雄可改一颗己方骰；无未审图标。 */
export function applyTravelingMerchants(state: GameState): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    d.pending ||
    d.hamlet?.active !== "hamlet_event:p008" ||
    d.heroes.length !== 4 ||
    d.heroes.some((hero) => hero.dead) ||
    hamletEventCompletionProblem(d)
  )
    return rejectBattleCommand(state, "Traveling Merchants须在完整回村与事件牌池下结算（R32）");
  const completed = completeHamletEvent({
    ...state,
    dungeon: { ...d, nextQuestProvisionFaceChoice: true },
  });
  return {
    ...completed,
    events: [
      {
        type: "dungeonUpdated",
        message: "Traveling Merchants：下次开局补给后，每名英雄可自选改一颗己方骰面（卡面p8）",
      },
      ...completed.events,
    ],
  };
}

function merchantOptions(d: DungeonState, heroId: string) {
  return [
    ...heroStartingProvisionIds(d, heroId).flatMap((id) =>
      PROVISION_FACES.map((face) => ({
        id: `set:${id}:${face}`,
        label: `将 ${id} 改为${PROVISION_LABELS[face]}`,
      })),
    ),
    { id: "skip", label: "不改骰面" },
  ];
}

/** 开局补给与Wild/Radiant选面全部完成后开始；仍停在 awaitingProvisions。 */
export function beginTravelingMerchantsChoice(state: GameState): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    d.phase !== "awaitingProvisions" ||
    !d.nextQuestProvisionFaceChoice ||
    d.pending ||
    d.startingProvisionChoices?.length ||
    !d.explorationSetup ||
    d.explorationSetup.provisions.length < 8 ||
    d.explorationSetup.provisions.length > 16 ||
    d.heroes.length !== 4
  )
    return rejectBattleCommand(state, "Traveling Merchants改骰须在开局补给掷完后开始（卡面p8）");
  const order = [...d.heroes]
    .sort((a, b) => STANCES.indexOf(a.stance!) - STANCES.indexOf(b.stance!))
    .map((h) => h.id);
  return continueTravelingMerchants({
    ...state,
    dungeon: { ...d, provisionFaceChoiceRemaining: order },
  });
}

function continueTravelingMerchants(state: GameState): ApplyResult {
  const d = state.dungeon!;
  const id = d.provisionFaceChoiceRemaining?.[0];
  if (!id) {
    const { nextQuestProvisionFaceChoice: _flag, provisionFaceChoiceRemaining: _rem, ...rest } = d;
    void _flag;
    void _rem;
    return proceedAfterProvisionFaceChoices(
      { ...state, dungeon: rest },
      [
        {
          type: "dungeonUpdated",
          message: "Traveling Merchants改骰结束（卡面p8、R12）",
        },
      ],
    );
  }
  const pending = {
    id: `dungeon-traveling-merchants:${d.decision}`,
    actorId: id,
    prompt: `Traveling Merchants：${id}可改一颗己方开局补给骰面，或放弃（卡面p8）`,
    options: merchantOptions(d, id),
  };
  return {
    state: { ...state, dungeon: { ...d, pending, decision: d.decision + 1 } },
    events: [{ type: "dungeonUpdated", message: pending.prompt }],
    pendingChoice: pending,
  };
}

export function chooseTravelingMerchants(
  state: GameState,
  choiceId: string,
  optionId: string,
): ApplyResult {
  const d = state.dungeon,
    pending = d?.pending,
    order = d?.provisionFaceChoiceRemaining,
    heroId = order?.[0];
  if (
    !d ||
    d.phase !== "awaitingProvisions" ||
    !d.nextQuestProvisionFaceChoice ||
    !pending ||
    pending.id !== choiceId ||
    !pending.id.startsWith("dungeon-traveling-merchants:") ||
    !heroId ||
    pending.actorId !== heroId ||
    !Array.isArray(order) ||
    !order.length ||
    new Set(order).size !== order.length ||
    !pending.options.some((o) => o.id === optionId) ||
    !merchantOptions(d, heroId).some((o) => o.id === optionId)
  )
    return rejectBattleCommand(state, "请为当前英雄选择一颗己方补给骰面，或放弃（卡面p8）");
  let provisions = d.explorationSetup!.provisions;
  if (optionId !== "skip") {
    const match = /^set:(.+):(food|bandage|potion|torch|tool)$/.exec(optionId);
    if (!match || !heroStartingProvisionIds(d, heroId).includes(match[1]!))
      return rejectBattleCommand(state, "改骰目标不是当前英雄的开局补给");
    const face = match[2] as ProvisionFace;
    provisions = provisions.map((p) => (p.id === match[1] ? { ...p, face } : p));
  }
  const next = continueTravelingMerchants({
    ...state,
    dungeon: {
      ...d,
      pending: null,
      explorationSetup: { ...d.explorationSetup!, provisions },
      provisionFaceChoiceRemaining: order.slice(1),
    },
  });
  return {
    ...next,
    events: [
      {
        type: "dungeonUpdated",
        message: `${heroId}：${optionId === "skip" ? "放弃改骰" : `改骰 ${optionId}`}（Traveling Merchants、卡面p8）`,
      },
      ...next.events,
    ],
  };
}
