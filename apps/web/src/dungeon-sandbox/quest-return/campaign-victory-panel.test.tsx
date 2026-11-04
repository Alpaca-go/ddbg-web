import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CampaignVictoryPanel } from "./campaign-victory-panel";
import { finalPreparationFixture } from "../../../../../packages/engine/src/test-helpers/final-preparation";

function victoryGame() {
  const base = finalPreparationFixture("quest:p016");
  return {
    ...base,
    dungeon: {
      ...base.dungeon!,
      campaignVictory: true as const,
      finalFormSequence: {
        completedForms: ["ancestor1", "gestatingHeart", "heartOfDarkness"] as const,
        status: "complete" as const,
      },
    },
  };
}

it("战役胜利面板显示终局与存活英雄，且不提供回村", () => {
  const markup = renderToStaticMarkup(<CampaignVictoryPanel game={victoryGame()} />);
  expect(markup).toContain("战役胜利");
  expect(markup).toContain("R9、R41");
  expect(markup).toContain("终局不回村");
  expect(markup).not.toContain("返回村庄");
  expect(markup).toContain('data-testid="campaign-victory-hero"');
  // 英雄名来自已核实 battleCatalog，不显示裸 heroStatId。
  expect(markup).toContain("CRUSADER");
  expect(markup).not.toContain("hero_stat:p001:front ·");
});
