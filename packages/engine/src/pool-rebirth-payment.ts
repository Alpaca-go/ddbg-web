import type { GameEvent, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { triggerDungeonPassive } from "./dungeon-passive";
import { resolveDungeonPressure } from "./dungeon-pressure";
import { captureFallenHeroes } from "./fallen-heroes";
import { releaseDeadHeroCards } from "./hero-death-cards";
import { returnPoolRebirthCards } from "./pool-rebirth-card-return";

function syncCombat(heroes: DungeonState["heroes"]): DungeonState["heroes"] {
  return heroes.map((h) =>
    h.combat
      ? {
          ...h,
          combat: {
            ...h.combat,
            stress: h.stress,
            wounds: h.wounds ?? h.combat.wounds,
            dead: h.dead ?? false,
            resolveTested: h.resolveTested ?? false,
            resolveCardId: h.resolveCardId ?? null,
            diseaseId: h.diseaseId ?? null,
            quirkIds: h.quirkIds ?? [],
          },
        }
      : h,
  );
}

type PreparedRebirth = {
  readonly status: "prepared";
  /** 暂存事务包含原队伍及目标档案；不能直接写入公开GameState或当成五人队伍。 */
  readonly dungeon: DungeonState;
  readonly recipientId: string;
  readonly events: readonly GameEvent[];
};

/** ROOMS FRONT p14 / R-147–149：清场调用方的原子事务前置。
 * 不校验清场凭据、不复活、不写入驿站；调用方必须完成这些步骤才可提交结果。
 */
export function preparePoolRebirthPayment(
  state: GameState,
  fallenHeroId: string,
): PreparedRebirth | { readonly status: "refused"; readonly reason: string } {
  const refuse = (reason: string) => ({ status: "refused" as const, reason });
  const d = state.dungeon;
  const matches = d?.fallenHeroes?.filter((f) => f.hero.id === fallenHeroId) ?? [];
  if (
    !d ||
    state.battle ||
    d.pending ||
    d.phase !== "ready" ||
    d.deathTrinketChoice ||
    d.replacementPreparation ||
    d.campaignFailure ||
    matches.length !== 1 ||
    d.heroes.length !== 4 ||
    !d.heroes.some((h) => !h.dead) ||
    !Number.isSafeInteger(state.seed) ||
    state.seed < 0 ||
    state.seed > 0xffffffff ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    !Number.isSafeInteger(d.cursor + 100)
  )
    return refuse("重生池支付需要唯一死亡档案、有效RNG和无待选的四人队伍");
  const fallen = matches[0]!;
  const name = d.battleCatalog?.heroStats.find((s) => s.id === fallen.hero.heroStatId)?.name;
  if (
    !name ||
    d.heroes.some(
      (h) =>
        !h.dead && d.battleCatalog?.heroStats.find((s) => s.id === h.heroStatId)?.name === name,
    )
  )
    return refuse("复活身份缺少目录或已有同身份存活英雄（R-147）");
  const preflight = returnPoolRebirthCards(fallen, d.heroes, d);
  if (preflight.status === "refused") return preflight;
  const ids = d.heroes.filter((h) => !h.dead).map((h) => h.id);
  const paid = triggerDungeonPassive(d, state.seed, ids, { type: "stress", amount: 4 });
  if (paid.status === "refused") return paid;
  const pressure = resolveDungeonPressure(
    { ...state, dungeon: paid.dungeon },
    { settleOnly: true },
  );
  const refused = pressure.events.find((e) => e.type === "commandRefused");
  if (refused) return refuse(refused.message);
  // 支付导致的新死亡也必须在回收前存档，供后续遗产/替补处理；不丢弃其饰品。
  const released = releaseDeadHeroCards(
    captureFallenHeroes({
      ...pressure,
      state: {
        ...pressure.state,
        dungeon: {
          ...pressure.state.dungeon!,
          heroes: syncCombat(pressure.state.dungeon!.heroes),
        },
      },
    }),
  );
  const releaseRefused = released.events.find((e) => e.type === "commandRefused");
  if (releaseRefused) return refuse(releaseRefused.message);
  const afterPayment = released.state.dungeon!;
  // 意志检定可能刚抽走原卡：支付完整收尾后才按R-148取回，应用R-149。
  const returned = returnPoolRebirthCards(fallen, afterPayment.heroes, afterPayment);
  if (returned.status === "refused") return returned;
  const heroes = syncCombat(returned.heroes);
  return {
    status: "prepared",
    recipientId: fallenHeroId,
    dungeon: { ...afterPayment, ...returned.pools, heroes },
    events: [
      ...paid.events,
      ...released.events,
      {
        type: "dungeonUpdated",
        message:
          "重生池：存活队员各承受压力+4，意志/心脏病与原牌归还已准备；尚未复活或进入驿站（ROOMS FRONT p14、R-147–149）",
      },
    ],
  };
}
