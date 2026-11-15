import { createCoreDungeonQuest } from "../../../../packages/engine/src/dungeon-quest-entry";
import {
  coreParty,
  coreQuestSources,
} from "../../../../packages/engine/src/test-helpers/core-quest";
import { naturalQuest } from "../../../../packages/engine/src/test-helpers/natural-quest";
import { applyCommand, type GameState } from "../../../../packages/engine/src/command";

/** 固定seed17原补员路径的真实页面检查点，不改伤口、站位或骰序。 */
export function pounderUiFixture() {
  const initial = createCoreDungeonQuest(
    17,
    "quest:p019",
    "standard",
    coreParty,
    coreQuestSources,
    true,
    null,
    ["core", "weald"],
  );
  const established = applyCommand(initial, {
    type: "establishImminentThreat",
    locationBosses: true,
    locationSources: true,
    pounderDungeonThreats: true,
    pounderHamletThreats: true,
    pounderBossBattles: true,
  });
  let bound: GameState | undefined, turn: GameState | undefined;
  naturalQuest(17, "quest:p019", true, coreQuestSources, 2, {
    continueFrom: established.state,
    handleDeaths: true,
    observe(state, command) {
      if (
        command.type === "prepareDungeonBattle" &&
        state.dungeon?.roomCards?.active?.cardId === "room:weald:p012"
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
  return { initial, bound, turn };
}
