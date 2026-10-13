import type { ApplyResult, Command, GameEvent, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { nextProvisionFace, PROVISION_FACES, PROVISION_LABELS } from "./loot";
import type { ProvisionFace } from "./loot";

/** R12、R37 / 规格书§5.2、§16：开局八颗；Wild和Radiant自选不消费RNG。 */
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
    ["aggressive", "defensive", "ranged", "support"].some(
      (stance) => d.heroes.filter((h) => h.stance === stance).length !== 1,
    ) ||
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
                message: "八颗开局补给已入公共池，可以开始探索（R12）",
              },
            ]),
      ],
      ...(pending ? { pendingChoice: pending } : {}),
    };
  };
  const provisions = d.explorationSetup.provisions;
  if (command.type === "rollDungeonProvisions") {
    if (d.pending || d.startingProvisionChoices || provisions.length) return refuse();
    const pool: { id: string; face: ProvisionFace }[] = [];
    const choices: { id: string; actorId: string }[] = [];
    const events: GameEvent[] = [];
    let cursor = d.cursor;
    for (const stance of ["aggressive", "defensive", "ranged", "support"] as const) {
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
    return finish(
      {
        ...d,
        cursor,
        startingProvisionChoices: choices,
        explorationSetup: { ...d.explorationSetup, provisions: pool },
      },
      events,
    );
  }
  const choices = d.startingProvisionChoices;
  const first = choices?.[0];
  const ids = [...provisions.map((p) => p.id), ...(choices ?? []).map((p) => p.id)];
  const expectedIds = ["aggressive", "defensive", "ranged", "support"].flatMap((stance) =>
    [0, 1].map((i) => `dungeon-starting-provision:${stance}:${i}`),
  );
  if (
    !first ||
    !d.pending ||
    command.choiceId !== d.pending.id ||
    !d.pending.id.startsWith("dungeon-starting-provisions:") ||
    d.pending.actorId !== first.actorId ||
    !PROVISION_FACES.includes(command.optionId as ProvisionFace) ||
    !d.pending.options.some((o) => o.id === command.optionId) ||
    ids.length !== 8 ||
    new Set(ids).size !== 8 ||
    ids.some((id) => !expectedIds.includes(id)) ||
    provisions.some((p) => !PROVISION_FACES.includes(p.face)) ||
    choices!.some(
      (c) =>
        !d.heroes.some(
          (h) => h.id === c.actorId && c.id.startsWith(`dungeon-starting-provision:${h.stance}:`),
        ),
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
