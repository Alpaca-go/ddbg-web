import type { CampaignLevel } from "../../../data/src/basic-quests";
import type { ApplyResult, GameState } from "../command";
import { rejectBattleCommand } from "../battle";
import { readCampaignLevel } from "../hamlet-campaign";
import { createRng } from "../rng";
import type { DungeonState } from "../dungeon";
import { applyActiveBossThreatToDungeon } from "./apply-active-boss-threat";
import { ensureCoreBossScriptsRegistered } from "./necromancer-i";
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
  const scriptId = resolveScriptIdForDescriptionCard(cardId);
  ensureCoreBossScriptsRegistered();
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
  void command;
  if (state.battle) return rejectBattleCommand(state, "战斗进行中不能定威胁（R-048）");
  const d = state.dungeon;
  if (!d) return rejectBattleCommand(state, "缺少战役状态，不能定威胁");
  if (readActiveBossThreatScriptId(d))
    return rejectBattleCommand(state, "已有激活迫近威胁；请先击败 Boss 或清除后再定威胁");
  if (d.imminentThreatDescriptionCardId)
    return rejectBattleCommand(
      state,
      "战役已确定过迫近威胁；升幕请用 drawImminentThreatAfterActAdvance",
    );
  const level = readCampaignLevel(d);
  if (level !== 1) return rejectBattleCommand(state, "战役开局定威胁须为战役 I 级（spec §2.4）");
  const pool = imminentThreatPoolForCampaign(1, []);
  return applyImminentThreatDraw(state, pool, "spec §2.4 洗 4 张 I 级 Ruins Boss 描述卡抽 1 张");
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
  const defeated = d.defeatedRuinsBossIdentities ?? [];
  if (defeated.length !== ((level - 1) as number))
    return rejectBattleCommand(
      state,
      `升幕抽牌需已击败 ${level - 1} 个 Ruins Boss（当前 ${defeated.length}）；击败 Boss 后由 finishDungeonBattle 记录`,
    );
  const pool = imminentThreatPoolForCampaign(level as CampaignLevel, defeated);
  return applyImminentThreatDraw(
    state,
    pool,
    `spec §2.2 从剩余 Boss 的 ${level} 级描述卡随机抽 1 张`,
  );
}
