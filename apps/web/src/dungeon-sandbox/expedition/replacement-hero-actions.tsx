import type { DungeonState } from "@ddbg/engine";
import type { DungeonViewProps } from "../view-props";

export function replacementHeroActionsVisible(d: DungeonState): boolean {
  if (d.campaignFailure) return true;
  const needsPrepare = d.heroes.some(
    (h) => h.dead && !d.preparedReplacements?.some((p) => p.deadHeroId === h.id),
  );
  return needsPrepare || !!d.preparedReplacements?.length;
}

/** 死亡补位：公开命令 `prepareReplacementHero` / `joinPreparedReplacements`（R31、R-039）。 */
export function ReplacementHeroActions({
  game,
  dispatch,
}: Pick<DungeonViewProps, "game" | "dispatch">) {
  const d = game.dungeon!;
  if (!replacementHeroActionsVisible(d)) return null;

  const deadCount = d.heroes.filter((h) => h.dead).length;
  const preparedCount = d.preparedReplacements?.length ?? 0;

  return (
    <div data-testid="replacement-hero-actions">
      {d.campaignFailure && (
        <p className="tt-alert" role="status">
          {d.campaignFailure === "insufficientWaitingHeroes"
            ? "英雄全灭，驿站等待英雄不足四人，战役失败（R9/R25）。"
            : "等待英雄代币耗尽，战役失败（R33）。"}
        </p>
      )}
      {d.heroes.some(
        (h) => h.dead && !d.preparedReplacements?.some((p) => p.deadHeroId === h.id),
      ) && (
        <button
          type="button"
          disabled={!!d.deathTrinketChoice || !!d.replacementPreparation || !!d.campaignFailure}
          onClick={() => dispatch({ type: "prepareReplacementHero" })}
        >
          准备驿站替补
        </button>
      )}
      {preparedCount > 0 && (
        <button
          type="button"
          disabled={
            !!d.pending ||
            !!d.deathTrinketChoice ||
            !!d.replacementPreparation ||
            !!d.campaignFailure ||
            deadCount !== preparedCount
          }
          onClick={() => dispatch({ type: "joinPreparedReplacements" })}
        >
          让{preparedCount}名替补入队并继续
        </button>
      )}
      {game.battle && preparedCount > 0 && !d.campaignFailure && (
        <p className="muted">替补已准备；须先结束战斗并返回探索后才能入队（R31）。</p>
      )}
    </div>
  );
}
