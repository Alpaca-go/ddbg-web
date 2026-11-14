import { basicQuests, readBasicQuest } from "../../data/src/basic-quests";
import { roomCatalogSchema } from "../../data/src/room";
import { wealdRoomCatalogSchema } from "../../data/src/weald-room";
import type { DungeonState } from "./dungeon";

export type ExpeditionRoomRegion = "ruins" | "weald";

export const ORDINARY_EXPEDITION_ROOM_COUNT = 9 as const;

export function expeditionRegionForQuestId(questId: string | undefined): ExpeditionRoomRegion {
  const quest = questId ? basicQuests.find((q) => q.id === questId) : undefined;
  return quest?.expeditionRegion === "weald" ? "weald" : "ruins";
}

export function readExpeditionRoomRegion(
  d: Pick<
    DungeonState,
    "questDistribution" | "bossExpeditionRegion" | "locationBossThreats" | "bossLocationSources"
  >,
): ExpeditionRoomRegion {
  if (
    d.locationBossThreats &&
    d.bossLocationSources &&
    d.bossExpeditionRegion === "weald" &&
    d.questDistribution?.questId === "quest:p019"
  )
    return "weald";
  return expeditionRegionForQuestId(readBasicQuest(d.questDistribution)?.id);
}

export function expeditionRoomCatalogParses(cards: unknown, region: ExpeditionRoomRegion): boolean {
  return region === "weald"
    ? wealdRoomCatalogSchema.safeParse(cards).success
    : roomCatalogSchema.safeParse(cards).success;
}

export function ordinaryRoomCardsInCatalog<
  T extends { readonly id: string; readonly location: string; readonly boss?: boolean },
>(cards: readonly T[], region: ExpeditionRoomRegion): readonly T[] {
  if (region === "weald") return cards.filter((c) => c.location === "weald" && !c.boss);
  return cards.filter((c) => c.location === "ruins" && !c.boss);
}

export function expeditionRoomDeckWithoutSetAside(
  cards: readonly { readonly id: string; readonly location: string; readonly boss?: boolean }[],
  region: ExpeditionRoomRegion,
  setAsideRoomCardId?: string | readonly string[],
) {
  const pool = ordinaryRoomCardsInCatalog(cards, region);
  const aside =
    typeof setAsideRoomCardId === "string" ? [setAsideRoomCardId] : (setAsideRoomCardId ?? []);
  if (!aside.length) return pool.map((c) => c.id);
  if (
    new Set(aside).size !== aside.length ||
    aside.some((id) => !pool.some((c) => c.id === id)) ||
    pool.length !== ORDINARY_EXPEDITION_ROOM_COUNT
  )
    throw new Error("旁置房间牌需要完整地点普通房间目录（R-048）");
  return pool.filter((c) => !aside.includes(c.id)).map((c) => c.id);
}
