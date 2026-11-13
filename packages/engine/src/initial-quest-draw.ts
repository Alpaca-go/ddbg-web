import type { ContentPackId } from "../../data/src/content-packs";
import { basicQuests } from "../../data/src/basic-quests";
import type { PendingChoice } from "./command";
import {
  executeHamletQuestDrawMode,
  legalHamletQuestDrawModes,
  type HamletQuestDrawOptionId,
} from "./hamlet-location-quest-draw";

/** W-02（W3）：首趟与村庄共用地点堆；没有当前任务或历史弃置。 */
export function initialQuestDrawModes(packs: readonly ContentPackId[] | undefined) {
  return legalHamletQuestDrawModes(1, packs, "", []);
}

export function drawInitialQuestOffers(
  seed: number,
  packs: readonly ContentPackId[] | undefined,
  mode: HamletQuestDrawOptionId,
) {
  if (
    !Number.isSafeInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff ||
    !initialQuestDrawModes(packs).some((plan) => plan.optionId === mode)
  )
    throw new Error("首趟任务抽法需要已选 Weald 包和合法抽法（W-02）");
  const drawn = executeHamletQuestDrawMode(mode, seed, 0, 1, packs, "", []);
  if ("reason" in drawn) throw new Error(drawn.reason);
  const pendingChoice: PendingChoice = {
    id: `initial-quest:${seed}:${mode}`,
    actorId: "party",
    prompt: "从抽出的两张任务中选择一张，另一张永久弃置。",
    options: drawn.offers.map((id) => ({ id, label: basicQuests.find((q) => q.id === id)!.name })),
  };
  return { ...drawn, pendingChoice };
}
