import { basicQuests } from "../../data/src/basic-quests";
import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import type { DungeonState } from "./dungeon";
import { createRng } from "./rng";
import { readDarkestBossEncounter } from "./boss/darkest-content";
import { readCampaignLevel } from "./hamlet-campaign";

/**
 * 规格书 §14.7.3：第 4 幕只打 **1** 张最暗任务（p016–p018 随机抽 1 张，不是 2 选 1），
 * 由它取消最终战的一个形态，之后直接进入最后村庄 + 最终战；不是 p016→p017→p018 三连（R-191）。
 */
export const DARKEST_QUEST_IDS = ["quest:p016", "quest:p017", "quest:p018"] as const;
export type DarkestQuestId = (typeof DARKEST_QUEST_IDS)[number];

/** 印刷形态名（英文卡面；本文件的文案是中文 UI + 英文卡名）。 */
const SKIPPED_FORM_LABELS = {
  ancestor1: "Ancestor 1st Form",
  ancestor2: "Ancestor 2nd Form",
  gestatingHeart: "Gestating Heart",
  heartOfDarkness: "Heart of Darkness",
} as const;

export type DarkestDungeonEntryReadiness =
  { readonly kind: "blocked"; readonly reason: string } | { readonly kind: "ok" };

/**
 * Act III Boss 已结算并回村：第 4 幕入口的公共前置（只读取，不消费 RNG）。
 * 「已击败 3 个 Boss」用来区分 II→III 升幕后仍残留的 II 幕 p019 胜利摘要。
 * 用于拦截「III 级普通任务已用完」之后回落到 2 选 1 的错误路径。
 */
export function darkestActEntryPending(d: DungeonState): boolean {
  return (
    readCampaignLevel(d) === 3 &&
    !d.darkest &&
    (d.defeatedRuinsBossIdentities ?? []).length === 3 &&
    d.questSummary?.questId === "quest:p019" &&
    d.questSummary.awarded === true &&
    d.bossQuestVictory === true &&
    d.hamletReturn?.phase === "complete"
  );
}

/** R-192：3 张最暗任务洗混后取首张；命令无载荷，种子 + 游标即可重放。 */
function drawDarkestQuest(seed: number, cursor: number) {
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(cursor) || cursor < 0)
    throw new Error("最暗任务抽签需要有效种子与RNG游标（R-192）");
  const rng = createRng(seed);
  for (let i = 0; i < cursor; i++) rng.next();
  const deck: DarkestQuestId[] = [...DARKEST_QUEST_IDS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return { questId: deck[0]!, cursor: cursor + deck.length - 1 };
}

/** 读取第 4 幕入口条件；只返回结论，不改状态、不消费 RNG、不提前抽卡。 */
export function readDarkestDungeonEntryReadiness(state: GameState): DarkestDungeonEntryReadiness {
  const blocked = (reason: string): DarkestDungeonEntryReadiness => ({ kind: "blocked", reason });
  const d = state.dungeon;
  if (!d || state.battle) return blocked("最暗地牢入口须在非战斗的村庄状态读取（§14.7.1）");
  if (d.darkest) return blocked("已在最暗地牢任务中：第 4 幕只有一张最暗任务（§14.7.3）");
  if (!darkestActEntryPending(d))
    return blocked("只有 Act III Boss 胜利、3 XP 已发并回村完成后才能进入最暗地牢（§14.7.1）");
  if (d.phase !== "inHamlet") return blocked("最暗地牢入口须在村庄阶段结束后开放（§14.7.1）");
  if (d.activeBossThreatScriptId) return blocked("已击败Boss的迫近威胁须先清除");
  if (!d.hamlet || d.hamlet.phase !== "preparationComplete")
    return blocked("须先完成 Act III Boss 后的村庄阶段，再进入最暗地牢（§14.7.1）");
  if (d.hamlet.finalPreparation)
    return blocked("最后四天准备之后不再进入最暗任务，应准备最终战（§14.7）");
  if (d.pending) return blocked("须先完成当前待选，再进入最暗地牢");
  if (d.nextQuestOffers?.length) return blocked("已有任务候选，请先处理当前抽取结果");
  if (d.heroes.length !== 4 || d.heroes.some((hero) => hero.dead))
    return blocked("最暗地牢出征需要四名存活英雄（§2.4）");
  if (!d.battleCatalog || !d.conditions || !d.trinkets || !d.roomCards)
    return blocked("最暗地牢出征需要完整牌池与战斗目录（R-048）");
  return { kind: "ok" };
}

/**
 * §14.7.1 / §14.7.3 / R-192：Act III Boss 后的村庄阶段结束，唯一任务候选是从 3 张最暗任务
 * 随机抽出的 1 张（公开抽卡，不是 2 选 1）。确认后仍走 `chooseNextQuest` 的出征校验与最暗布置。
 */
export function enterDarkestDungeon(state: GameState): ApplyResult {
  const readiness = readDarkestDungeonEntryReadiness(state);
  if (readiness.kind === "blocked") return rejectBattleCommand(state, readiness.reason);
  const d = state.dungeon!;
  let drawn: ReturnType<typeof drawDarkestQuest>;
  try {
    drawn = drawDarkestQuest(state.seed, d.cursor);
  } catch (error) {
    return rejectBattleCommand(
      state,
      error instanceof Error ? error.message : "最暗任务抽签失败（R-192）",
    );
  }
  const quest = basicQuests.find((entry) => entry.id === drawn.questId);
  if (!quest) return rejectBattleCommand(state, "最暗任务卡缺失，未进入最暗地牢（R-048）");
  const encounter = readDarkestBossEncounter(drawn.questId);
  const skipped = encounter ? SKIPPED_FORM_LABELS[encounter.skipFinalForm] : undefined;
  if (!skipped)
    return rejectBattleCommand(state, "最暗任务缺少最终形态取消数据，未进入最暗地牢（R-048）");
  const pending = {
    id: `hamlet-next-quest:${d.decision}`,
    actorId: "party",
    prompt: `第 4 幕：最暗地牢任务随机抽 1 张（不是 2 选 1）——${quest.name}；本任务取消最终战的 ${skipped} 形态（§14.7.3 / R-192）`,
    options: [{ id: quest.id, label: quest.name }],
  };
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        cursor: drawn.cursor,
        pending,
        decision: d.decision + 1,
        nextQuestOffers: [quest.id],
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `最暗地牢入口：随机抽到 ${quest.name}（取消最终战 ${skipped}；§14.7.3 / R-192）`,
      },
    ],
    pendingChoice: pending,
  };
}
