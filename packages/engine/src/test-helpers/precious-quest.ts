import { heroMovePathLimit } from "../battle-hero-movement";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { naturalParty, naturalQuest } from "./natural-quest";
import { disinfectionSources as sources } from "./disinfection-quest";
import type { QuestStart } from "../../../data/src/quest-save";

/** 固定 seed22；Stash 玩家用公开移动趋向 D，空闲时换姿态，不注入状态或骰序。 */
export function preciousQuest() {
  const start: QuestStart = {
    seed: 22,
    questId: "quest:weald:p005",
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
  let previous = initial;
  let beforeStart = initial;
  const commands: Command[] = [];
  const rooms = new Set<string>();
  let before: GameState | undefined, after: GameState | undefined;
  let attack: Command | undefined;
  const run = naturalQuest(start.seed, start.questId, true, sources, 2, {
    continueFrom: initial,
    survival: true,
    handleDeaths: true,
    wealdPrecious: true,
    heroAction(game) {
      const b = game.battle!,
        turn = b.encounter!.turn;
      if (
        game.dungeon?.roomCards?.active?.cardId !== "room:weald:04" ||
        turn.type !== "hero" ||
        turn.mustMove
      )
        return undefined;
      const hero = b.entities.find((e) => e.id === turn.actorId)!;
      const paths = new Map<string, string[]>([[hero.areaId, []]]);
      for (const [id, path] of paths) {
        for (const next of [...b.areas.find((a) => a.id === id)!.adjacent].sort())
          if (!paths.has(next)) paths.set(next, [...path, next]);
      }
      const path = paths.get("D") ?? [];
      for (
        let length = Math.min(path.length, heroMovePathLimit(game, hero.id));
        length > 0;
        length--
      ) {
        const move = { type: "moveHero", actorId: hero.id, path: path.slice(0, length) } as const;
        if (!applyCommand(game, move).events.some((e) => e.type === "commandRefused")) return move;
      }
      return {
        type: "changeStance",
        actorId: hero.id,
        direction: hero.stance === "aggressive" ? "backward" : "forward",
      };
    },
    observe(game, command, events = []) {
      if (game.dungeon?.roomCards?.active) rooms.add(game.dungeon.roomCards.active.cardId);
      if (
        command.type === "startBattle" &&
        game.dungeon?.roomCards?.active?.cardId === "room:weald:04"
      )
        beforeStart = previous;
      if (events.some((e) => e.type === "passiveTriggered" && e.trigger === "precious")) {
        before = previous;
        after = game;
        attack = command;
        throw new Error("Precious checkpoint ready");
      }
      commands.push(command);
      previous = game;
    },
  });
  if (!before || !after || !attack)
    throw new Error(`缺 Precious 自然检查点：${run.stopReason} rooms=${[...rooms].join(",")}`);
  return { start, before, beforeStart, after, attack, commands, sources };
}
