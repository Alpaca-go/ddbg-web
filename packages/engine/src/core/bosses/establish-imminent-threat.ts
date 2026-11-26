import { ensureShriekerIBossScriptRegistered } from "../../weald/bosses/shrieker/shrieker-i";
import { nextExpeditionLocationDecks } from "../../shared/hamlet/hamlet-location-embark";
import { ensurePounderIBossScriptRegistered } from "../../weald/bosses/pounder/pounder-i";
import { wealdThreatPool } from "../../weald/bosses/threat-pool";
import { ensureCampaignBossScriptsRegistered } from "../../shared/core/registry";
import { requireFaceTheThreatEmbarkPlanForSandbox } from "./face-the-threat-embark-runtime";
import type { CampaignLevel } from "../../../../data/src/core/quests/basic-quests";
import type { ApplyResult, GameState } from "../../shared/core/command";
import { rejectBattleCommand } from "../../shared/battle/battle";
import { readCampaignLevel } from "../../shared/hamlet/hamlet-campaign";
import { createRng } from "../../shared/core/rng";
import type { DungeonState } from "../../shared/dungeon/dungeon";
import { applyActiveBossThreatToDungeon } from "./apply-active-boss-threat";
import { ensureCoreBossScriptsRegistered } from "./necromancer/necromancer-i";
import { getBossScript } from "./registry";
import {
  imminentThreatPoolForCampaign,
  resolveScriptIdForDescriptionCard,
  ruinsBossIdentityForScriptId,
  unregisteredImminentThreatHold,
  type RuinsBossIdentity,
} from "./threat-description-catalog";
import { readActiveBossThreatScriptId } from "./threat-campaign";
import type { BossScriptId } from "./types";

export type EstablishImminentThreatCommand = {
  readonly type: "establishImminentThreat";
  readonly locationBosses?: true | undefined;
  readonly locationSources?: true | undefined;
  readonly pounderDungeonThreats?: true | undefined;
  readonly pounderHamletThreats?: true | undefined;
  readonly pounderBossBattles?: true | undefined;
  readonly shriekerBossBattles?: true | undefined;
  readonly wealdHigherBosses?: true | undefined;
};

export type DrawImminentThreatAfterActAdvanceCommand = {
  readonly type: "drawImminentThreatAfterActAdvance";
};

export type ImminentThreatCommand =
  EstablishImminentThreatCommand | DrawImminentThreatAfterActAdvanceCommand;

function shuffleWithRng(
  cards: readonly string[],
  rng: { next: () => number },
): {
  readonly deck: string[];
  readonly draws: number;
} {
  const deck = [...cards];
  let draws = 0;
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    draws++;
  }
  return { deck, draws };
}

function drawOne(
  pool: readonly string[],
  rng: { next: () => number },
): {
  readonly cardId: string;
  readonly rngDraws: number;
} {
  if (pool.length === 1) return { cardId: pool[0]!, rngDraws: 0 };
  const { deck, draws } = shuffleWithRng(pool, rng);
  return { cardId: deck[0]!, rngDraws: draws };
}

function appendDefeatedRuinsBoss(
  d: DungeonState,
  identity: RuinsBossIdentity,
): readonly RuinsBossIdentity[] {
  const prev = d.defeatedRuinsBossIdentities ?? [];
  if (prev.includes(identity)) return prev;
  return [...prev, identity];
}

export function recordRuinsBossDefeatOnThreatCleared(
  d: DungeonState,
  clearedScriptId: BossScriptId,
): DungeonState {
  const identity = ruinsBossIdentityForScriptId(clearedScriptId);
  if (!identity) return d;
  return { ...d, defeatedRuinsBossIdentities: appendDefeatedRuinsBoss(d, identity) };
}

