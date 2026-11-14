import { readExpeditionRoomRegion, expeditionRegionForQuestId } from "./expedition-room-catalog";
import coreCurios from "../../data/normalized/corebox/curio.json";
import coreRooms from "../../data/normalized/corebox/room.json";
import medium from "../../data/normalized/extension/weald/monster_medium.json";
import large from "../../data/normalized/extension/weald/monster_large.json";
import wealdCurios from "../../data/normalized/extension/weald/curio.json";
import { curioFileSchema, wealdCurioFileSchema } from "../../data/src/curio";
import { roomFileSchema } from "../../data/src/room";
import { basicQuests } from "../../data/src/basic-quests";
import { rebuildLocationQuestDecks } from "./location-quest-sources";
import { WEALD_APPROVED_ROOM_CARDS } from "./expansions/weald/room-catalog";
import type { DungeonState } from "./dungeon";

/** W-02 / R9–10：地点来源来自随程序交付的数据；不把上一趟活动堆当新地点来源。 */
export function nextExpeditionLocationDecks(d: DungeonState, questId: string) {
  const quest = basicQuests.find((q) => q.id === questId)!;
  const region =
    d.bossLocationSources &&
    d.locationBossThreats &&
    questId === "quest:p019" &&
    d.activeBossThreatScriptId === "boss:weald:hag:1"
      ? "weald"
      : expeditionRegionForQuestId(questId);
  if (region !== "weald" && readExpeditionRoomRegion(d) !== "weald") return null;
  if (!d.contentPacks?.includes("weald") || !d.battleCatalog || !d.monsterPool)
    throw new Error("地点切换需要已选 Weald 包与完整目录（W-02）");
  const sources = {
    catalog: {
      ...d.battleCatalog,
      monsters: d.battleCatalog.monsters.filter((m) => !m.id.includes(":weald:")),
    },
    monsters: d.monsterPool.cards,
    curios: curioFileSchema.parse(coreCurios).cards,
    rooms: roomFileSchema.parse(coreRooms).cards,
    resolveCards: d.resolveCards,
    weald: { medium, large, curios: wealdCurioFileSchema.parse(wealdCurios).cards },
  };
  const decks = rebuildLocationQuestDecks(
    sources,
    region,
    questId === "quest:p019" ? (d.campaignLevel ?? 1) : quest.level,
    d.contentPacks,
  );
  const cards = region === "weald" ? WEALD_APPROVED_ROOM_CARDS : sources.rooms;
  return {
    // 保留核心战斗来源供下一次切回；随机抽牌仍严格由地点怪物池限定。
    battleCatalog: {
      ...sources.catalog,
      monsters: [
        ...sources.catalog.monsters,
        ...decks.catalog.monsters.filter((m) => m.id.includes(":weald:")),
      ],
    },
    roomCards: { cards, deck: null, discard: [], active: null },
    monsterPool: {
      ...decks.monsterPool,
      ...("monsterDrawScope" in quest ? { monsterDrawScope: quest.monsterDrawScope } : {}),
    },
    curio: { cards: decks.curios, deck: null, discard: [], active: null },
    ...("setAsideRoomCardId" in quest ? { setAsideRoomCardId: quest.setAsideRoomCardId } : {}),
  } satisfies Partial<DungeonState>;
}
