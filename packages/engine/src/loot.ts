import { rejectBattleCommand } from "./battle";
import type { BattleState } from "./battle";
import type { ApplyResult, GameEvent, GameState } from "./command";
import { finishTurn, nextBattleRoll } from "./encounter";
import { createRng } from "./rng";

export const PROVISION_FACES = ["food", "bandage", "potion", "torch", "tool"] as const;
export type ProvisionFace = (typeof PROVISION_FACES)[number];
export const PROVISION_LABELS = {
  food: "食物",
  bandage: "绷带",
  potion: "药水",
  torch: "火把",
  tool: "工具",
};
export type LootKind =
  "rollProvision" | "chooseProvision" | "goldOrProvision" | "doubleGoldOrChoose" | "doubleGold";
export type LootToken = { readonly id: string; readonly kind: LootKind };
export type LootState = {
  readonly available: readonly LootToken[];
  readonly placed: readonly (LootToken & { readonly areaId: string; readonly revealed: boolean })[];
  readonly claimedIds: readonly string[];
  readonly gold: number;
  readonly provisionCursor: number;
};
/** R-047：五种各两枚；软件 id 仅区分实例，不给实体编号。 */
export function createLootState(): LootState {
  const kinds: readonly LootKind[] = [
    "rollProvision",
    "chooseProvision",
    "goldOrProvision",
    "doubleGoldOrChoose",
    "doubleGold",
  ];
  return {
    available: kinds.flatMap((kind) => [0, 1].map((index) => ({ id: `${kind}:${index}`, kind }))),
    placed: [],
    claimedIds: [],
    gold: 0,
    provisionCursor: 0,
  };
}
export function closeBattleLoot(loot: LootState | undefined): LootState | undefined {
  return loot
    ? {
        ...loot,
        available: [...loot.available, ...loot.placed.map(({ id, kind }) => ({ id, kind }))],
        placed: [],
      }
    : undefined;
}
/** placements 可重复同一区域，以表示同区多个独立代币；普通房间仍用唯一 lootAreas。 */
export function placeBattleLoot(
  battle: BattleState,
  seed: number,
  placements: readonly string[] | undefined = battle.lootAreas,
): BattleState | null {
  if (!placements || battle.loot) return battle;
  if (placements.some((id) => !battle.areas.some((area) => area.id === id))) return null;
  const loot = battle.lootPool ?? createLootState();
  const canonical = createLootState().available;
  const ids = [...loot.available.map((token) => token.id), ...loot.claimedIds];
  if (
    loot.placed.length ||
    new Set(ids).size !== ids.length ||
    ids.length !== 10 ||
    ids.some((id) => !canonical.some((token) => token.id === id)) ||
    loot.available.some(
      (token) => !canonical.some((entry) => entry.id === token.id && entry.kind === token.kind),
    ) ||
    !Number.isSafeInteger(loot.gold) ||
    loot.gold < 0 ||
    !Number.isSafeInteger(loot.provisionCursor) ||
    loot.provisionCursor < 0
  ) {
    return null;
  }
  const deck = [...loot.available];
  const rng = createRng(seed);
  for (let index = 0; index < battle.rngCursor; index++) rng.next();
  let cursor = battle.rngCursor;
  for (let index = deck.length - 1; index > 0; index--) {
    const other = Math.floor(rng.next() * (index + 1));
    [deck[index], deck[other]] = [deck[other]!, deck[index]!];
    cursor++;
  }
  const placed = placements.flatMap((areaId) => {
    const token = deck.shift();
    return token ? [{ ...token, areaId, revealed: false }] : [];
  });
  return { ...battle, rngCursor: cursor, loot: { ...loot, available: deck, placed } };
}

