import { readExpeditionRoomRegion } from "./expedition-room-catalog";
import { basicQuests } from "../../data/src/basic-quests";
import { curioPoolSchemaForLocation } from "../../data/src/curio-pool";
import type { DungeonState } from "./dungeon";

/** 由已登记任务决定地点；不由牌的命名空间或已选扩展推断目标地点。 */
export function questCurioCatalogSchema(questId: string | undefined) {
  const region = basicQuests.find((quest) => quest.id === questId)?.expeditionRegion;
  // 旧沙盒无任务、核心最暗流程沿用原核心目录；不改变旧档重放数据。
  return curioPoolSchemaForLocation(!region || region === "darkestDungeon" ? "ruins" : region);
}

export function dungeonCurioCatalogValid(d: DungeonState): boolean {
  try {
    if (readExpeditionRoomRegion(d) === "weald")
      return (
        d.contentPacks?.includes("weald") === true &&
        curioPoolSchemaForLocation("weald").safeParse(d.curio?.cards).success
      );
    return questCurioCatalogSchema(d.questDistribution?.questId).safeParse(d.curio?.cards).success;
  } catch {
    return false;
  }
}
