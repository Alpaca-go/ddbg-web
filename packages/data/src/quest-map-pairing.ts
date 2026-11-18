import layoutsFile from "../normalized/corebox/dungeon_layouts.json";
import {
  dungeonLayoutFileSchema,
  dungeonLayoutSchema,
  roomDistributionTokenTotal,
  type DungeonLayout,
} from "./dungeon-layout";
import { FORMAL_WEALD_HIGHER_TASK_QUEST_IDS, isSandboxWealdEmbarkQuest } from "./basic-quests";
import type { ContentPackId } from "./content-packs";

/** R-046 / R-116：8 槽遗迹 vs 16 槽最暗地牢（红边 QuestMap p11/p12，VQ-08/09）。 */
export type QuestExpeditionRegion = "ruins" | "darkestDungeon" | "weald";

/** 未列入生产路径的 Weald 出征仍拒绝（正式路径见 R-272／`formalWealdProductionEmbarkAllowed`）。 */
export function expeditionLocationEmbarkBlockReason(
  expeditionRegion: QuestExpeditionRegion,
): string | null {
  if (expeditionRegion === "weald") return "Weald 任务未列入当前正式出征生产路径（R-272）";
  return null;
}

/** R-272：核心 + Weald 正式 Stygian／Standard／Radiant 生产路径（`createCampaignQuest`、村庄出征）。 */
export function formalWealdProductionEmbarkAllowed(
  expeditionRegion: QuestExpeditionRegion,
  questId: string,
  packs?: readonly ContentPackId[],
  wealdHigherQuestOffers?: true | "tasks-v1",
): boolean {
  if (expeditionRegion !== "weald" || !packs?.includes("weald")) return false;
  if (isSandboxWealdEmbarkQuest(questId)) return true;
  if (!wealdHigherQuestOffers) return false;
  if (questId === "quest:weald:p015") return true;
  return (
    wealdHigherQuestOffers === "tasks-v1" &&
    (FORMAL_WEALD_HIGHER_TASK_QUEST_IDS as readonly string[]).includes(questId)
  );
}

/** 村庄与战役起点共用；允许任务返回 null，否则回退 `expeditionLocationEmbarkBlockReason`。 */
export function sandboxExpeditionEmbarkBlockReason(
  expeditionRegion: QuestExpeditionRegion,
  questId: string,
  packs?: readonly ContentPackId[],
  wealdHigherQuestOffers?: true | "tasks-v1",
): string | null {
  if (formalWealdProductionEmbarkAllowed(expeditionRegion, questId, packs, wealdHigherQuestOffers))
    return null;
  return expeditionLocationEmbarkBlockReason(expeditionRegion);
}

const parsedLayouts = dungeonLayoutFileSchema.parse(layoutsFile).layouts;

export function coreQuestMapLayouts(): readonly DungeonLayout[] {
  return parsedLayouts;
}

export function dungeonLayoutRoomSlotCount(layout: Pick<DungeonLayout, "nodes">): number {
  return layout.nodes.filter((n) => n.kind === "room").length;
}

export function inferQuestMapRegion(layout: Pick<DungeonLayout, "nodes">): QuestExpeditionRegion {
  return dungeonLayoutRoomSlotCount(layout) === 16 ? "darkestDungeon" : "ruins";
}

/** R-250：Weald 出征共用核心包八槽 QuestMap；任务 `expeditionRegion` 仍为 weald。 */
export function questMapLayoutMatchesExpedition(
  layout: Pick<DungeonLayout, "nodes">,
  expeditionRegion: QuestExpeditionRegion,
  tokenTotal: number,
): boolean {
  const layoutRegion = inferQuestMapRegion(layout);
  if (expeditionRegion === "weald") {
    return tokenTotal === 8 && layoutRegion === "ruins";
  }
  return layoutRegion === expeditionRegion;
}

