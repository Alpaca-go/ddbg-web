import type { ApplyResult, GameState } from "../../../command";
import { createBattleState, rejectBattleCommand } from "../../../battle";
import { buildBossHeroEntities } from "../../../boss/deploy-heroes";
import { resolveBossScriptIdForQuest } from "../../../boss/quest-bridge";
import { getBossScript } from "../../../boss/registry";
import { createLootState } from "../../../loot";
import { ensureCampaignBossScriptsRegistered } from "../../../expansions/register";
import { hagDeploymentContext } from "./hag-deployment-context";
import { WEALD_HAG_I_CONTENT } from "./hag-i-content";
import { isCampaignExpeditionMode } from "../../../campaign-expedition-mode";

/** R30／W4／R-254：Boss 房使用独立核准目录，不占普通房间牌堆。 */
export function prepareHagIObjectiveRoom(state: GameState): ApplyResult {
  return prepareHagObjectiveRoom(state, 1);
}
export function prepareHagHigherObjectiveRoom(state: GameState): ApplyResult {
  const level = state.dungeon?.campaignLevel;
  if ((level !== 2 && level !== 3) || !state.dungeon?.wealdHigherBosses)
    return rejectBattleCommand(state, "R-268：高等级 Hag 需要显式版本及II／III级");
  return prepareHagObjectiveRoom(state, level);
}
function prepareHagObjectiveRoom(state: GameState, level: 1 | 2 | 3): ApplyResult {
  const binding = hagDeploymentContext(level);
  const d = state.dungeon;
  const room = d?.rooms.find((r) => r.id === d.position);
  const plan = d?.faceTheThreatEmbarkPlan;
  if (d?.contentPacks?.includes("weald")) ensureCampaignBossScriptsRegistered(d.contentPacks);
  const entry = getBossScript(binding.script)?.combatEntry;
  if (
    !d ||
    state.battle ||
    d.phase !== "awaitingRoom" ||
    d.pending ||
    !d.contentPacks?.includes("weald") ||
    !isCampaignExpeditionMode(d.mode) ||
    d.campaignLevel !== level ||
    d.activeBossThreatScriptId !== binding.script ||
    d.imminentThreatDescriptionCardId !== binding.description ||
    room?.kind !== "objective" ||
    !room.revealed ||
    room.cleared ||
    d.mustLeaveRoomId === d.position ||
    !d.roomCards ||
    d.roomCards.active ||
    d.questDistribution?.questId !== "quest:p019" ||
    plan?.questId !== "quest:p019" ||
    plan.roomPlacement !== "edgeRoomsR30" ||
    plan.resolvedScriptId !== binding.script ||
    resolveBossScriptIdForQuest("quest:p019", d) !== binding.script ||
    !entry ||
    (Object.keys(entry) as (keyof typeof entry)[]).some(
      (key) => entry[key] !== plan.combatEntry[key],
    )
  )
    return rejectBattleCommand(state, "R-254：需要 Weald I 级 Hag 实际威胁、出征计划和未清目标房");
  const message =
    level === 1
      ? "Hag 专属房已绑定；下一步 deployHagI，保留普通房间牌堆（W4／R-254）"
      : `Hag ${level === 2 ? "II" : "III"}专属房已绑定；下一步 deployHagHigher，保留普通房间牌堆（W4／R-267／R-268）`;
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        roomCards: {
          ...d.roomCards,
          active: {
            roomId: room.id,
            cardId: WEALD_HAG_I_CONTENT.tile.roomId,
            blockedReason: message,
          },
        },
      },
    },
    events: [{ type: "dungeonUpdated", message }],
  };
}

