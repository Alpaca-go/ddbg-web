import { roomCatalogSchema } from "../../../data/src/room";
import type { ApplyResult, GameState } from "../command";
import { rejectBattleCommand } from "../battle";
import { resolveBossScriptIdForQuest, FACE_THE_THREAT_QUEST_ID } from "./quest-bridge";
import { getBossScript } from "./registry";
import { RUINS_COMBAT_LEVELS } from "./ruins-combat-levels";

/** 已核对的房间身份（room.ts / rooms FRONT p10–13），不推断区域与图标。 */
const rooms = {
  necromancer: { id: "room:p010", name: "Necromancer Room" },
  prophet: { id: "room:p011", name: "Prophet Room" },
  collector: { id: "room:p012", name: "Collector Room" },
  fanatic: { id: "room:p013", name: "Fanatic Room" },
} as const;

/** R30：目标房使用实际 Boss 的专属房间，不抽普通房间牌、不消费 RNG。 */
export function prepareBossObjectiveRoom(state: GameState): ApplyResult {
  const d = state.dungeon!;
  const plan = d.faceTheThreatEmbarkPlan;
  const room = d.rooms.find((r) => r.id === d.position);
  const refuse = (message: string) => rejectBattleCommand(state, message);
  if (
    state.battle ||
    d.phase !== "awaitingRoom" ||
    d.pending ||
    room?.kind !== "objective" ||
    room.cleared ||
    d.mustLeaveRoomId === d.position ||
    d.questDistribution?.questId !== FACE_THE_THREAT_QUEST_ID ||
    plan?.questId !== FACE_THE_THREAT_QUEST_ID ||
    plan.roomPlacement !== "edgeRoomsR30"
  )
    return refuse("需要 Face the Threat 未清理目标房和正式出征计划（R30）");
  const scriptId = resolveBossScriptIdForQuest(FACE_THE_THREAT_QUEST_ID, d);
  const registered = scriptId ? getBossScript(scriptId)?.combatEntry : undefined;
  const family = (Object.keys(rooms) as (keyof typeof rooms)[]).find((key) =>
    RUINS_COMBAT_LEVELS[key].some((entry) => entry.script === scriptId),
  );
  if (
    !family ||
    !registered ||
    scriptId !== plan.resolvedScriptId ||
    (d.imminentThreatDescriptionCardId !== undefined &&
      d.imminentThreatDescriptionCardId !== registered.descriptionAbilityCardId) ||
    (Object.keys(registered) as (keyof typeof registered)[]).some(
      (key) => registered[key] !== plan.combatEntry[key],
    )
  )
    return refuse("实际迫近威胁、Boss 等级与出征战斗卡不一致，未绑定房间（R-124 / R30）");
  const catalog = d.roomCards;
  if (!catalog || !roomCatalogSchema.safeParse(catalog.cards).success)
    return refuse("Boss 房间入口缺完整核心盒房间目录（R-048）");
  if (catalog.active) return refuse("该房间牌已记录；不能重复绑定或替换 Boss 房间（R30）");
  const expected = rooms[family];
  const card = catalog.cards.find((c) => c.id === expected.id);
  if (!card || !card.boss || card.location !== "ruins" || card.name !== expected.name)
    return refuse("对应 Boss 专属房间身份不一致，未替换普通房间（R-048）");
  const blockedReason = `${card.name} 已绑定 ${scriptId}（${registered.combatMonsterCardId}）；专属房间几何、印刷部署及生产战斗交接尚未获批接通，保留房间牌，不能改抽普通房间（R30 / R-048）。`;
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        roomCards: { ...catalog, active: { roomId: room.id, cardId: card.id, blockedReason } },
      },
    },
    events: [{ type: "dungeonUpdated", message: blockedReason }],
  };
}
