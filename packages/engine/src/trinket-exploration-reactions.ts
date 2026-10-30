import type { DungeonState } from "./dungeon";
import type { GameEvent } from "./command";
import { availableTrinket, spendTrinket, trinketChoice } from "./trinket-reactions";
import { nextProvisionFace, PROVISION_FACES, PROVISION_LABELS } from "./loot";

type ExplorationRoll = NonNullable<NonNullable<DungeonState["exploration"]>["rolls"]>[number];
export function explorationTrinketReaction(
  d: DungeonState,
  roll: ExplorationRoll,
): ExplorationRoll {
  let next = roll;
  while (!next.resolved) {
    const options: { id: string; label: string }[] = [];
    if (
      ["trap", "hunger"].includes(next.face) &&
      availableTrinket(d, roll.heroId, "trinket:p012", "upright")
    )
      options.push({ id: "ignore", label: "Survival Guide：忽略本次Trap或Hunger" });
    if (next.face !== "trap" && availableTrinket(d, roll.heroId, "trinket:p012", "inverted"))
      options.push({ id: "trap", label: "Survival Guide：将本次非Trap探索骰转成Trap" });
    const chosen = trinketChoice(
      d,
      roll.heroId,
      "exploring:" + roll.id,
      "探索骰 " + next.face + "：选择Survival Guide",
      options,
    );
    if (chosen === "continue") return next;
    next = chosen === "ignore" ? { ...next, resolved: true } : { ...next, face: "trap" };
    spendTrinket(d, roll.heroId, "trinket:p012");
  }
  return next;
}
/** R-129 / R-131：只在柴火休息成功时，按可用容量掷至多两颗；Forward Camps不调用。 */
export function campingTrinketReaction(
  dungeon: DungeonState,
  seed: number,
): { dungeon: DungeonState; events: readonly GameEvent[] } {
  let d = dungeon;
  const events: GameEvent[] = [];
  for (const hero of d.heroes) {
    const pool = d.explorationSetup?.provisions;
    if (!pool || pool.length >= 16 || !availableTrinket(d, hero.id, "trinket:p024", "upright"))
      continue;
    const chosen = trinketChoice(
      d,
      hero.id,
      "camping",
      "柴火休息已同意：可使用Camper’s Helmet掷补给骰",
      [{ id: "trinket:p024", label: "掷至多两颗补给骰并翻面" }],
    );
    if (chosen === "continue") continue;
    const count = Math.min(2, 16 - pool.length);
    for (let i = 0; i < count; i++) {
      const rolled = nextProvisionFace(seed, d.cursor);
      events.push({
        type: "provisionRolled",
        actorId: hero.id,
        face: rolled,
        message:
          "Camper’s Helmet补给骰：" + (rolled === "wild" ? "Wild" : PROVISION_LABELS[rolled]),
      });
      const face =
        rolled === "wild"
          ? (trinketChoice(
              d,
              hero.id,
              "camping-wild:" + i,
              "Camper’s Helmet Wild：选择补给面",
              PROVISION_FACES.map((id) => ({ id, label: PROVISION_LABELS[id] })),
              true,
            ) as (typeof PROVISION_FACES)[number])
          : rolled;
      const setup = d.explorationSetup!,
        id = "camp-provision:" + d.decision + ":" + hero.id + ":" + d.cursor;
      d = {
        ...d,
        cursor: d.cursor + 1,
        explorationSetup: { ...setup, provisions: [...setup.provisions, { id, face }] },
      };
    }
    spendTrinket(d, hero.id, "trinket:p024");
  }
  return { dungeon: d, events };
}
