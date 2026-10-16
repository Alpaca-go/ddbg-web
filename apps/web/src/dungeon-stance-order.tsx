import { canSetDungeonStances, DUNGEON_HERO_STANCES } from "@ddbg/engine";
import type { Command, GameState } from "@ddbg/engine";

const labels = ["进攻", "防御", "远程", "支援"];
export function DungeonStanceOrder({
  game,
  dispatch,
}: {
  game: GameState;
  dispatch: (command: Command) => void;
}) {
  const d = game.dungeon;
  if (
    !d ||
    d.heroes.length !== 4 ||
    new Set(d.heroes.map((h) => h.stance)).size !== 4 ||
    d.heroes.some((h) => !DUNGEON_HERO_STANCES.includes(h.stance!))
  )
    return null;
  const heroes = [...d.heroes].sort(
    (a, b) => DUNGEON_HERO_STANCES.indexOf(a.stance!) - DUNGEON_HERO_STANCES.indexOf(b.stance!),
  );
  const move = (index: number, target: number) => {
    const heroIds = heroes.map((h) => h.id);
    [heroIds[index], heroIds[target]] = [heroIds[target]!, heroIds[index]!];
    dispatch({ type: "setDungeonStances", heroIds });
  };
  return (
    <fieldset disabled={!canSetDungeonStances(game)}>
      <legend>探索姿态</legend>
      <p>导航就绪或掷探索骰前可免费调整顺序。</p>
      <ol data-testid="dungeon-stance-order">
        {heroes.map((hero, i) => {
          const name =
            d.battleCatalog?.heroStats.find((s) => s.id === hero.heroStatId)?.name ?? hero.id;
          return (
            <li key={hero.id} data-testid={`dungeon-stance-${DUNGEON_HERO_STANCES[i]}`}>
              {labels[i]}：{name}（{hero.id}）
              <button aria-label={`${name} 前移`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                前移
              </button>
              <button aria-label={`${name} 后移`} disabled={i === 3} onClick={() => move(i, i + 1)}>
                后移
              </button>
            </li>
          );
        })}
      </ol>
    </fieldset>
  );
}
