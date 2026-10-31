import type { SkillStance } from "./hero-skill";

const STANCES: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];
export type SpawnCard = {
  readonly instanceId: string;
  readonly cardId: string;
  readonly edge: "front" | "back";
  readonly stanceSlots: 1 | 2;
  readonly verified: boolean;
};
export type SpawnPlacement = SpawnCard & { readonly stance: SkillStance; readonly areaId: string };

/** R17、R-029 / R-052 / R-058：已知顺序牌堆，每个实例为实际一张卡，不另掷骰。 */
export function spawnMonsters(
  deck: readonly SpawnCard[],
  starts: Readonly<Record<SkillStance, string>>,
  options?: { readonly allowUnverified?: boolean },
):
  | { type: "refused"; reason: string }
  | {
      type: "spawned";
      monsters: readonly SpawnPlacement[];
      discarded: readonly SpawnCard[];
      remaining: readonly SpawnCard[];
      drawn: number;
    } {
  const allowUnverified = options?.allowUnverified === true;
  if (
    new Set(deck.map((card) => card.instanceId)).size !== deck.length ||
    deck.some(
      (card) =>
        !card.instanceId ||
        !card.cardId ||
        (!allowUnverified && card.verified !== true) ||
        (allowUnverified && typeof card.verified !== "boolean") ||
        ![1, 2].includes(card.stanceSlots) ||
        !["front", "back"].includes(card.edge),
    ) ||
    STANCES.some((stance) => typeof starts[stance] !== "string" || !starts[stance])
  )
    return { type: "refused", reason: "生成需要唯一实例、已核实前后排 / 占格和起点（R-048）" };
  let placed: { card: SpawnCard; position: number }[] = [];
  const discarded: SpawnCard[] = [];
  let drawn = 0;
  const occupied = () =>
    new Set(
      placed.flatMap((entry) =>
        Array.from({ length: entry.card.stanceSlots }, (_, index) => entry.position + index),
      ),
    );
  const destination = (card: SpawnCard) => {
    const used = occupied();
    const first = (card.edge === "front" ? [0, 1, 2, 3] : [3, 2, 1, 0]).find(
      (position) => !used.has(position),
    );
    if (first === undefined) return undefined;
    const position = card.edge === "back" ? first - card.stanceSlots + 1 : first;
    return position >= 0 &&
      position + card.stanceSlots <= 4 &&
      Array.from({ length: card.stanceSlots }, (_, index) => position + index).every(
        (slot) => !used.has(slot),
      )
      ? position
      : undefined;
  };
  for (const card of deck) {
    if (occupied().size === 4) break;
    drawn++;
    let position = destination(card);
    if (position === undefined && card.stanceSlots === 2) {
      const lastSmall = placed.map((entry) => entry.card.stanceSlots).lastIndexOf(1);
      if (lastSmall < 0)
        return { type: "refused", reason: "大型怪无空间且没有可替换的小型怪（R-029）" };
      discarded.push(placed[lastSmall]!.card);
      placed = placed.filter((_, index) => index !== lastSmall);
      if (destination(card) === undefined) {
        let offset = 0;
        const positions = new Map<string, number>();
        for (const entry of [...placed].sort((left, right) => left.position - right.position)) {
          positions.set(entry.card.instanceId, offset);
          offset += entry.card.stanceSlots;
        }
        placed = placed.map((entry) => ({
          ...entry,
          position: positions.get(entry.card.instanceId)!,
        }));
      }
      position = destination(card);
    }
    if (position === undefined) return { type: "refused", reason: "生成空间无效，拒绝猜落点" };
    placed.push({ card, position });
  }
  return {
    type: "spawned",
    monsters: placed.map((entry) => ({
      ...entry.card,
      stance: STANCES[entry.position]!,
      areaId: starts[STANCES[entry.position]!],
    })),
    discarded,
    remaining: deck.slice(drawn),
    drawn,
  };
}
