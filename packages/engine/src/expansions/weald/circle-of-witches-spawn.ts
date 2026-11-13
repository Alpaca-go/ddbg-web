import { readBasicQuest } from "../../../../data/src/basic-quests";
import exceptionFile from "../../../../data/normalized/extension/weald/quest_exception_monsters.json";
import type { ApplyResult, GameState } from "../../command";
import type { DungeonState } from "../../dungeon";
import { allRuinsRoomCardIds, readSetAsideRoomCardId } from "../../dungeon-objective";
import {
  expeditionRoomCatalogParses,
  ordinaryRoomCardsInCatalog,
  ORDINARY_EXPEDITION_ROOM_COUNT,
  readExpeditionRoomRegion,
} from "../../expedition-room-catalog";
import { dungeonMonsterPoolCatalogValid } from "../../monster-pool-validation";
import { dungeonMonsterPoolThrough } from "../../monster-pool-runtime";
import type { SkillStance } from "../../hero-skill";
import { createRng } from "../../rng";
import { spawnMonsters, type SpawnCard } from "../../spawn";

export const WEALD_CRONE_EXCEPTION_CARD_ID = "monster_medium:weald:p015" as const;
export const WEALD_CRONE_EXCEPTION_INSTANCE_ID = "quest-exception:weald:crone:0" as const;

type ExceptionCatalogCard = {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly life: number;
  readonly speed: number;
  readonly type_position_tags: readonly string[];
};

/** 中型非 Large 占格与核准 I 级 Weald 中型目录一致，不另写 `stanceSlots`（R-048）。 */
const CRONE_STANCE_SLOTS = 1 as const;

const exceptionCatalog = ((): ExceptionCatalogCard | undefined => {
  const file = exceptionFile as { cards: ExceptionCatalogCard[] };
  const card = file.cards.find((c) => c.id === WEALD_CRONE_EXCEPTION_CARD_ID);
  if (
    !card ||
    card.level !== 2 ||
    card.life !== 12 ||
    card.speed !== 3 ||
    !card.type_position_tags.includes("Back")
  )
    return undefined;
  return card;
})();

export function readQuestExceptionSpawnFromState(d: DungeonState) {
  const quest = readBasicQuest(d.questDistribution);
  return quest && "questExceptionSpawn" in quest ? quest.questExceptionSpawn : undefined;
}

function croneSpawnCard(): SpawnCard | undefined {
  if (!exceptionCatalog) return undefined;
  return {
    instanceId: WEALD_CRONE_EXCEPTION_INSTANCE_ID,
    cardId: exceptionCatalog.id,
    edge: "back",
    stanceSlots: CRONE_STANCE_SLOTS,
    verified: false,
  };
}

export function wealdCroneExceptionObjectiveActive(d: DungeonState): boolean {
  const quest = readBasicQuest(d.questDistribution);
  if (!quest || quest.id !== "quest:weald:p002") return false;
  const room = d.rooms.find((r) => r.id === d.position);
  if (room?.kind !== "objective") return false;
  const aside = readSetAsideRoomCardId(d);
  const activeId = d.roomCards?.active?.cardId;
  return aside !== undefined && activeId === aside;
}

export function wealdCroneExceptionOutsidePoolIds(d: DungeonState): readonly string[] {
  if (!d.monsterPool?.active || d.monsterPool.active.roomId !== d.position) return [];
  if (
    !d.monsterPool.active.monsters.some((m) => m.instanceId === WEALD_CRONE_EXCEPTION_INSTANCE_ID)
  )
    return [];
  return [WEALD_CRONE_EXCEPTION_INSTANCE_ID];
}

/** R-247：Crone 在抽牌序首位；栏满时由 `spawnMonsters` 替换一只小型怪（第 16 页）。 */
export function spawnCircleOfWitchesEncounter(
  crone: SpawnCard,
  poolDeck: readonly SpawnCard[],
  deployment: Readonly<Record<SkillStance, string>>,
) {
  return spawnMonsters([crone, ...poolDeck], deployment, { allowUnverified: true });
}

