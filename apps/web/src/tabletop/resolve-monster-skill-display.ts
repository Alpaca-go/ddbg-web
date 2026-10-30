import { battleData as questBattleData } from "virtual:quest-battle-data";
import type { PreparedMonsterAction } from "@ddbg/engine";
import { battleData } from "virtual:battle-data";
import type { TabletopMonsterPreparedSkill } from "./tabletop-detail-types";

export function monsterCardName(monsterCardId: string): string {
  return (
    [...battleData.monsters, ...(questBattleData.bossMonsters ?? [])].find(
      (m) => m.id === monsterCardId,
    )?.name ?? monsterCardId
  );
}

export function resolveMonsterSkillName(monsterCardId: string, skillSlot: number): string {
  const card = [...battleData.monsters, ...(questBattleData.bossMonsters ?? [])].find(
    (m) => m.id === monsterCardId,
  );
  const skill = card?.skills.find((s) => s.slot === skillSlot);
  return skill?.name ?? `技能位 ${skillSlot}`;
}

export function resolveMonsterSkillId(monsterCardId: string, skillSlot: number): string {
  return `${monsterCardId}:skill${skillSlot}`;
}

/** 只读映射 `battle.monsterAction` → 详情展示（不推算选招）。 */
export function projectMonsterPreparedSkill(
  action: PreparedMonsterAction,
  monsterCardId: string,
): TabletopMonsterPreparedSkill {
  return {
    skillSlot: action.skillSlot,
    skillId: resolveMonsterSkillId(monsterCardId, action.skillSlot),
    skillName: resolveMonsterSkillName(monsterCardId, action.skillSlot),
    selectionRoll: action.selectionRoll,
    targetPriority: null,
    targetId: action.targetId,
  };
}
