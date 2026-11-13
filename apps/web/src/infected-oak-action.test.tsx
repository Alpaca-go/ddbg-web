import { beforeAll, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GameState } from "@ddbg/engine";
import { disinfectionJourney } from "../../../packages/engine/src/test-helpers/disinfection-quest";
import { InfectedOakAction } from "./infected-oak-action";

let game: GameState;
beforeAll(() => {
  game = disinfectionJourney().before.game;
}, 120000);
const render = (state = game, frozen = false) =>
  renderToStaticMarkup(<InfectedOakAction game={state} frozen={frozen} dispatch={() => {}} />);
it("真实消毒停点显示可执行按钮；冻结、缺药水时禁用，非本任务隐藏", () => {
  expect(render()).toContain("消毒橡树（1行动＋1药水）");
  expect(render()).not.toContain("disabled");
  expect(render(game, true)).toContain("disabled");
  const empty = { ...game, battle: { ...game.battle!, provisions: [] } };
  expect(render(empty)).toContain("disabled");
  expect(render(empty)).toContain("Potion");
  const other: GameState = {
    ...game,
    dungeon: {
      ...game.dungeon!,
      questDistribution: { ...game.dungeon!.questDistribution!, questId: "quest:p001" },
    },
  };
  expect(render(other)).toBe("");
  expect(render({ ...game, dungeon: { ...game.dungeon!, contentPacks: ["core"] } })).toBe("");
});
