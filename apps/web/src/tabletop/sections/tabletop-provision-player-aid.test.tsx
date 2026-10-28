import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TabletopProvisionPlayerAid } from "./tabletop-provision-player-aid";

describe("TabletopProvisionPlayerAid", () => {
  it("renders Provisions player aid reference with map id", () => {
    const html = renderToStaticMarkup(<TabletopProvisionPlayerAid />);
    expect(html).toContain('data-testid="tabletop-provision-player-aid"');
    expect(html).toContain('data-testid="tabletop-provision-player-aid-face"');
    expect(html).toContain("PLAYER_AIDS_FRONT.pdf_p001.png");
    expect(html).toContain("补给参考卡");
  });
});
