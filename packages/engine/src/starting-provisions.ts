import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameEvent, GameState } from "./command";
import { applyEncounterCommand } from "./encounter";
import { nextProvisionFace, PROVISION_FACES, PROVISION_LABELS } from "./loot";
import type { ProvisionFace } from "./loot";

export type StartingWild = { readonly id: string; readonly actorId: string };
function continueStarting(
  state: GameState,
  wilds: readonly StartingWild[],
  events: readonly GameEvent[],
): ApplyResult {
  const battle = state.battle!;
  const wild = wilds[0];
  if (wild) {
    const choice = {
      id: `starting-provisions:${battle.choiceCursor}`,
      actorId: wild.actorId,
      prompt: "开局补给 Wild：选择一面",
      options: PROVISION_FACES.map((face) => ({ id: face, label: PROVISION_LABELS[face] })),
    };
    return {
      state: {
        ...state,
        battle: {
          ...battle,
          choiceCursor: battle.choiceCursor + 1,
          pending: { type: "startingProvision", choice, wilds },
        },
      },
      events,
      pendingChoice: choice,
    };
  }
  const ready: GameState = {
    ...state,
    battle: { ...battle, pending: null, startingProvisionsReady: true },
  };
  const started = applyEncounterCommand(ready, { type: "startBattle" });
  return { ...started, events: [...events, ...started.events] };
}
/** R12 / 说明书 §5.2：每英雄两颗，Wild 对应英雄选面，先全部入池再开始单场。 */
export function startWithProvisions(state: GameState): ApplyResult {
  const battle = state.battle!;
  if (
    battle.encounter ||
    battle.startingProvisionsReady ||
    !battle.startingProvisions ||
    !battle.provisions ||
    battle.provisions.length
  )
    return rejectBattleCommand(state, "开局补给需要明确空池且不能重复掷骰");
  const stances = ["aggressive", "defensive", "ranged", "support"] as const;
  const heroes = battle.entities.filter((entity) => entity.side === "hero" && !entity.dead);
  if (
    heroes.length !== 4 ||
    stances.some((stance) => heroes.filter((hero) => hero.stance === stance).length !== 1)
  )
    return rejectBattleCommand(state, "开局补给需要四名已定位的存活英雄（R12）");
  const provisions = [...battle.provisions];
  const wilds: StartingWild[] = [];
  const events: GameEvent[] = [];
  let cursor = battle.rngCursor;
  for (const stance of stances) {
    const actorId = heroes.find((hero) => hero.stance === stance)!.id;
    for (let index = 0; index < 2; index++) {
      const id = `starting-provision:${stance}:${index}`;
      const face = nextProvisionFace(state.seed, cursor++);
      events.push({
        type: "provisionRolled",
        actorId,
        face,
        message: `开局补给：${face === "wild" ? "Wild，待玩家选面" : PROVISION_LABELS[face]}`,
      });
      if (face === "wild") wilds.push({ id, actorId });
      else provisions.push({ id, face });
    }
  }
  return continueStarting(
    { ...state, battle: { ...battle, provisions, rngCursor: cursor } },
    wilds,
    events,
  );
}
export function chooseStartingProvision(state: GameState, face: string): ApplyResult {
  const battle = state.battle!;
  const pending = battle.pending;
  if (
    pending?.type !== "startingProvision" ||
    !PROVISION_FACES.includes(face as ProvisionFace) ||
    !battle.provisions ||
    battle.provisions.length >= 8
  )
    return rejectBattleCommand(state, "开局补给选择失效");
  const wild = pending.wilds[0]!;
  return continueStarting(
    {
      ...state,
      battle: {
        ...battle,
        provisions: [...battle.provisions, { id: wild.id, face: face as ProvisionFace }],
      },
    },
    pending.wilds.slice(1),
    [
      {
        type: "provisionSelected",
        actorId: wild.actorId,
        face: face as ProvisionFace,
        message: "开局 Wild 已选择补给骰面",
      },
    ],
  );
}
