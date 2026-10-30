import { coreTrinketFreeActions } from "@ddbg/engine";
import type { GameState, Command } from "@ddbg/engine";
export function CoreTrinketActions({
  game,
  send,
}: {
  readonly game: GameState;
  readonly send: (command: Command) => void;
}) {
  const actions = coreTrinketFreeActions(game);
  const name = (id: string) => {
    const hero = game.battle?.entities.find((e) => e.id === id);
    if (hero?.hero) return hero.hero;
    const h = game.dungeon?.heroes.find((h) => h.id === id);
    return game.dungeon?.battleCatalog?.heroStats.find((s) => s.id === h?.heroStatId)?.name ?? id;
  };
  if (!actions.length) return null;
  return (
    <fieldset data-action-group="provisions" data-testid="core-trinket-actions">
      <legend>使用饰品</legend>
      {actions.map((a) => (
        <button
          key={a.cardId}
          disabled={!!a.problem}
          title={a.problem ?? undefined}
          onClick={() => send({ type: "useCoreTrinket", actorId: a.actorId, cardId: a.cardId })}
        >
          {name(a.actorId)} · {a.label}
        </button>
      ))}
    </fieldset>
  );
}
