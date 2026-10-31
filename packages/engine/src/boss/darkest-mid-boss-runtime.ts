import { roomCatalogSchema } from "../../../data/src/room";
import type { ApplyResult, GameState } from "../command";
import { rejectBattleCommand } from "../battle";
import type { DungeonState } from "../dungeon";
import type { SkillStance } from "../hero-skill";
import type { SpawnPlacement } from "../spawn";
import { isDarkestQuest } from "../darkest-setup";
import { readDarkestBossEncounter } from "./darkest-content";
import {
  darkestMidBossScriptIdForQuest,
  ensureDarkestMidBossScriptsRegistered,
  readDarkestMidBossRequiredCombatCardIds,
} from "./darkest-mid-boss-scripts";
import { getBossScript } from "./registry";
import { resolveBossScriptIdForQuest } from "./quest-bridge";
import type { BossScriptId } from "./types";

const ROOM_NAMES: Record<string, string> = {
  "room:p023": "Shuffling Horror Room",
  "room:p022": "Templars Room",
  "room:p024": "Mammoth Cyst Room",
};

const PLACEHOLDER_AREAS: Readonly<Record<SkillStance, string>> = {
  aggressive: "darkest-mid-boss-aggressive",
  defensive: "darkest-mid-boss-defensive",
  ranged: "darkest-mid-boss-ranged",
  support: "darkest-mid-boss-support",
};

export type StoredDarkestBossEncounterPlan = {
  readonly resolvedScriptId: BossScriptId;
  readonly questId: "quest:p016" | "quest:p017" | "quest:p018";
  readonly roomCardId: string;
  readonly actorCardIds: readonly string[];
  readonly supportCardIds: readonly string[];
  readonly wiringHold: string;
};

function readMonsterSpawnMeta(
  state: GameState,
  cardId: string,
): Pick<SpawnPlacement, "edge" | "stanceSlots"> | undefined {
  const card = state.dungeon?.battleCatalog?.monsters.find((entry) => entry.id === cardId);
  if (!card?.type_position_tags?.length) return undefined;
  const tags = card.type_position_tags;
  return {
    edge: tags.includes("Back") ? "back" : "front",
    stanceSlots: tags.includes("Large") ? 2 : 1,
  };
}

function supportPlanHoldSummary(supportCardIds: readonly string[]): string {
  if (!supportCardIds.length) return "";
  return `；目录召唤物 ${supportCardIds.join("、")} 未部署（combatReady: false）`;
}

function supportDeployedHoldSummary(supportMonsters: readonly SpawnPlacement[]): string {
  if (!supportMonsters.length) return "";
  const ids = supportMonsters.map((monster) => monster.cardId).join("、");
  return `；支持怪 ${ids} 已记录身份（verified: false；技能召唤执行 hold）`;
}

const STANCE_ORDER: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

function occupiedStanceIndexes(
  placements: readonly Pick<SpawnPlacement, "stance" | "stanceSlots">[],
): Set<number> {
  const occupied = new Set<number>();
  for (const placement of placements) {
    const start = STANCE_ORDER.indexOf(placement.stance);
    for (let slot = start; slot < start + placement.stanceSlots; slot += 1) occupied.add(slot);
  }
  return occupied;
}

function pickOpenStance(occupied: Set<number>, width: 1 | 2): SkillStance | undefined {
  for (const stance of STANCE_ORDER) {
    const start = STANCE_ORDER.indexOf(stance);
    if (start + width > STANCE_ORDER.length) continue;
    let fits = true;
    for (let slot = start; slot < start + width; slot += 1) {
      if (occupied.has(slot)) fits = false;
    }
    if (fits) return stance;
  }
  return undefined;
}

function buildDarkestMidBossSupportPlacements(
  state: GameState,
  questId: StoredDarkestBossEncounterPlan["questId"],
  supportCardIds: readonly string[],
  actorPlacements: readonly SpawnPlacement[],
  refuse: (message: string) => ApplyResult,
): SpawnPlacement[] | ApplyResult {
  const occupied = occupiedStanceIndexes(actorPlacements);
  const supportMonsters: SpawnPlacement[] = [];
  for (const [index, cardId] of supportCardIds.entries()) {
    const meta = readMonsterSpawnMeta(state, cardId);
    if (!meta)
      return refuse(`${cardId} 缺少目录前后排/占格，不能伪造支持怪部署（R-048）`);
    const stance = pickOpenStance(occupied, meta.stanceSlots);
    if (!stance)
      return refuse(`${cardId} 无可用姿态轨占位（Large Boss 占格后 R-048 拒绝重叠）`);
    const start = STANCE_ORDER.indexOf(stance);
    for (let slot = start; slot < start + meta.stanceSlots; slot += 1) occupied.add(slot);
    supportMonsters.push({
      instanceId: `darkest-mid-boss-support:${questId}:${index}`,
      cardId,
      edge: meta.edge,
      stanceSlots: meta.stanceSlots,
      verified: false,
      stance,
      areaId: PLACEHOLDER_AREAS[stance],
    });
  }
  return supportMonsters;
}

