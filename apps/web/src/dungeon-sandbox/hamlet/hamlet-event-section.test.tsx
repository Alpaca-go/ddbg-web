import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { HamletEventSection } from "./hamlet-event-section";
import { actThreeCompleteFixture } from "../../../../../packages/engine/src/test-helpers/act-three-complete";
import { ruinsActReadyFixture } from "../../../../../packages/engine/src/test-helpers/ruins-act";
import { useDungeonStore } from "../store";
import { dungeonFlowStep } from "../../tabletop/phase/dungeon-flow-step";

// 本测试直接安装明确的回村夹具，不加载 Vite 沙盒虚拟模块。
vi.mock("../fixture-setup", () => ({ setup: () => ({ game: { seed: 1, notes: [] } }) }));

function markup() {
  const s = useDungeonStore.getState();
  return renderToStaticMarkup(
    <HamletEventSection
      game={s.game}
      dispatch={s.dispatch}
      commands={s.commands}
      events={s.events}
      formal
      pendingChoice={null}
    />,
  );
}

it("III 幕后村庄准备完成：只提供最暗入口，点击后可完成 p016 出征", () => {
  const previous = useDungeonStore.getState();
  try {
    useDungeonStore.setState({ game: actThreeCompleteFixture(), commands: [], events: [] });
    const before = markup();
    expect(before).toContain('data-testid="enter-darkest-dungeon"');
    expect(before).toContain("We Are The Flame");
    expect(before).not.toContain('data-testid="offer-next-quest"');
    expect(dungeonFlowStep(useDungeonStore.getState().game)).toContain("进入最暗地牢");

    useDungeonStore.getState().dispatch({ type: "enterDarkestDungeon" });
    const pending = useDungeonStore.getState().game.dungeon!.pending!;
    expect(pending.options).toEqual([{ id: "quest:p016", label: "We Are The Flame" }]);
    expect(useDungeonStore.getState().commands).toHaveLength(1);

    useDungeonStore.getState().dispatch({
      type: "resolveChoice",
      choiceId: pending.id,
      optionId: "quest:p016",
    });
    const d = useDungeonStore.getState().game.dungeon!;
    expect(d.phase).toBe("awaitingProvisions");
    expect(d.questDistribution!.questId).toBe("quest:p016");
    expect(d.rooms).toHaveLength(16);
    expect(d.darkest?.monsterDeck).toHaveLength(26);
    expect(d.trinkets!.level).toBe(3);
    expect(useDungeonStore.getState().commands.map((c) => c.type)).toEqual([
      "enterDarkestDungeon",
      "resolveChoice",
    ]);
  } finally {
    useDungeonStore.setState(previous);
  }
});

it("II 级村庄准备完成仍走普通抽取入口，不显示最暗按钮", () => {
  const previous = useDungeonStore.getState();
  try {
    useDungeonStore.setState({
      game: ruinsActReadyFixture(2, "necromancer"),
      commands: [],
      events: [],
    });
    // 该夹具仍在回村完成后、未抽村庄事件；准备完成态由按钮分支判定。
    const game = useDungeonStore.getState().game;
    useDungeonStore.setState({
      game: {
        ...game,
        dungeon: {
          ...game.dungeon!,
          hamlet: {
            deck: ["hamlet_event:p001"],
            permanentlyRemoved: [],
            active: null,
            last: "hamlet_event:p001",
            phase: "preparationComplete",
            preparationDays: 4,
            remainingDays: 0,
            day: 1,
            noCaretaker: false,
            extraBlock: false,
            caretaker: null,
            blockedBuildings: [],
            heroOrder: [],
          },
        },
      },
    });
    const html = markup();
    expect(html).not.toContain('data-testid="enter-darkest-dungeon"');
    expect(html).toContain('data-testid="offer-next-quest"');
  } finally {
    useDungeonStore.setState(previous);
  }
});
