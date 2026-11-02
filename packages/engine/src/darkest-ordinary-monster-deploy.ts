import {
  darkestDungeonMonsterInstances,
  type DarkestMonsterPoolFile,
} from "../../data/src/darkest-monster-pool";
import { roomCatalogSchema } from "../../data/src/room";
import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { isDarkestQuest } from "./darkest-setup";
import type { SkillStance } from "./hero-skill";
import { spawnMonsters, type SpawnCard, type SpawnPlacement } from "./spawn";

const PLACEHOLDER_AREAS: Readonly<Record<SkillStance, string>> = {
  aggressive: "darkest-ordinary-aggressive",
  defensive: "darkest-ordinary-defensive",
  ranged: "darkest-ordinary-ranged",
  support: "darkest-ordinary-support",
};

const FIELD_LABELS = {
  speed: "移动值",
  stanceGroups: "姿态选招",
  unverifiedIcons: "未确认图标",
} as const;

function readDarkestDeckInstances(pool: DarkestMonsterPoolFile) {
  return darkestDungeonMonsterInstances(pool);
}

function spawnCardsForDeck(
  pool: DarkestMonsterPoolFile,
  deckIds: readonly string[],
): SpawnCard[] | undefined {
  const byId = new Map(readDarkestDeckInstances(pool).map((entry) => [entry.instanceId, entry]));
  const cards: SpawnCard[] = [];
  for (const instanceId of deckIds) {
    const instance = byId.get(instanceId);
    if (!instance) return undefined;
    cards.push({ ...instance, verified: false });
  }
  return cards;
}

function deckConservationError(
  d: DungeonState,
  next: {
    readonly remaining: readonly string[];
    readonly discarded: readonly string[];
    readonly activeIds: readonly string[];
  },
): string | undefined {
  const base = d.darkest!.monsterDeck;
  if (base.length !== 26 || new Set(base).size !== 26) return "最暗怪物牌堆不守恒，不能重新抽牌";
  const ids = [...next.remaining, ...next.discarded, ...next.activeIds];
  if (ids.length !== base.length || new Set(ids).size !== base.length)
    return "最暗怪物牌堆不守恒，不能重新抽牌";
  if (ids.some((id) => !base.includes(id))) return "最暗怪物牌堆不守恒，不能重新抽牌";
  return undefined;
}

function missingBattleSummary(
  pool: DarkestMonsterPoolFile,
  monsters: readonly SpawnPlacement[],
): string {
  const labels = monsters.flatMap((monster) => {
    const card = pool.cards.find((entry) => entry.combatCardId === monster.cardId);
    if (!card?.missingBattleFields.length) return [];
    return [
      `${card.name}：${card.missingBattleFields.map((field) => FIELD_LABELS[field]).join(" / ")}`,
    ];
  });
  return labels.length ? `待核实战斗字段：${labels.join("；")}。` : "";
}

export function darkestOrdinaryDeploymentMatches(d: DungeonState): boolean {
  const deployment = d.darkest?.ordinaryDeployment;
  return !!deployment && deployment.roomId === d.position && deployment.monsters.length > 0;
}

/** 普通最暗房已部署或仍缺 roomCards.active 时的停点；不替代 mid-boss hold。 */
export function darkestOrdinaryDeploymentHold(d: DungeonState): string | undefined {
  if (!d.darkest || !isDarkestQuest(d.questDistribution?.questId)) return undefined;
  const room = d.rooms.find((entry) => entry.id === d.position);
  if (room?.kind === "objective") return undefined;
  const deployment = d.darkest.ordinaryDeployment;
  if (darkestOrdinaryDeploymentMatches(d)) {
    const identity = deployment!.monsters.map((m) => m.cardId).join("、");
    return (
      deployment!.blockedReason ||
      `最暗普通遭遇已记录身份（${identity}）；可 deployDarkestOrdinaryEncounter 进入 BattleState 后显式 startBattle 洗先攻；battleReady: false 与 Room Tile 几何未获批，不可用 startDungeonBattle（R-048）。`
    );
  }
  const active = d.roomCards?.active;
  if (active?.roomId === d.position && !active.tileId)
    return "最暗普通房间须先 prepareDungeonBattle 记录房间牌，再 prepareDungeonMonsters 从 26 张牌堆抽遭遇（R-048）。";
  return undefined;
}

