import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { QuestSummaryPanel } from "./quest-summary-panel";
import { ruinsActReadyFixture } from "../../../../../packages/engine/src/test-helpers/ruins-act";
import { useDungeonStore } from "../store";
import { dungeonFlowStep } from "../../tabletop/phase/dungeon-flow-step";

// 本测试直接安装明确的回村夹具，不加载Vite沙盒虚拟模块。
vi.mock("../fixture-setup", () => ({ setup: () => ({ game: { seed: 1, notes: [] } }) }));

function markup() {
  const s = useDungeonStore.getState();
  return renderToStaticMarkup(
    <QuestSummaryPanel
      game={s.game}
      dispatch={s.dispatch}
      commands={s.commands}
      events={s.events}
      formal
      pendingChoice={null}
    />,
  );
}

it("Boss回村只提供升幕；派发后事件入口恢复，成功命令只记录一次", () => {
  const previous = useDungeonStore.getState();
  try {
    useDungeonStore.setState({
      game: ruinsActReadyFixture(1, "necromancer"),
      commands: [],
      events: [],
    });
    expect(markup()).toContain("推进战役至2级");
    expect(markup()).not.toContain("抽村庄事件</button>");
    expect(dungeonFlowStep(useDungeonStore.getState().game)).toContain("等待推进战役等级");
    useDungeonStore.getState().dispatch({ type: "advanceRuinsAct" });
    expect(markup()).not.toContain("推进战役至2级");
    expect(markup()).toContain("抽村庄事件</button>");
    expect(useDungeonStore.getState().commands).toHaveLength(1);
    const after = useDungeonStore.getState().game;
    useDungeonStore.getState().dispatch({ type: "advanceRuinsAct" });
    expect(useDungeonStore.getState().game).toBe(after);
    expect(useDungeonStore.getState().commands).toHaveLength(1);
  } finally {
    useDungeonStore.setState(previous);
  }
});

it("未完成前置时按钮禁用并显示原因，事件入口不绕过升幕", () => {
  const previous = useDungeonStore.getState();
  try {
    const game = ruinsActReadyFixture(1, "necromancer");
    useDungeonStore.setState({
      game: { ...game, dungeon: { ...game.dungeon!, discardedQuests: [] } },
    });
    expect(markup()).toMatch(/<button disabled="">推进战役至2级/);
    expect(markup()).toContain("两个普通任务");
    expect(markup()).not.toContain("抽村庄事件</button>");
  } finally {
    useDungeonStore.setState(previous);
  }
});
