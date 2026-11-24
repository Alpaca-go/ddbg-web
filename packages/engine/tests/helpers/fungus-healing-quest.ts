import type { QuestStart } from "../../../data/src/quest-save";
import { applyCommand, type Command, type GameState } from "../../src/shared/core/command";
import { createCoreDungeonQuest } from "../../src/shared/dungeon/dungeon-quest-entry";
import { livingNecroticFungus } from "../../src/weald/necrotic-fungus";
import { naturalParty, naturalQuest } from "./natural-quest";
import { disinfectionSources as sources } from "./disinfection-quest";

/** 已有 seed1 Fungal Research，仅采集实际 Divine Grace 因 W-04 被拒绝的回合。 */
export function fungusHealingQuest() {
  const start: QuestStart = {
    seed: 1,
    questId: "quest:weald:p001",
    mode: "radiant",
    party: naturalParty,
    contentPacks: ["core", "weald"],
    bossEdgeRooms: true,
    stygianRoomRules: "full",
  };
  const initial = createCoreDungeonQuest(
    1,
    start.questId,
    start.mode,
    start.party,
    sources,
    true,
    "full",
    start.contentPacks,
  );
  const commands: Command[] = [];
  let before: GameState | undefined, heal: Command | undefined;
  const run = naturalQuest(1, start.questId, true, sources, 4, {
    continueFrom: initial,
    survival: true,
    handleDeaths: true,
    fungalResearch: "retain-one",
    heroAction(game) {
      const b = game.battle!,
        turn = b.encounter!.turn;
      if (turn.type !== "hero" || turn.mustMove || !livingNecroticFungus(b).length)
        return undefined;
      const actor = b.entities.find((e) => e.id === turn.actorId)!;
      if (!actor.skillIds.includes("hero_skill:core:h05:p094")) return undefined;
      for (const target of b.entities.filter((e) => e.side === "hero" && !e.dead)) {
        const c = {
          type: "playHeroSkill",
          actorId: actor.id,
          targetId: target.id,
          skillId: "hero_skill:core:h05:p094",
          allTrinkets: true,
        } as const;
        const r = applyCommand(game, c);
        if (r.events.some((e) => e.type === "commandRefused" && e.message.includes("W-04"))) {
          before = game;
          heal = c;
          throw new Error("fungus healing checkpoint ready");
        }
      }
      return undefined;
    },
    observe(_game, c) {
      commands.push(c);
    },
  });
  if (!before || !heal) throw new Error(`缺禁疗自然检查点：${run.stopReason}`);
  return { start, before, heal, commands, sources };
}
