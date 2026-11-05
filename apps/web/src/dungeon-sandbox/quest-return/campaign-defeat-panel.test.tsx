import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { CampaignDefeatPanel, campaignFailureText } from "./campaign-defeat-panel";
import { finalPreparationFixture } from "../../../../../packages/engine/src/test-helpers/final-preparation";

type Failure = "bossQuestHeroesDefeated" | "insufficientWaitingHeroes" | "noWaitingHeroes";

function defeatGame(failure: Failure = "bossQuestHeroesDefeated") {
  const base = finalPreparationFixture("quest:p016");
  return {
    ...base,
    dungeon: {
      ...base.dungeon!,
      campaignFailure: failure,
      heroes: base.dungeon!.heroes.map((hero) => ({
        ...hero,
        dead: true as const,
        wounds: hero.life ?? 0,
      })),
    },
  };
}

it("战役失败面板显示原因、阵亡名单与终局文案，不回村", () => {
  const markup = renderToStaticMarkup(<CampaignDefeatPanel game={defeatGame()} />);
  expect(markup).toContain("战役失败");
  expect(markup).toContain("Boss任务英雄全灭，战役失败（R-044）。");
  expect(markup).toContain("不再回村");
  expect(markup).not.toContain("返回村庄");
  expect(markup).toContain('data-testid="campaign-defeat"');
  expect(markup).toContain('data-testid="campaign-defeat-hero"');
  // 英雄名来自已核实 battleCatalog，不显示裸 heroStatId。
  expect(markup).toContain("CRUSADER");
  expect(markup).not.toContain("hero_stat:p001:front（阵亡）");
});

it("三种失败原因各有对应文案（R-044 / R9·R25 / R33）", () => {
  expect(campaignFailureText("bossQuestHeroesDefeated")).toContain("R-044");
  expect(campaignFailureText("insufficientWaitingHeroes")).toContain("R9/R25");
  expect(campaignFailureText("noWaitingHeroes")).toContain("R33");
  expect(campaignFailureText(undefined)).toBe("战役失败。");
});

it("提供开新战役入口，点击回调只由页面处理", () => {
  const onNewCampaign = vi.fn();
  const markup = renderToStaticMarkup(
    <CampaignDefeatPanel
      game={defeatGame("insufficientWaitingHeroes")}
      onNewCampaign={onNewCampaign}
    />,
  );
  expect(markup).toContain('data-testid="campaign-defeat-new-campaign"');
  expect(markup).toContain("开新战役");
  expect(onNewCampaign).not.toHaveBeenCalled();
});
