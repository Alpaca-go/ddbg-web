import type { ApplyResult, Command, GameEvent, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { nextProvisionFace, PROVISION_FACES, PROVISION_LABELS } from "./loot";
import type { ProvisionFace } from "./loot";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

function baseProvisionIds() {
  return STANCES.flatMap((stance) =>
    [0, 1].map((i) => `dungeon-starting-provision:${stance}:${i}`),
  );
}

function bonusProvisionId(heroId: string, index: number) {
  return `dungeon-bonus-provision:${heroId}:${index}`;
}

/** R12、R37 / 规格书§5.2、§16：开局八颗；Wild和Radiant自选不消费RNG。R-041：奖励骰在常规八颗之后逐颗掷出，池满16即停。 */
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
    state.battle ||
    d.phase !== "awaitingProvisions" ||
    !d.explorationSetup ||
    d.explorationSetup.light !== 5 ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
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
  const finish = (next: DungeonState, events: readonly GameEvent[]): ApplyResult => {
    const first = next.startingProvisionChoices?.[0];
    const pending = first
      ? {
          id: `dungeon-starting-provisions:${next.decision}`,
          actorId: first.actorId,
          prompt: `开局补给：${first.actorId}选择骰面（Wild / Radiant自选）`,
          options: PROVISION_FACES.map((face) => ({ id: face, label: PROVISION_LABELS[face] })),
        }
      : null;
    return {
      state: {
        ...state,
        dungeon: {
          ...next,
          pending,
          decision: next.decision + 1,
          phase: first ? "awaitingProvisions" : "ready",
        },
      },
      events: [
        ...events,
        ...(first
          ? []
          : [
              {
                type: "dungeonUpdated" as const,
                message: "开局补给已入公共池，可以开始探索（R12/R-041）",
              },
            ]),
      ],
      ...(pending ? { pendingChoice: pending } : {}),
    };
  };
  const provisions = d.explorationSetup.provisions;
  if (command.type === "rollDungeonProvisions") {
    if (d.pending || d.startingProvisionChoices || provisions.length) return refuse();
    if (
      d.heroes.some((h) => {
        const n = h.nextQuestProvisionDice;
        return (
          n !== undefined && (!Number.isSafeInteger(n) || n < 0 || !Number.isSafeInteger(n + 8))
        );
      })
    )
      return refuse();
    const pool: { id: string; face: ProvisionFace }[] = [];
    const choices: { id: string; actorId: string }[] = [];
    const events: GameEvent[] = [];
    let cursor = d.cursor;
    for (const stance of STANCES) {
      const actorId = d.heroes.find((h) => h.stance === stance)!.id;
      for (let index = 0; index < 2; index++) {
        const id = `dungeon-starting-provision:${stance}:${index}`;
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
    return finish(
      {
        ...d,
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
  const expectedBase = baseProvisionIds();
  const bonusIds = ids.filter((id) => id.startsWith("dungeon-bonus-provision:"));
  if (
    !first ||
    !d.pending ||
    command.choiceId !== d.pending.id ||
    !d.pending.id.startsWith("dungeon-starting-provisions:") ||
    d.pending.actorId !== first.actorId ||
    !PROVISION_FACES.includes(command.optionId as ProvisionFace) ||
    !d.pending.options.some((o) => o.id === command.optionId) ||
    ids.length < 8 ||
    ids.length > 16 ||
    new Set(ids).size !== ids.length ||
    expectedBase.some((id) => !ids.includes(id)) ||
    ids.some((id) => !expectedBase.includes(id) && !bonusIds.includes(id)) ||
    bonusIds.some((id) => !/^dungeon-bonus-provision:[^:]+:\d+$/.test(id)) ||
    provisions.some((p) => !PROVISION_FACES.includes(p.face)) ||
    choices!.some((c) => !d.heroes.some((h) => h.id === c.actorId))
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
