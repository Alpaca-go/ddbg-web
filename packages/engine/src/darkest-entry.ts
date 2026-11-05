import { basicQuests } from "../../data/src/basic-quests";
import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import type { DungeonState } from "./dungeon";
import { readCampaignLevel } from "./hamlet-campaign";

/**
 * 规格书 §14.7.3：第 4 幕只打 **1** 张最暗任务（p016–p018 随机抽 1 张，不是 2 选 1），
 * 由它取消最终战的一个形态，之后直接进入最后村庄 + 最终战；不是 p016→p017→p018 三连（R-191）。
 *
 * 本切片按 R-191 固定提供 p016；随机 1/3 抽签尚未接线（Q-155），
 * 未裁定前不得把 p016–p018 塞回普通 2 选 1 池，也不得改成三连。
 */
export const DARKEST_ENTRY_FIXED_QUEST_ID = "quest:p016" as const;

export type DarkestDungeonEntryReadiness =
  | { readonly kind: "blocked"; readonly reason: string }
  | { readonly kind: "ok"; readonly questId: typeof DARKEST_ENTRY_FIXED_QUEST_ID };

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

/** 读取第 4 幕入口条件；只返回结论，不改状态、不消费 RNG。 */
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
  return { kind: "ok", questId: DARKEST_ENTRY_FIXED_QUEST_ID };
}

/**
 * §14.7.1 / §14.7.3：Act III Boss 后的村庄阶段结束，唯一任务候选是最暗任务。
 * 固定提供 p016（不抽卡、不消耗 RNG）；确认后仍走 `chooseNextQuest` 的出征校验。
 */
export function enterDarkestDungeon(state: GameState): ApplyResult {
  const readiness = readDarkestDungeonEntryReadiness(state);
  if (readiness.kind === "blocked") return rejectBattleCommand(state, readiness.reason);
  const d = state.dungeon!;
  const quest = basicQuests.find((entry) => entry.id === readiness.questId);
  if (!quest) return rejectBattleCommand(state, "最暗任务卡缺失，未进入最暗地牢（R-048）");
  const pending = {
    id: `hamlet-next-quest:${d.decision}`,
    actorId: "party",
    prompt:
      "第 4 幕：进入最暗地牢任务（§14.7.3 随机 1/3 尚未接线，本切片固定 p016 We Are The Flame；不抽普通任务卡）",
    options: [{ id: quest.id, label: quest.name }],
  };
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        pending,
        decision: d.decision + 1,
        nextQuestOffers: [quest.id],
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `最暗地牢入口：固定提供 ${quest.name}（§14.7.3 / R-191；随机 1/3 抽签见 Q-155）`,
      },
    ],
    pendingChoice: pending,
  };
}
