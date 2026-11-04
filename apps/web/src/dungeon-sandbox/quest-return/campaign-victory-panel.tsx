import type { GameState } from "@ddbg/engine";

/**
 * R9/R41：第 4 幕击败 Heart of Darkness = 战役胜利，游戏到此结束。
 * 终局不回村（Kyries 2026-11-04）：面板只提供「开新战役」回到出征设置。
 */
export function CampaignVictoryPanel({
  game,
  onNewCampaign,
}: {
  game: GameState;
  onNewCampaign?: () => void;
}) {
  const d = game.dungeon!;
  const stats = d.battleCatalog?.heroStats ?? [];
  const survivors = d.heroes.filter((hero) => !hero.dead);
  return (
    <main className="shell" data-testid="campaign-victory">
      <section aria-label="战役胜利">
        <h1>战役胜利</h1>
        <p>第 4 幕 · Heart of Darkness 已被击败（R9、R41）。最终战全部形态完成，本战役到此结束。</p>
        <ul>
          {survivors.map((hero) => (
            <li key={hero.id} data-testid="campaign-victory-hero">
              {stats.find((stat) => stat.id === hero.heroStatId)?.name ??
                hero.heroStatId ??
                hero.id}
              {" · 伤口 "}
              {hero.wounds ?? 0}
              {" · 压力 "}
              {hero.stress ?? 0}
            </li>
          ))}
        </ul>
        <p>打完最终 BOSS 本战役即结束，不回到村庄。</p>
        {onNewCampaign && (
          <button type="button" data-testid="campaign-victory-new-campaign" onClick={onNewCampaign}>
            开新战役
          </button>
        )}
      </section>
    </main>
  );
}

/** 开新战役 = 回到出征设置页：只清查询串与 hash，保留站点路径。 */
export function campaignRestartUrl(href: string): string {
  const url = new URL(href);
  url.search = "";
  url.hash = "";
  return url.toString();
}
