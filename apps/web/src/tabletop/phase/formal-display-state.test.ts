import { expect, it, vi } from "vitest";
import { createTabletopInitialState } from "../tabletop-initial-state";
import { formalDetailIsValid } from "./formal-display-state";
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