/** R36 / R39–41：目标房绑定专属房间与 Boss 脚本；几何与战斗仍 hold。 */
export function prepareDarkestObjectiveBossRoom(state: GameState): ApplyResult | undefined {
  const d = state.dungeon!;
  const room = d.rooms.find((entry) => entry.id === d.position);
  if (!d.darkest || room?.kind !== "objective") return undefined;
  const questId = d.questDistribution?.questId;
  if (!isDarkestQuest(questId)) return undefined;
  const darkestQuestId = questId;
  const refuse = (message: string) => rejectBattleCommand(state, message);
  if (
    state.battle ||
    d.phase !== "awaitingRoom" ||
    d.pending ||
    room.cleared ||
    d.mustLeaveRoomId === d.position
  )
    return refuse("需要未清理的最暗目标房战斗入口（R36）");
  const catalog = d.roomCards;
  if (!catalog || !roomCatalogSchema.safeParse(catalog.cards).success)
    return refuse("最暗 Boss 房间入口缺完整房间目录（R-048）");
  if (catalog.active) return refuse("该房间牌已记录；不能重复绑定最暗 Boss 房间（R36）");
  const encounter = readDarkestBossEncounter(darkestQuestId);
  if (!encounter) return refuse("最暗任务缺少 Boss 内容目录（R36）");
  ensureDarkestMidBossScriptsRegistered();
  const scriptId = resolveBossScriptIdForQuest(darkestQuestId, d);
  const script = scriptId ? getBossScript(scriptId) : undefined;
  if (!scriptId || !script?.combatEntry)
    return refuse("最暗 Boss 脚本未注册或未映射，不能绑定房间（A-4）");
  const card = catalog.cards.find(
    (entry) =>
      entry.id === encounter.roomCardId &&
      entry.location === "darkestDungeon" &&
      entry.boss === true,
  );
  const expectedName = ROOM_NAMES[encounter.roomCardId];
  if (!card || card.name !== expectedName)
    return refuse("最暗 Boss 专属房间身份不一致，未替换普通房间（R-048）");
  const wiringHold = "专属 Room Tile 几何、印刷部署与技能执行未获批（combatReady: false）";
  const plan: StoredDarkestBossEncounterPlan = {
    resolvedScriptId: scriptId,
    questId: darkestQuestId,
    roomCardId: encounter.roomCardId,
    actorCardIds: encounter.actors.map((actor) => actor.cardId),
    supportCardIds: encounter.supportCardIds,
    wiringHold,
  };
  const actorLabel = encounter.actors
    .map((actor) => `${actor.cardId}（${actor.stance}）`)
    .join("、");
  const blockedReason = `${card.name} 已绑定 ${scriptId}：${actorLabel}${supportPlanHoldSummary(encounter.supportCardIds)}；${wiringHold}。保留原牌，不改抽遗迹房间（R36 / R-048）。`;
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        darkest: { ...d.darkest, bossEncounterPlan: plan },
        roomCards: {
          ...catalog,
          active: { roomId: room.id, cardId: card.id, blockedReason },
        },
      },
    },
    events: [{ type: "dungeonUpdated", message: blockedReason }],
  };
}

export function darkestBossDeploymentMatchesPlan(
  d: DungeonState,
  plan: StoredDarkestBossEncounterPlan,
): boolean {
  const deployment = d.darkest?.bossDeployment;
  if (!deployment || deployment.roomId !== d.position) return false;
  if (deployment.resolvedScriptId !== plan.resolvedScriptId) return false;
  const deployed = deployment.monsters.map((monster) => monster.cardId).sort().join(",");
  const expected = [...plan.actorCardIds].sort().join(",");
  return deployed === expected;
}

