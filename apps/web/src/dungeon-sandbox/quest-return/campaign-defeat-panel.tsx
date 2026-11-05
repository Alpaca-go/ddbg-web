import type { GameState } from "@ddbg/engine";

type CampaignFailure = NonNullable<GameState["dungeon"]>["campaignFailure"];

const FAILURE_TEXT: Readonly<Record<NonNullable<CampaignFailure>, string>> = {
  bossQuestHeroesDefeated: "Boss任务英雄全灭，战役失败（R-044）。",
  insufficientWaitingHeroes: "英雄全灭，驿站等待英雄不足四人，战役失败（R9/R25）。",
  noWaitingHeroes: "等待英雄代币耗尽，战役失败（R33）。",
};

export function campaignFailureText(failure: CampaignFailure): string {
  return failure ? FAILURE_TEXT[failure] : "战役失败。";
}

/**
 * R9/R25/R33/R-044：战役失败是终局，不再接受命令。
 * 与胜利面板对称，提供「开新战役」回到出征设置（R-188 补充同款入口）。
 */
export function CampaignDefeatPanel({
  game,
  onNewCampaign,
}: {
  game: GameState;
  onNewCampaign?: () => void;
}) {
  const d = game.dungeon!;
  const stats = d.battleCatalog?.heroStats ?? [];
  const fallen = d.heroes.filter((hero) => hero.dead);
  const survivors = d.heroes.filter((hero) => !hero.dead);
  const nameOf = (heroId: string, heroStatId?: string) =>
    stats.find((stat) => stat.id === heroStatId)?.name ?? heroStatId ?? heroId;
  return (
    <main className="shell" data-testid="campaign-defeat">
      <section aria-label="战役失败">
        <h1>战役失败</h1>
        <p>{campaignFailureText(d.campaignFailure)}</p>
        <p>战役到此结束，不再回村，也不再接受部署 / 战斗 / 结算命令。</p>
        {!!fallen.length && (
          <ul>
            {fallen.map((hero) => (
              <li key={hero.id} data-testid="campaign-defeat-hero">
                {nameOf(hero.id, hero.heroStatId)}（阵亡）
              </li>
            ))}
          </ul>
        )}
        {!fallen.length && survivors.length > 0 && (
          <p>存活：{survivors.map((hero) => nameOf(hero.id, hero.heroStatId)).join(" · ")}</p>
        )}
        {onNewCampaign && (
          <button type="button" data-testid="campaign-defeat-new-campaign" onClick={onNewCampaign}>
            开新战役
          </button>
        )}
      </section>
    </main>
  );
}
