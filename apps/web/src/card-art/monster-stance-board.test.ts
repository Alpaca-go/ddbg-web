import { describe, expect, it } from "vitest";
import { stanceColumnHasOccupants } from "./monster-stance-board";

describe("monster stance board presentation", () => {
  it("marks columns active only when occupants exist", () => {
    expect(stanceColumnHasOccupants(0)).toBe(false);
    expect(stanceColumnHasOccupants(1)).toBe(true);
  });
});
