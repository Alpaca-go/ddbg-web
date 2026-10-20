/** 右栏详情面板可选中的对象种类（T3）。 */
export type TabletopDetailTargetKind = "hero" | "monster" | "room" | "building" | "quest";

export type TabletopMonsterPreparedSkill = {
  readonly skillSlot: number;
  readonly skillId: string;
  readonly skillName: string;
  readonly selectionRoll: number | null;
  /** 引擎 `PreparedMonsterAction` 无此字段，仅事件带卡面优先级时为 string */
  readonly targetPriority: string | null;
  readonly targetId: string;
};