export function darkestMidBossDeploymentHold(d: DungeonState): string | undefined {
  const plan = d.darkest?.bossEncounterPlan;
  if (!plan || !isDarkestQuest(plan.questId)) return undefined;
  const encounter = readDarkestBossEncounter(plan.questId);
  if (!encounter || encounter.combatReady) return undefined;
  const label = plan.resolvedScriptId;
  if (darkestBossDeploymentMatchesPlan(d, plan)) {
    const deployment = d.darkest?.bossDeployment;
    const supportHold = deployment?.supportMonsters.length
      ? supportDeployedHoldSummary(deployment.supportMonsters)
      : supportPlanHoldSummary(plan.supportCardIds);
    return `${label} 目标房已记录 Boss 身份（${plan.actorCardIds.join("、")}）${supportHold}；可 deployDarkestMidBoss 进入 BattleState 后显式 startBattle 洗先攻；${plan.wiringHold}，不可用 startDungeonBattle（R-048）。`;
  }
  return `${label} 目标房须按目录部署 ${plan.actorCardIds.join("、")}；不能用最暗 26 张牌堆随机遭遇替代（R36 / R-048）。`;
}

/** 目标房：按 darkest_boss_content 记录 Boss 棋子身份；不消费最暗怪物牌堆。 */
export function prepareDarkestMidBossDeployment(state: GameState): ApplyResult | undefined {
  const d = state.dungeon!;
  const plan = d.darkest?.bossEncounterPlan;
  const active = d.roomCards?.active;
  const room = d.rooms.find((entry) => entry.id === d.position);
  if (!d.darkest || !plan || room?.kind !== "objective") return undefined;
  const refuse = (message: string): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message }],
  });
  if (
    d.phase !== "awaitingRoom" ||
    d.pending ||
    room.cleared ||
    active?.roomId !== d.position ||
    active.cardId !== plan.roomCardId
  )
    return refuse("需要已绑定的最暗 Boss 房间牌与目标房（R36）");
  if (d.darkest.bossDeployment)
    return refuse("最暗 Boss 部署已记录；不能重抽 / 重洗 / 发奖励");
  const encounter = readDarkestBossEncounter(plan.questId);
  if (!encounter) return refuse("最暗 Boss 内容目录缺失（R36）");
  const monsters: SpawnPlacement[] = [];
  for (const [index, actor] of encounter.actors.entries()) {
    const meta = readMonsterSpawnMeta(state, actor.cardId);
    if (!meta) return refuse(`${actor.cardId} 缺少目录前后排/占格，不能伪造 Boss 部署（R-048）`);
    monsters.push({
      instanceId: `darkest-mid-boss:${plan.questId}:${index}`,
      cardId: actor.cardId,
      edge: meta.edge,
      stanceSlots: meta.stanceSlots,
      verified: true,
      stance: actor.stance,
      areaId: PLACEHOLDER_AREAS[actor.stance],
    });
  }
  const supportBuilt = buildDarkestMidBossSupportPlacements(
    state,
    plan.questId,
    plan.supportCardIds,
    monsters,
    refuse,
  );
  if ("events" in supportBuilt) return supportBuilt;
  const supportMonsters = supportBuilt;
  const blockedReason = `${plan.resolvedScriptId} 已部署 ${monsters.map((m) => m.cardId).join("、")}${supportDeployedHoldSummary(supportMonsters)}；可 deployDarkestMidBoss 后 startBattle；${plan.wiringHold}（R-048）。`;
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        darkest: {
          ...d.darkest,
          bossDeployment: {
            roomId: d.position,
            resolvedScriptId: plan.resolvedScriptId,
            monsters,
            supportMonsters,
            supportCardIds: plan.supportCardIds,
            blockedReason,
          },
        },
        roomCards: { ...d.roomCards!, active: { ...active, blockedReason } },
      },
    },
    events: [{ type: "dungeonUpdated", message: blockedReason }],
  };
}

export function readDarkestMidBossDeployedCardIds(d: DungeonState | undefined): readonly string[] {
  const deployment = d?.darkest?.bossDeployment;
  if (!deployment || deployment.roomId !== d?.position) return [];
  return deployment.monsters.map((monster) => monster.cardId);
}

export function darkestMidBossEncounterReady(state: GameState): boolean {
  const plan = state.dungeon?.darkest?.bossEncounterPlan;
  if (!plan) return false;
  return darkestBossDeploymentMatchesPlan(state.dungeon!, plan);
}

export function readDarkestMidBossRequiredCardIdsForQuest(questId: string): readonly string[] {
  return readDarkestMidBossRequiredCombatCardIds(questId);
}

export { darkestMidBossScriptIdForQuest };
