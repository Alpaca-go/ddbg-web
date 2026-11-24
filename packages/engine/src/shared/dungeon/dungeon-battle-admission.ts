/** B02 / C-008：`startDungeonBattle` 拒战文案分类（回归用，不改变闸门语义）。 */
export function isSkillAdmissionRefusal(message: string): boolean {
  return (
    message.includes("尚未接入") ||
    message.includes("完整效果") ||
    message.includes("完整战斗字段") ||
    message.includes("技能射程") ||
    message.includes("目标尚未完整接入") ||
    message.includes("真实疾病技能需要完整疾病") ||
    message.includes("怪物自身效果尚未接入") ||
    message.includes("怪物完整效果尚未接入")
  );
}

export function isLevelApprovalAdmissionRefusal(message: string): boolean {
  return message.includes("等级 / 高等级限定批准不符");
}