/** p002 目标房：II Crone 例外 + I 级混池补满；非目标房返回 undefined。 */
export function prepareWealdQuestExceptionMonsterDeployment(
  state: GameState,
  deployment: Readonly<Record<SkillStance, string>>,
): ApplyResult | undefined {
  const d = state.dungeon!;
  if (!wealdCroneExceptionObjectiveActive(d)) return undefined;
  const plan = readQuestExceptionSpawnFromState(d);
  if (!plan || plan.combatCardId !== WEALD_CRONE_EXCEPTION_CARD_ID) return undefined;
  if (d.questExceptionComponentAvailable === false)
    return {
      state,
      events: [
        {
          type: "commandRefused",
          message: "Circle of Witches 组件 Crone 未在任务组件区可用，不能重复部署（R-247）",
        },
      ],
    };
  const pool = d.monsterPool!;
  const refuse = (message: string): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message }],
  });
  if (!dungeonMonsterPoolCatalogValid(d))
    return refuse("怪物目录地点或核准字段无效，未部署（R9、W3、R-048）");
  if (pool.active || pool.discarded.length)
    return refuse("本场怪物已记录或牌堆状态不一致；不能重抽 / 重洗 / 发奖励");
  const crone = croneSpawnCard();
  if (!crone) return refuse("II 级 Crone 例外目录未登记，不能伪造部署（R-244、R-048）");
  const active = d.roomCards!.active!;
  const roomRegion = readExpeditionRoomRegion(d);
  const roomIds = allRuinsRoomCardIds(d, active.cardId);
  if (
    roomIds.length !== ORDINARY_EXPEDITION_ROOM_COUNT ||
    new Set(roomIds).size !== ORDINARY_EXPEDITION_ROOM_COUNT ||
    roomIds.some(
      (id) => !ordinaryRoomCardsInCatalog(d.roomCards!.cards, roomRegion).some((c) => c.id === id),
    ) ||
    !expeditionRoomCatalogParses(d.roomCards?.cards, roomRegion)
  )
    return refuse("房间牌堆不守恒，不能推进怪物部署");
  const dungeonLevel = d.explorationSetup?.dungeonLevel;
  if (!dungeonLevel || dungeonLevel !== 1)
    return refuse("Circle of Witches 仅 I 级出征；Crone 为 II 级任务例外（R-244）");
  const catalog = dungeonMonsterPoolThrough(pool, dungeonLevel);
  const ids = pool.remaining ?? catalog.map((card) => card.instanceId);
  if (
    ids.length !== catalog.length ||
    new Set(ids).size !== catalog.length ||
    ids.some((id) => !catalog.some((c) => c.instanceId === id))
  )
    return refuse("怪物牌堆不守恒，不能重新抽牌");
  const deck = ids.map((id) => catalog.find((card) => card.instanceId === id)!);
  const rng = createRng(state.seed);
  for (let i = 0; i < d.cursor; i++) rng.next();
  const cursor = d.cursor;
  for (let i = pool.remaining === null ? deck.length - 1 : 0; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  const spawned = spawnCircleOfWitchesEncounter(crone, deck, deployment);
  if (spawned.type === "refused") return refuse(spawned.reason);
  if (spawned.monsters.reduce((n, m) => n + m.stanceSlots, 0) !== 4)
    return refuse("牌堆未填满四姿态，不提交半场部署");
  if (!spawned.monsters.some((m) => m.cardId === WEALD_CRONE_EXCEPTION_CARD_ID))
    return refuse("目标房未部署 II 级 Crone（R-247）");
  const remaining = spawned.remaining.map((card) => card.instanceId);
  const discardedIds = [...pool.discarded, ...spawned.discarded.map((card) => card.instanceId)];
  if (
    new Set(remaining).size !== remaining.length ||
    remaining.some((id) => !catalog.some((entry) => entry.instanceId === id)) ||
    new Set(discardedIds).size !== discardedIds.length ||
    discardedIds.some((id) => !catalog.some((entry) => entry.instanceId === id))
  )
    return refuse("怪物牌堆不守恒，不能推进任务例外生成");
  const blockedReason =
    "已部署 II 级 Crone（任务例外，不进 I 级 14 实体池）并由 Weald+Common I 级牌堆补满；技能效果未核准，本刀只接部署 / 位序 / 组件复用 / XP（R-244、R-247、R-048）。";
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        cursor: cursor + (pool.remaining === null ? deck.length - 1 : 0),
        questExceptionComponentAvailable: false,
        monsterPool: {
          ...pool,
          remaining,
          discarded: discardedIds,
          active: { roomId: d.position, monsters: spawned.monsters, blockedReason },
        },
        roomCards: { ...d.roomCards!, active: { ...active, blockedReason } },
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `Circle of Witches 目标房：${blockedReason}`,
      },
    ],
  };
}

export function recordWealdCroneKillOnBattleFinish(
  d: DungeonState,
  defeatedMonsterCardIds: readonly string[],
) {
  if (d.questDistribution?.questId !== "quest:weald:p002") return d;
  const added = defeatedMonsterCardIds.filter((id) => id === WEALD_CRONE_EXCEPTION_CARD_ID).length;
  if (!added && d.questExceptionComponentAvailable !== false) {
    return { ...d, questExceptionComponentAvailable: true };
  }
  return {
    ...d,
    questExceptionCroneKills: (d.questExceptionCroneKills ?? 0) + added,
    questExceptionComponentAvailable: true,
  };
}
