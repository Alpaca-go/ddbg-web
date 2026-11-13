import medium from "../../../data/normalized/extension/weald/monster_medium.json";
import large from "../../../data/normalized/extension/weald/monster_large.json";
import curios from "../../../data/normalized/extension/weald/curio.json";
import { wealdCurioFileSchema } from "../../../data/src/curio";
import { coreQuestSources } from "./core-quest";
import type { QuestStart } from "../../../data/src/quest-save";
import { naturalParty, naturalQuest } from "./natural-quest";
import { createCoreDungeonQuest, type CoreQuestSources } from "../dungeon-quest-entry";
import { applyCommand, type Command, type GameState } from "../command";
import { readInfectedOakAction } from "../battle-infected-oak";
import { heroMovePathLimit } from "../battle-hero-movement";

export const disinfectionSources: CoreQuestSources = {
  ...coreQuestSources,
  weald: { medium, large, curios: wealdCurioFileSchema.parse(curios).cards },
};

/** 固定玩家偏好：目标房先移动到可合法消毒的星区并消毒，其余沿用自然策略。 */
export function disinfectionHeroAction(state: GameState): Command | undefined {
  const action = readInfectedOakAction(state);
  if (!action) return undefined;
  if (!action.disabledReason) return action.command;
  const b = state.battle!,
    turn = b.encounter!.turn;
  if (
    b.infectedOakDisinfected ||
    turn.type !== "hero" ||
    turn.actions < 2 ||
    !b.provisions?.some((p) => p.face === "potion")
  )
    return undefined;
  const hero = b.entities.find((e) => e.id === turn.actorId)!;
  const paths = new Map<string, string[]>([[hero.areaId, []]]);
  for (const [id, path] of paths) {
    if (path.length >= heroMovePathLimit(state, hero.id)) continue;
    for (const next of [...b.areas.find((a) => a.id === id)!.adjacent].sort())
      if (!paths.has(next)) paths.set(next, [...path, next]);
  }
  for (const [id, path] of paths) {
    if (!path.length || !b.areas.find((a) => a.id === id)?.poisonousRoots) continue;
    const command = { type: "moveHero", actorId: hero.id, path } as const;
    const moved = applyCommand(state, command);
    if (
      !moved.events.some((e) => e.type === "commandRefused") &&
      readInfectedOakAction(moved.state)?.disabledReason === null
    )
      return command;
  }
  return undefined;
}

/** 不注入牌序、房间、伤害或快照：从固定 seed 2 出征，记录真实消毒前后停点。 */
export function disinfectionJourney(sources = disinfectionSources) {
  const start: QuestStart = {
    seed: 2,
    questId: "quest:weald:p003" as const,
    mode: "radiant" as const,
    contentPacks: ["core", "weald"],
    bossEdgeRooms: true,
    stygianRoomRules: "full" as const,
    party: naturalParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
  };
  const initial = createCoreDungeonQuest(
    2,
    start.questId,
    start.mode,
    naturalParty,
    sources,
    true,
    "full",
    start.contentPacks,
  );
  let previous = initial;
  const commands: Command[] = [];
  let before: { game: GameState; commands: Command[] } | undefined;
  let after: typeof before;
  const run = naturalQuest(2, start.questId, true, sources, 4, {
    continueFrom: initial,
    heroAction: disinfectionHeroAction,
    observe: (state, command) => {
      if (command.type === "disinfectInfectedOak" && !before)
        before = { game: previous, commands: [...commands] };
      commands.push(command);
      if (command.type === "disinfectInfectedOak" && !after)
        after = { game: state, commands: [...commands] };
      previous = state;
    },
  });
  if (!before || !after) throw new Error(`固定 Disinfection 场景未到消毒停点：${run.stopReason}`);
  return { start, before, after, run };
}