/** 非目标房：从 shuffled monsterDeck 真实抽牌记录身份；占位 areaId，不消费 mid-boss 路径。 */
export function prepareDarkestOrdinaryMonsterDeployment(state: GameState): ApplyResult | undefined {
  const d = state.dungeon!;
  if (!d.darkest || !isDarkestQuest(d.questDistribution?.questId)) return undefined;
  const room = d.rooms.find((entry) => entry.id === d.position);
  if (!room || room.kind === "objective" || room.cleared) return undefined;
  const refuse = (message: string): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message }],
  });
  if (d.phase !== "awaitingRoom" || d.pending || d.mustLeaveRoomId === d.position)
    return refuse("需要未清理的最暗普通战斗入口（R36）");
  const catalog = d.roomCards;
  if (!catalog || !roomCatalogSchema.safeParse(catalog.cards).success)
    return refuse("最暗普通房间入口缺完整房间目录（R-048）");
  const active = catalog.active;
  if (!active || active.roomId !== d.position || active.tileId)
    return refuse(
      "需要已绑定的最暗普通房间牌（无获批 Room Tile）；不能替换房间或提前抽怪物（R-048）",
    );
  if (d.darkest.ordinaryDeployment)
    return refuse("本场最暗遭遇已记录或牌堆状态不一致；不能重抽 / 重洗 / 发奖励");
  if (d.darkest.bossDeployment && d.darkest.bossDeployment.roomId === d.position)
    return refuse("最暗 Boss 部署与 26 张牌堆路径互斥（R36）");
  const pool = d.darkest.monsterPool;
  const baseRemaining = d.darkest.monsterDeckRemaining ?? d.darkest.monsterDeck;
  const baseDiscarded = d.darkest.monsterDeckDiscarded ?? [];
  const deckCards = spawnCardsForDeck(pool, baseRemaining);
  if (!deckCards || deckCards.length !== baseRemaining.length)
    return refuse("最暗怪物牌堆身份缺失，不能伪造遭遇（R-048）");
  const spawned = spawnMonsters(deckCards, PLACEHOLDER_AREAS, { allowUnverified: true });
  if (spawned.type === "refused") return refuse(spawned.reason);
  if (spawned.monsters.reduce((count, monster) => count + monster.stanceSlots, 0) !== 4)
    return refuse("牌堆未填满四姿态，不提交最暗普通部署");
  const remaining = spawned.remaining.map((card) => card.instanceId);
  const discarded = [...baseDiscarded, ...spawned.discarded.map((card) => card.instanceId)];
  const activeIds = spawned.monsters.map((monster) => monster.instanceId);
  const conservation = deckConservationError(d, { remaining, discarded, activeIds });
  if (conservation) return refuse(conservation);
  const identitySummary = spawned.monsters
    .map((monster) => `${monster.instanceId}→${monster.cardId}`)
    .join("、");
  const missing = missingBattleSummary(pool, spawned.monsters);
  const blockedReason = `${missing}已从 26 张最暗牌堆抽 ${spawned.drawn} 张（${identitySummary}）；可 deployDarkestOrdinaryEncounter 后 startBattle；占位 areaId 非获批板块；battleReady: false，Room Tile 几何未获批，不可用 startDungeonBattle（R-048）。部署顺序已记录；不重抽，房间未清理，未发奖励。`;
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        darkest: {
          ...d.darkest,
          monsterDeckRemaining: remaining,
          monsterDeckDiscarded: discarded,
          ordinaryDeployment: {
            roomId: d.position,
            monsters: spawned.monsters,
            blockedReason,
          },
        },
        roomCards: { ...catalog, active: { ...active, blockedReason } },
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `最暗普通遭遇（26 张牌堆）已抽 ${spawned.drawn} 张：${blockedReason}`,
      },
    ],
  };
}