function applyImminentThreatDraw(
  state: GameState,
  pool: readonly string[],
  rulesRef: string,
): ApplyResult {
  const d = state.dungeon!;
  if (!pool.length)
    return rejectBattleCommand(state, "迫近威胁抽牌池为空（已击败全部 Ruins Boss？）");
  const rng = createRng(state.seed);
  for (let i = 0; i < d.cursor; i++) rng.next();
  const { cardId, rngDraws } = drawOne(pool, rng);
  const cursor = d.cursor + rngDraws;
  if (d.shriekerBossBattles) ensureShriekerIBossScriptRegistered();
  if (d.pounderDungeonThreats) ensurePounderIBossScriptRegistered();
  if (d.wealdHigherBosses) ensureCampaignBossScriptsRegistered(d.contentPacks);
  const scriptId = resolveScriptIdForDescriptionCard(
    cardId,
    d.contentPacks,
    d.pounderDungeonThreats,
    d.shriekerBossBattles,
    d.wealdHigherBosses,
  );
  ensureCoreBossScriptsRegistered();
  if (d.locationBossThreats) ensureCampaignBossScriptsRegistered(d.contentPacks);
  const registered = scriptId && getBossScript(scriptId);
  let dungeon: DungeonState = {
    ...d,
    cursor,
    imminentThreatDescriptionCardId: cardId,
    ...(registered
      ? {}
      : { unregisteredImminentThreatHold: unregisteredImminentThreatHold(cardId) }),
  };
  if (registered && scriptId) {
    dungeon = applyActiveBossThreatToDungeon(dungeon, scriptId);
    const { unregisteredImminentThreatHold: _hold, ...withoutHold } = dungeon;
    void _hold;
    dungeon = withoutHold;
  } else {
    const { activeBossThreatScriptId: _active, ...base } = dungeon;
    void _active;
    dungeon = base;
    if (dungeon.hamlet) {
      dungeon = {
        ...dungeon,
        hamlet: applyActiveBossThreatToDungeon(dungeon, null).hamlet!,
      };
    }
  }
  const scriptNote = registered
    ? `→ 脚本 ${scriptId}，村庄 / 地牢被动已挂接`
    : `→ ${unregisteredImminentThreatHold(cardId)}`;
  return {
    state: { ...state, dungeon },
    events: [
      {
        type: "dungeonUpdated",
        message: `迫近威胁：抽 ${cardId}（${rulesRef}）${scriptNote}`,
      },
    ],
  };
}

export function establishImminentThreat(
  state: GameState,
  command: EstablishImminentThreatCommand,
): ApplyResult {
  if (command.locationSources && !command.locationBosses)
    return rejectBattleCommand(state, "地点出征来源须同时启用完整地点威胁池");
  if (state.battle) return rejectBattleCommand(state, "战斗进行中不能定威胁（R-048）");
  const d = state.dungeon;
  if (!d) return rejectBattleCommand(state, "缺少战役状态，不能定威胁");
  if (
    command.shriekerBossBattles &&
    (!command.locationBosses || !command.locationSources || !d.contentPacks?.includes("weald"))
  )
    return rejectBattleCommand(state, "Shrieker I 需要完整 Weald 来源");
  if (command.pounderBossBattles && !command.pounderHamletThreats)
    return rejectBattleCommand(state, "Pounder Boss 战斗版本须同时启用两段威胁版本");
  if (
    command.pounderBossBattles &&
    (!d.contentPacks?.includes("weald") ||
      (d.questDistribution?.questId === "quest:p019" &&
        d.faceTheThreatEmbarkPlan?.roomPlacement !== "edgeRoomsR30"))
  )
    return rejectBattleCommand(
      state,
      "Pounder Boss 版本需要 Weald 包；p019 开局须使用已核准 R30 边缘房",
    );
  if (command.pounderHamletThreats && !command.pounderDungeonThreats)
    return rejectBattleCommand(state, "Pounder 村庄威胁版本须同时启用地牢威胁版本");
  if (
    command.pounderDungeonThreats &&
    (!command.locationSources ||
      !command.locationBosses ||
      (d.mode === "stygian" && !command.pounderBossBattles) ||
      (d.questDistribution?.questId === "quest:p019" && !command.pounderBossBattles))
  )
    return rejectBattleCommand(
      state,
      "Pounder 地牢威胁试验须启用完整地点来源与核准 Boss 出征版本；Stygian 仅接受完整生产命令",
    );
  if (
    command.wealdHigherBosses &&
    (!command.locationSources ||
      !command.locationBosses ||
      !command.shriekerBossBattles ||
      !command.pounderBossBattles)
  )
    return rejectBattleCommand(state, "Weald 高等级版本需要完整地点与 Boss 版本");
  if (readActiveBossThreatScriptId(d))
    return rejectBattleCommand(state, "已有激活迫近威胁；请先击败 Boss 或清除后再定威胁");
  if (d.imminentThreatDescriptionCardId)
    return rejectBattleCommand(
      state,
      "战役已确定过迫近威胁；升幕请用 drawImminentThreatAfterActAdvance",
    );
  const level = readCampaignLevel(d);
  if (level !== 1) return rejectBattleCommand(state, "战役开局定威胁须为战役 I 级（spec §2.4）");
  let pool: readonly string[];
  try {
    pool = command.locationBosses ? wealdThreatPool(d, 1) : imminentThreatPoolForCampaign(1, []);
  } catch (error) {
    return rejectBattleCommand(state, error instanceof Error ? error.message : "地点威胁来源无效");
  }
  const result = applyImminentThreatDraw(
    command.locationBosses
      ? {
          ...state,
          dungeon: {
            ...d,
            locationBossThreats: true,
            ...(command.locationSources ? { bossLocationSources: true } : {}),
            ...(command.wealdHigherBosses ? { wealdHigherBosses: true } : {}),
            ...(command.pounderDungeonThreats ? { pounderDungeonThreats: true } : {}),
            ...(command.pounderHamletThreats ? { pounderHamletThreats: true } : {}),
            ...(command.shriekerBossBattles ? { shriekerBossBattles: true } : {}),
            ...(command.pounderBossBattles ? { pounderBossBattles: true } : {}),
          },
        }
      : state,
    pool,
    command.locationBosses
      ? "Weald W3：混洗启用地点的 I 级 Boss 描述卡"
      : "spec §2.4 洗 4 张 I 级 Ruins Boss 描述卡抽 1 张",
  );
  let next = result.state.dungeon!;
  if (
    command.locationSources &&
    (next.activeBossThreatScriptId === "boss:weald:hag:1" ||
      (command.shriekerBossBattles && next.activeBossThreatScriptId === "boss:weald:shrieker:1") ||
      (command.pounderBossBattles &&
        next.activeBossThreatScriptId === "boss:weald:brigandPounder:1")) &&
    d.questDistribution?.questId === "quest:p019"
  ) {
    if (d.phase !== "awaitingProvisions")
      return rejectBattleCommand(state, "Weald Boss 地点来源只能在 p019 开局补给前重建（W3）");
    try {
      const decks = nextExpeditionLocationDecks(next, "quest:p019");
      if (!decks) return rejectBattleCommand(state, "Weald Boss 缺少地点来源（W3）");
      next = { ...next, ...decks, bossExpeditionRegion: "weald" };
    } catch (error) {
      return rejectBattleCommand(
        state,
        error instanceof Error ? error.message : "Weald Boss 地点来源无效",
      );
    }
  }
  if (
    d.phase === "awaitingProvisions" &&
    d.questDistribution?.questId === "quest:p019" &&
    d.faceTheThreatEmbarkPlan &&
    next.activeBossThreatScriptId
  ) {
    return {
      ...result,
      state: {
        ...result.state,
        dungeon: {
          ...next,
          faceTheThreatEmbarkPlan: {
            ...d.faceTheThreatEmbarkPlan,
            ...requireFaceTheThreatEmbarkPlanForSandbox(next),
          },
        },
      },
    };
  }
  return { ...result, state: { ...result.state, dungeon: next } };
}

