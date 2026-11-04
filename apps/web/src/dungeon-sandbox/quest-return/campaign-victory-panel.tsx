import type { GameState } from "@ddbg/engine";

/**
 * R9/R41：第 4 幕击败 Heart of Darkness = 战役胜利。
 * B1 只做终局结算：不回到村庄、不开放新战役，也不接受进一步命令。
 */
export function CampaignVictoryPanel({ game }: { game: GameState }) {
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
        <p>终局不回村，也不开放新战役；如需重新开始，请刷新页面重新出征。</p>
      </section>
    </main>
  );
}
