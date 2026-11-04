import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { CampaignVictoryPanel, campaignRestartUrl } from "./campaign-victory-panel";
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

it("战役胜利面板显示终局与存活英雄，且不回村", () => {
  const markup = renderToStaticMarkup(<CampaignVictoryPanel game={victoryGame()} />);
  expect(markup).toContain("战役胜利");
  expect(markup).toContain("R9、R41");
  expect(markup).toContain("不回到村庄");
  expect(markup).not.toContain("返回村庄");
  expect(markup).toContain('data-testid="campaign-victory-hero"');
  // 英雄名来自已核实 battleCatalog，不显示裸 heroStatId。
  expect(markup).toContain("CRUSADER");
  expect(markup).not.toContain("hero_stat:p001:front ·");
});

it("提供开新战役入口，点击回调只由页面处理", () => {
  const onNewCampaign = vi.fn();
  const markup = renderToStaticMarkup(
    <CampaignVictoryPanel game={victoryGame()} onNewCampaign={onNewCampaign} />,
  );
  expect(markup).toContain('data-testid="campaign-victory-new-campaign"');
  expect(markup).toContain("开新战役");
  expect(onNewCampaign).not.toHaveBeenCalled();
});

it("开新战役回到出征设置页：清查询串与 hash，保留路径", () => {
  expect(campaignRestartUrl("http://127.0.0.1:8080/?phase=3&seed=7#top")).toBe(
    "http://127.0.0.1:8080/",
  );
  expect(campaignRestartUrl("http://127.0.0.1:8080/")).toBe("http://127.0.0.1:8080/");
});
