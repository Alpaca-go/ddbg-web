import type { ApplyResult, GameState } from "./command";
import { readBasicQuest } from "../../data/src/basic-quests";
import { dungeonProvisionWindow } from "./dungeon-provision-window";
import { rejectBattleCommand } from "./battle";

export function canSetupForwardCamp(state: GameState): boolean {
  const d = state.dungeon;
  if (!d || state.battle || !dungeonProvisionWindow(d)) return false;
  const quest = readBasicQuest(d.questDistribution);
  if (quest?.id !== "quest:p012") return false;
  const room = d.rooms.find((r) => r.id === d.position);
  if (room?.kind !== "empty" || !room.cleared) return false;
  const provisions = d.explorationSetup?.provisions ?? [];
  return provisions.some((p) => p.face === "torch" || p.face === "tool");
}

/** R-113：已清理 Empty 房消耗 1 Torch 或 1 Tool 设营；同房可多次，不移除 Empty 代币。 */
export function setupForwardCamp(
  state: GameState,
  command: { readonly type: "setupForwardCamp"; readonly provisionId: string },
): ApplyResult {
  const d = state.dungeon;
  const refuse = (message: string) => rejectBattleCommand(state, message);
  if (!d || state.battle || !dungeonProvisionWindow(d))
    return refuse("设营须在导航就绪、完整效果之间进行（R-113）");
  const quest = readBasicQuest(d.questDistribution);
  if (quest?.id !== "quest:p012") return refuse("仅 Forward Camps III 可在 Empty 房设营（R-113）");
  const room = d.rooms.find((r) => r.id === d.position);
  if (room?.kind !== "empty" || !room.cleared)
    return refuse("须在已清理的 Empty 房设营；不移除 Empty 代币（R-113）");
  const setup = d.explorationSetup;
  if (!setup) return refuse("缺少探索补给池（R-048）");
  const provision = setup.provisions.find((p) => p.id === command.provisionId);
  if (!provision || (provision.face !== "torch" && provision.face !== "tool"))
    return refuse("设营须消耗 1 颗 Torch 或 1 颗 Tool（Shovel）（R-113）");
  const setups = (d.forwardCampSetups ?? 0) + 1;
  if (!Number.isSafeInteger(setups) || setups < 1) return refuse("设营次数记录无效（R-113）");
  const label = provision.face === "torch" ? "Torch" : "Tool（Shovel）";
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        pressureSource: "provision",
        forwardCampSetups: setups,
        explorationSetup: {
          ...setup,
          provisions: setup.provisions.filter((p) => p.id !== provision.id),
        },
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `${d.position}：消耗 ${label} 设 forward camp（第 ${setups} 次）；Empty 代币保留（R-113）`,
      },
    ],
  };
}
