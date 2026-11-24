import { applyCommand } from "../../src/shared/core/command";
import type { Command, GameEvent, GameState, PendingChoice } from "../../src/shared/core/command";
import { createCoreDungeonQuest } from "../../src/shared/dungeon/dungeon-quest-entry";
import { basicQuests } from "../../../data/src/basic-quests";
import type { BasicQuestId } from "../../../data/src/basic-quests";
import { coreParty, coreQuestSources } from "./core-quest";
import { canRestDungeon } from "../../src/shared/dungeon/dungeon-rest";
import { nextNaturalRoute } from "./natural-route";
import { playNaturalBattle } from "./natural-battle";
import { pickNaturalReplacementOptionId } from "./natural-replacement";
import { isBossQuestId } from "../../src/core/bosses/quest-bridge";
import {
  DARKEST_MAMMOTH_CYST_SCRIPT_ID,
  DARKEST_SHUFFLING_HORROR_SCRIPT_ID,
  DARKEST_TEMPLARS_SCRIPT_ID,
} from "../../src/core/bosses/darkest-mid-boss-scripts";

const equipped = [
  ["hero_skill:core:h01:p001", "hero_skill:core:h01:p004", "hero_skill:core:h01:p016"],
  ["hero_skill:core:h02:p022", "hero_skill:core:h02:p031", "hero_skill:core:h02:p034"],
  ["hero_skill:core:h04:p064", "hero_skill:core:h04:p067", "hero_skill:core:h04:p073"],
  ["hero_skill:core:h05:p088", "hero_skill:core:h05:p094", "hero_skill:core:h05:p097"],
];
export const naturalParty = coreParty.map((hero, index) => ({
  ...hero,
  skillIds: equipped[index]!,
}));
export type NaturalQuestOptions = {
  /** W3：显式新版本地点 Boss 池；缺省保持历史策略与命令日志。 */
  readonly locationBosses?: true;
  readonly locationSources?: true;
  /** 测试玩家在指定数量目标房清理后合法撤离，不读取未揭示内容。 */
  readonly exitAfterObjectiveRooms?: number;
  /** Disinfection 测试玩家：消毒指定数量橡树后合法撤离。 */
  readonly exitAfterDisinfectedOaks?: number;
  /** Circle of Witches 测试玩家：击杀指定数量 Crone 后合法撤离。 */
  readonly exitAfterCroneKills?: number;
  readonly fungalResearch?: "retain-one" | "retain-all" | "destroy-all";
  /** 显式玩家目标操作；不改变既有自然策略的缺省行为。 */
  readonly heroAction?: (state: GameState) => Command | undefined;
  /** 显式玩家捐款选择；缺省仍优先给20金，仅从实际选项选择。 */
  readonly fundraiserDonation?: number;
  /** Wipe ‘Em Out：至少清理多少间巢穴才离开（默认 1）。 */
  readonly wipeLairs?: number;
  /** 从已出征状态续跑（awaitingProvisions / ready），不新建任务入口。 */
  readonly continueFrom?: GameState;
  /** 仅记录公开命令的观测点；用于在自然战斗待选/结算处验证日志重放。 */
  readonly observe?: (state: GameState, command: Command, events?: readonly GameEvent[]) => void;
  /** 自然完成指定场数后按R14提前离开；不伪造任务目标已完成。 */
  readonly exitAfterBattles?: number;
  /**
   * 测试偏好：英雄浪费行动（换姿态）、不求胜，直至 heroesDefeated，
   * 再公开 finishDungeonBattle。仍只走公开命令，不注入 dead:true。
   */
  readonly preferWipeout?: boolean;
  /**
   * 探索中英雄阵亡时按公开命令完成驿站替补（prepareReplacementHero → 选择 → 入队）。
   * 供跨任务的战役级回放使用；默认关闭以保持既有单任务场景不变，也不改战斗策略。
   */
  readonly handleDeaths?: boolean;
  /** 替补时优先驿站复活（不扣等待代币）；默认关闭以保持历史日志。 */
  readonly preferStagecoachRevival?: boolean;
  /** 遗物偏好：保守打法（击杀优先、避免英雄掉血），只给玩家策略链用，不改自然默认。 */
  readonly survival?: boolean;
  /** V1：濒死时优先使用治疗技能（需 survival）。 */
  readonly emergencyHeal?: boolean;
  /** 显式跟随页面的新攻击命令版本，不改变玩家策略。 */
  readonly toxicMushrooms?: true;
  readonly wealdUnprepared?: true;
  readonly wealdPrecious?: true;
  readonly wealdAbyssalPuff?: true;
  readonly wealdOurs?: true;
  readonly wealdClearing?: true;
  /** 显式当前页面命令版本；缺省保持旧日志。 */
  readonly allTrinkets?: true;
  readonly bossEdgeRooms?: true;
  /** 玩家策略：每间房后按这个「伤口 + 压力」阈值决定休息（默认 12，与既有自然策略一致）。 */
  readonly restThreshold?: number;
  /** 明亮模式下，用公开侦察减少探索骰；不在高压时支付侦察费用。 */
  readonly radiantScouting?: boolean;
};

