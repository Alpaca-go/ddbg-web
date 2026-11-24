import { createCoreDungeonQuest } from "../../../../packages/engine/src/shared/dungeon/dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../../packages/engine/tests/helpers/core-quest";
import { naturalQuest } from "../../../../packages/engine/tests/helpers/natural-quest";
import {
  applyCommand,
  type Command,
  type GameState,
} from "../../../../packages/engine/src/shared/core/command";
import type { CoreQuestSources } from "../../../../packages/engine/src/shared/dungeon/dungeon-quest-entry";
import { createQuestSave } from "../../../../packages/engine/src/shared/quest/quest-save";

/** 固定seed17原补员路径的真实页面检查点，不改伤口、站位或骰序。 */
export function pounderUiFixture(sources: CoreQuestSources = coreQuestSources) {
  const initial = createCoreDungeonQuest(
    17,
    "quest:p019",
    "standard",
    coreParty,
    sources,
    true,
    null,
    ["core", "weald"],
  );
  const threat = {
    type: "establishImminentThreat",
    locationBosses: true,
    locationSources: true,
    pounderDungeonThreats: true,
    pounderHamletThreats: true,
    pounderBossBattles: true,
  } as const;
  const established = applyCommand(initial, threat);
  const commands: Command[] = [threat];
  let bound: GameState | undefined, turn: GameState | undefined;
  naturalQuest(17, "quest:p019", true, sources, 2, {
    continueFrom: established.state,
    handleDeaths: true,
    observe(state, command) {
      commands.push(command);
      if (
        command.type === "prepareDungeonBattle" &&
        state.dungeon?.roomCards?.active?.cardId === "room:weald:12"
      )
        bound = state;
      const current = state.battle?.encounter?.turn;
      if (
        !turn &&
        !state.battle?.pending &&
        current?.type === "monster" &&
        current.actorId === "boss:pounder"
      )
        turn = state;
      // 页面只用这两个真实检查点；不继续执行已由引擎严格日志测试覆盖的败局。
      if (bound && turn) throw new Error("Pounder UI checkpoints ready");
    },
  });
  if (!bound || !turn) throw new Error("Pounder自然页面检查点未抵达");
  const save = createQuestSave(
    {
      seed: 17,
      questId: "quest:p019",
      mode: "standard",
      party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
      contentPacks: ["core", "weald"],
      bossEdgeRooms: true,
    },
    commands,
    turn,
    sources,
  );
  return { initial, bound, turn, save };
}
