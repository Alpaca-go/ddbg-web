import { readBasicQuest } from "../../../../../packages/data/src/basic-quests";
import { restPoints } from "../../../../../packages/data/src/scout-rest";
import { CoreboxPrintCardFace } from "../../card-art/corebox-print-card-face";
import type { GameState } from "@ddbg/engine";

export function DungeonDecksZone({
  game,
  withTestIds = false,
}: {
  game: GameState;
  withTestIds?: boolean;
}) {
  const d = game.dungeon!;
  const quest = readBasicQuest(d.questDistribution);
  const tid = (id: string) => (withTestIds ? { "data-testid": id } : {});
  return (
    <div className="dungeon-decks-zone">
      <p {...tid("dungeon-provision-count")}>
        公共补给（{d.explorationSetup!.provisions.length}/16）
      </p>
      <p {...tid("dungeon-gold")}>共享金币：{d.gold}</p>
      <div {...tid("dungeon-trinkets")}>
        <p>携带饰品：</p>
        {d.trinkets?.held.length ? (
          <div className="trinket-held-row">
            {d.trinkets.held.map((h) => {
              const trinketCard = d.trinkets!.cards.find((c) => c.id === h.cardId)!;
              return (
                <CoreboxPrintCardFace
                  key={`${h.heroId}-${h.cardId}`}
                  deck="trinket"
                  cardId={h.cardId}
                  face={h.face === "upright" ? "front" : "back"}
                  size="sm"
                  label={`${h.heroId} · ${trinketCard.name}（${h.face === "upright" ? "正面" : "反面"}）`}
                />
              );
            })}
          </div>
        ) : (
          <p>无</p>
        )}
      </div>
      <p {...tid("dungeon-firewood")}>
        {quest?.name ?? "任务"} 柴火：
        {d.rest?.used
          ? "已弃置"
          : d.rest
            ? `可用（${restPoints(d.rest.questId)}点）`
            : "无已核实柴火"}
      </p>
      <p {...tid("dungeon-provisions")}>
        剩余补给：
        {d.explorationSetup!.provisions.map((p) => `${p.id} ${p.face}`).join(" · ") || "无"}
      </p>
      <p {...tid("dungeon-status-stacks")}>
        {d.heroes
          .map(
            (h) =>
              `${h.id}：${
                (h.statusStacks ?? h.combat?.statusStacks)
                  ?.map((s) => `${s.kind} ${s.remaining}t`)
                  .join("、") || "无状态"
              }`,
          )
          .join("；")}
      </p>
    </div>
  );
}
