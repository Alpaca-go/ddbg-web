vi.mock("virtual:quest-battle-data", () => ({
  battleData: {
    bossMonsters: [
      {
        id: "monster_large:p018",
        name: "Ancestor 2",
        skills: [{ slot: 3, name: "Embrace Futility" }],
      },
    ],
  },
}));
import { expect, it, vi } from "vitest";
import { createTabletopInitialState } from "../tabletop-initial-state";
import { formalDetailIsValid } from "./formal-display-state";
import { monsterCardName, resolveMonsterSkillName } from "../resolve-monster-skill-display";
import type { FlowPhaseId } from "./flow-phase";
import type { TabletopDetailTargetKind } from "../tabletop-detail-types";

vi.mock("virtual:battle-data", () => ({ battleData: { monsters: [] } }));

it.each<[TabletopDetailTargetKind, string | null, FlowPhaseId, boolean]>([
  ["hero", "hero-0", "questSetup", true],
  ["hero", "hero-0", "expeditionPrep", true],
  ["hero", "hero-0", "dungeonExploration", true],
  ["hero", "missing", "battle", false],
  ["monster", "m0", "battle", true],
  ["monster", "missing", "battle", false],
  ["monster", "m0", "dungeonExploration", false],
  ["room", "room:p006", "dungeonExploration", true],
  ["room", "room:p006", "battle", true],
  ["room", "room:p005", "dungeonExploration", false],
  ["room", "room:p006", "questReturn", false],
  ["room", "room:p006", "hamlet", false],
  ["quest", "quest:p001", "expeditionPrep", true],
  ["quest", "quest:p002", "expeditionPrep", false],
  ["quest", "quest:p001", "hamlet", false],
  ["building", "abbey", "hamlet", true],
  ["building", "abbey", "battle", false],
  ["hero", null, "questReturn", true],
])("详情 %s/%s 在 %s 有效性为 %s", (kind, id, phase, valid) => {
  const base = createTabletopInitialState();
  const state = { ...base, ui: { ...base.ui, detailTargetKind: kind, detailTargetId: id } };
  const before = structuredClone(state);
  expect(formalDetailIsValid(state, phase)).toBe(valid);
  expect(state).toEqual(before);
});

it("最终战 Boss 的名称和技能从正式目录读取，未知身份仍显示 ID", () => {
  expect(monsterCardName("monster_large:p018")).toBe("Ancestor 2");
  expect(resolveMonsterSkillName("monster_large:p018", 3)).toBe("Embrace Futility");
  expect(monsterCardName("unknown")).toBe("unknown");
  expect(resolveMonsterSkillName("unknown", 3)).toBe("技能位 3");
});
