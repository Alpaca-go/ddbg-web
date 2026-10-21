import type { EncounterState } from "@ddbg/engine";
import { AssetPlaceholder } from "../asset-placeholder";

/** 正式先攻只读取当前遭遇，避免从 mock 补齐未知值。 */
export function FormalBattleInitiative({
  encounter,
  entityName,
}: {
  readonly encounter: EncounterState | undefined;
  readonly entityName: (id: string) => string;
}) {
  const turn = encounter?.turn;
  const actor = turn && "actorId" in turn ? entityName(turn.actorId) : null;
  const side = turn?.type === "hero" || turn?.type === "monster" ? turn.type : null;
  return (
    <section
      className="tt-init tt-init--formal"
      aria-label="当前行动与先攻"
      data-testid="tabletop-initiative"
    >
      <h3 className="tt-init__title">先攻与回合</h3>
      <p className="tt-init__actor" data-testid="tabletop-turn-actor">
        {actor
          ? `${actor} · ${turn?.type === "hero" ? `剩余 ${turn.actions} 行动` : "怪物回合"}`
          : turn?.type === "awaitingInitiative"
            ? "等待抽取先攻"
            : turn?.type === "finished"
              ? "本场战斗结束"
              : turn?.type === "halted"
                ? "本场战斗停止"
                : "尚未开始"}
      </p>
      <div className="tt-init__round">
        第 <strong>{encounter?.round ?? "—"}</strong> / 4 轮
      </div>
      <ol className="tt-init__round-track" aria-label="回合轨">
        {[1, 2, 3, 4].map((round) => (
          <li key={round} aria-current={encounter?.round === round ? "step" : undefined}>
            {round}
          </li>
        ))}
      </ol>
      <div className="tt-init__deck">
        <AssetPlaceholder
          assetType="initiative"
          label="先攻牌背待确认"
          className="tt-init__deck-back"
        />
        <span data-testid="formal-initiative-remaining">
          余牌 {encounter?.deck.length ?? "—"} 张
        </span>
      </div>
      <div className="tt-init__revealed" aria-label="当前翻开先攻">
        {side ? (
          <span className="tt-init__card" aria-label={side === "hero" ? "英雄先攻" : "怪物先攻"}>
            {side === "hero" ? "英" : "怪"}
          </span>
        ) : (
          <span className="muted">当前翻牌：—</span>
        )}
      </div>
    </section>
  );
}