/** R12：六面各一次；顺序只是软件采样序，不当作印刷数字。 */
export function nextProvisionFace(seed: number, cursor: number): ProvisionFace | "wild" {
  const rng = createRng(seed);
  for (let index = 0; index < cursor; index++) rng.next();
  return [...PROVISION_FACES, "wild" as const][Math.floor(rng.next() * 6)]!;
}
function finishLoot(
  state: GameState,
  actorId: string,
  token: LootToken,
  reward: { gold: number } | { face: ProvisionFace },
  events: readonly GameEvent[],
): ApplyResult {
  const battle = state.battle!;
  const loot = battle.loot!;
  const turn = battle.encounter!.turn;
  if (turn.type !== "hero" || turn.actorId !== actorId || turn.actions < 1)
    return rejectBattleCommand(state, "拾取的英雄回合已失效");
  if (
    !Number.isSafeInteger(loot.gold) ||
    loot.gold < 0 ||
    !Number.isSafeInteger(loot.provisionCursor) ||
    loot.provisionCursor < 0
  )
    return rejectBattleCommand(state, "战利品金币 / 补给实例游标无效");
  const gold = "gold" in reward ? loot.gold + reward.gold : loot.gold;
  if (!Number.isSafeInteger(gold)) return rejectBattleCommand(state, "金币超出安全整数范围");
  if ("face" in reward && (!battle.provisions || battle.provisions.length >= 16))
    return rejectBattleCommand(state, "补给池已满或缺失，保留宝箱且不扣行动（R-059）");
  const next: GameState = {
    ...state,
    battle: {
      ...battle,
      pending: null,
      ...("face" in reward
        ? {
            provisions: [
              ...battle.provisions!,
              { id: `loot-provision:${loot.provisionCursor}`, face: reward.face },
            ],
          }
        : {}),
      loot: {
        ...loot,
        gold,
        provisionCursor: loot.provisionCursor + Number("face" in reward),
        placed: loot.placed.filter((entry) => entry.id !== token.id),
        claimedIds: [...loot.claimedIds, token.id],
      },
      encounter: { ...battle.encounter!, turn: { ...turn, actions: turn.actions - 1 } },
    },
  };
  const resolved: GameEvent[] = [
    ...events,
    {
      type: "lootResolved",
      actorId,
      tokenId: token.id,
      kind: token.kind,
      reward,
      message: "拾取战利品，奖励已结算，移除宝箱并消耗一个行动",
    },
  ];
  return turn.actions === 1
    ? finishTurn(next, actorId, resolved)
    : { state: next, events: resolved };
}
function rewardChoice(
  state: GameState,
  actorId: string,
  token: LootToken,
  phase: "reward" | "face",
  events: readonly GameEvent[],
): ApplyResult {
  const battle = state.battle!;
  const options =
    phase === "face"
      ? PROVISION_FACES.map((face) => ({ id: face, label: PROVISION_LABELS[face] }))
      : [
          {
            id: "gold",
            label:
              token.kind === "doubleGoldOrChoose" ? "掷 d10，获得双倍金币" : "掷 d10，获得金币",
          },
          ...(battle.provisions!.length < 16
            ? [
                {
                  id: "provision",
                  label: token.kind === "doubleGoldOrChoose" ? "自选一颗补给" : "掷一颗补给骰",
                },
              ]
            : []),
        ];
  const choice = {
    id: `loot:${battle.choiceCursor}:${token.id}:${phase}`,
    actorId,
    prompt: phase === "face" ? "选择补给骰面" : "选择战利品奖励",
    options,
  };
  return {
    state: {
      ...state,
      battle: {
        ...battle,
        choiceCursor: battle.choiceCursor + 1,
        pending: { type: "lootReward", actorId, token, phase, choice },
      },
    },
    events,
    pendingChoice: choice,
  };
}
function rollProvision(
  state: GameState,
  actorId: string,
  token: LootToken,
  events: readonly GameEvent[],
): ApplyResult {
  const battle = state.battle!;
  const face = nextProvisionFace(state.seed, battle.rngCursor);
  const next = { ...state, battle: { ...battle, rngCursor: battle.rngCursor + 1 } };
  const rolled: GameEvent[] = [
    ...events,
    {
      type: "provisionRolled",
      actorId,
      face,
      message: `补给骰：${face === "wild" ? "Wild，选择一面" : PROVISION_LABELS[face]}`,
    },
  ];
  return face === "wild"
    ? rewardChoice(next, actorId, token, "face", rolled)
    : finishLoot(next, actorId, token, { face }, rolled);
}
export function interactLoot(state: GameState, actorId: string): ApplyResult {
  const battle = state.battle;
  const turn = battle?.encounter?.turn;
  const actor = battle?.entities.find((entity) => entity.id === actorId);
  if (
    !battle ||
    turn?.type !== "hero" ||
    turn.actorId !== actorId ||
    turn.actions < 1 ||
    turn.mustMove ||
    !actor ||
    actor.dead
  )
    return rejectBattleCommand(state, "拾取必须在当前英雄行动中，且不能跳过必须移动");
  const token = battle.loot?.placed.find((token) => token.areaId === actor.areaId);
  if (
    !token ||
    !battle.provisions ||
    battle.provisions.length > 16 ||
    new Set(battle.provisions.map((provision) => provision.id)).size !== battle.provisions.length ||
    battle.provisions.some(
      (provision) => !provision.id || !PROVISION_FACES.includes(provision.face),
    )
  )
    return rejectBattleCommand(state, "同区没有宝箱或补给池缺失 / 无效");
  if (battle.provisions.length === 16 && ["rollProvision", "chooseProvision"].includes(token.kind))
    return rejectBattleCommand(state, "补给池已满，保留纯补给宝箱且不扣行动（R-059）");
  const next = {
    ...state,
    battle: {
      ...battle,
      loot: {
        ...battle.loot!,
        placed: battle.loot!.placed.map((entry) =>
          entry.id === token.id ? { ...entry, revealed: true } : entry,
        ),
      },
    },
  };
  const events: GameEvent[] = [
    { type: "lootRevealed", actorId, tokenId: token.id, kind: token.kind, message: "翻开同区宝箱" },
  ];
  if (token.kind === "chooseProvision") return rewardChoice(next, actorId, token, "face", events);
  if (token.kind === "rollProvision") return rollProvision(next, actorId, token, events);
  if (token.kind !== "doubleGold") return rewardChoice(next, actorId, token, "reward", events);
  const gold = 2 * nextBattleRoll(state.seed, battle.rngCursor);
  return finishLoot(
    { ...next, battle: { ...next.battle, rngCursor: battle.rngCursor + 1 } },
    actorId,
    token,
    { gold },
    events,
  );
}
export function resolveLootChoice(state: GameState, optionId: string): ApplyResult {
  const battle = state.battle!;
  const pending = battle.pending;
  if (pending?.type !== "lootReward") return rejectBattleCommand(state, "战利品选择已失效");
  const { actorId, token, phase } = pending;
  if (phase === "face") {
    if (!PROVISION_FACES.includes(optionId as ProvisionFace))
      return rejectBattleCommand(state, "补给骰面无效");
    return finishLoot(state, actorId, token, { face: optionId as ProvisionFace }, []);
  }
  if (optionId === "gold") {
    const multiplier = token.kind === "doubleGoldOrChoose" ? 2 : 1;
    return finishLoot(
      { ...state, battle: { ...battle, rngCursor: battle.rngCursor + 1 } },
      actorId,
      token,
      { gold: multiplier * nextBattleRoll(state.seed, battle.rngCursor) },
      [],
    );
  }
  if (optionId !== "provision" || !battle.provisions || battle.provisions.length >= 16)
    return rejectBattleCommand(state, "补给奖励无可用骰子（R-059）");
  return token.kind === "doubleGoldOrChoose"
    ? rewardChoice(state, actorId, token, "face", [])
    : rollProvision(state, actorId, token, []);
}