export function drawImminentThreatAfterActAdvance(
  state: GameState,
  command: DrawImminentThreatAfterActAdvanceCommand,
): ApplyResult {
  void command;
  if (state.battle) return rejectBattleCommand(state, "战斗进行中不能抽迫近威胁（R-048）");
  const d = state.dungeon;
  if (!d) return rejectBattleCommand(state, "缺少战役状态");
  if (readActiveBossThreatScriptId(d))
    return rejectBattleCommand(state, "当前仍有激活迫近威胁；须在 Boss 被击败后升幕再抽");
  const level = readCampaignLevel(d);
  if (level < 2)
    return rejectBattleCommand(
      state,
      "升幕抽迫近威胁须战役 II 级及以上（spec §2.2 / R35）；完整升幕步骤仍待接",
    );
  if (d.locationBossThreats && !d.wealdHigherBosses)
    return rejectBattleCommand(
      state,
      "Weald II／III 级 Boss 描述来源及升幕尚未核准接通（W3／R-048）",
    );
  const defeated = d.defeatedRuinsBossIdentities ?? [];
  if (
    defeated.length + (d.wealdHigherBosses ? (d.defeatedWealdBossIdentities?.length ?? 0) : 0) !==
    ((level - 1) as number)
  )
    return rejectBattleCommand(
      state,
      `升幕抽牌需已击败 ${level - 1} 个 Ruins Boss（当前 ${defeated.length}）；击败 Boss 后由 finishDungeonBattle 记录`,
    );
  let pool: readonly string[];
  try {
    pool = d.wealdHigherBosses
      ? wealdThreatPool(d, level as CampaignLevel)
      : imminentThreatPoolForCampaign(level as CampaignLevel, defeated);
  } catch (error) {
    return rejectBattleCommand(state, error instanceof Error ? error.message : "地点威胁来源无效");
  }
  return applyImminentThreatDraw(
    state,
    pool,
    `spec §2.2 从剩余 Boss 的 ${level} 级描述卡随机抽 1 张`,
  );
}
