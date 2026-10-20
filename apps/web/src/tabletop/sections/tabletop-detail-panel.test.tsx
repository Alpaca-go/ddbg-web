import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createTabletopInitialState } from "../tabletop-initial-state";
import { TabletopDetailPanel } from "./tabletop-detail-panel";

const base = createTabletopInitialState();
const entityName = (id: string) => id;

describe("TabletopDetailPanel", () => {
  it("无选中时渲染阶段默认提示", () => {
    const html = renderToStaticMarkup(
      <TabletopDetailPanel
        detailCaption="怪物卡 / 英雄卡 + 房间卡"
        kind="hero"
        targetId={null}
        quest={base.quest}
        heroes={base.heroes}
        monsters={base.monsters}
        entityName={entityName}
      />,
    );
    expect(html).toContain("tabletop-detail-phase-hint");
    expect(html).toContain("怪物卡 / 英雄卡 + 房间卡");
  });

  it("选中怪物渲染选招区块", () => {
    const html = renderToStaticMarkup(
      <TabletopDetailPanel
        detailCaption=""
        kind="monster"
        targetId="m0"
        quest={base.quest}
        heroes={base.heroes}
        monsters={base.monsters}
        entityName={() => "HELLION"}
      />,
    );
    expect(html).toContain("tabletop-detail-monster");
    expect(html).toContain("伤口 3/9");
    expect(html).toContain("选招 d10=4");
  });

  it("选中英雄渲染状态列表", () => {
    const html = renderToStaticMarkup(
      <TabletopDetailPanel
        detailCaption=""
        kind="hero"
        targetId="hero-1"
        quest={base.quest}
        heroes={base.heroes}
        monsters={base.monsters}
        entityName={entityName}
      />,
    );
    expect(html).toContain("tabletop-detail-hero-status");
    expect(html).toContain("增益");
  });
});
