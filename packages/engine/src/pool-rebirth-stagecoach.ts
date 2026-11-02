import type { PreparedRebirth } from "./pool-rebirth-payment";
import type { DungeonState } from "./dungeon";
import { stagecoachProjections, stagecoachHoldingsProblem } from "./stagecoach-holdings";
import { conditionPoolProblem } from "./conditions";
import { trinketPoolProblem } from "./trinket-acquisition";

/** R-147–151：把已准备的事务拆回四人队伍与持牌驿站英雄；仍不是公开清场入口。 */
export function storePoolRebirthInStagecoach(
  prepared: PreparedRebirth,
):
  | { readonly status: "resolved"; readonly dungeon: DungeonState }
  | { readonly status: "refused"; readonly reason: string } {
  const d = prepared.dungeon;
  const recipient = d.heroes.find((h) => h.id === prepared.recipientId);
  const refuse = (reason: string) => ({ status: "refused" as const, reason });
  const archive = d.fallenHeroes?.filter((f) => f.hero.id === prepared.recipientId && !f.revived);
  if (
    !recipient?.dead ||
    archive?.length !== 1 ||
    !d.conditions ||
    !d.trinkets ||
    prepared.paymentDungeon.heroes.length !== 4
  )
    return refuse("驿站复活事务缺少唯一未使用档案、原牌或四人支付记录");
  const newId = `reborn:${recipient.id}`;
  if (
    [...prepared.paymentDungeon.heroes, ...(d.stagecoachHeroes ?? [])].some((h) => h.id === newId)
  )
    return refuse("驿站复活身份已存在，不能重复提交事务");
  const { deathReason: _reason, ...original } = recipient;
  void _reason;
  const revived = {
    ...original,
    id: newId,
    dead: false,
    ...(recipient.combat
      ? {
          combat: (() => {
            const { deathReason: _combatReason, ...combat } = recipient.combat!;
            void _combatReason;
            return { ...combat, id: newId, dead: false };
          })(),
        }
      : {}),
  };
  const heroes = prepared.paymentDungeon.heroes.map((h) =>
    h.id === recipient.id ? h : d.heroes.find((updated) => updated.id === h.id)!,
  );
  if (heroes.some((h) => !h)) return refuse("驿站事务丢失原队伍成员");
  const stagecoachHeroes = [...(d.stagecoachHeroes ?? []), revived];
  const projection = stagecoachProjections(stagecoachHeroes);
  const next: DungeonState = {
    ...d,
    heroes,
    ...(heroes.some((h) => h.dead)
      ? {
          phase: "awaitingReplacement" as const,
          replacementResume: d.replacementResume ?? ("ready" as const),
        }
      : {}),
    stagecoachHeroes,
    conditions: { ...d.conditions, reservedHeroes: projection.conditions },
    trinkets: {
      ...d.trinkets,
      reservedHeroes: projection.trinkets,
      held: d.trinkets.held.map((h) => (h.heroId === recipient.id ? { ...h, heroId: newId } : h)),
    },
    fallenHeroes: d.fallenHeroes!.map((f) => (f === archive[0] ? { ...f, revived: true } : f)),
  };
  const problem =
    stagecoachHoldingsProblem(next) ??
    conditionPoolProblem(next.conditions!, heroes) ??
    trinketPoolProblem(next.trinkets!, heroes);
  return problem ? refuse(problem) : { status: "resolved", dungeon: next };
}