/** 只部署核准 I 级，保留显式 startBattle 先攻步骤；Stygian 沿用标准 Boss 房（R-036）。 */
export function deployHagI(state: GameState): ApplyResult {
  return deployHag(state, 1);
}
export function deployHagHigher(state: GameState): ApplyResult {
  const level = state.dungeon?.campaignLevel;
  if ((level !== 2 && level !== 3) || !state.dungeon?.wealdHigherBosses)
    return rejectBattleCommand(state, "R-268：高等级 Hag 需要显式版本及II／III级");
  return deployHag(state, level);
}
function deployHag(state: GameState, level: 1 | 2 | 3): ApplyResult {
  const binding = hagDeploymentContext(level);
  const d = state.dungeon;
  const active = d?.roomCards?.active;
  const room = d?.rooms.find((r) => r.id === d.position);
  const tile = WEALD_HAG_I_CONTENT.tile;
  const refuse = (message: string) => rejectBattleCommand(state, message);
  if (
    !d ||
    state.battle ||
    d.phase !== "awaitingRoom" ||
    d.pending ||
    !isCampaignExpeditionMode(d.mode) ||
    d.campaignLevel !== level ||
    !d.battleCatalog ||
    !d.explorationSetup ||
    d.explorationSetup.dungeonLevel !== level ||
    d.monsterPool?.active ||
    active?.cardId !== tile.roomId ||
    active.tileId !== undefined ||
    active.roomId !== d.position ||
    room?.kind !== "objective" ||
    !room.revealed ||
    room.cleared ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    !Number.isSafeInteger(d.decision) ||
    d.decision < 0 ||
    d.heroes.length !== 4 ||
    (level === 1 && d.heroes.some((h) => h.level !== 1)) ||
    new Set(d.heroes.map((h) => h.id)).size !== 4 ||
    new Set(d.heroes.map((h) => h.stance)).size !== 4
  )
    return refuse("R-254：需要核准 Hag I 目标房、四英雄与有效地牢上下文");
  // 用同一入口复核实际威胁和计划；不修改输入，也不再次绑定房间。
  const probe = prepareHagObjectiveRoom(
    {
      ...state,
      dungeon: { ...d, roomCards: { ...d.roomCards!, active: null } },
    },
    level,
  );
  if (probe.events.some((e) => e.type === "commandRefused"))
    return refuse("R-254：Hag I 威胁或出征计划不一致");
  const heroes = buildBossHeroEntities(
    state,
    refuse,
    tile.deployment.heroes,
    level === 1 ? "Hag I" : `Hag ${level === 2 ? "II" : "III"}`,
  );
  if (!Array.isArray(heroes)) return heroes;
  const deployment = binding.deployment;
  try {
    const battle = createBattleState(state.seed, {
      ...deployment,
      roomName: "Hag",
      entities: [...heroes, ...deployment.entities],
      heroStats: d.battleCatalog.heroStats,
      skills: d.battleCatalog.skills,
      light: d.explorationSetup.light,
      provisions: d.explorationSetup.provisions,
      resolveCards: d.resolveCards,
      ...(d.conditions ? { conditions: d.conditions } : {}),
      ...(d.trinkets ? { trinkets: d.trinkets } : {}),
      lootPool: { ...(d.lootPool ?? createLootState()), gold: d.gold },
      provisionWindows: true,
    }).battle!;
    const message =
      level === 1
        ? "Hag I 与 Empty 已按 W4／R-254 部署；等待 startBattle 洗先攻"
        : `Hag ${level === 2 ? "II" : "III"}与 Empty 已按 R-267／R-268 部署；等待 startBattle 洗先攻`;
    return {
      state: {
        ...state,
        dungeon: {
          ...d,
          phase: "inBattle",
          roomCards: {
            ...d.roomCards!,
            active: { ...active, tileId: tile.id, blockedReason: message },
          },
        },
        battle: {
          ...battle,
          rngCursor: d.cursor,
          choiceCursor: d.decision,
          resolveDecks: d.resolveDecks,
        },
      },
      events: [{ type: "dungeonUpdated", message }],
    };
  } catch (error) {
    return refuse(`Hag I 部署无效：${error instanceof Error ? error.message : String(error)}`);
  }
}
