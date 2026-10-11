import { expect, it } from "vitest";
import die from "../normalized/corebox/exploration_die.json";
import { explorationDieSchema } from "./exploration";

it("印刷骰网六面各一次，包括无效果的空白；重复 / 缺面拒绝", () => {
  expect(explorationDieSchema.parse(die).faces).toHaveLength(6);
  expect(
    explorationDieSchema.safeParse({ ...die, faces: [...die.faces.slice(1), "blank"] }).success,
  ).toBe(false);
  expect(explorationDieSchema.safeParse({ ...die, faces: die.faces.slice(1) }).success).toBe(false);
});
