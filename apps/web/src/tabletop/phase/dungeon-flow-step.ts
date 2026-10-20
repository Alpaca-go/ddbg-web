import type { GameState } from "@ddbg/engine";

/** 与引擎 phase / 子状态一一对应的步骤文案（原 dungeon-checkpoint 逻辑）。 */
export function dungeonFlowStep(game: GameState): string {
  const d = game.dungeon;
  if (!d) return "等待开始任务";
  const currentRoom = d.rooms?.find((r) => r.id === d.position);
  if (d.hamletReturn) {
    if (d.hamletReturn.phase === "complete") {
      if (d.hamlet?.phase === "preparationComplete") return "村庄准备完成；可抽取下一任务";
      if (d.hamlet) return "村庄准备进行中";
      return "回村完成；等待村庄事件";
    }
    return "回村步骤进行中；探索已经结束";
  }
  if (d.phase === "exited") {
    return `已从 ${d.position} 离开地牢；金币与英雄状态已保留，等待任务 XP / 回村接口`;
  }
  if (d.phase === "ready" && d.mustLeaveRoomId === d.position) {
    return `已撤退到 ${d.position} 地图节点；房间未清理，必须离开`;
  }
  if (d.phase === "awaitingCurio") {
    return `Curio 待结算；${d.curio?.active?.roomId ? "队伍已在房间" : "队伍尚未移动"}，不能补用 Torch 或重抽`;
  }
  if (d.phase === "awaitingReplacement") {
    return `英雄死亡：请完成驿站替补准备与入队，${d.pressureSource === "room" ? `队伍已在 ${d.position}` : "队伍尚未移动"}`;
  }
  if (d.phase === "blockedPressure") {
    return `压力已支付：意志卡数据待核实，${d.pressureSource === "room" ? `队伍已在 ${d.position}` : "队伍尚未移动"}`;
  }
  if (d.phase === "awaitingRoom") {
    return `进入 ${d.position}：等待${d.roomCards?.active ? "守卫战斗准备完成；原牌已记录，房间未清理" : currentRoom?.kind === "trap" ? " Trap 分配，保留代币" : currentRoom?.kind === "dark" ? " Dark 降光，保留代币" : "非 Empty 房间效果"}`;
  }
  if (d.phase === "ready" && (d.exploration || (d.visited?.length ?? 0) > 1)) {
    return `已到达 ${d.position}；${currentRoom?.cleared ? (currentRoom.kind === "empty" ? "Empty 已清理，移除房间代币" : "已清理，移除房间代币") : currentRoom?.kind === "trap" ? "Trap 已结算，保留代币" : currentRoom?.kind === "dark" ? "Dark 已结算，保留代币" : "灰点必须停留"}`;
  }
  if (d.exploration) {
    return `${d.exploration.from} → ${d.exploration.to} · 每人 ${d.exploration.dicePerHero} 骰 · 等待危险结算，队伍尚未移动`;
  }
  if (d.phase === "awaitingProvisions" || (d.startingProvisionChoices?.length ?? 0) > 0) {
    return "入口：领取开局补给后进入探索";
  }
  if (d.hamlet) {
    if (d.hamlet.phase === "preparationComplete") return "村庄准备完成；可抽取下一任务";
    if (d.hamlet.phase === "awaitingCaretaker") return "村庄：等待掷看守人";
    if (d.hamlet.phase === "heroActions") return "村庄：英雄按姿态顺序访问建筑";
    if (d.hamlet.phase === "eventBlocked") return "村庄：等待事件选择";
    return "村庄准备进行中";
  }
  return "等待侦察 / 路线选择";
}
