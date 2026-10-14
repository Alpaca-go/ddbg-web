import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { rejectBattleCommand } from "./battle";

export const recoveryBuildings = ["abbey", "tavern", "sanitarium"] as const;
export type RecoveryBuilding = (typeof recoveryBuildings)[number];
export type BuildingLevels = Partial<Readonly<Record<RecoveryBuilding, 1 | 2 | 3>>>;
export type UpgradeHamletBuildingCommand = {
  readonly type: "upgradeHamletBuilding";
  readonly building: RecoveryBuilding;
};
export function buildingLevelsProblem(d: DungeonState) {
  if (d.buildingLevels === undefined) return null;
  if (!d.buildingLevels || typeof d.buildingLevels !== "object" || Array.isArray(d.buildingLevels))
    return "建筑等级结构无效";
  return d.buildingLevels &&
    Object.entries(d.buildingLevels).some(
      ([id, level]) =>
        !recoveryBuildings.includes(id as RecoveryBuilding) || ![1, 2, 3].includes(level),
    )
    ? "建筑等级无效，不能补默认值"
    : null;
}
export function recoveryBuildingLevel(d: DungeonState, building: RecoveryBuilding) {
  return d.buildingLevels?.[building] ?? 1;
}
/** R33：团队共用20金升一级，不是英雄访问，不占建筑、不耗天数或RNG。 */
export function upgradeHamletBuilding(
  state: GameState,
  command: UpgradeHamletBuildingCommand,
): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    state.battle ||
    d.phase !== "inHamlet" ||
    d.hamletReturn?.phase !== "complete" ||
    d.pending ||
    d.hamlet?.phase === "eventBlocked" ||
    buildingLevelsProblem(d) ||
    !recoveryBuildings.includes(command.building) ||
    !Number.isSafeInteger(d.gold) ||
    d.gold < 20 ||
    recoveryBuildingLevel(d, command.building) === 3
  )
    return rejectBattleCommand(
      state,
      "升级须在已完成回村、没有待选或未结算事件时进行；限三栋恢复建筑、每级20金、最高III级（R33）",
    );
  const level = (recoveryBuildingLevel(d, command.building) + 1) as 2 | 3;
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        gold: d.gold - 20,
        buildingLevels: { ...d.buildingLevels, [command.building]: level },
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `团队支付20金，将${command.building}升至${level === 2 ? "II" : "III"}级；不消耗英雄行动（R33）`,
      },
    ],
  };
}
const definitions = {
  tavern3: ["tavern", "stress", 3, 1, 1],
  tavern6: ["tavern", "stress", 6, 3, 1],
  tavern9: ["tavern", "stress", 9, 9, 2],
  heal5: ["sanitarium", "heal", 5, 1, 1, 1],
  heal10: ["sanitarium", "heal", 10, 3, 1, 1],
  heal7: ["sanitarium", "heal", 7, 1, 2, 2],
  heal14: ["sanitarium", "heal", 14, 3, 2, 2],
  heal9: ["sanitarium", "heal", 9, 1, 3],
  heal18: ["sanitarium", "heal", 18, 3, 3],
  cureDisease: ["sanitarium", "disease", 0, 2, 1],
  removeQuirks: ["abbey", "quirks", 0, 2, 1],
  tavernHeal5: ["tavern", "heal", 5, 1, 3],
  tavernHeal10: ["tavern", "heal", 10, 3, 3],
  tavernCureDisease: ["tavern", "disease", 0, 2, 3],
  abbeyStress3: ["abbey", "stress", 3, 1, 3],
  abbeyStress6: ["abbey", "stress", 6, 3, 3],
} as const;
export type RecoveryServiceId = keyof typeof definitions;
/** R34 / §4.5：原语、数值、价格和开放等级来自官方表；不开放未接的正面怪癖选项。 */
export function recoveryServices(d: DungeonState) {
  if (buildingLevelsProblem(d)) return [];
  const names = { abbey: "修道院", tavern: "酒馆", sanitarium: "疗养院" };
  return (Object.keys(definitions) as RecoveryServiceId[]).flatMap((id) => {
    const [building, effect, amount, baseCost, min, max = 3] = definitions[id];
    const level = recoveryBuildingLevel(d, building);
    if (level < min || level > max) return [];
    const cost = effect === "quirks" && level === 3 ? 1 : baseCost;
    const label = `${names[building]} ${["I", "II", "III"][level - 1]}：${effect === "stress" ? `压力 −${amount}` : effect === "heal" ? `治疗 ${amount}` : effect === "disease" ? "移除疾病" : "移除怪癖"}（${cost} 金）`;
    return [{ id, building, effect, amount, cost, label, level }];
  });
}