export function questIdPageNumber(questId: string): number | null {
  const m = /^quest:p(\d+)$/.exec(questId);
  if (!m) return null;
  const page = Number(m[1]);
  return Number.isInteger(page) && page > 0 ? page : null;
}

export function questMapLayoutPageNumber(layout: Pick<DungeonLayout, "source">): number {
  return layout.source.page;
}

/** 任务卡与 QuestMap 是否仅因 PDF 页码同号而被硬绑（R-116 禁止）。 */
export function isQuestMapPageHardBind(
  questId: string,
  layout: Pick<DungeonLayout, "source">,
): boolean {
  const questPage = questIdPageNumber(questId);
  return questPage !== null && questPage === layout.source.page;
}

export type QuestMapPairingInput = {
  readonly id: string;
  readonly distribution: Pick<
    import("./dungeon-layout").RoomDistribution,
    "counts" | "randomizeNonObjective"
  >;
  readonly expeditionRegion: QuestExpeditionRegion;
};

function layoutEmbarkBlocked(layout: DungeonLayout): string | null {
  if (layout.unresolvedMarkers?.length) return "未解释标记";
  if (layout.nodes.some((n) => n.kind === "unresolved")) return "未解释标记";
  return null;
}

/** 与任务代币总数、出征地点兼容的 QuestMap 候选（不按 quest 页码 = map 页码筛选）。 */
export function compatibleQuestMapLayouts(
  quest: QuestMapPairingInput,
  layouts: readonly DungeonLayout[] = parsedLayouts,
): DungeonLayout[] {
  const tokenTotal = roomDistributionTokenTotal(quest.distribution);
  return layouts.filter((layout) => {
    if (dungeonLayoutRoomSlotCount(layout) !== tokenTotal) return false;
    if (!questMapLayoutMatchesExpedition(layout, quest.expeditionRegion, tokenTotal)) return false;
    return true;
  });
}

/**
 * 为出征 / 沙盒选一张兼容 QuestMap（R-116）。
 * 优先 `review: confirmed`；同条件下用 seed+cursor 稳定择一，**不**按任务页码 = 地图页码。
 */
export function pickQuestMapLayout(
  quest: QuestMapPairingInput,
  seed: number,
  cursor = 0,
  layouts: readonly DungeonLayout[] = parsedLayouts,
): DungeonLayout {
  const candidates = compatibleQuestMapLayouts(quest, layouts);
  if (!candidates.length) {
    throw new Error(
      `无兼容 QuestMap：${quest.id} tokenTotal=${roomDistributionTokenTotal(quest.distribution)} region=${quest.expeditionRegion}（R-046 / R-116）`,
    );
  }
  const confirmed = candidates.filter((l) => l.review === "confirmed");
  const pool = (confirmed.length ? confirmed : candidates)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  const idx = Math.abs(seed + cursor) % pool.length;
  return dungeonLayoutSchema.parse(pool[idx]!);
}

export function pickQuestMapLayoutId(
  quest: QuestMapPairingInput,
  seed: number,
  cursor = 0,
  layouts: readonly DungeonLayout[] = parsedLayouts,
): string {
  return pickQuestMapLayout(quest, seed, cursor, layouts).id;
}

export function pickEmbarkQuestMapLayout(
  quest: QuestMapPairingInput,
  seed: number,
  cursor = 0,
  layouts: readonly DungeonLayout[] = parsedLayouts,
): DungeonLayout {
  const embarkReady = compatibleQuestMapLayouts(quest, layouts).filter(
    (l) => layoutEmbarkBlocked(l) === null,
  );
  if (!embarkReady.length) {
    throw new Error(
      `无可出征 QuestMap：${quest.id}（槽数/地点匹配但均 pending 或未解释标记，R-048 / R-116）`,
    );
  }
  const confirmed = embarkReady.filter((l) => l.review === "confirmed");
  const pool = (confirmed.length ? confirmed : embarkReady)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  const idx = Math.abs(seed + cursor) % pool.length;
  return dungeonLayoutSchema.parse(pool[idx]!);
}
