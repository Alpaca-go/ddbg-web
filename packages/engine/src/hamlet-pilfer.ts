import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { rejectBattleCommand } from "./battle";
import { createLootState, type LootState } from "./loot";
import { createRng } from "./rng";
import { finishHamletAction } from "./hamlet-actions";

type Hero = DungeonState["heroes"][number];

const reviewed = {
  "hero_stat:p017:front": { level: 1 },
  "hero_stat:p017:back": { level: 2 },
  "hero_stat:p018:front": { level: 3 },
} as const;

/** R-047：十枚规范实例；缺池时按回村同款建立，不发明额外供给。 */
function ensureLootPool(d: DungeonState): LootState | { reason: string } {
  const loot = d.lootPool ?? { ...createLootState(), gold: d.gold };
  const canonical = createLootState().available;
  const ids = [...loot.available.map((t) => t.id), ...loot.claimedIds];
  if (
    loot.placed.length ||
    new Set(ids).size !== ids.length ||
    ids.length !== 10 ||
    ids.some((id) => !canonical.some((t) => t.id === id)) ||
    loot.available.some(
      (t) => !canonical.some((expected) => expected.id === t.id && expected.kind === t.kind),
    ) ||
    loot.gold !== d.gold ||
    !Number.isSafeInteger(loot.provisionCursor) ||
    loot.provisionCursor < 0
  )
    return { reason: "Pilfer需要守恒的战利品池（R-047、R-048）" };
  return loot;
}

/**
 * Hero STAT FRONT/BACK p17、FRONT p18：Hamlet Skill Pilfer — Draw a {Loot Token}。
 * R-096 仅限定命名图标；抽取一枚加入 claimed（离开可用堆）。
 * 翻面结算、补给去向、空堆等见 Q-99，本主题拒绝这些边（R-001/R-048）。
 */
export function usePilfer(state: GameState, hero: Hero): ApplyResult {
  const d = state.dungeon!;
  const stat = d.battleCatalog?.heroStats.find((s) => s.id === hero.heroStatId);
  const row = reviewed[hero.heroStatId as keyof typeof reviewed];
  const pool = ensureLootPool(d);
  if ("reason" in pool)
    return rejectBattleCommand(state, pool.reason);
  if (
    !row ||
    !hero.attributesVerified ||
    !stat?.attributesVerified ||
    stat.name !== "GRAVE ROBBER" ||
    stat.level !== row.level ||
    hero.level !== row.level
  )
    return rejectBattleCommand(state, "Pilfer只接已核实盗墓者I–III（R-048、R-096）");
  if (!pool.available.length)
    return rejectBattleCommand(
      state,
      "Pilfer：战利品可用堆已空，抽取代币时机/空堆语义待确认（Q-99）",
    );
  if (!Number.isSafeInteger(d.cursor) || d.cursor < 0 || !Number.isSafeInteger(d.cursor + 1))
    return rejectBattleCommand(state, "Pilfer RNG游标无效");
  const rng = createRng(state.seed);
  for (let i = 0; i < d.cursor; i++) rng.next();
  const index = Math.floor(rng.next() * pool.available.length);
  const drawn = pool.available[index]!;
  const available = pool.available.filter((_, i) => i !== index);
  const next = finishHamletAction(
    {
      ...d,
      cursor: d.cursor + 1,
      lootPool: {
        ...pool,
        available,
        claimedIds: [...pool.claimedIds, drawn.id],
      },
      phase: "inHamlet",
      hamletReturn: { ...d.hamletReturn!, phase: "complete" },
    },
    hero.id,
    false,
  );
  return {
    state: { ...state, dungeon: next },
    events: [
      {
        type: "dungeonUpdated",
        message: `Pilfer：抽取战利品标记 ${drawn.id}（${drawn.kind}）入已抽取堆；未翻面结算（Hero STAT、R33、R-096；结算见 Q-99）`,
      },
    ],
  };
}
