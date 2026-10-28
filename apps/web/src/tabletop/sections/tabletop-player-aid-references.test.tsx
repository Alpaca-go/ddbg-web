import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TabletopConditionsPlayerAid } from "./tabletop-conditions-player-aid";
import { TabletopDungeonPlayerAidRefs } from "./tabletop-dungeon-player-aid-refs";
import { TabletopExplorationPlayerAid } from "./tabletop-exploration-player-aid";
import { TabletopRoomsPlayerAid } from "./tabletop-rooms-player-aid";

describe("Tabletop player aid references", () => {
  it("renders Exploration back from player_aid:p001", () => {
    const html = renderToStaticMarkup(<TabletopExplorationPlayerAid />);
    expect(html).toContain('data-testid="tabletop-exploration-player-aid"');
    expect(html).toContain("PLAYER_AIDS_BACK.pdf_p001.png");
    expect(html).toContain("探索参考卡");
  });

  it("renders Rooms front from player_aid:p005", () => {
    const html = renderToStaticMarkup(<TabletopRoomsPlayerAid />);
    expect(html).toContain('data-testid="tabletop-rooms-player-aid"');
    expect(html).toContain("PLAYER_AIDS_FRONT.pdf_p005.png");
    expect(html).toContain("房间参考卡");
  });

  it("renders Conditions back from player_aid:p005", () => {
    const html = renderToStaticMarkup(<TabletopConditionsPlayerAid />);
    expect(html).toContain('data-testid="tabletop-conditions-player-aid"');
    expect(html).toContain("PLAYER_AIDS_BACK.pdf_p005.png");
    expect(html).toContain("状态参考卡");
  });

  it("stacks dungeon exploration references", () => {
    const html = renderToStaticMarkup(<TabletopDungeonPlayerAidRefs />);
    expect(html).toContain('data-testid="tabletop-dungeon-player-aid-refs"');
    expect(html).toContain("PLAYER_AIDS_FRONT.pdf_p001.png");
    expect(html).toContain("PLAYER_AIDS_BACK.pdf_p001.png");
    expect(html).toContain("PLAYER_AIDS_FRONT.pdf_p005.png");
  });
});
