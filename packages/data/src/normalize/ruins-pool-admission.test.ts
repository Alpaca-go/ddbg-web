import { expect, it } from "vitest";
import medium from "../../normalized/corebox/monster_medium.json";
import large from "../../normalized/corebox/monster_large.json";
import { normalizedMonsterMediumFileSchema, normalizedMonsterLargeFileSchema } from "./schema";
import {
  RUINS_DL2_APPROVED_HIGHER_COMBAT_IDS,
  ruinsPoolAdmissionRows,
} from "./ruins-pool-admission";

const monsters = [
  ...normalizedMonsterMediumFileSchema.parse(medium).cards,
  ...normalizedMonsterLargeFileSchema.parse(large).cards,
].filter((card) => "skills" in card);

it("DL2 牌堆：全部 II 级战斗卡均在 R-083 已批子集内", () => {
  const rows = ruinsPoolAdmissionRows(monsters, 2);
  const level2 = rows.filter((row) => row.poolLevel === 2);
  expect(level2).toHaveLength(5);
  for (const row of level2) {
    expect(row.hasApprovedHigherMonsterFields, row.combatCardId).toBe(true);
    expect(row.catalogHasSpeedStance, row.combatCardId).toBe(true);
    expect(row.catalogUnverified, row.combatCardId).toBe(false);
    expect(RUINS_DL2_APPROVED_HIGHER_COMBAT_IDS as readonly string[]).toContain(row.combatCardId);
  }
});

it("DL3 牌堆：R-142 只新增 Bone Bearer，其余三种仍缺 Speed/选招", () => {
  const rows = ruinsPoolAdmissionRows(monsters, 3);
  const level3 = rows.filter((row) => row.poolLevel === 3);
  expect(level3.map((r) => r.combatCardId).sort()).toEqual([
    "monster_large:p004",
    "monster_medium:p016",
    "monster_medium:p056",
    "monster_medium:p059",
  ]);
  for (const row of level3) {
    if (row.combatCardId === "monster_medium:p016") {
      expect(row.missingBattleFields).toEqual([]);
      expect(row.hasApprovedHigherMonsterFields).toBe(true);
      expect(row.catalogHasSpeedStance).toBe(true);
      continue;
    }
    expect(row.missingBattleFields).toEqual(["speed", "stanceGroups"]);
    expect(row.hasApprovedHigherMonsterFields).toBe(false);
    expect(row.catalogHasSpeedStance).toBe(false);
  }
});