/** 与正式页面 startBattle／playMonsterSkill 及 store.dispatch 的显式版本一致。 */
export const CURRENT_WEALD_ROOM_VERSIONS = {
  toxicMushrooms: true,
  wealdUnprepared: true,
  wealdPrecious: true,
  wealdAbyssalPuff: true,
  wealdOurs: true,
  wealdClearing: true,
  allTrinkets: true,
  bossEdgeRooms: true,
} as const satisfies NaturalQuestOptions;

/** 测试用固定决策驱动，不进入产品；只执行公开命令，不修改任何游戏状态／牌序。 */
export function naturalQuest(
  seed: number,
  questId: BasicQuestId,
  keepStop = false,
  sources = coreQuestSources,
  scoutRooms = 2,
  options: NaturalQuestOptions = {},
) {
  const wipeLairs = options.wipeLairs ?? 1;
  const initial =
    options.continueFrom ?? createCoreDungeonQuest(seed, questId, "radiant", naturalParty, sources);
  let state = initial;
  const commands: Command[] = [],
    events: GameEvent[] = [];
  const step = (command: Command) => {
    if (options.toxicMushrooms && command.type === "playMonsterSkill")
      command = { ...command, toxicMushrooms: true };
    if (options.wealdUnprepared && command.type === "startBattle")
      command = { ...command, wealdUnprepared: true };
    if (options.wealdPrecious && command.type === "startBattle")
      command = { ...command, wealdPrecious: true };
    if (options.wealdAbyssalPuff && command.type === "startBattle")
      command = { ...command, wealdAbyssalPuff: true };
    if (options.wealdClearing && command.type === "startBattle")
      command = { ...command, wealdClearingHeroes: true, wealdClearingMonsters: true };
    if (options.wealdOurs && command.type === "startBattle")
      command = { ...command, wealdOurs: true };
    if (options.bossEdgeRooms && command.type === "resolveChoice")
      command = { ...command, bossEdgeRooms: true };
    if (options.allTrinkets) command = { ...command, allTrinkets: true };
    const r = applyCommand(state, command);
    const refused = r.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(`${command.type}: ${refused.message}`);
    commands.push(command);
    events.push(...r.events);
    state = r.state;
    options.observe?.(state, command, r.events);
    return r;
  };
  const choice = () => state.battle?.pending?.choice ?? state.dungeon?.pending;
  const choose = (id: string) => {
    const pending = choice();
    if (!pending) throw new Error("missing choice");
    return step({ type: "resolveChoice", choiceId: pending.id, optionId: id });
  };
  const pick = (pending: PendingChoice) => {
    const choices = pending.options;
    // 全灭偏好：固定首选项，避免智能 pick 改变补给/探索 RNG 导致第4轮撤退而非英雄全灭。
    if (options.preferWipeout) return choices[0]!.id;
    if (pending.id.startsWith("dungeon-rest:") && choices.some((o) => o.id.startsWith("heal:"))) {
      const plan = state.dungeon!.rest!.plan!;
      return [...choices].sort((a, b) => {
        const score = (id: string) => {
          const [kind, i] = id.split(":"),
            hero = state.dungeon!.heroes[Number(i)]!,
            spent = plan.spend[Number(i)]!;
          return kind === "heal" ? (hero.wounds! - spent.heal) * 0.7 : hero.stress - spent.stress;
        };
        return score(b.id) - score(a.id);
      })[0]!.id;
    }
    if (pending.id.startsWith("dungeon-trinket:")) {
      const equip = choices.find((o) => o.id.startsWith("equip:"));
      if (equip) return equip.id;
    }
    return (
      [
        "continue",
        "food",
        "collective",
        "discard-new",
        "gold",
        "pressure",
        "suffer",
        "attack",
        "agree",
        "20",
      ].find((id) => choices.some((o) => o.id === id)) ??
      choices.find((o) => o.id.startsWith("use:"))?.id ??
      choices[0]!.id
    );
  };
  const settle = () => {
    for (let count = 0; count < 200; count++) {
      while (state.dungeon?.deathTrinketChoice)
        step({
          type: "resolveChoice",
          choiceId: state.dungeon.deathTrinketChoice.id,
          optionId: "discard",
        });
      while (options.handleDeaths && state.dungeon?.replacementPreparation)
        step({
          type: "resolveChoice",
          choiceId: state.dungeon.replacementPreparation.choice.id,
          optionId: pickNaturalReplacementOptionId(
            state.dungeon.replacementPreparation.choice,
            options.preferStagecoachRevival === true,
          ),
        });
      const p = choice();
      if (p) {
        choose(pick(p));
        continue;
      }
      if (state.dungeon?.phase === "blockedPressure") {
        step({ type: "resolveDungeonPressure" });
        continue;
      }
      if (!state.battle && state.dungeon?.phase === "awaitingCurio") {
        step({ type: "resolveDungeonCurio" });
        continue;
      }
      return;
    }
    throw new Error("choice loop");
  };
  const fight = () =>
    playNaturalBattle(
      { state: () => state, step, settle },
      {
        ...(options.preferWipeout
          ? { preferWipeout: true }
          : options.survival
            ? { survival: true, ...(options.emergencyHeal ? { emergencyHeal: true } : {}) }
            : {}),
        ...(options.heroAction ? { heroAction: options.heroAction } : {}),
        ...(options.fungalResearch ? { fungalResearch: options.fungalResearch } : {}),
      },
    );
  /** 经闭包读回 phase，避免 step 重赋值后仍被收窄为 ready。 */
  const dungeonPhase = () => state.dungeon!.phase;
  const currentQuestId = () =>
    (state.dungeon!.questDistribution?.questId ?? questId) as BasicQuestId;
  const room = () => {
    if (
      isBossQuestId(currentQuestId()) &&
      state.dungeon!.bossQuestVictory === true &&
      dungeonPhase() !== "awaitingReplacement"
    )
      return;
    for (let count = 0; count < 20; count++) {
      if (
        isBossQuestId(currentQuestId()) &&
        state.dungeon!.bossQuestVictory === true &&
        dungeonPhase() !== "awaitingReplacement"
      )
        return;
      settle();
      const phase = dungeonPhase();
      if (phase === "ready") return;
      if (options.preferWipeout && phase === "awaitingReplacement") return;
      if (options.handleDeaths && phase === "awaitingReplacement") {
        // 战役已失败时不再准备替补；继续发命令只会得到「战役已失败」的拒绝。
        if (state.dungeon!.campaignFailure) return;
        // 公开替补流程：先准备，再选升级，最后入队；等待英雄代币仍由引擎判定。
        for (let guard = 0; guard < 10 && dungeonPhase() === "awaitingReplacement"; guard++) {
          if (state.dungeon!.campaignFailure) return;
          step(
            (state.dungeon!.preparedReplacements?.length ?? 0) >=
              state.dungeon!.heroes.filter((h) => h.dead).length
              ? { type: "joinPreparedReplacements" }
              : { type: "prepareReplacementHero" },
          );
          settle();
        }
        continue;
      }
      if (phase !== "awaitingRoom") throw new Error(`dungeon halted ${phase}`);
      const kind = state.dungeon!.rooms.find((r) => r.id === state.dungeon!.position)!.kind;
      if (
        kind === "lair" ||
        kind === "treasure" ||
        kind === "objective" ||
        (kind === "curio" && state.dungeon!.curioRoom?.stage === "guarded")
      ) {
        step({ type: "prepareDungeonBattle" });
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:ruins:10" &&
          state.dungeon!.activeBossThreatScriptId === "boss:ruins:necromancer:1"
        ) {
          step({ type: "deployNecromancerI" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:ruins:10" &&
          state.dungeon!.activeBossThreatScriptId === "boss:ruins:necromancer:2"
        ) {
          step({ type: "deployNecromancerII" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:ruins:10" &&
          state.dungeon!.activeBossThreatScriptId === "boss:ruins:necromancer:3"
        ) {
          step({ type: "deployNecromancerIII" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:ruins:11" &&
          state.dungeon!.activeBossThreatScriptId === "boss:ruins:prophet:1"
        ) {
          step({ type: "deployProphetI" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:ruins:11" &&
          state.dungeon!.activeBossThreatScriptId === "boss:ruins:prophet:2"
        ) {
          step({ type: "deployProphetII" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:ruins:11" &&
          state.dungeon!.activeBossThreatScriptId === "boss:ruins:prophet:3"
        ) {
          step({ type: "deployProphetIII" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:ruins:12" &&
          state.dungeon!.activeBossThreatScriptId === "boss:ruins:collector:1"
        ) {
          step({ type: "deployCollectorI" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:ruins:12" &&
          state.dungeon!.activeBossThreatScriptId === "boss:ruins:collector:2"
        ) {
          step({ type: "deployCollectorII" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:ruins:12" &&
          state.dungeon!.activeBossThreatScriptId === "boss:ruins:collector:3"
        ) {
          step({ type: "deployCollectorIII" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:weald:11" &&
          state.dungeon!.activeBossThreatScriptId === "boss:weald:shrieker:1" &&
          state.dungeon!.shriekerBossBattles
        ) {
          step({ type: "deployShriekerI" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:weald:10" &&
          state.dungeon!.activeBossThreatScriptId === "boss:weald:hag:1"
        ) {
          step({ type: "deployHagI" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:weald:12" &&
          state.dungeon!.activeBossThreatScriptId === "boss:weald:brigandPounder:1" &&
          state.dungeon!.pounderBossBattles
        ) {
          step({ type: "deployPounderI" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:ruins:13" &&
          state.dungeon!.activeBossThreatScriptId === "boss:ruins:fanatic:1"
        ) {
          step({ type: "deployFanaticI" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:ruins:13" &&
          state.dungeon!.activeBossThreatScriptId === "boss:ruins:fanatic:2"
        ) {
          step({ type: "deployFanaticII" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:ruins:13" &&
          state.dungeon!.activeBossThreatScriptId === "boss:ruins:fanatic:3"
        ) {
          step({ type: "deployFanaticIII" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:darkest:09" &&
          state.dungeon!.darkest?.bossEncounterPlan?.resolvedScriptId === DARKEST_TEMPLARS_SCRIPT_ID
        ) {
          step({ type: "deployTemplarsI" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:darkest:10" &&
          state.dungeon!.darkest?.bossEncounterPlan?.resolvedScriptId ===
            DARKEST_SHUFFLING_HORROR_SCRIPT_ID
        ) {
          step({ type: "deployShufflingHorrorI" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (
          state.dungeon!.roomCards!.active!.cardId === "room:darkest:11" &&
          state.dungeon!.darkest?.bossEncounterPlan?.resolvedScriptId ===
            DARKEST_MAMMOTH_CYST_SCRIPT_ID
        ) {
          step({ type: "deployMammothCystI" });
          fight();
          if (state.dungeon!.campaignFailure) return;
          continue;
        }
        if (!state.dungeon!.roomCards!.active!.tileId) throw new Error("unready tile");
        step({ type: "prepareDungeonMonsters" });
        step({ type: "startDungeonBattle" });
        fight();
        if (options.preferWipeout && dungeonPhase() === "awaitingReplacement") return;
        if (kind === "objective") {
          for (let i = 0; i < 10; i++) {
            const roomState = state.dungeon!.rooms.find((r) => r.id === state.dungeon!.position)!;
            if (roomState.cleared || dungeonPhase() !== "awaitingRoom") break;
            step({ type: "resolveDungeonRoom" });
            settle();
          }
        }
      } else step({ type: "resolveDungeonRoom" });
    }
    throw new Error("room loop");
  };
  try {
    const activeQuestId = (state.dungeon!.questDistribution?.questId ?? questId) as BasicQuestId;
    const activeQuest = basicQuests.find((q) => q.id === activeQuestId)!;
    if (activeQuestId === "quest:p019" && !state.dungeon!.imminentThreatDescriptionCardId)
      step({
        type: "establishImminentThreat",
        ...(options.locationBosses ? { locationBosses: true } : {}),
        ...(options.locationSources ? { locationSources: true } : {}),
      });
    if (options.locationBosses && state.dungeon!.unregisteredImminentThreatHold)
      throw new Error(state.dungeon!.unregisteredImminentThreatHold);
    if (dungeonPhase() === "awaitingProvisions") {
      step({ type: "rollDungeonProvisions" });
      settle();
    } else if (dungeonPhase() !== "ready") {
      throw new Error(`unexpected dungeon phase ${dungeonPhase()}`);
    }
    for (let hops = 0; hops < state.dungeon!.layout.nodes.length ** 2; hops++) {
      if (options.preferWipeout && dungeonPhase() === "awaitingReplacement")
        return { initial, state, commands, events, stopReason: null };
      if (state.dungeon!.heroes.some((h) => h.dead)) throw new Error("hero died");
      const route = nextNaturalRoute(state.dungeon!);
      if (!route) break;
      const dBefore = state.dungeon!;
      if (
        options.radiantScouting &&
        dBefore.mode === "radiant" &&
        !route.backtrack &&
        dBefore.layout.nodes.some((node) => node.id === dBefore.position && node.kind === "room") &&
        dBefore.mustLeaveRoomId !== dBefore.position &&
        dBefore.heroes.every((hero) => hero.stress < 7)
      ) {
        step({ type: "scoutDungeon" });
        settle();
        if (dungeonPhase() !== "ready") room();
        if (state.dungeon!.campaignFailure)
          return { initial, state, commands, events, stopReason: null };
      }
      step({ type: route.backtrack ? "beginDungeonBacktrack" : "beginDungeonExploration" });
      choose(route.to);
      if (!route.backtrack) step({ type: "rollDungeonExploration" });
      settle();
      room();
      if (state.dungeon!.campaignFailure)
        return { initial, state, commands, events, stopReason: null };
      if (options.preferWipeout && dungeonPhase() === "awaitingReplacement")
        return { initial, state, commands, events, stopReason: null };
      const d = state.dungeon!;
      if (
        canRestDungeon(state) &&
        d.heroes.reduce((n, h) => n + h.stress + h.wounds!, 0) > (options.restThreshold ?? 12)
      ) {
        step({ type: "restDungeon" });
        settle();
      }
      const won = events.filter(
        (e) => e.type === "battleFinished" && e.outcome === "victory",
      ).length;
      const cleared = d.rooms.filter((r) => r.cleared),
        lairs = cleared.filter((r) => r.kind === "lair");
      const done = isBossQuestId(activeQuestId)
        ? d.bossQuestVictory === true
        : options.exitAfterObjectiveRooms !== undefined
          ? cleared.filter((r) => r.kind === "objective").length >= options.exitAfterObjectiveRooms
          : options.exitAfterDisinfectedOaks !== undefined
            ? (d.disinfectionOakCount ?? 0) >= options.exitAfterDisinfectedOaks
            : options.exitAfterCroneKills !== undefined
              ? (d.questExceptionCroneKills ?? 0) >= options.exitAfterCroneKills
              : options.exitAfterBattles !== undefined
                ? events.filter((e) => e.type === "battleFinished").length >=
                  options.exitAfterBattles
                : activeQuest.xpKind === "all"
                  ? cleared.length >= scoutRooms && won > 0
                  : activeQuest.xpKind === "lair"
                    ? lairs.length >= wipeLairs
                    : activeQuest.xpKind === "objective"
                      ? cleared.filter((r) => r.kind === "objective").length >= 1
                      : activeQuest.xpKind === "curio"
                        ? cleared.filter((r) => r.kind === "curio").length >= 1
                        : lairs.length > 0 && d.gold >= 20;
      if (done) {
        step({ type: "leaveDungeon" });
        choose("agree");
        step({ type: "summarizeDungeonQuest" });
        if (
          activeQuestId === "quest:p003" &&
          state.dungeon!.pending?.id.startsWith("dungeon-fundraiser:")
        ) {
          const donations = state.dungeon!.pending!.options;
          // 提前退出时可能不足20金；只从引擎实际提供的捐献选项中选择。
          const preferred = `give:${options.fundraiserDonation ?? 20}`;
          choose(
            donations.some((option) => option.id === preferred) ? preferred : donations[0]!.id,
          );
        }
        return { initial, state, commands, events, stopReason: null };
      }
    }
    throw new Error("route exhausted");
  } catch (error) {
    if (keepStop)
      return {
        initial,
        state,
        commands,
        events,
        stopReason: error instanceof Error ? error.message : String(error),
      };
    throw error;
  }
}
