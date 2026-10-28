import { expect, it } from "vitest";
import rawCurios from "../../data/normalized/corebox/curio.json";
import { curioFileSchema } from "../../data/src/curio";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import { drawDungeonCurio } from "./dungeon-curio";

const cards = curioFileSchema.parse(rawCurios).cards;
const heroes = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].map((name, i) => ({
  id: `h${i}`,
  stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
  stress: 0,
  level: 1,
  life: 1,
  wounds: 0,
  attributesVerified: true,
}));

function hazardCurioState(seed = 1237): GameState {
  const base = createDungeonSandbox(
    seed,
    layout,
    distribution,
    "standard",
    "G",
    heroes,
    [],
    {
      dungeonLevel: 1,
      light: 5,
      provisions: ["tool", "tool", "tool", "tool", "torch", "food"].map((face, i) => ({
        id: `p${i}`,
        face: face as "tool" | "torch" | "food",
      })),
    },
    cards,
  );
  let state = applyCommand(base, { type: "beginDungeonExploration" }).state;
  state = applyCommand(state, {
    type: "resolveChoice",
    choiceId: state.dungeon!.pending!.id,
    optionId: "D",
  }).state;
  state = applyCommand(state, { type: "rollDungeonExploration" }).state;
  return applyCommand(state, {
    type: "resolveChoice",
    choiceId: state.dungeon!.pending!.id,
    optionId: "h0:1",
  }).state;
}

it("生产 curio.json：24 张效果行均已核实（R-064），无 R-048 null 停点行", () => {
  expect(cards).toHaveLength(24);
  for (const card of cards) {
    const unknown = card.rows.filter((r) => r.effect === null);
    expect(unknown, `${card.id} 含未核实行`).toEqual([]);
  }
});

it("R-048：无 Torch p21 仍停在疾病依赖，不把半张卡当可审", () => {
  expect(cards.find((c) => c.id === "curio:p021")!.rows.map((r) => r.effect!.type)).toEqual([
    "stress",
    "status",
    "drawDisease",
    "gold",
  ]);
});

it("R-068 / Q-61：地牢内 Curio 抽空在扣 Torch 前拒抽，不洗回弃牌", () => {
  const base = hazardCurioState(),
    d = base.dungeon!;
  const exhausted = {
    ...base,
    dungeon: {
      ...d,
      curio: { ...d.curio!, deck: [], discard: cards.map((c) => c.id) },
    },
  };
  const roll = exhausted.dungeon!.exploration!.rolls!.find(
    (r) => r.face === "curio" && !r.resolved,
  )!;
  const result = drawDungeonCurio(exhausted, roll.id, "use:p4");
  expect(result.state).toBe(exhausted);
  expect(result.events[0]).toMatchObject({
    type: "commandRefused",
    message: expect.stringMatching(/R-068|不洗回/),
  });
  expect(result.state.dungeon!.curio!.deck).toEqual([]);
  expect(result.state.dungeon!.explorationSetup!.provisions).toEqual(
    exhausted.dungeon!.explorationSetup!.provisions,
  );
});
