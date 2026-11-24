import type { QuestStart } from "../../../data/src/shared/quest-save";
import { applyCommand, type Command, type GameState } from "../../src/shared/core/command";
import { createCoreDungeonQuest } from "../../src/shared/dungeon/dungeon-quest-entry";
import { heroMovePathLimit } from "../../src/shared/battle/battle-hero-movement";
import { disinfectionSources as sources } from "./disinfection-quest";
import { naturalParty, naturalQuest } from "./natural-quest";

/** 固定已有 seed2 Disinfection；仅从公开几何选择可穿过／暂留／移出的路径。 */
export function zeroCapacityQuest() {
  const start: QuestStart = {
    seed: 2,
    questId: "quest:weald:p003",
    mode: "radiant",
    party: naturalParty,
    contentPacks: ["core", "weald"],
    bossEdgeRooms: true,
    stygianRoomRules: "full",
  };
  const initial = createCoreDungeonQuest(
    start.seed,
    start.questId,
    start.mode,
    start.party,
    sources,
    true,
    "full",
    start.contentPacks,
  );
  const commands: Command[] = [];
  const seen = new Set<string>();
  let checkpoint:
    { before: GameState; enter: Command; leave: Command; through: Command } | undefined;
  const run = naturalQuest(2, start.questId, true, sources, 4, {
    continueFrom: initial,
    heroAction(game) {
      const b = game.battle!,
        turn = b.encounter!.turn;
      if (turn.type !== "hero" || turn.mustMove) return undefined;
      if (turn.actions !== 2) {
        const hero = b.entities.find((e) => e.id === turn.actorId)!;
        return b.areas.some((a) => a.zeroCapacity)
          ? {
              type: "changeStance",
              actorId: hero.id,
              direction: hero.stance === "aggressive" ? "backward" : "forward",
            }
          : undefined;
      }
      seen.add(
        `${game.dungeon?.roomCards?.active?.cardId}:${b.areas.filter((a) => a.zeroCapacity).map((a) => a.id)}:${turn.actions}`,
      );
      const hero = b.entities.find((e) => e.id === turn.actorId)!;
      const paths = new Map<string, string[]>([[hero.areaId, []]]);
      for (const [id, path] of paths) {
        for (const next of [...b.areas.find((a) => a.id === id)!.adjacent].sort())
          if (!paths.has(next)) paths.set(next, [...path, next]);
      }
      for (const [id, path] of paths) {
        if (!path.length || !b.areas.find((a) => a.id === id)?.zeroCapacity) continue;
        const enter = { type: "moveHero", actorId: hero.id, path, allTrinkets: true } as const;
        const pause = applyCommand(game, enter);
        if (pause.events.some((e) => e.type === "commandRefused")) continue;
        for (const dest of [...b.areas.find((a) => a.id === id)!.adjacent].sort()) {
          if (b.areas.find((a) => a.id === dest)?.zeroCapacity) continue;
          const leave = {
            type: "moveHero",
            actorId: hero.id,
            path: [dest],
            allTrinkets: true,
          } as const;
          const through = { ...enter, path: [...path, dest] };
          if (
            [applyCommand(pause.state, leave), applyCommand(game, through)].some((r) =>
              r.events.some((e) => e.type === "commandRefused"),
            )
          )
            continue;
          checkpoint = { before: game, enter, leave, through };
          throw new Error("zero capacity checkpoint ready");
        }
      }
      if (heroMovePathLimit(game, hero.id) >= 2) {
        for (const [id, path] of paths) {
          if (!b.areas.find((a) => a.id === id)?.zeroCapacity || path.length < 2) continue;
          const approach = {
            type: "moveHero",
            actorId: hero.id,
            path: path.slice(0, Math.min(path.length - 1, heroMovePathLimit(game, hero.id))),
          } as const;
          if (!applyCommand(game, approach).events.some((e) => e.type === "commandRefused"))
            return approach;
        }
      }
      if (b.areas.some((a) => a.zeroCapacity))
        return {
          type: "changeStance",
          actorId: hero.id,
          direction: hero.stance === "aggressive" ? "backward" : "forward",
        };
      return undefined;
    },
    observe(_game, command) {
      commands.push(command);
    },
  });
  if (!checkpoint) throw new Error(`缺零容量自然检查点：${run.stopReason} ${[...seen]}`);
  const paused = applyCommand(checkpoint.before, checkpoint.enter).state;
  const after = applyCommand(paused, checkpoint.leave).state;
  const crossed = applyCommand(checkpoint.before, checkpoint.through).state;
  return { ...checkpoint, start, commands, sources, paused, after, crossed };
}
