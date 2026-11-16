import { expect, it } from "vitest";
import { applyCommand } from "../../command";
import { removeCasualties, endAfterCasualties } from "../../encounter";
import { applyFinalSwipeSpawn } from "./higher-task-effects";
import { wealdTaskBattleFixture } from "../../test-helpers/weald-task-battle";

it("Final Swipe 初始一只一次，后续新生成再触发，重复处理结果不叠加", () => {
  const before = wealdTaskBattleFixture("quest:weald:p013");
  const started = applyCommand(before, { type: "startBattle" });
  expect(started.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(
    started.state.battle!.entities[0]!.statusStacks?.filter((s) => s.kind === "blight"),
  ).toHaveLength(1);
  const summon = {
    state: {
      ...started.state,
      battle: {
        ...started.state.battle!,
        entities: [
          ...started.state.battle!.entities,
          { ...started.state.battle!.entities.find((e) => e.id === "m")!, id: "summoned" },
        ],
      },
    },
    events: [],
  };
  const next = applyFinalSwipeSpawn(started.state, summon);
  expect(
    next.state.battle!.entities[0]!.statusStacks?.filter((s) => s.kind === "blight"),
  ).toHaveLength(2);
  expect(applyFinalSwipeSpawn(started.state, next)).toEqual(next);
});
it("The Infected 末只死亡先给两份2／2t再清场，同一次清理不重放", () => {
  const started = applyCommand(wealdTaskBattleFixture("quest:weald:p014"), { type: "startBattle" });
  const dead = {
    state: {
      ...started.state,
      battle: {
        ...started.state.battle!,
        entities: started.state.battle!.entities.map((e) =>
          e.id === "m" ? { ...e, dead: true, wounds: 39 } : e,
        ),
      },
    },
    events: [],
  };
  const cleared = removeCasualties(dead, ["m"]);
  const stacks = cleared.state.battle!.entities[0]!.statusStacks?.filter(
    (s) => s.kind === "blight",
  );
  expect(stacks).toHaveLength(2);
  expect(stacks?.map((s) => s.amount)).toEqual([2, 2]);
  const repeated = removeCasualties(cleared, ["m"]);
  expect(repeated.state.battle!.entities[0]!.statusStacks).toEqual(
    cleared.state.battle!.entities[0]!.statusStacks,
  );
  const end = endAfterCasualties(cleared)!;
  expect(end.state.battle!.encounter!.turn).toMatchObject({ type: "finished", outcome: "victory" });
});
