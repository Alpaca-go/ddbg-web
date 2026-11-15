import { heroMovePathLimit } from "../battle-hero-movement";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { naturalParty, naturalQuest } from "./natural-quest";
import { disinfectionSources as sources } from "./disinfection-quest";
import type { QuestStart } from "../../../data/src/quest-save";

/** 固定 seed21；9 号房玩家优先移动至 B 并拾箱，不注入状态、牌序或骰序。 */
export function oursQuest() {
  const start: QuestStart = {
    seed: 21,
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
  let beforePickup = initial;
  let pickupIndex = 0;
  const commands: Command[] = [];
  const rooms = new Set<string>();
  let before: GameState | undefined, after: GameState | undefined;
  let attack: Command | undefined;
  const run = naturalQuest(start.seed, start.questId, true, sources, 2, {
    continueFrom: initial,
    survival: true,
    handleDeaths: true,
    wealdOurs: true,
    heroAction(game) {
      const b = game.battle!,
        turn = b.encounter!.turn;
      if (
        game.dungeon?.roomCards?.active?.cardId !== "room:weald:p009" ||
        turn.type !== "hero" ||
        turn.mustMove
      )
        return undefined;
      const hero = b.entities.find((e) => e.id === turn.actorId)!;
      const pickup = { type: "interactLoot", actorId: hero.id } as const;
      if (
        b.loot?.placed.some((t) => t.areaId === hero.areaId) &&
        !applyCommand(game, pickup).events.some((e) => e.type === "commandRefused")
      )
        return pickup;
      const paths = new Map<string, string[]>([[hero.areaId, []]]);
      for (const [id, path] of paths) {
        for (const next of [...b.areas.find((a) => a.id === id)!.adjacent].sort())
          if (!paths.has(next)) paths.set(next, [...path, next]);
      }
      const path = paths.get("B") ?? [];
      for (
        let length = Math.min(path.length, heroMovePathLimit(game, hero.id));
        length > 0;
        length--
      ) {
        const move = { type: "moveHero", actorId: hero.id, path: path.slice(0, length) } as const;
        if (!applyCommand(game, move).events.some((e) => e.type === "commandRefused")) return move;
      }
      return undefined;
    },
    observe(game, command, events = []) {
      if (
        command.type === "interactLoot" &&
        previous.dungeon?.roomCards?.active?.cardId === "room:weald:p009"
      ) {
        beforePickup = previous;
        pickupIndex = commands.length;
      }
      if (game.dungeon?.roomCards?.active) rooms.add(game.dungeon.roomCards.active.cardId);
      if (
        command.type === "startBattle" &&
        game.dungeon?.roomCards?.active?.cardId === "room:weald:p009"
      )
        beforeStart = previous;
      if (events.some((e) => e.type === "passiveTriggered" && e.trigger === "ours")) {
        before = previous;
        after = game;
        attack = command;
        throw new Error("Ours checkpoint ready");
      }
      commands.push(command);
      previous = game;
    },
  });
  if (!before || !after || !attack)
    throw new Error(`缺 Ours 自然检查点：${run.stopReason} rooms=${[...rooms].join(",")}`);
  const pickupSteps = [...commands.slice(pickupIndex), attack];
  return {
    start,
    before,
    beforeStart,
    beforePickup,
    pickupIndex,
    pickupSteps,
    after,
    attack,
    commands,
    sources,
  };
}
