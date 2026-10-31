import type { ApplyResult, GameState } from "./command";
import type { ScoutRest } from "../../data/src/scout-rest";
import { nextProvisionFace, PROVISION_FACES, PROVISION_LABELS, type ProvisionFace } from "./loot";

export type Excavation = {
  readonly roomId: string;
  readonly heroIndex: number;
  readonly reward: ProvisionFace | "wild" | null;
  readonly originalRest: ScoutRest;
  readonly stage: "provisions" | "rest";
};

/** R36 / R-138：逐英雄奖励骰；Wild 与满池处置都保留已掷结果。 */
export function resolveExcavation(
  state: GameState,
  choice?: { choiceId: string; optionId: string },
): ApplyResult {
  const original = state,
    d = state.dungeon!;
  const room = d.rooms.find((r) => r.id === d.position);
  const refuse = (): ApplyResult => ({
    state: original,
    events: [{ type: "commandRefused", message: "挖掘点上下文或待选无效（R36）" }],
  });
  if (
    !d.darkest ||
    state.battle ||
    room?.kind !== "empty" ||
    room.cleared ||
    d.phase !== "awaitingRoom" ||
    !d.rest ||
    !d.explorationSetup ||
    d.heroes.length !== 4 ||
    d.heroes.some((h) => h.dead)
  )
    return refuse();
  let excavation: Excavation = d.darkest.excavation ?? {
    roomId: room.id,
    heroIndex: 0,
    reward: null,
    stage: "provisions",
    originalRest: d.rest,
  };
  if (excavation.roomId !== room.id || excavation.stage !== "provisions") return refuse();
  let provisions = [...d.explorationSetup.provisions],
    cursor = d.cursor;
  if (
    provisions.length > 16 ||
    new Set(provisions.map((p) => p.id)).size !== provisions.length ||
    !Number.isSafeInteger(cursor) ||
    cursor < 0
  )
    return refuse();
  if (choice) {
    if (
      !d.pending?.id.startsWith("dungeon-excavation:") ||
      d.pending.id !== choice.choiceId ||
      !d.pending.options.some((o) => o.id === choice.optionId)
    )
      return refuse();
    if (choice.optionId.startsWith("discard:")) {
      if (provisions.length !== 16 || !excavation.reward) return refuse();
      provisions = provisions.filter((p) => p.id !== choice.optionId.slice(8));
    } else {
      if (
        excavation.reward !== "wild" ||
        !PROVISION_FACES.includes(choice.optionId as ProvisionFace)
      )
        return refuse();
      excavation = { ...excavation, reward: choice.optionId as ProvisionFace };
    }
  } else if (d.pending || d.darkest.excavation) return refuse();
  const heroes = [...d.heroes].sort(
    (a, b) =>
      ["aggressive", "defensive", "ranged", "support"].indexOf(a.stance!) -
      ["aggressive", "defensive", "ranged", "support"].indexOf(b.stance!),
  );
  const finish = (options?: { id: string; label: string }[], prompt = ""): ApplyResult => {
    const pending = options ? { id: `dungeon-excavation:${d.decision}`, prompt, options } : null;
    const next = {
      ...d,
      cursor,
      decision: d.decision + 1,
      pending,
      explorationSetup: { ...d.explorationSetup!, provisions },
      darkest: { ...d.darkest!, excavation },
    };
    return {
      state: { ...state, dungeon: next },
      events: [{ type: "dungeonUpdated", message: prompt }],
      ...(pending ? { pendingChoice: pending } : {}),
    };
  };
  while (excavation.heroIndex < 4) {
    if (excavation.reward === null) {
      excavation = { ...excavation, reward: nextProvisionFace(state.seed, cursor) };
      cursor++;
    }
    if (provisions.length === 16)
      return finish(
        provisions.map((p) => ({ id: `discard:${p.id}`, label: `弃 ${PROVISION_LABELS[p.face]}` })),
        "补给已满16颗：弃已有一颗后领取挖掘点已掷奖励，不重掷（R-138）",
      );
    if (excavation.reward === "wild")
      return finish(
        PROVISION_FACES.map((face) => ({ id: face, label: PROVISION_LABELS[face] })),
        "挖掘点 Wild：选择补给面，不重掷",
      );
    provisions.push({
      id: `excavation:${room.id}:${heroes[excavation.heroIndex]!.id}`,
      face: excavation.reward!,
    });
    excavation = { ...excavation, heroIndex: excavation.heroIndex + 1, reward: null };
  }
  excavation = { ...excavation, stage: "rest" };
  const pending = {
    id: `dungeon-rest:${d.decision}`,
    prompt: "挖掘点免费休息8点：共同分配或每人2点，不消耗柴火（R36）",
    options: [
      { id: "collective", label: "共同分配8点" },
      { id: "equal", label: "每名英雄分配2点" },
    ],
  };
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        cursor,
        decision: d.decision + 1,
        pending,
        phase: "ready",
        explorationSetup: { ...d.explorationSetup, provisions },
        darkest: { ...d.darkest, excavation },
        rest: { questId: d.rest.questId, used: false, restPointOverride: 8 },
      },
    },
    events: [{ type: "dungeonUpdated", message: pending.prompt }],
    pendingChoice: pending,
  };
}

/** 免费休息结束才清理房间，恢复原柴火，包括原先已经使用的柴火。 */
export function finishExcavationRest(result: ApplyResult): ApplyResult {
  const d = result.state.dungeon!,
    excavation = d.darkest?.excavation;
  if (excavation?.stage !== "rest" || !d.rest?.used || result.pendingChoice) return result;
  const { excavation: _done, ...darkest } = d.darkest!;
  void _done;
  return {
    ...result,
    state: {
      ...result.state,
      dungeon: {
        ...d,
        darkest,
        rest: excavation.originalRest,
        rooms: d.rooms.map((r) =>
          r.id === excavation.roomId ? { ...r, revealed: true, cleared: true } : r,
        ),
      },
    },
    events: [
      ...result.events,
      { type: "dungeonUpdated", message: "挖掘点已清理；免费休息完成，原柴火保留（R36）" },
    ],
  };
}
